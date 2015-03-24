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
   * Jump to the map after entering a new accident.
   * The map data doesn't update when you add a new user data point.
   * Scrolling is not working on the add accident page (maybe disabled).

Bicyclist User Stories:
 * As a cyclist I'd like a safe route from X to Y.
    * Add the ability to route trips.
 * As a cyclist, I want to know where the dangerous streets are.

Policymaker User Stories:
 * As a policy maker, I would like to see summary statistics of filtered data.
    * Add pie chart of metric accidents are colored by.
    * Add a way to filter by accident metrics: We were thinking this would involve filtering the dataset thats used to compute the # accidents on any particular route. Ideally the map would let you pick one specific metric (say, if you color by Weather, and you pick 'clear' only accidents on clear days happened - or the reverse).
    * Implement a date range filter for the map view.
    * Clean up each of the crash metrics: get rid of blank data, standardize the
      'missing' value for all metrics (missing vs unknown).
    * Make the key show ALL POSSIBLE values even if they aren't on the map --
      for instance 'driver drunk' shows up as no/missing instead of no/yes/missing.
    * Make metrics that are ordinal use an ordinal color key (eg, driver speed).
    * For boolean style metrics pick better colors (and make it the SAME for all
      booleans).
    * Make a consistent color across all metrics for the missing value (also
      'other' -- Jeremy suggests hard coding (I agree!)).
    * Sort the metric values.
 * As a policy maker, I want 'dangerous paths' to be meaningful: we're
   interested in normalizing the data by amount of traffic (bicycle and
   vehicular).

Misc:
 * Our crash data is old! Contact NCDOT about getting new data.
 * Make a 'state wide' mode that shows crashes on the whole state.

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

