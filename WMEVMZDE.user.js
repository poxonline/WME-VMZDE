// ==UserScript==
// @name WME-VMZDE
// @description This script create buttons to open several Traffic Managemant Plattforms in Germany, using the WME paramenters where supported.
// @namespace https://github.com/poxonline/WME-VMZDE/blob/main/WMEVMZDE.user.js
// @version 2025.08.02.01
// @updateURL https://github.com/poxonline/WME-VMZDE/raw/main/WMEVMZDE.user.js
// @downloadURL https://github.com/poxonline/WME-VMZDE/raw/main/WMEVMZDE.user.js
// @include https://*.waze.com/editor*
// @include https://*.waze.com/*/editor*
// @grant	none
// @author	pox_online

// ==/UserScript==

// Hint: Script is Based on Code from https://github.com/iridium1-waze/WME-L2DEGEO

// Mini howto:
// 1) install this script as GitHub script
// 2) Click on any of the links includes to open, PL Data will be handed over where supported.

var vmzde_version = "2025.08.02.01";

/* eslint-env jquery */ //we are working with jQuery
//indicate used variables to be assigned
/*global W*/
/*global proj4*/
/*global firstProj*/
/*global newtab*/

//currently not in use, but leaving code as a claculation reference
/*
double[] WGS84toGoogleBing(double lon, double lat) {
  double x = lon * 20037508.34 / 180;
  double y = Math.Log(Math.Tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
  y = y * 20037508.34 / 180;
  return new double[] {x, y};
}
double[] GoogleBingtoWGS84Mercator (double x, double y) {
  double lon = (x / 20037508.34) * 180;
  double lat = (y / 20037508.34) * 180;
  lat = 180/Math.PI * (2 * Math.Atan(Math.Exp(lat * Math.PI / 180)) - Math.PI / 2);
  return new double[] {lon, lat};
}
*/

function getQueryString (link, name)
{
  var pos = link.indexOf(name + '=' ) + name.length + 1;
  var len = link.substr(pos).indexOf('&');
  if (-1 == len) len = link.substr(pos).length;
  return link.substr(pos,len);
}

function CorrectZoom (link)
{
  var found = link.indexOf('livemap');
  return (-1 == found)?13:2;
}

function add_buttons()
{
  if (document.getElementById('user-info') == null) {
    setTimeout(add_buttons, 500);
    console.log('user-info element not yet available, page still loading');
    return;
  }
   if (!W.loginManager.user) {
    W.loginManager.events.register('login', null, add_buttons);
    W.loginManager.events.register('loginStatus', null, add_buttons);
    // Double check as event might have triggered already
    if (!W.loginManager.user) {
      return;
    }
  }

var dummy_noparamter_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: DarkSlateGrey;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Bayern Info</button>');
dummy_noparamter_btn.click(function(){

  var mapsUrl = 'https://www.verkehr.nrw/#' ;
  window.open(mapsUrl,'_blank');
});

var bw_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: Green;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Verkehrsinfo BW</button>');
bw_btn.click(function(){
  var href = $('.WazeControlPermalink a').attr('href');

    var lon = getQueryString(href, 'lon');
    var lat = getQueryString(href, 'lat');
    var zoom = parseInt(getQueryString(href, 'zoom')) + CorrectZoom(href);

    zoom = zoom > 19 ? 19 : zoom;
    zoom = zoom - 10;
  var mapsUrl = 'https://verkehrsinfo-bw.de/?zoom='+zoom+'&fullscreen=false&center='+ lat +','+ lon +'&layers=Beschriftung,Verkehrslage,Reisezeitverlust,Verkehrsmeldungen,Baustellen,Baustellenverl%C3%A4ufe,Baustellenumleitungen,Verkehrskameras,Wechselwegweisung,Betriebsmeldungen&suchtext=&openebenencontrol=false' ;
       
  window.open(mapsUrl,'_blank');
});
  
var by_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: Green;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Bayern Info</button>');
by_btn.click(function(){
    var href = $('.WazeControlPermalink a').attr('href');

    var lon = getQueryString(href, 'lon');
    var lat = getQueryString(href, 'lat');
    var west = lat-0.1;
    var ost = lat+0.1;
    var nord = lot-0.1;
    var sued = lot+0.1;
    var zoom = parseInt(getQueryString(href, 'zoom')) + CorrectZoom(href);

    zoom = zoom > 19 ? 19 : zoom;
    zoom = zoom - 3;
  var mapsUrl = 'https://www.bayerninfo.de/de/karte?bounds=' + nord + '%2C' + west + '%2C' + sued + '%2C' + ost + '&traffic=all';
       
  window.open(mapsUrl,'_blank');

});

var nrw_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: Green;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Verkehr.NRW</button>');
nrw_btn.click(function(){
    var href = $('.WazeControlPermalink a').attr('href');

    var lon = getQueryString(href, 'lon');
    var lat = getQueryString(href, 'lat');
    var zoom = parseInt(getQueryString(href, 'zoom')) + CorrectZoom(href);

    zoom = zoom > 19 ? 19 : zoom;
  var mapsUrl = 'https://www.verkehr.nrw/web/vipnrw/karte/?center='+ lat +','+ lon + '&zoom=' + zoom +'&car=true&publicTransport=false&bike=false&layer=Verkehrslage,Parken,Webcams,Verkehrsmeldungen,Baustellen&highlightRoute=false' ;
       
  window.open(mapsUrl,'_blank');

});

var agmbh_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: Green;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Verkehr.Autobahn</button>');
agmbh_btn.click(function(){
    var href = $('.WazeControlPermalink a').attr('href');

    var lon = getQueryString(href, 'lon');
    var lat = getQueryString(href, 'lat');
    var zoom = parseInt(getQueryString(href, 'zoom')) + CorrectZoom(href);

    zoom = zoom > 19 ? 19 : zoom;
  var mapsUrl = 'https://verkehr.vz-deutschland.de/?lat='+ lat +'&lon='+ lon + '&zoom=' + zoom +'&layer=raststellen,baustellen,stau,verkehrsmeldungen' ;

  window.open(mapsUrl,'_blank');

});  
  
var rlp_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: Green;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Mobilitätsatlas Rheinland-Pfalz</button>');
rlp_btn.click(function(){
    var href = $('.WazeControlPermalink a').attr('href');

    var lon = getQueryString(href, 'lon');
    var lat = getQueryString(href, 'lat');
    var zoom = parseInt(getQueryString(href, 'zoom')) + CorrectZoom(href);

    zoom = zoom > 19 ? 19 : zoom;
    zoom = zoom - 3;
  var mapsUrl = 'https://verkehr.rlp.de/#/?center='+ lat +','+ lon + '&zoom=' + zoom ;
       
  window.open(mapsUrl,'_blank');

});

var sh_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: Green;border-radius: 5px;border: 0.5px solid lightgrey; background: white">Mobilitätsatlas Schleswig-Holstein</button>');
    sh_btn.click(function(){

        var href = $('.WazeControlPermalink a').attr('href');

        var lon = parseFloat(getQueryString(href, 'lon'));
        var lat = parseFloat(getQueryString(href, 'lat'));

        // Using Proj4js to transform coordinates. See http://proj4js.org/
        var script = document.createElement("script"); // dynamic load the library from https://cdnjs.com/libraries/proj4js
        script.type = 'text/javascript';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.4.4/proj4.js';
        document.getElementsByTagName('head')[0].appendChild(script); // Add it to the end of the head section of the page (could change 'head' to 'body' to add it to the end of the body section instead)
        script.onload = popAtlas; //wait till the script is downloaded & executed
        function popAtlas() {

            //just a wrapper for onload
            if (proj4) {
                firstProj= "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
                var utm = proj4(firstProj,[lon,lat]);


                var mapsUrl = 'https://danord.gdi-sh.de/viewer/resources/apps/lbvsh_baustelleninfos/index.html?lang=de&vm=2D&s=2000&c='+utm[0]+'%2C'+utm[1]+'#/';
                //var mapsUrl = 'https://danord.gdi-sh.de/viewer/resources/apps/lbvsh_baustelleninfos/index.html?lang=de&vm=2D&s=2000&c='+utm[0]+'%2C'+utm[1]+'#/';
                //var mapsUrl = 'https://danord.gdi-sh.de/viewer/resources/apps/lbvsh_baustelleninfos/index.html?lang=de&center='+utm[0]+'%2C'+utm[1]+'#/';
                //var mapsUrl = 'https://danord.gdi-sh.de/viewer/resources/apps/lbvsh_baustelleninfos/index.html?lang=de&center='+utm[0]+','+utm[1]+'&zoom='+ zoom;
                //var mapsUrl = 'https://danord.gdi-sh.de/viewer/resources/apps/lbvsh_baustelleninfos/index.html?lang=de#'+utm[0]+'%2C'+utm[1]+'#/';
                window.open(mapsUrl,'_blank');
            }
        }
});
  
var nds_btn = $('<button style="width: 285px;height: 24px; font-size:85%;color: DarkSlateGrey;border-radius: 5px;border: 0.5px solid lightgrey; background: white">VMZ Niedersachsen</button>');
nds_btn.click(function(){

  var mapsUrl = 'https://www.vmz-niedersachsen.de/niedersachsen/' ;
  window.open(mapsUrl,'_blank');
});
    
  var spacer = '<p style="margin-bottom:5px">'
  
// create the content of the side-panel tab
var addon = document.createElement('section');
addon.id = "vmzde-addon";

addon.innerHTML =
    '<a href="https://github.com/poxonline/WME-VMZDE/blob/main/WMEVMZDE.user.js" target="_blank"><b>Links to VMZ DE Portals </b>v ' + vmzde_version + '</a><p>';

//alert("Create Tab");
var userTabs = document.getElementById('user-info');
var navTabs = document.getElementsByClassName('nav-tabs', userTabs)[0];
var tabContent = document.getElementsByClassName('tab-content', userTabs)[0];

var newtab = '';

newtab = document.createElement('li');
newtab.innerHTML = '<a href="#sidepanel-vmzde" data-toggle="tab">VMZ DE</a>';
navTabs.appendChild(newtab);

addon.id = "sidepanel-vmzde";
addon.className = "tab-pane";
tabContent.appendChild(addon);

$("#sidepanel-vmzde").append('<b><p style="font-family:verdana"; "font-size:16px">Verkehrsportale der Bundesländer</b></p>'); // ■■■■■ "Verkehrsportale der Bundesländer" ■■■■■
$("#sidepanel-vmzde").append(spacer);
$("#sidepanel-vmzde").append('<p style="font-size:80%">Portale mit grüner Schrift unterstützen die Übergabe der Koordinaten aus dem WME</p>');
$("#sidepanel-vmzde").append(spacer);
$("#sidepanel-vmzde").append(bw_btn); // Verkehrsinfo BW - Mit Übergabe
$("#sidepanel-vmzde").append(spacer);
$("#sidepanel-vmzde").append(by_btn); // Bayerinfo - Mit Übergabe
$("#sidepanel-vmzde").append(spacer);
$("#sidepanel-vmzde").append(nrw_btn); // Nordrhein-Westfalen - Verkehr.NRW mit Übergabe
$("#sidepanel-vmzde").append(spacer);
$("#sidepanel-vmzde").append(rlp_btn); // Rheinland-Pfalz - Mobilitätsatlas mit Übergabe
$("#sidepanel-vmzde").append(spacer);
$("#sidepanel-vmzde").append(agmbh_btn); // Verkehr-Autobahn Button
$("#sidepanel-vmzde").append(spacer);
$("#sidepanel-vmzde").append(sh_btn); // Schleswig-Holstein - Mobilitätsatlas mit Übergabe
$("#sidepanel-vmzde").append(spacer);
$("#sidepanel-vmzde").append('<center>=====================</center>');
$("#sidepanel-vmzde").append(spacer);
$("#sidepanel-vmzde").append(nds_btn); // VMZ Niedersachsen - Ohne Übergabe
$("#sidepanel-vmzde").append(spacer);
$("#sidepanel-vmzde").append('<br><br>');
}
add_buttons();
