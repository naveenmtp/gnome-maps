/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
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
 * with GNOME Maps; if not, see <http://www.gnu.org/licenses/>.
 *
 * Author: Jonas Danielsson <jonas@threetimestwo.org>
 */

const Champlain = imports.gi.Champlain;
const Lang = imports.lang;

const Location = imports.location;
const Utils = imports.utils;

const ShapeLayer = new Lang.Class({
    Name: 'ShapeLayer',
    Extends: Champlain.PathLayer,

    _init: function() {
        this.parent();

        this._bbox = new Champlain.BoundingBox();
    },

    get bbox() {
        return this._bbox;
    },

    _addNode: function(coordinate) {
        let [latitude, longitude] = [coordinate[1], coordinate[0]];

        this.add_node(new Champlain.Coordinate({
            latitude: latitude,
            longitude: longitude
        }));
        this._bbox.extend(latitude, longitude);
    },

    addPolygon: function(polygon) {
        polygon.coordinates.forEach(this._addNode.bind(this));
    },

    addLineString: function(lineString) {
        lineString.coordinates.forEach(this._addNode.bind(this));
    }
});
