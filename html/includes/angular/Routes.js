var OCEM = angular.module('RideOrDie', ['ngRoute', 'ui.bootstrap', 'ui.mask', 'google-maps'.ns()]);

OCEM.controller('indexCtlr', ['$scope','$http','$q',indexCtrl]);


OCEM.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $locationProvider.html5Mode(true);
        $routeProvider
        .when('/', {
            templateUrl: '/partials/Index',
            controller: 'indexCtlr'
        })
        .otherwise({
            redirectTo: '/'
        });
  }]);

OCEM.config(['$httpProvider', function ($httpProvider) {
    $httpProvider.interceptors.push(function() {
        return {
            request: function(request) {
                if (request.method === 'GET') {
                    if (request.url.indexOf('.') === -1) {
                        var sep = request.url.indexOf('?') === -1 ? '?' : '&';
                        request.url = request.url + sep + 'cacheBust=' + new Date().getTime();
                    }
                }
                return request;
            }
        };
    });
}]);


function indexCtrl($scope, $http, $q) {
    $scope.clickedFeature = "";
    $scope.marker = false;
    var wasLoaded = false;

    $('#pleaseWaitDialog').modal('show');
    $('#modalStatus').text("Loading Google Maps...");

    var routeInfo = $('#route_info');
    routeInfo.dialog({ autoOpen: false, position: { my: "right bottom", at: "right-14 bottom-28", of: ".angular-google-map-container" } }); // Initialize dialog plugin

    $scope.map = {
        center: {latitude: 35.9886, longitude: -78.9072},
        zoom: 12,
        options: {
            minZoom: 12,
            maxZoom: 20,
            styles: [
                {
                    featureType: "all",
                    elementType: "labels",
                    stylers: [ { visibility: "off" }]
                }
            ]
        },
        events: {
            tilesloaded: function (map) {
                if (wasLoaded) {
                  return;
                }
                $('#modalStatus').text("Loading Bike Routes...");
                $scope.dataSet = [];
                var dataset = null;
                var roads = null;

                $('#modalStatus').text("Retrieving & Processing Crash Data...");
                $http.get('/data/durham.json').then(function(result) {
                    dataset = result.data;
                    return $http.get("/data/durham-bike-lanes.topojson");
                }).then(function(result) {
                    roads = topojson.feature(result.data,result.data.objects['durham-bike-lanes']).features;
                }).then(function() {
                    var path = d3.geo.path();
                    roads.forEach(function(arc) {
                        arc.wrecks = [];
                        arc.severityCount = 0;
                    });
                    $scope.highestWrecks = 0;
                    roads.forEach(function(arc) {
                        var arcFound = false;
                        arc.geometry.coordinates.forEach(function(point) {
                            dataset.forEach(function(accident) {
                                var dist = calcCrow(
                                    +accident.latitude,
                                    +accident.longitude,
                                    point[1],
                                    point[0]);
                                if (dist < 0.09 && !arcFound) { //300 feet
                                    arcFound = true;
                                    arc.severityCount++;
                                    if (arc.severityCount > $scope.highestWrecks) {
                                        $scope.highestWrecks = arc.severityCount;
                                        $scope.highestWreckLoc = accident;
                                    }
                                    arc.wrecks.push(accident);
                                    $scope.dataSet.push(accident);
                                }
                            });
                        });
                    });
                    map.data.forEach(function(feature) {
                        feature.setProperty("severity", parseFloat((feature.getProperty('severityCount'))/$scope.highestWrecks));
                    });

                    map.data.addListener('click', function(event){
                        $scope.clickedFeature = event.feature;
                        var routeInfo = $('#route_info');
                        $('.ui-dialog-titlebar-close').html("X");
                        $('#wreck_count').text(event.feature.getProperty('severityCount'));
                        routeInfo.dialog( "open" ); // Initialize dialog plugin
                        $scope.$apply();
                        routeInfo.dialog( "option", "position", { my: "right bottom", at: "right-14 bottom-28", of: ".angular-google-map-container" } );
                    });
                }).then(function() {
                    var overlay = new google.maps.OverlayView();
                    // TODO as you zoom in, the stroke should grow a
                    // bit.
                    overlay.onAdd = function() {
                        var svg = d3.select(this.getPanes().overlayLayer)
                            .append('div')
                                .attr('class','bikeOverlay')
                            .append('svg')
                                .attr('class','bikeSvg');
                        var roadGroup = svg.append('g')
                            .attr('class','roads');
                        var accidentGroup = svg.append('g')
                            .attr('class','accidents');

                        overlay.draw = function() {
                            var overlayProjection = this.getProjection();
                            var zoom = this.getMap().getZoom();

                            var d3Projection = function(gmapCoord) {
                                var googleCoordinates = new google.maps.LatLng(gmapCoord[1], gmapCoord[0]);
                                var pixelCoordinates = overlayProjection.fromLatLngToDivPixel(googleCoordinates);
                                return [pixelCoordinates.x + 4000 , pixelCoordinates.y + 4000];
                            };
                            var path = d3.geo.path().projection(d3Projection);

                            var color = d3.scale.linear()
                                .domain([0,1,$scope.highestWrecks])
                                .range(["#637939","#fd8d3c","#d62728"]);
                            var opacity = d3.scale.linear()
                                .domain([0,$scope.highestWrecks])
                                .range([0.5,1]);
                            roadGroup.selectAll('path')
                                .data(roads, function(d) { return d.id; })
                                .attr('d',path)
                                .attr('stroke-width', (zoom-10) +'px')
                                .enter().append('svg:path')
                                .attr('d',path)
                                .attr('opacity', function(d, i) {
                                  return opacity(d.severityCount);
                                })
                                .attr('stroke', function(d, i) {
                                  return color(d.severityCount);
                                })
                                .attr('stroke-width', (zoom-10) +'px')
                                .attr('class','road');

                            // find all the unique values in the array
                            var accidentTypes = d3.set(dataset.map(function(d) {
                              return d.bike_injur;
                            })).values();

                            var injuryColors = d3.scale.category10();
                            var eachCircle = function(d) {
                                var p = d3Projection([d.longitude, d.latitude]);
                                var s = d3.select(this);
                                s.attr('cx', p[0]);
                                s.attr('cy', p[1]);
                                s.attr('fill', injuryColors(accidentTypes.indexOf(d.bike_injur)));
                                s.attr('r', (zoom-10));
                            };
                            accidentGroup.selectAll('circle')
                                .data(dataset, function(d) { return d.objectid; })
                                .each(eachCircle)
                                .enter().append('svg:circle')
                                .each(eachCircle)
                                .attr('class','accident');
                        };
                    };
                    overlay.setMap(map);
                }).then(function() {
                    // TODO update the legend
                    wasLoaded = true;
                    $('#pleaseWaitDialog').modal('hide');
                }).catch(function(err) {
                    console.error(err);
                });
            }
        }
    };
}

//This function takes in latitude and longitude of two location and returns the distance between them as the crow flies (in km)
function calcCrow(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = toRad(lat2-lat1);
    var dLon = toRad(lon2-lon1);
    var lat1 = toRad(lat1);
    var lat2 = toRad(lat2);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d;
}

// Converts numeric degrees to radians
function toRad(Value) {
    return Value * Math.PI / 180;
}

function getColor(value) {
    //value from 0 to 1
    var hue=(((1-value)*120));
    if (hue < 0)
        hue = 0;
    return ["hsl(",hue,",100%,50%)"].join("");
}
