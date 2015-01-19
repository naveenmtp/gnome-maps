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

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const Application = imports.application;

const Response = {
    SUCCESS: 0,
    CANCELLED: 1,
};

const OSMEditDialog = new Lang.Class({
    Name: 'OSMEditDialog',
    Extends: Gtk.Dialog,
    Template: 'resource:///org/gnome/Maps/ui/osm-edit-dialog.ui',
    InternalChildren: [ 'cancelButton',
			'saveButton',
			'stack',
		        'nameEntry',
		        'commentEntry',
		        'sourceEntry'],
    
    _init: function(params) {
	this._place = params.place;
	delete params.place;

	// This is a construct-only property and cannot be set by GtkBuilder
        params.use_header_bar = true;

	this.parent(params);

	this._cancellable = new Gio.Cancellable();
	this._cancellable.connect((function() {
            this.response(Response.CANCELLED);
        }).bind(this));

        this.connect('delete-event', (function() {
            this._cancellable.cancel();
        }).bind(this));

	this._isEditing = false;
	this._saveButton.connect('clicked', this._onSaveClicked.bind(this));
	
	Application.osmEditManager.fetchObject(this._place,
					       this._fetchOSMObjectCB.bind(this),
					       this._cancellable);
    },

    _onSaveClicked: function() {
	if (this._isEditing) {
	    // switch to the upload view
	    this._stack.set_visible_child_name('upload');
	    this._saveButton.label = _("Upload");
	    this._isEditing = false;
	} else {
	    // upload data to OSM
	    Application.osmEditManager.uploadObject(this._osmObject,
						    this._commentEntry.text,
						    this._sourceEntry.text,
						    this._uploadOSMObjectCB);
	}
    },
    
    _fetchOSMObjectCB: function(success, status, data) {
	if (success) {
	    this._loadOSMData(data);
	} else {
	    this._showError(status);
	}
    },

    _loadOSMData: function(data) {
	this._osmObject = data;
	this._isEditing = true;
	this._initEditWidgets();
	this._stack.set_visible_child_name('editor');
    },

    _uploadOSMObjectCB: function(success, status) {
	// TODO: show error dialog (might need more info from the connection layer)
	// TODO: close the dialog on sucess
    },

    _showError: function(status) {

    },

    _initEditWidgets: function() {
	// TODO: for now, just use a static name text entry
	let name = this._osmObject.getTag('name');

	if (name)
	    this._nameEntry.text = this._osmObject.getTag('name');

	this._nameEntry.connect('changed', (function() {
	    this._osmObject.setTag('name', this._nameEntry.text);
	    this._saveButton.sensitive = true;
	}).bind(this));
    }
});
