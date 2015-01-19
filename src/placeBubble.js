/* -*- Mode: JS2; indent-tabs-mode: nil; js2-basic-offset: 4 -*- */
/* vim: set et ts=4 sw=4: */
/*
 * Copyright (c) 2014 Damián Nohales
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
 * with GNOME Maps; if not, see <http://www.gnu.org/licenses/>.
 *
 * Author: Damián Nohales <damiannohales@gmail.com>
 */

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Format = imports.format;
const Lang = imports.lang;

const Application = imports.application;
const ContactPlace = imports.contactPlace;
const MapBubble = imports.mapBubble;
const OSMConnection = imports.osmConnection;
const OSMUtils = imports.osmUtils;
const Overpass = imports.overpass;
const Place = imports.place;
const PlaceFormatter = imports.placeFormatter;
const PlaceStore = imports.placeStore;
const Utils = imports.utils;

// enumeration representing
// the different OSM editing
// field types
const EditFieldType = {
    // plain text
    TEXT: 0,
    // integer value (e.g. population)
    INTEGER: 1,
    // selection of yes|no|limited|designated
    YES_NO_LIMITED_DESIGNATED: 2
}

const PlaceBubble = new Lang.Class({
    Name: 'PlaceBubble',
    Extends: MapBubble.MapBubble,

    _init: function(params) {
        let ui = Utils.getUIObject('place-bubble', [ 'stack',
                                                     'box-content',
                                                     'label-title']);
        params.buttons = (MapBubble.Button.ROUTE |
                          MapBubble.Button.SEND_TO |
			  MapBubble.Button.EDIT);

        // We do not serialize contacts to file, so adding them
        // as favourites does not makes sense right now.
        if (!(params.place instanceof ContactPlace.ContactPlace))
            params.buttons |= MapBubble.Button.FAVORITE;

        this.parent(params);

        Utils.load_icon(this.place.icon, 48, (function(pixbuf) {
            this.image.pixbuf = pixbuf;
        }).bind(this));

        this._stack = ui.stack;
        this._title = ui.labelTitle;
        this._boxContent = ui.boxContent;

        let overpass = new Overpass.Overpass();
        if (Application.placeStore.exists(this.place, null)) {

            // If the place is stale, update from Overpass.
            if (Application.placeStore.isStale(this.place)) {
                overpass.addInfo(this.place, (function(status, code) {
                    this._populate(this.place);
                    Application.placeStore.updatePlace(this.place);
                }).bind(this));
            } else {
                let place = Application.placeStore.get(this.place);
                this._populate(place);
            }
        } else {
            overpass.addInfo(this.place, (function(status, code) {
                this._populate(this.place);
                Application.placeStore.addPlace(this.place,
                                                PlaceStore.PlaceType.RECENT);
            }).bind(this));
        }
        this.content.add(this._stack);

	this._initEditButton(this._editButton);
	this._initOSMEditor();

	this._cancellable = new Gio.Cancellable();
        this.connect('delete-event', (function() {
            this._cancellable.cancel();
        }).bind(this));
    },

    _formatWikiLink: function(wiki) {
        let tokens = wiki.split(':');

        return Format.vprintf('https://%s.wikipedia.org/wiki/%s', [ tokens[0],
                                                                    tokens[1] ]);
    },

    _populate: function(place) {
        let infos = [];
        let formatter = new PlaceFormatter.PlaceFormatter(place);

        this._title.label = formatter.title;

        infos = formatter.rows.map(function(row) {
            row = row.map(function(prop) {
                switch (prop) {
                case 'postal_code':
                    return _("Postal code: %s").format(place[prop]);
                case 'country_code':
                    return _("Country code: %s").format(place[prop]);
                default:
                    return place[prop];
                }
            });
            return row.join(', ');
        });

        if (place.population)
            infos.push(_("Population: %s").format(place.population));

        if (place.openingHours)
            infos.push(_("Opening hours: %s").format(place.openingHoursTranslated));

        if (place.wiki) {
            let link = this._formatWikiLink(place.wiki);
            let href = Format.vprintf('<a href="%s">%s</a>',
                                      [link, _("Wikipedia")]);
            infos.push(href);
        }

        if (place.wheelchair) {
            infos.push(_("Wheelchair access: %s").format(place.wheelchairTranslated));
        }

        infos.forEach((function(info) {
            let label = new Gtk.Label({ label: info,
                                        visible: true,
                                        use_markup: true,
                                        halign: Gtk.Align.START });
            this._boxContent.pack_start(label, false, true, 0);
        }).bind(this));

        this._stack.visible_child = this._boxContent;
    },

    // clear the view widgets to be able to re-polute an updated place
    _clearView: function() {
	let widgets = this._boxContent.get_children();

	// remove the dynamically added content, the title label
	// has position 0 in the box
	for (let i = 1; i < widgets.length; i++) {
	    this._boxContent.remove(widgets[i]);
	}
    },

    _initEditButton: function(button) {
	button.connect('clicked', this._onEditClicked.bind(this));
    },

    _onEditClicked: function() {
	this._viewOrEditStack.visible_child_name = 'loading';
	Application.osmEditManager.fetchObject(this._place,
					       this._onObjectFetched.bind(this),
					       this._cancellable);
    },

    _initOSMEditor: function() {
	this._saveButton.connect('clicked', this._onSaveClicked.bind(this));
	this._cancelButton.connect('clicked', this._onCancelClicked.bind(this));
	this._setupEditingButtons();
    },
	
    _onObjectFetched: function(success, status, osmObject, osmType) {
	if (success) {
	    this._loadOSMData(osmObject, osmType);
	    // keep the save button insensitive until the user has done a change
	    this._saveButton.sensitive = false;
	} else {
	    this._showError(status);
	    this._viewOrEditStack.visible_child_name = 'view';
	}
    },

    // GtkContainer.child_get_property doesn't seem to be usable from GJS
    _getRowOfDeleteButton: function(button) {
	for (let row = 0;; row++) {
	    let foundButton = this._editContentArea.get_child_at(2, row);

	    if (foundButton === button)
		return row;

	    if (foundButton == null)
		return -1;
	}
    },
    
    _addOSMEditDeleteButton: function(tag) {
	let deleteButton = Gtk.Button.new_from_icon_name('user-trash-symbolic',
							 Gtk.IconSize.BUTTON);
	this._editContentArea.attach(deleteButton, 2, this._nextRow, 1, 1);

	deleteButton.connect('clicked', (function() {
	    this._osmObject.delete_tag(tag);

	    let row = this._getRowOfDeleteButton(deleteButton);
	    this._editContentArea.remove_row(row);
	    this._saveButton.sensitive = true;
	    this._nextRow--;
	    this._updateAddDetailMenu();
	}).bind(this, tag));

	deleteButton.show();
    },

    _addOSMEditLabel: function(text) {
	let label = new Gtk.Label({label: text});
	label.halign = Gtk.Align.END;
	this._editContentArea.attach(label, 0, this._nextRow, 1, 1);

	// add the label to the size group, to align all labels with the
	// hard-coded comment label
	this._editLabelSizeGroup.add_widget(label);

	label.show();
    },

    _osmWikipediaRewriteFunc: function(text) {
	let wikipediaArticleFormatted =
	    OSMUtils.getWikipediaOSMArticleFormatFromUrl(text);
	
	// if the entered text is a Wikipedia link,
	// substitute it with the OSM-formatted Wikipedia article tag
	if (wikipediaArticleFormatted)
	    return wikipediaArticleFormatted;
	else
	    return text;
    },
    
    _addOSMEditTextEntry: function(text, tag, value, rewriteFunc) {
	this._addOSMEditLabel(text);
	
	let entry = new Gtk.Entry();
	entry.text = value;

	entry.connect('changed', (function() {
	    if (rewriteFunc)
		entry.text = rewriteFunc(entry.text);
	    this._osmObject.set_tag(tag, entry.text);
	    this._saveButton.sensitive = true;
	}).bind(this, tag, entry));

	this._editContentArea.attach(entry, 1, this._nextRow, 1, 1);
	entry.show();

	// TODO: should we allow deleting the name field?
	this._addOSMEditDeleteButton(tag);
	
	this._nextRow++;
    },

    _addOSMEditIntegerEntry: function(text, tag, value) {
	this._addOSMEditLabel(text);
	
	let spinbutton = Gtk.SpinButton.new_with_range(0, 1e9, 1);
	spinbutton.value = value;
	spinbutton.numeric = true;
	spinbutton.connect('changed', (function() {
	    this._osmObject.set_tag(tag, spinbutton.text);
	    this._saveButton.sensitive = true;
	}).bind(this, tag, spinbutton));
	
 	this._editContentArea.attach(spinbutton, 1, this._nextRow, 1, 1);
	spinbutton.show();
	
	this._addOSMEditDeleteButton(tag);

	this._nextRow++;
    },

    _addOSMEditYesNoLimitedDesignated: function(text, tag, value) {
	this._addOSMEditLabel(text);

	let combobox = new Gtk.ComboBoxText();

	combobox.append('yes', _("Yes"));
	combobox.append('no', _("No"));
	combobox.append('limited', _("Limited"));
	combobox.append('designated', _("Designated"));
	
	combobox.active_id = value;
	combobox.connect('changed', (function() {
	    this._osmObject.set_tag(tag, combobox.active_id);
	    this._saveButton.sensitive = true;
	}).bind(this, tag, combobox));

 	this._editContentArea.attach(combobox, 1, this._nextRow, 1, 1);
	combobox.show();
	
	this._addOSMEditDeleteButton(tag);

	this._nextRow++;	
    },

    // update visible items in the ad
    _updateAddDetailMenu: function() {
	let name = this._osmObject.get_tag('name');
	let wikipedia = this._osmObject.get_tag('wikipedia');
	let population = this._osmObject.get_tag('population');
	let wheelchair = this._osmObject.get_tag('wheelchair');

	this._addNameButton.visible = (name == null);
	this._addWikipediaButton.visible = (wikipedia == null);
	this._addPopulationButton.visible = (population == null);
	this._addWheelchairButton.visible = (wheelchair == null);

	// update sensitiveness of the add details button, set it as
	// insensitive if all tags when support editing is already present
	this._addDetailButton.sensitive =
	    (name == null || wikipedia == null || population == null ||
	     wheelchair == null);
    },

    // helper function to connect an add menu item
    // to a corresponding callback to add the appropriate
    // OSM tag
    _connectAddEditFieldButton: function(button, label, tag, type,
					rewriteFunc) {
	button.connect('clicked', (function() {
	    this._addDetailButton.active = false;

	    // add a "placeholder" empty OSM tag to keep the add detail menu
	    // updated, these tags will be filtered out if nothing is entered
	    this._osmObject.set_tag(tag, '');
	    this._updateAddDetailMenu();
	    
	    switch (type) {
	    case EditFieldType.TEXT:
		this._addOSMEditTextEntry(label, tag, '', rewriteFunc);
		break;
	    case EditFieldType.INTEGER:
		this._addOSMEditIntegerEntry(label, tag, '');
		break;
	    case EditFieldType.YES_NO_LIMITED_DESIGNATED:
		this._addOSMEditYesNoLimitedDesignated(label, tag, '');
		break;
	    }
	}).bind(this, label, tag, type));
    },

    // set up the menu entries for adding OSM tags
    _setupEditingButtons: function() {
	this._connectAddEditFieldButton(this._addNameButton,
					_("Name"), 'name',
					EditFieldType.TEXT);
	this._connectAddEditFieldButton(this._addWikipediaButton,
					_("Wikipedia"), 'wikipedia',
					EditFieldType.TEXT,
				       this._osmWikipediaRewriteFunc);
	this._connectAddEditFieldButton(this._addPopulationButton,
					_("Population"), 'population',
					EditFieldType.INTEGER);
	this._connectAddEditFieldButton(this._addWheelchairButton,
					_("Wheelchair"), 'wheelchair',
					EditFieldType.YES_NO_LIMITED_DESIGNATED);

	// initially set unexisting changeset comment
	this._changesetComment = null;
	this._editCommentEntry.connect('changed', (function() {
	    this._changesetComment = this._editCommentEntry.text;
	}).bind(this));
    },

    _loadOSMData: function(osmObject, osmType) {
	this._osmObject = osmObject;
	this._osmType = osmType;

	// clear any previos editing widgets
	let widgets = this._editContentArea.get_children();
	for (let i = 0; i < widgets.length; i++) {
	    this._editContentArea.remove(widgets[i]);
	}

	// create edit widgets
	this._nextRow = 0;
	
	let name = osmObject.get_tag('name');
	if (name != null)
	    this._addOSMEditTextEntry(_("Name"), 'name', name);

	let wikipedia = osmObject.get_tag('wikipedia');
	if (wikipedia != null)
	    this._addOSMEditTextEntry(_("Wikipedia"), 'wikipedia', wikipedia,
				     this._osmWikipediaRewriteFunc);

	let population = osmObject.get_tag('population');
	if (population != null)
	    this._addOSMEditIntegerEntry(_("Population"), 'population',
					 population);

	let wheelchair = osmObject.get_tag('wheelchair');
	if (wheelchair != null)
	    this._addOSMEditYesNoLimitedDesignated(_("Wheelchair access"),
						   'wheelchair', wheelchair);

	this._updateAddDetailMenu();
	this._viewOrEditStack.visible_child_name = 'edit';
    },

    _showError: function(status) {
	let statusMessage = OSMConnection.getStatusMessage(status);
	let messageDialog =
	    new Gtk.MessageDialog({ transient_for: this.get_toplevel(),
				    destroy_with_parent: true,
                                    message_type: Gtk.MessageType.ERROR,
                                    buttons: Gtk.ButtonsType.OK,
                                    modal: true,
                                    text: _("An error has occurred"),
                                    secondary_text: statusMessage });

	messageDialog.run();
        messageDialog.destroy();
    },

    _onSaveClicked: function() {
	Application.osmEditManager.uploadObject(this._osmObject,
						this._osmType,
						this._changesetComment,
						null,
						this._uploadObjectCB.bind(this));
    },

    _onCancelClicked: function() {
	this._viewOrEditStack.visible_child_name = 'view';
    },

    _uploadObjectCB: function(success, status) {
	if (success) {
	    if (!Application.osmEditManager.useTestApi) {
		// update place
		OSMUtils.updatePlaceFromOSMObject(this._place, this._osmObject);
		// refresh place view
		this._clearView();
		this._populate(this._place);
	    }
	} else
	    this._showError(status);
	    
	this._viewOrEditStack.visible_child_name = 'view';
    }
});
