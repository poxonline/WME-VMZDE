// ==UserScript==
// @name WME-VMZDE-sdk
// @description This script create buttons to open several Traffic Management Platforms in Germany, using the WME parameters where supported.
// @namespace https://github.com/poxonline/WME-VMZDE/blob/main/WMEVMZDE.user.js
// @version 2025.08.06.02
// @updateURL https://github.com/poxonline/WME-VMZDE/raw/main/WMEVMZDE.user.js
// @downloadURL https://github.com/poxonline/WME-VMZDE/raw/main/WMEVMZDE.user.js
// @include https://*.waze.com/editor*
// @include https://*.waze.com/*/editor*
// @grant none
// @author pox_online
// ==/UserScript==

// Hinweis: Skript basiert auf Code von https://github.com/iridium1-waze/WME-L2DEGEO

var vmzde_version = "2025.08.06.02";

/* eslint-env jquery */
/*global W*/
/*global proj4*/
/*global OpenLayers*/

/**
 * Wartet auf die vollständige Initialisierung der Waze-Umgebung
 */
function waitForWaze() {
    return new Promise((resolve) => {
        function checkWaze() {
            // Prüfe auf alle notwendigen Waze-Objekte
            if (typeof W !== 'undefined' &&
                W.map &&
                W.loginManager &&
                typeof $ !== 'undefined') {
                console.log('Waze-Umgebung erfolgreich geladen');
                resolve();
            } else {
                console.log('Warte auf Waze-Umgebung...');
                setTimeout(checkWaze, 500);
            }
        }
        checkWaze();
    });
}

/**
 * Moderne Implementierung zur Ermittlung von Kartenzentrum und Zoom-Level
 * Kompatibel mit neuer und alter Waze SDK
 */
function getCenterZoom() {
    try {
        // Methode 1: Neue SDK-API (bevorzugt)
        if (W.map && W.map.getCenter && W.map.getZoom) {
            const center = W.map.getCenter();
            const zoom = W.map.getZoom();

            if (center && center.lat !== undefined && center.lon !== undefined) {
                return {
                    lat: center.lat,
                    lon: center.lon,
                    zoom: zoom
                };
            }
        }

        // Methode 2: OpenLayers-Fallback für ältere Versionen
        if (W.map && W.map.getOLMap) {
            const map = W.map.getOLMap();
            const zoom = map.getZoom();

            // Prüfe ob OpenLayers verfügbar ist
            if (typeof OpenLayers !== 'undefined' && OpenLayers.Projection) {
                const center = map.getCenter().transform(
                    new OpenLayers.Projection('EPSG:900913'),
                    new OpenLayers.Projection('EPSG:4326')
                );
                return {
                    lat: center.lat,
                    lon: center.lon,
                    zoom: zoom
                };
            }
        }

        // Methode 3: Alternative für neue SDK
        if (W.map && W.map.olMap) {
            const view = W.map.olMap.getView();
            if (view) {
                const center = view.getCenter();
                const zoom = view.getZoom();

                // Koordinatentransformation von Web Mercator zu WGS84
                if (center && center.length >= 2) {
                    const lon = center[0] * 180 / 20037508.34;
                    const lat = Math.atan(Math.exp(center[1] * Math.PI / 20037508.34)) * 360 / Math.PI - 90;

                    return {
                        lat: lat,
                        lon: lon,
                        zoom: zoom
                    };
                }
            }
        }

        throw new Error('Keine verfügbare Methode zur Koordinatenermittlung gefunden');

    } catch (error) {
        console.error('Fehler beim Abrufen der Kartenkoordinaten:', error);

        // Fallback-Koordinaten für Deutschland
        return {
            lat: 51.1657,
            lon: 10.4515,
            zoom: 6
        };
    }
}

/**
 * Hilfsfunktionen (unverändert, da sie funktionieren)
 */
function getQueryString(link, name) {
    var pos = link.indexOf(name + '=') + name.length + 1;
    var len = link.substr(pos).indexOf('&');
    if (-1 == len) len = link.substr(pos).length;
    return link.substr(pos, len);
}

function CorrectZoom(link) {
    var found = link.indexOf('livemap');
    return (-1 == found) ? 13 : 2;
}

/**
 * Hauptfunktion zum Hinzufügen der Buttons
 */
async function add_buttons() {
    try {
        // Warte auf Waze-Initialisierung
        await waitForWaze();

        // Warte auf DOM-Element
        let attempts = 0;
        while (!document.getElementById('user-info') && attempts < 20) {
            console.log('Warte auf user-info Element...');
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        if (!document.getElementById('user-info')) {
            console.error('user-info Element nicht gefunden nach 10 Sekunden');
            return;
        }

        // Warte auf Benutzeranmeldung
        if (!W.loginManager.user) {
            console.log('Warte auf Benutzeranmeldung...');
            return new Promise((resolve) => {
                const checkLogin = () => {
                    if (W.loginManager.user) {
                        resolve();
                        createButtons();
                    } else {
                        setTimeout(checkLogin, 1000);
                    }
                };

                // Event-Listener für Login-Events
                if (W.loginManager.events && W.loginManager.events.register) {
                    W.loginManager.events.register('login', null, () => {
                        resolve();
                        createButtons();
                    });
                    W.loginManager.events.register('loginStatus', null, () => {
                        if (W.loginManager.user) {
                            resolve();
                            createButtons();
                        }
                    });
                }

                checkLogin();
            });
        }

        createButtons();

    } catch (error) {
        console.error('Fehler beim Initialisieren des VMZ-DE Skripts:', error);
    }
}

/**
 * Erstellt alle Buttons und das Interface
 */
function createButtons() {
    console.log('Erstelle VMZ-DE Buttons...');

    // Baden-Württemberg Button
    var bw_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: Green;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Verkehrsinfo BW</button>');
    bw_btn.click(function() {
        var cz = getCenterZoom();
        var zoom = cz.zoom > 19 ? 19 : cz.zoom;
        zoom = zoom - 10;
        var mapsUrl = 'https://verkehrsinfo-bw.de/?zoom=' + zoom + '&fullscreen=false&center=' + cz.lat + ',' + cz.lon + '&layers=Beschriftung,Verkehrslage,Reisezeitverlust,Verkehrsmeldungen,Baustellen,Baustellenverl%C3%A4ufe,Baustellenumleitungen,Verkehrskameras,Wechselwegweisung,Betriebsmeldungen&suchtext=&openebenencontrol=false';
        window.open(mapsUrl, '_blank');
    });

    // Bayern Button
    var by_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: Green;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Bayern Info</button>');
    by_btn.click(function() {
        var cz = getCenterZoom();
        var nord = cz.lat + 0.01;
        var sued = cz.lat - 0.01;
        var west = cz.lon - 0.01;
        var ost = cz.lon + 0.01;
        var mapsUrl = 'https://www.bayerninfo.de/de/karte?bounds=' + nord + '%2C' + west + '%2C' + sued + '%2C' + ost + '&traffic=all';
        window.open(mapsUrl, '_blank');
    });

    // Nordrhein-Westfalen Button
    var nrw_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: Green;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Verkehr.NRW</button>');
    nrw_btn.click(function() {
        var cz = getCenterZoom();
        var zoom = cz.zoom > 19 ? 19 : cz.zoom;
        var mapsUrl = 'https://www.verkehr.nrw/web/vipnrw/karte/?center=' + cz.lat + ',' + cz.lon + '&zoom=' + zoom + '&car=true&publicTransport=false&bike=false&layer=Verkehrslage,Parken,Webcams,Verkehrsmeldungen,Baustellen&highlightRoute=false';
        window.open(mapsUrl, '_blank');
    });

    // Autobahn GmbH Button
    var agmbh_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: Green;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Verkehr.Autobahn</button>');
    agmbh_btn.click(function() {
        var cz = getCenterZoom();
        var zoom = cz.zoom > 19 ? 19 : cz.zoom;
        var mapsUrl = 'https://verkehr.vz-deutschland.de/?lat=' + cz.lat + '&lon=' + cz.lon + '&zoom=' + zoom + '&layer=raststellen,baustellen,stau,verkehrsmeldungen';
        window.open(mapsUrl, '_blank');
    });

    // Rheinland-Pfalz Button
    var rlp_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: Green;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Mobilitätsatlas Rheinland-Pfalz</button>');
    rlp_btn.click(function() {
        var cz = getCenterZoom();
        var zoom = cz.zoom > 19 ? 19 : cz.zoom;
        zoom = zoom - 3;
        var mapsUrl = 'https://verkehr.rlp.de/#/?center=' + cz.lat + ',' + cz.lon + '&zoom=' + zoom;
        window.open(mapsUrl, '_blank');
    });

    // Schleswig-Holstein Button
    var sh_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: Green;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Mobilitätsatlas Schleswig-Holstein</button>');
    sh_btn.click(function() {
        var cz = getCenterZoom();

        // Proj4-Bibliothek laden falls nicht vorhanden
        if (typeof proj4 === 'undefined') {
            var script = document.createElement("script");
            script.type = 'text/javascript';
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.4.4/proj4.js';
            script.onload = function() {
                openShMap(cz);
            };
            script.onerror = function() {
                console.error('Proj4-Bibliothek konnte nicht geladen werden');
                alert('Fehler beim Laden der Kartenprojektion');
            };
            document.getElementsByTagName('head')[0].appendChild(script);
        } else {
            openShMap(cz);
        }

        function openShMap(coordinates) {
            try {
                var firstProj = "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
                var utm = proj4(firstProj, [coordinates.lon, coordinates.lat]);
                var mapsUrl = 'https://danord.gdi-sh.de/viewer/resources/apps/lbvsh_baustelleninfos/index.html?lang=de&vm=2D&s=2000&c=' + utm[0] + '%2C' + utm[1] + '#/';
                window.open(mapsUrl, '_blank');
            } catch (error) {
                console.error('Fehler bei der Koordinatentransformation:', error);
                alert('Fehler bei der Koordinatenumrechnung');
            }
        }
    });

    // Niedersachsen Button
    var nds_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: DarkSlateGrey;border-radius: 5px;border: 0.5px solid lightgrey; background: white">VMZ Niedersachsen</button>');
    nds_btn.click(function() {
        var mapsUrl = 'https://www.vmz-niedersachsen.de/niedersachsen/';
        window.open(mapsUrl, '_blank');
    });

    // Tab erstellen
    createVMZTab();

    // Buttons zum Tab hinzufügen
    var spacer = '<p style="margin-bottom:5px">';

    $("#sidepanel-vmzde").append('<b><p style="font-family:verdana; font-size:16px">Verkehrsportale der Bundesländer</b></p>');
    $("#sidepanel-vmzde").append(spacer);
    $("#sidepanel-vmzde").append('<p style="font-size:80%">Umgestellt auf WME SDK, danke an hahn112</p>');
    $("#sidepanel-vmzde").append('<p style="font-size:80%">Portale mit grüner Schrift unterstützen die Übergabe der Koordinaten aus dem WME</p>');
    $("#sidepanel-vmzde").append(spacer);
    $("#sidepanel-vmzde").append(bw_btn);
    $("#sidepanel-vmzde").append(spacer);
    $("#sidepanel-vmzde").append(by_btn);
    $("#sidepanel-vmzde").append(spacer);
    $("#sidepanel-vmzde").append(nrw_btn);
    $("#sidepanel-vmzde").append(spacer);
    $("#sidepanel-vmzde").append(rlp_btn);
    $("#sidepanel-vmzde").append(spacer);
    $("#sidepanel-vmzde").append(agmbh_btn);
    $("#sidepanel-vmzde").append(spacer);
    $("#sidepanel-vmzde").append(sh_btn);
    $("#sidepanel-vmzde").append(spacer);
    $("#sidepanel-vmzde").append('<center>=====================</center>');
    $("#sidepanel-vmzde").append(spacer);
    $("#sidepanel-vmzde").append(nds_btn);
    $("#sidepanel-vmzde").append(spacer);
    $("#sidepanel-vmzde").append('<br><br>');

    console.log('VMZ-DE Buttons erfolgreich erstellt');
}

/**
 * Erstellt den VMZ-Tab in der Seitenleiste
 */
function createVMZTab() {
    try {
        var addon = document.createElement('section');
        addon.innerHTML = '<a href="https://github.com/poxonline/WME-VMZDE/blob/main/WMEVMZDE.user.js" target="_blank"><b>Links to VMZ DE Portals </b>v ' + vmzde_version + '</a><p>';

        var userTabs = document.getElementById('user-info');
        var navTabs = document.getElementsByClassName('nav-tabs', userTabs)[0];
        var tabContent = document.getElementsByClassName('tab-content', userTabs)[0];

        // Tab-Navigation erstellen
        var newtab = document.createElement('li');
        newtab.innerHTML = '<a href="#sidepanel-vmzde" data-toggle="tab">VMZ DE</a>';
        navTabs.appendChild(newtab);

        // Tab-Inhalt erstellen
        addon.id = "sidepanel-vmzde";
        addon.className = "tab-pane";
        tabContent.appendChild(addon);

        console.log('VMZ-DE Tab erfolgreich erstellt');
    } catch (error) {
        console.error('Fehler beim Erstellen des VMZ-DE Tabs:', error);
    }
}

// Skript-Initialisierung
console.log('VMZ-DE Skript wird geladen...');
add_buttons();
