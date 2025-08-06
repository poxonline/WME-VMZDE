// ==UserScript==
// @name WME-VMZDE
// @description This script create buttons to open several Traffic Management Platforms in Germany, using the WME parameters where supported.
// @namespace https://github.com/poxonline/WME-VMZDE/blob/main/WMEVMZDE.user.js
// @version 2025.08.06.03
// @updateURL https://github.com/poxonline/WME-VMZDE/raw/main/WMEVMZDE.user.js
// @downloadURL https://github.com/poxonline/WME-VMZDE/raw/main/WMEVMZDE.user.js
// @include https://*.waze.com/editor*
// @include https://*.waze.com/*/editor*
// @grant none
// @author pox_online
// ==/UserScript==

const VMZDE_VERSION = "2025.08.06.03";

/**
 * Moderne SDK-konforme Implementierung zur Ermittlung von Kartenzentrum und Zoom-Level
 * Verwendet die aktuelle Waze SDK API mit Fallback-Mechanismen
 */
function getCenterZoom() {
    try {
        // Primäre Methode: Aktuelle SDK API
        if (W?.map?.getOLMap) {
            const olMap = W.map.getOLMap();
            const center = olMap.getCenter();
            const zoom = olMap.getZoom();

            // Koordinatentransformation von Web Mercator zu WGS84
            if (center && typeof center.transform === 'function') {
                const lonLat = center.clone().transform(
                    olMap.getProjectionObject(),
                    new OpenLayers.Projection('EPSG:4326')
                );

                return {
                    lat: parseFloat(lonLat.lat.toFixed(6)),
                    lon: parseFloat(lonLat.lon.toFixed(6)),
                    zoom: Math.round(zoom)
                };
            }
        }

        // Fallback-Methode: Direkte Map-API
        if (W?.map?.center && W?.map?.zoom) {
            const center = W.map.center;
            return {
                lat: parseFloat(center.lat.toFixed(6)),
                lon: parseFloat(center.lon.toFixed(6)),
                zoom: Math.round(W.map.zoom)
            };
        }

        // Letzter Fallback: Model-basierte Abfrage
        if (W?.model?.venues?.getCenter) {
            const center = W.model.venues.getCenter();
            const zoom = W.map?.getZoom() || 10;

            return {
                lat: parseFloat(center.lat.toFixed(6)),
                lon: parseFloat(center.lon.toFixed(6)),
                zoom: Math.round(zoom)
            };
        }

        throw new Error('Keine verfügbare Methode zur Koordinatenermittlung gefunden');

    } catch (error) {
        console.error('VMZDE: Fehler beim Abrufen der Kartenkoordinaten:', error);

        // Fallback-Koordinaten für Deutschland (Zentrum)
        return {
            lat: 51.1657,
            lon: 10.4515,
            zoom: 6
        };
    }
}

/**
 * Asynchrone Proj4-Bibliothek laden mit Caching
 */
async function loadProj4() {
    // Prüfen ob bereits geladen
    if (window.proj4) {
        return window.proj4;
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.type = 'text/javascript';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.8.0/proj4.min.js';
        script.async = true;

        script.onload = () => {
            console.log('VMZDE: Proj4-Bibliothek erfolgreich geladen');
            resolve(window.proj4);
        };

        script.onerror = () => {
            console.error('VMZDE: Proj4-Bibliothek konnte nicht geladen werden');
            reject(new Error('Proj4-Bibliothek konnte nicht geladen werden'));
        };

        document.head.appendChild(script);
    });
}

/**
 * Button-Konfiguration für konsistentes Design
 */
const BUTTON_CONFIG = {
    baseStyle: "width: 285px; height: 28px; font-size: 13px; border-radius: 6px; border: 1px solid #ccc; background: linear-gradient(to bottom, #fff, #f5f5f5); cursor: pointer; margin: 2px 0; transition: all 0.2s ease;",
    activeStyle: "color: #2e7d32; font-weight: 500;",
    inactiveStyle: "color: #666; font-style: italic;",
    hoverStyle: "background: linear-gradient(to bottom, #f5f5f5, #e8e8e8); border-color: #999;"
};

/**
 * Erstellt einen standardisierten Button mit Hover-Effekten
 */
function createButton(text, isActive = true) {
    const colorStyle = isActive ? BUTTON_CONFIG.activeStyle : BUTTON_CONFIG.inactiveStyle;
    const button = $(`<button style="${BUTTON_CONFIG.baseStyle} ${colorStyle}">${text}</button>`);

    // Hover-Effekte hinzufügen
    button.hover(
        function() { $(this).css('background', 'linear-gradient(to bottom, #f0f8ff, #e6f3ff)'); },
        function() { $(this).css('background', 'linear-gradient(to bottom, #fff, #f5f5f5)'); }
    );

    return button;
}

/**
 * Portal-Konfiguration für bessere Wartbarkeit
 */
const PORTALS = {
    bw: {
        name: 'Verkehrsinfo BW',
        active: true,
        urlBuilder: (cz) => {
            const zoom = Math.min(Math.max(cz.zoom - 10, 1), 19);
            return `https://verkehrsinfo-bw.de/?zoom=${zoom}&fullscreen=false&center=${cz.lat},${cz.lon}&layers=Beschriftung,Verkehrslage,Reisezeitverlust,Verkehrsmeldungen,Baustellen,Baustellenverläufe,Baustellenumleitungen,Verkehrskameras,Wechselwegweisung,Betriebsmeldungen`;
        }
    },
    by: {
        name: 'Bayern Info',
        active: true,
        urlBuilder: (cz) => {
            const offset = 0.01;
            const nord = (cz.lat + offset).toFixed(6);
            const sued = (cz.lat - offset).toFixed(6);
            const west = (cz.lon - offset).toFixed(6);
            const ost = (cz.lon + offset).toFixed(6);
            return `https://www.bayerninfo.de/de/karte?bounds=${nord}%2C${west}%2C${sued}%2C${ost}&traffic=all`;
        }
    },
    nrw: {
        name: 'Verkehr.NRW',
        active: true,
        urlBuilder: (cz) => {
            const zoom = Math.min(cz.zoom, 19);
            return `https://www.verkehr.nrw/web/vipnrw/karte/?center=${cz.lat},${cz.lon}&zoom=${zoom}&car=true&publicTransport=false&bike=false&layer=Verkehrslage,Parken,Webcams,Verkehrsmeldungen,Baustellen&highlightRoute=false`;
        }
    },
    autobahn: {
        name: 'Verkehr.Autobahn',
        active: true,
        urlBuilder: (cz) => {
            const zoom = Math.min(cz.zoom, 19);
            return `https://verkehr.vz-deutschland.de/?lat=${cz.lat}&lon=${cz.lon}&zoom=${zoom}&layer=raststellen,baustellen,stau,verkehrsmeldungen`;
        }
    },
    rlp: {
        name: 'Mobilitätsatlas Rheinland-Pfalz',
        active: true,
        urlBuilder: (cz) => {
            const zoom = Math.min(Math.max(cz.zoom - 3, 1), 19);
            return `https://verkehr.rlp.de/#/?center=${cz.lat},${cz.lon}&zoom=${zoom}`;
        }
    },
    sh: {
        name: 'Mobilitätsatlas Schleswig-Holstein',
        active: true,
        requiresProj4: true,
        urlBuilder: async (cz) => {
            const proj4 = await loadProj4();
            const utmProj = "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
            const utm = proj4(utmProj, [cz.lon, cz.lat]);
            return `https://danord.gdi-sh.de/viewer/resources/apps/lbvsh_baustelleninfos/index.html?lang=de&vm=2D&s=2000&c=${utm[0]}%2C${utm[1]}#/`;
        }
    },
    nds: {
        name: 'VMZ Niedersachsen',
        active: false,
        urlBuilder: () => 'https://www.vmz-niedersachsen.de/niedersachsen/'
    }
};

/**
 * Erstellt Button-Handler für ein Portal
 */
function createPortalHandler(portalConfig) {
    return async function() {
        try {
            const cz = getCenterZoom();
            const url = await portalConfig.urlBuilder(cz);
            window.open(url, '_blank');
        } catch (error) {
            console.error(`VMZDE: Fehler beim Öffnen von ${portalConfig.name}:`, error);
            alert(`Fehler beim Öffnen von ${portalConfig.name}. Bitte versuchen Sie es erneut.`);
        }
    };
}

/**
 * Wartet auf die Verfügbarkeit der Waze-Objekte
 */
function waitForWaze() {
    return new Promise((resolve) => {
        const checkWaze = () => {
            if (window.W &&
                W.loginManager &&
                W.map &&
                document.getElementById('user-info')) {
                resolve();
            } else {
                setTimeout(checkWaze, 500);
            }
        };
        checkWaze();
    });
}

/**
 * Wartet auf Benutzeranmeldung
 */
function waitForLogin() {
    return new Promise((resolve) => {
        if (W.loginManager.user) {
            resolve();
            return;
        }

        const loginHandler = () => {
            if (W.loginManager.user) {
                W.loginManager.events.unregister('login', null, loginHandler);
                W.loginManager.events.unregister('loginStatus', null, loginHandler);
                resolve();
            }
        };

        W.loginManager.events.register('login', null, loginHandler);
        W.loginManager.events.register('loginStatus', null, loginHandler);
    });
}

/**
 * Erstellt den VMZ-Tab in der Seitenleiste
 */
function createVMZTab() {
    try {
        const userTabs = document.getElementById('user-info');
        if (!userTabs) {
            throw new Error('user-info Element nicht gefunden');
        }

        const navTabs = userTabs.querySelector('.nav-tabs');
        const tabContent = userTabs.querySelector('.tab-content');

        if (!navTabs || !tabContent) {
            throw new Error('Tab-Container nicht gefunden');
        }

        // Tab-Navigation erstellen
        const tabLi = document.createElement('li');
        tabLi.innerHTML = '<a href="#sidepanel-vmzde" data-toggle="tab">VMZ DE</a>';
        navTabs.appendChild(tabLi);

        // Tab-Inhalt erstellen
        const tabPane = document.createElement('section');
        tabPane.id = 'sidepanel-vmzde';
        tabPane.className = 'tab-pane';
        tabContent.appendChild(tabPane);

        console.log('VMZDE: Tab erfolgreich erstellt');

    } catch (error) {
        console.error('VMZDE: Fehler beim Erstellen des Tabs:', error);
    }
}

/**
 * Hauptfunktion zum Hinzufügen der Buttons
 */
async function addButtons() {
    try {
        // Warten auf Waze und Benutzeranmeldung
        await waitForWaze();
        await waitForLogin();

        console.log('VMZDE: Initialisierung gestartet');

        // Tab erstellen
        createVMZTab();

        // Container für Buttons
        const container = $('#sidepanel-vmzde');
        if (!container.length) {
            throw new Error('VMZ-Container nicht gefunden');
        }

        // Header hinzufügen
        container.html(`
            <div style="padding: 10px;">
                <h3 style="margin: 0 0 10px 0; color: #333;">Verkehrsportale Deutschland</h3>
                <p style="font-size: 12px; color: #666; margin: 0 0 15px 0;">
                    Koordinaten werden automatisch aus dem WME übertragen.<br>
                    Version: ${VMZDE_VERSION} | Feedback an pox_online
                    Umgestellt auf WME SDK, danke an hahn112
                </p>
                <div style="border-bottom: 1px solid #ddd; margin-bottom: 15px;"></div>
            </div>
        `);

        // Aktive Portale (mit Koordinatenübergabe)
        const activeContainer = $('<div style="padding: 0 10px;"></div>');
        activeContainer.append('<h4 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 14px;">🟢 Mit Koordinatenübergabe</h4>');

        Object.entries(PORTALS).forEach(([key, config]) => {
            if (config.active) {
                const button = createButton(config.name, true);
                button.click(createPortalHandler(config));
                activeContainer.append(button);
            }
        });

        container.append(activeContainer);

        // Trennlinie
        container.append('<div style="border-bottom: 1px solid #ddd; margin: 20px 10px;"></div>');

        // Inaktive Portale (ohne Koordinatenübergabe)
        const inactiveContainer = $('<div style="padding: 0 10px 20px 10px;"></div>');
        inactiveContainer.append('<h4 style="color: #666; margin: 0 0 10px 0; font-size: 14px;">⚪ Ohne Koordinatenübergabe</h4>');

        Object.entries(PORTALS).forEach(([key, config]) => {
            if (!config.active) {
                const button = createButton(config.name, false);
                button.click(createPortalHandler(config));
                inactiveContainer.append(button);
            }
        });

        container.append(inactiveContainer);

        console.log('VMZDE: Buttons erfolgreich hinzugefügt');

    } catch (error) {
        console.error('VMZDE: Fehler bei der Initialisierung:', error);

        // Fallback: Einfache Fehlermeldung anzeigen
        setTimeout(() => {
            if ($('#sidepanel-vmzde').length) {
                $('#sidepanel-vmzde').html(`
                    <div style="padding: 10px; color: red;">
                        <h3>VMZDE Fehler</h3>
                        <p>Das Script konnte nicht vollständig geladen werden.</p>
                        <p>Bitte Seite neu laden oder Entwickler kontaktieren.</p>
                    </div>
                `);
            }
        }, 2000);
    }
}

// Script-Initialisierung mit verbesserter Fehlerbehandlung
(function() {
    'use strict';

    console.log(`VMZDE Script v${VMZDE_VERSION} wird geladen...`);

    // Warten auf DOM-Bereitschaft
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addButtons);
    } else {
        addButtons();
    }

    // Zusätzlicher Fallback für langsame Verbindungen
    setTimeout(addButtons, 3000);

})();
