Overview
--------

A [demo is here](http://desolate-garden-4742.herokuapp.com/).

TODO
====

We're currently migrating from
[Jazzhub](https://hub.jazz.net/project/arburns/C4D_BikeSafetyApp/overview) to
github. At the moment we don't have the `Issues` feature enabled in github. In
the meantime the issues are broken down by 'User Story':

 * Ability to let users add their own accidents:
   * Add time/date of accident.
   * Add a dialog asking the user what they want to do after a new accident has
     been added.

Bicyclist User Stories:
 * As a cyclist I'd like a safe route from X to Y.
    * Add the ability to route trips.
 * As a cyclist, I want to know where the dangerous streets are.

Policymaker User Stories:
 * As a policy maker, I would like to see summary statistics of filtered data.
    * Add pie chart of metric accidents are colored by.
    * Add a way to filter by accident metrics: We were thinking this would involve filtering the dataset thats used to compute the # accidents on any particular route. Ideally the map would let you pick one specific metric (say, if you color by Weather, and you pick 'clear' only accidents on clear days happened - or the reverse).
    * Implement a date range filter for the map view.
 * As a policy maker, I want 'dangerous paths' to be meaningful: we're
   interested in normalizing the data by amount of traffic (bicycle and
   vehicular).

Run
===

    npm install
    npm start

TopoJSON
========

The frontend application uses [TopoJSON](https://github.com/mbostock/topojson)
to render paths. If the source geojson is updated then the topojson needs to be
updated too.

To convert a geojson file to topojson, do:

    ./node_modules/.bin/topojson -p BIKE_FACIL --id-property OBJECTID_12 html/src/data/durham-bike-lanes.geojson > html/src/data/durham-bike-lanes.topojson

