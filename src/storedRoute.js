/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
 * Copyright (c) 2015 Jonas Danielsson
 *
 * GNOME Maps is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * GNOME Maps is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with GNOME Maps; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Jonas Danielsson <jonas@threetimestwo.org>
 */

const Champlain = imports.gi.Champlain;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const Application = imports.application;
const Place = imports.place;
const Route = imports.route;
const RouteQuery = imports.routeQuery;

const StoredRoute = new Lang.Class({
    Name: 'StoredRoute',
    Extends: Place.Place,

    _init: function(params) {
        let route = params.route;
        delete params.route;

        this._transportation = params.transportation;
        delete params.transportation;

        this.route = new Route.Route();
        this.route.update({ path: route.path,
                            turnPoints: route.turnPoints,
                            distance: route.distance,
                            time: route.time,
                            bbox: route.bbox });

        let places = params.places;
        delete params.places;
        params.name = places[0].name + ' → ' + places[places.length -1].name;

        this.places = [];
        this._containsCurrentLocation = false;
        places.forEach((function(place) {
            if (place === Application.geoclue.place)
                this._containsCurrentLocation = true;

            this.places.push(new Place.Place({ place: place }));
        }).bind(this));

        this.parent(params);
    },

    get viaString() {
        return this.places.map(function(place) {
            return place.name;
        }).join(' → ');
    },

    get transportation() {
        return this._transportation;
    },

    get icon() {
        let transport = RouteQuery.Transportation;
        let icon = Gio.Icon.new_for_string('route-button-symbolic');

        switch(this._transportation) {
        case transport.PEDESTRIAN:
            icon = Gio.Icon.new_for_string('route-pedestrian-symbolic');
            break;
        case transport.CAR:
            icon = Gio.Icon.new_for_string('route-car-symbolic');
            break;
        case transport.BIKE:
            icon = Gio.Icon.new_for_string('route-bike-symbolic');
            break;
        }

        return icon;
    },

    get uniqueID() {
        return this._transportation + '-' + this.places.map(function(place) {
            return [place.osm_type, place.osm_id].join('-');
        }).join('-');
    },

    get containsCurrentLocation() {
        return this._containsCurrentLocation;
    },

    get containsNull() {
        let hasNull = false;

        for (let p = 0; p < this.places.length; p++) {
            if (!this.places[p].name) {
                hasNull = true;
                break;
            }
        }
        return hasNull;
    },

    toJSON: function() {
        let turnPoints = this.route.turnPoints.map(function(turnPoint) {
            let coordinate = { latitude: turnPoint.coordinate.latitude,
                               longitude: turnPoint.coordinate.longitude };
            return { coordinate: coordinate,
                     type: turnPoint.type,
                     distance: turnPoint.distance,
                     instruction: turnPoint.instruction };
        });
        let bounding_box = { top: this.route.bbox.top,
                             bottom: this.route.bbox.bottom,
                             left: this.route.bbox.left,
                             right: this.route.bbox.right };

        let path = this.route.path.map(function(coordinate) {
            return { latitude: coordinate.latitude,
                     longitude: coordinate.longitude };
        });

        let route = { path: path,
                      turnPoints: turnPoints,
                      distance: this.route.distance,
                      time: this.route.time };

        let places = this.places.map(function(place) {
            return place.toJSON();
        });

        return { id: -1,
                 transportation: this._transportation,
                 route: route,
                 places: places };
    }
});

StoredRoute.fromJSON = function(obj) {
    let props;
    let places = [];
    let route;
    let transportation = null;

    for (let key in obj) {
        let prop = obj[key];

        switch(key) {
        case 'transportation':
            transportation = prop;
            break;

        case 'route':
            route = new Route.Route();
            prop.path = prop.path.map(function(coordinate) {
                let lat = coordinate.latitude;
                let lon = coordinate.longitude;
                return new Champlain.Coordinate({ latitude: lat,
                                                  longitude: lon });
            });
            prop.turnPoints = prop.turnPoints.map(function(turnPoint) {
                let lat = turnPoint.coordinate.latitude;
                let lon = turnPoint.coordinate.longitude;

                let coordinate = new Champlain.Coordinate({ latitude: lat,
                                                            longitude: lon });

                return new Route.TurnPoint({
                    coordinate: coordinate,
                    type: turnPoint.type,
                    distance: turnPoint.distance,
                    instruction: turnPoint.instruction
                });
            });
            route.update(prop);
            break;

        case 'places':
            prop.forEach(function(p) {
                places.push(Place.Place.fromJSON(p));
            });
            break;
        }
    }
    return new StoredRoute({ transportation: transportation,
                             route: route,
                             places: places });
};
