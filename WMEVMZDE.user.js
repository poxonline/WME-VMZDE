// ==UserScript==
// @name WME-VMZDE
// @description This script create buttons to open several Traffic Management Platforms in Germany, using the WME parameters where supported.
// @namespace https://github.com/poxonline/WME-VMZDE/blob/main/WMEVMZDE.user.js
// @version 2025.11.15.01
// @updateURL https://github.com/poxonline/WME-VMZDE/raw/main/WMEVMZDE.user.js
// @downloadURL https://github.com/poxonline/WME-VMZDE/raw/main/WMEVMZDE.user.js
// @include https://*.waze.com/editor*
// @include https://*.waze.com/*/editor*
// @grant none
// @author pox_online
// ==/UserScript==
// The script is based on Iridium1 L2DEGEO Script, so thanks him for the base of the source code!

/* eslint-env jquery */
/*global W*/

const VMZDE_VERSION = "2025.11.15.01";

// Konfiguration für Retry-Mechanismen
const CONFIG = {
    maxRetries: 20,
    retryDelay: 1000,
    elementCheckDelay: 500,
    maxWaitTime: 30000
};

/**
 * Erweiterte Wartefunktion mit mehreren Selektoren und Timeout
 */
function waitForElement(selectors, timeout = CONFIG.maxWaitTime) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkElement = () => {
            // Prüfe alle möglichen Selektoren
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    console.log(`VMZDE: Element gefunden mit Selektor: ${selector}`);
                    resolve(element);
                    return;
                }
            }

            // Timeout-Prüfung
            if (Date.now() - startTime > timeout) {
                reject(new Error(`Timeout: Keines der Elemente gefunden: ${selectors.join(', ')}`));
                return;
            }

            // Erneut prüfen
            setTimeout(checkElement, CONFIG.elementCheckDelay);
        };

        checkElement();
    });
}

/**
 * Robuste Wartefunktion für Waze-Objekte mit detailliertem Logging
 */
function waitForWaze() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const startTime = Date.now();

        const checkWaze = () => {
            attempts++;
            console.log(`VMZDE: Waze-Check Versuch ${attempts}/${CONFIG.maxRetries}`);

            // Detaillierte Prüfung der Waze-Objekte
            const checks = {
                'window.W': !!window.W,
                'W.loginManager': !!(window.W && W.loginManager),
                'W.map': !!(window.W && W.map),
                'W.model': !!(window.W && W.model)
            };

            console.log('VMZDE: Waze-Objekt Status:', checks);

            if (checks['window.W'] && checks['W.loginManager'] && checks['W.map']) {
                console.log('VMZDE: Alle erforderlichen Waze-Objekte verfügbar');
                resolve();
                return;
            }

            if (attempts >= CONFIG.maxRetries || Date.now() - startTime > CONFIG.maxWaitTime) {
                reject(new Error(`Waze-Objekte nach ${attempts} Versuchen nicht verfügbar`));
                return;
            }

            setTimeout(checkWaze, CONFIG.retryDelay);
        };

        checkWaze();
    });
}

/**
 * Erweiterte Login-Wartefunktion
 */
function waitForLogin() {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();

        const checkLogin = () => {
            console.log('VMZDE: Login-Status prüfen...');

            if (W.loginManager && W.loginManager.user) {
                console.log('VMZDE: Benutzer ist angemeldet');
                resolve();
                return;
            }

            if (Date.now() - startTime > CONFIG.maxWaitTime) {
                reject(new Error('Login-Timeout erreicht'));
                return;
            }

            // Event-Listener für Login-Events
            if (W.loginManager && W.loginManager.events) {
                const loginHandler = () => {
                    if (W.loginManager.user) {
                        console.log('VMZDE: Login-Event empfangen');
                        W.loginManager.events.unregister('login', null, loginHandler);
                        W.loginManager.events.unregister('loginStatus', null, loginHandler);
                        resolve();
                    }
                };

                W.loginManager.events.register('login', null, loginHandler);
                W.loginManager.events.register('loginStatus', null, loginHandler);
            }

            setTimeout(checkLogin, CONFIG.retryDelay);
        };

        checkLogin();
    });
}

/**
 * Moderne SDK-konforme Implementierung zur Ermittlung von Kartenzentrum und Zoom-Level
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
            return `https://verkehrsinfo-bw.de/?zoom=${zoom}&fullscreen=false&center=${cz.lat},${cz.lon}&layers=Beschriftung,Verkehrslage,Reisezeitverlust,Verkehrsmeldungen,Baustellen%20und%20Ereignisse,Baustellenverläufe,Baustellenumleitungen,Verkehrskameras,Wechselwegweisung,Betriebsmeldungen`;
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
 * Robuste Tab-Erstellung mit mehreren Fallback-Strategien
 */
async function createVMZTab() {
    try {
        console.log('VMZDE: Suche nach Tab-Container...');

        // Verschiedene mögliche Selektoren für den Tab-Container
        const userInfoSelectors = [
            '#user-info',
            '.user-info',
            '[id*="user-info"]',
            '.nav-tabs',
            '#sidebar .nav-tabs',
            '.sidebar .nav-tabs'
        ];

        // Warte auf user-info Element
        const userTabs = await waitForElement(userInfoSelectors);
        console.log('VMZDE: user-info Element gefunden');

        // Suche nach nav-tabs Container
        let navTabs = userTabs.querySelector('.nav-tabs');
        if (!navTabs) {
            // Alternative Selektoren für nav-tabs
            navTabs = document.querySelector('.nav-tabs') ||
                     userTabs.querySelector('ul[role="tablist"]') ||
                     userTabs.querySelector('.nav');
        }

        // Suche nach tab-content Container
        let tabContent = userTabs.querySelector('.tab-content');
        if (!tabContent) {
            // Alternative Selektoren für tab-content
            tabContent = document.querySelector('.tab-content') ||
                        userTabs.querySelector('[role="tabpanel"]') ||
                        userTabs.querySelector('.content');
        }

        if (!navTabs || !tabContent) {
            throw new Error(`Tab-Container nicht vollständig gefunden. navTabs: ${!!navTabs}, tabContent: ${!!tabContent}`);
        }

        console.log('VMZDE: Tab-Container gefunden, erstelle VMZ-Tab...');

        // Prüfe ob Tab bereits existiert
        if (document.getElementById('sidepanel-vmzde')) {
            console.log('VMZDE: Tab bereits vorhanden, überspringe Erstellung');
            return;
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

        // Kurz warten damit der Tab im DOM verfügbar ist
        await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
        console.error('VMZDE: Fehler beim Erstellen des Tabs:', error);
        throw error;
    }
}

/**
 * Hauptfunktion zum Hinzufügen der Buttons mit Retry-Mechanismus
 */
async function addButtons() {
    let retryCount = 0;

    while (retryCount < CONFIG.maxRetries) {
        try {
            console.log(`VMZDE: Initialisierung Versuch ${retryCount + 1}/${CONFIG.maxRetries}`);

            // Schritt 1: Warten auf Waze-Objekte
            console.log('VMZDE: Warte auf Waze-Objekte...');
            await waitForWaze();

            // Schritt 2: Warten auf Benutzeranmeldung
            console.log('VMZDE: Warte auf Benutzeranmeldung...');
            await waitForLogin();

            // Schritt 3: Tab erstellen
            console.log('VMZDE: Erstelle VMZ-Tab...');
            await createVMZTab();

            // Schritt 4: Container finden und Buttons hinzufügen
            console.log('VMZDE: Suche VMZ-Container...');
            const container = $('#sidepanel-vmzde');

            if (!container.length) {
                throw new Error('VMZ-Container nicht gefunden nach Tab-Erstellung');
            }

            console.log('VMZDE: VMZ-Container gefunden, füge Buttons hinzu...');

            // Container leeren falls bereits Inhalt vorhanden
            container.empty();

            // Header hinzufügen
            container.html(`
                <div style="padding: 10px;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">Verkehrsportale Deutschland</h3>
                    <p style="font-size: 12px; color: #666; margin: 0 0 15px 0;">
                        Koordinaten werden automatisch aus dem WME übertragen.<br>
                        Version: ${VMZDE_VERSION} | Feedback an pox_online
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

            console.log('VMZDE: Initialisierung erfolgreich abgeschlossen!');
            return; // Erfolg - Schleife verlassen

        } catch (error) {
            retryCount++;
            console.error(`VMZDE: Fehler bei Versuch ${retryCount}:`, error);

            if (retryCount >= CONFIG.maxRetries) {
                console.error('VMZDE: Maximale Anzahl von Versuchen erreicht');
                showErrorMessage();
                return;
            }

            console.log(`VMZDE: Warte ${CONFIG.retryDelay}ms vor nächstem Versuch...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
        }
    }
}

/**
 * Zeigt eine Fehlermeldung an wenn das Script nicht geladen werden kann
 */
function showErrorMessage() {
    // Versuche eine einfache Fehlermeldung zu erstellen
    setTimeout(() => {
        try {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #ffebee;
                border: 1px solid #f44336;
                color: #c62828;
                padding: 15px;
                border-radius: 5px;
                z-index: 10000;
                max-width: 300px;
                font-family: Arial, sans-serif;
                font-size: 14px;
            `;
            errorDiv.innerHTML = `
                <strong>VMZDE Script Fehler</strong><br>
                Das Script konnte nicht geladen werden.<br>
                <small>Bitte Seite neu laden oder Entwickler kontaktieren.</small>
                <button onclick="this.parentElement.remove()" style="float: right; margin-top: 5px;">×</button>
            `;
            document.body.appendChild(errorDiv);

            // Automatisch nach 10 Sekunden entfernen
            setTimeout(() => {
                if (errorDiv.parentElement) {
                    errorDiv.remove();
                }
            }, 10000);

        } catch (e) {
            console.error('VMZDE: Konnte keine Fehlermeldung anzeigen:', e);
        }
    }, 1000);
}

// Script-Initialisierung mit verbesserter Fehlerbehandlung
(function() {
    'use strict';

    console.log(`VMZDE Script v${VMZDE_VERSION} wird geladen...`);

    // Mehrere Initialisierungsstrategien
    const initStrategies = [
        // Strategie 1: Sofort wenn DOM bereit
        () => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', addButtons);
            } else {
                addButtons();
            }
        },

        // Strategie 2: Nach kurzer Verzögerung
        () => setTimeout(addButtons, 2000),

        // Strategie 3: Nach längerer Verzögerung (für langsame Verbindungen)
        () => setTimeout(addButtons, 5000),

        // Strategie 4: Window load event
        () => window.addEventListener('load', addButtons)
    ];

    // Alle Strategien ausführen
    initStrategies.forEach((strategy, index) => {
        try {
            console.log(`VMZDE: Initialisierungsstrategie ${index + 1} gestartet`);
            strategy();
        } catch (error) {
            console.error(`VMZDE: Fehler bei Initialisierungsstrategie ${index + 1}:`, error);
        }
    });

})();
