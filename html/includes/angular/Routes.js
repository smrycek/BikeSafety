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
            minZoom: 12
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
                    $scope.highestWrecks = 0;
                    roads.forEach(function(road) {
                        // TODO instead use the topojson data that D3 is using.
                        //
                        // The data here should be thought of as pre-computed,
                        // because it will be. When it is pre-computed.
                        //
                        // There should be a set of two points - those that are
                        // the road (with color/value information), and then the
                        // points that weren't included (too far away). Those
                        // are interesting too in that they communicate where a
                        // bike path is lacking - where there SHOULD be a bike
                        // path (bike path desert).
                        var c = path.centroid(roads[0]);
                        // console.log("|dataset[0] = "+ JSON.stringify(dataset[0]));
                        console.log("|d = "+ d3.geo.distance(c,[dataset[0].longitude,dataset[0].latitude]));
                        [].forEach(function(feature) {
                            // var featureFound = false;
                            // feature.getGeometry().getArray().forEach(function(coord) {
                            //     var dist = calcCrow(coord.lat(), coord.lng(), item.location.latitude, item.location.longitude);
                            //     if (dist < 0.04572 && !featureFound) { //150 feet
                            //         featureFound = true;
                            //         feature.setProperty("severityCount", parseFloat(feature.getProperty('severityCount'))+1);
                            //         if (parseFloat(feature.getProperty('severityCount')) > $scope.highestWrecks) {
                            //             $scope.highestWrecks = parseFloat(feature.getProperty('severityCount'));
                            //             $scope.highestWreckLoc = item;
                            //         }
                            //         feature.wrecks.push(item);
                            //         $scope.dataSet.push(item);
                            //     }
                            // });
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

                            var d3Projection = function(gmapCoord) {
                                var googleCoordinates = new google.maps.LatLng(gmapCoord[1], gmapCoord[0]);
                                var pixelCoordinates = overlayProjection.fromLatLngToDivPixel(googleCoordinates);
                                return [pixelCoordinates.x + 4000 , pixelCoordinates.y + 4000];
                            };
                            var path = d3.geo.path().projection(d3Projection);

                            roadGroup.selectAll('path')
                                .data(roads, function(d) { return d.id; })
                                .attr('d',path)
                                .enter().append('svg:path')
                                .attr('d',path)
                                .attr('class','road');

                            var eachCircle = function(d) {
                                var p = d3Projection([d.longitude, d.latitude]);
                                var s = d3.select(this);
                                s.attr('cx', p[0]);
                                s.attr('cy', p[1]);
                            };
                            accidentGroup.selectAll('circle')
                                .data(dataset, function(d) { return d.objectid; })
                                .each(eachCircle)
                                .enter().append('svg:circle')
                                .each(eachCircle)
                                .attr('r',5)
                                .attr('class','accident');
                        };
                    };
                    overlay.setMap(map);
                }).then(function() {
                    wasLoaded = true;
                    $('#pleaseWaitDialog').modal('hide');
                }).catch(function(err) {
                    console.error(err);
                });
            }
        }
    };
}

function getColor(value) {
    //value from 0 to 1
    var hue=(((1-value)*120));
    if (hue < 0)
        hue = 0;
    return ["hsl(",hue,",100%,50%)"].join("");
}
