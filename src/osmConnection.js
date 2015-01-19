/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
 * Copyright (c) 2015 Marcus Lundblad
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
 * Author: Marcus Lundblad <ml@update.uu.se>
 */

const _ = imports.gettext.gettext;

const Utils = imports.utils;

const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Maps = imports.gi.GnomeMaps;
const Soup = imports.gi.Soup;

const BASE_URL = 'https://api.openstreetmap.org/api';
const TEST_BASE_URL = 'http://api06.dev.openstreetmap.org/api';
const API_VERSION = '0.6';

const OSMConnection = new Lang.Class({
    Name: 'OSMConnection',

    _init: function(params) {
	this._session = new Soup.Session();

	// TODO: stopgap to supply username/password
	// to use with HTTP basic auth, should be
	// replaced with OAUTH and real settings or GOA account
	this._username = GLib.getenv('OSM_USERNAME');
	this._password = GLib.getenv('OSM_PASSWORD');

	let useLiveApi = GLib.getenv('OSM_USE_LIVE_API');

	// for now use the test API unless explicitly
	// set to use the live one
	if (useLiveApi == 'yes')
	    this._useTestApi = false;
	else
	    this._useTestApi = true;

	this._session.connect('authenticate', this._authenticate.bind(this));
	
	Maps.osm_init();
    },

    get useTestAPI() {
	return this._useTestApi;
    },

    getOSMObject: function(type, id, callback, cancellable) {
	let url = this._getQueryUrl(type, id);
	let uri = new Soup.URI(url);
	let request = new Soup.Message({ method: 'GET',
					 uri: uri });

	cancellable.connect((function() {
	    this._session.cancel_message(request, Soup.STATUS_CANCELLED);
	}).bind(this));
	
	this._session.queue_message(request, (function(obj, message) {
	    if (message.status_code !== Soup.Status.OK) {
                callback(false, message.status_code, null);
                return;
            }

            Utils.debug ('data received: ' + message.response_body.data);

	    // override object type to use the mock object if using the test API
	    if (this._useTestApi)
		type = GLib.getenv('OSM_MOCK_TYPE');
	    
	    let object = this._parseXML(type, message.response_body);

	    if (object == null)
		callback(false, message.status_code, null, type);
	    else
		callback(true,
			 message.status_code,
			 object, type);
        }).bind(this));
    },
    
    _getQueryUrl: function(type, id) {
	if (this._useTestApi) {
	    // override object type and ID from a mock object
	    // since the object we get from Nominatim and Overpass
	    // doesn't exist in the test OSM environment
	    type = GLib.getenv('OSM_MOCK_TYPE');
	    id = GLib.getenv('OSM_MOCK_ID');
	}
	
	return this._getBaseUrl() + '/' + API_VERSION + '/' + type + '/' + id;
    },

    _getBaseUrl: function() {
	return this._useTestApi ? TEST_BASE_URL : BASE_URL;
    },

    _parseXML: function(type, body) {
	let object;
	
	switch (type) {
	case 'node':
	    object = Maps.osm_parse_node(body.data, body.length);
	    break;
	case 'way':
	    object = Maps.osm_parse_way(body.data, body.length);
            break;
        case 'relation':
            object = Maps.osm_parse_relation(body.data, body.length);
	    break;
        default:
            GLib.error('unknown OSM type: ' + type);
	}

	return object;
    },

    openChangeset: function(comment, source, callback) {
	let changeset =
	    Maps.OSMChangeset.new(comment, source, 'gnome-maps ' + pkg.version);
	let xml = changeset.serialize();

	Utils.debug('about open changeset:\n' + xml + '\n');

	let url = this._getOpenChangesetUrl();
	let uri = new Soup.URI(url);
	let msg = new Soup.Message({ method: 'PUT',
					 uri: uri });
	msg.set_request('text/xml', Soup.MemoryUse.COPY, xml, xml.length);
	
	this._session.queue_message(msg, (function(obj, message) {
	    if (message.status_code !== Soup.Status.OK) {
                callback(false, message.status_code, null);
                return;
            }

	    let changesetId = GLib.ascii_strtoull (message.response_body.data,
						   '', 10);
	    callback(true, message.status_code, changesetId);
	    
        }));
    },

    uploadObject: function(object, type, changeset, callback) {
	object.changeset = changeset;

	let xml = object.serialize();

	Utils.debug('about to upload object:\n' + xml + '\n');

	let url = this._getCreateOrUpdateUrl(object, type);
	let uri = new Soup.URI(url);
	let msg = new Soup.Message({ method: 'PUT',
				     uri: uri });
	msg.set_request('text/xml', Soup.MemoryUse.COPY, xml, xml.length);

	this._session.queue_message(msg, (function(obj, message) {
	    if (message.status_code !== Soup.Status.OK) {
                callback(false, message.status_code, null);
                return;
            }

	    callback(true, message.status_code, message.response_body.data);
        }));
	
    },

    closeChangeset: function(changesetId, callback) {
	let url = this._getCloseChangesetUrl(changesetId);
	let uri = new Soup.URI(url);
	let msg = new Soup.Message({ method: 'PUT',
				     uri: uri });

	this._session.queue_message(msg, (function(obj, message) {
	    if (message.status_code !== Soup.Status.OK) {
                callback(false, message.status_code);
                return;
            }

	    callback(true, message.status_code);
        }));
    },

    _getOpenChangesetUrl: function() {
	return this._getBaseUrl() + '/' + API_VERSION + '/changeset/create';
    },

    _getCloseChangesetUrl: function(changesetId) {
	return this._getBaseUrl() + '/' + API_VERSION + '/changeset/' +
	    changesetId + '/close';
    },
 
    _getCreateOrUpdateUrl: function(object, type) {
	if (object.id)
	    return this._getBaseUrl() + '/' + API_VERSION + '/' + type +
	           '/' + object.id;
	else
	    return this._getBaseUrl() + '/' + API_VERSION + '/' + type +
	           '/create';
    },

    _authenticate: function(session, msg, auth, retrying, user_data) {
	if (retrying)
	    session.cancel_message(msg, Soup.Status.UNAUTHORIZED);

	auth.authenticate(this._username, this._password);
    }
});

/*
 * Gets a status message (usually for an error case)
 * to show for a given OSM server response.
 */
function getStatusMessage(statusCode) {
    switch (statusCode) {
    case Soup.Status.IO_ERROR:
    case Soup.Status.UNAUTHORIZED:
	// setting the status in session.cancel_message still seems
	// to always give status IO_ERROR
	return _("Incorrect user name or password");
    case Soup.Status.OK:
	return _("Success");
    case Soup.Status.BAD_REQUEST:
	return _("Bad request");
    case Soup.Status.NOT_FOUND:
	return _("Object not found");
    case Soup.Status.CONFLICT:
	return _("Conflict, someone else has just modified the object");
    case Soup.Status.GONE:
	return _("Object has been deleted");
    case Soup.Status.PRECONDITION_FAILED:
	return _("Way or relation refers to non-existing children");
    default:
	return null;
    }
}

