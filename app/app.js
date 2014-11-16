'use strict';

angular.module('ordinal', []).filter('ordinal', function() {
  var ordinal = function(input) {
    // Only process numeric values.
    if (isNaN(input) || input === null) return input;

    var s=["th","st","nd","rd"],
    v=input%100;
    return input+(s[(v-20)%10]||s[v]||s[0]);
  }

  return ordinal;
});

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'myApp.uk',
  'myApp.region',
  'myApp.council',
  'regionServices',
  'councilServices',
  'countryServices',
  'ordinal'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/uk/'});
  //console.log("Hash",window.location.hash);

  var map = L.map('map').setView([54.9, -1.5], 6);

  // Settings - to be put into parameter
  var plot_title;
  var plot_name;
  var plot_calc;
  var range;
  var grades;
  var params = window.location.hash.split('/');
  //console.log("Params length",params.length);
  var plot_option = params[params.length-1];
  console.log("Plot option",plot_option);
  //var plot_option = 'gas_person';
  switch(plot_option) {
    case 'elec_house':
        plot_title = 'Electricity use';
        plot_name = 'kWh per meter per day';
        plot_calc = '(f.elec_total / f.elec_meters / 365).toFixed(2)';
        range = 20;
        grades = [0, 40, 50, 60, 70, 80, 90, 100];
        break;
    case 'elec_person':
        plot_title = 'Electricity use';
        plot_name = 'kWh per person per day';
        plot_calc = '(f.elec_total / f.population / 365).toFixed(2)';
        range = 10;
        grades = [0, 40, 50, 60, 70, 80, 90, 100];
        break;
    case 'elec_total':
        plot_title = 'Electricity use';
        plot_name = 'GWh annually';
        plot_calc = '(f.elec_total/1000/1000).toFixed(0)';
        range = 600;
        grades = [0, 40, 50, 60, 70, 80, 90, 100];
        break;
    case 'gas_house':
        plot_title = 'Gas use';
        plot_name = 'kWh per meter per day';
        plot_calc = '(f.gas_total / f.gas_meters / 365).toFixed(2)';
        range = 50;
        grades = [0, 40, 50, 60, 70, 80, 90, 100];
        break;
    case 'gas_person':
        plot_title = 'Gas use';
        plot_name = 'kWh per person per day';
        plot_calc = '(f.gas_total / f.population / 365).toFixed(2)';
        range = 20;
        grades = [0, 40, 50, 60, 70, 80, 90, 100];
        break;
    case 'gas_total':
        plot_title = 'Gas use';
        plot_name = 'GWh annually';
        plot_calc = '(f.gas_total/1000/1000).toFixed(0)';
        range = 1000;
        grades = [0, 40, 50, 60, 70, 80, 90, 100];
        break;
    case 'fuel_poor':
        plot_title = 'Socio-Economic';
        plot_name = '% Fuel Poor';
        plot_calc = '(f.percent_fuel_poor)'; //(f.percent_fuel_poor))';
        range = 10;
        grades = [0, 40, 50, 60, 70, 80, 90, 100];
        break;
    default:  // 'kw_household'
        plot_title = 'Renewables Data';
        plot_name = 'kW per household';
        plot_calc = '(f.kw_per_household).toFixed(2)';
        range = 1;
        grades = [0, 1, 2, 5, 10, 20, 50, 100];
  }

  L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
      '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="http://mapbox.com">Mapbox</a>',
    id: 'examples.map-20v6611k'
  }).addTo(map);

  var RegionData = {}

  $.ajaxSetup({async: false});
  $.getJSON('data/uk', function(data) {
      RegionData = data;
  });
  $.ajaxSetup({async: true});
    //alert("Data var: " + RegionData);


  function getRegionById(id) {
    return _.find(RegionData, {"LA_id": id});
  }
    
  // control that shows state info on hover
  var info = L.control();

  info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
  };

  info.update = function (feature) {
    if (!_.isObject(feature)) {
      return;
    }
    var region = getRegionById(feature.id);
    this._div.innerHTML = '<h4>' + plot_title + '</h4>' +  (feature ?
      '<b>' + feature.properties.name + '</b><br />' + getValue(region) + ' ' + plot_name + '</sup>'
      : 'Hover over a county');
  };

  info.addTo(map);

  // Calculate the value to be displayed - taken from the feature data
  function getValue(f) {
    if (!_.has(f, "kw_per_household"))
    {
      console.warn("Map is missing kw_per_household data");
      return 0;
    }
    //var calc = (f.pv.total+f.wind.total+f.chp.total)/f.households*10000;
    var calc = (f.kw_per_household).toFixed(2);
    return eval(plot_calc);
  }

  // get color depending on population density value
  function getColor(v) {
    var d = v * 100 / range;
    return d > grades[7]  ? '#a63603' :
           d > grades[6]  ? '#d94801' :
           d > grades[5]  ? '#f16913' :
           d > grades[4]  ? '#fd8d3c' :
           d > grades[3]  ? '#fdae6b' :
           d > grades[2]  ? '#fdd0a2' :
           d > grades[1]  ? '#fee6ce' :
                           '#fff5eb';
  }

  function style(feature) {
    if (feature === null) {
      return; 
    }
    var kw_per_household = getValue(getRegionById(feature.id));
    return {
      weight: 0.5,
      opacity: 1,
      color: 'grey',
      //dashArray: '3',
      fillOpacity: 0.7,
      fillColor: getColor(kw_per_household)
    };
  }

  function highlightFeature(e) {

    var layer = e.target;

    layer.setStyle({
      weight: 5,
      color: '#666',
      dashArray: '',
      fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera) {
      layer.bringToFront();
    }

    info.update(layer.feature);
  }

  var geojson;

  function resetHighlight(e) {
    geojson.resetStyle(e.target);
    info.update();
  }

  function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
    window.location.href= '#/council/' + e.target.feature.id;
    // console.log("moved?", $location)
  }

  function onEachFeature(feature, layer) {
    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: zoomToFeature
    });
  }

  geojson = L.geoJson(statesData, {
    style: style,
    onEachFeature: onEachFeature
  }).addTo(map);

  var legend = L.control({position: 'bottomright'});

  legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend'),
      labels = [],
      from, to;

    for (var i = 0; i < grades.length; i++) {
      from = grades[i]/100*range;
      to = grades[i + 1]/100*range;

      labels.push(
        '<i style="background:' + getColor(from + 0.001) + '"></i> ' +
        from + (to ? '&ndash;' + to : '+'));
    }

    div.innerHTML = labels.join('<br>');
    return div;
  };

  legend.addTo(map);

}]);