/*
 * Copyright (c) 2011, 2012, 2013 Red Hat, Inc.
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
 * Author: Cosimo Cecchi <cosimoc@redhat.com>
 *         Zeeshan Ali (Khattak) <zeeshanak@gnome.org>
 */

const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Champlain = imports.gi.Champlain;
const GtkChamplain = imports.gi.GtkChamplain;
const Geocode = imports.gi.GeocodeGlib;

const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Application = imports.application;
const MainToolbar = imports.mainToolbar;
const Utils = imports.utils;
const Config = imports.config;

const _ = imports.gettext.gettext;

const _CONFIGURE_ID_TIMEOUT = 100; // msecs
const _WINDOW_MIN_WIDTH = 600;
const _WINDOW_MIN_HEIGHT = 500;

const MainWindow = new Lang.Class({
    Name: 'MainWindow',

    _init: function(app) {
        this._configureId = 0;

        this.window = new Gtk.ApplicationWindow({ application: app,
                                                  width_request: _WINDOW_MIN_WIDTH,
                                                  height_request: _WINDOW_MIN_HEIGHT,
						  window_position: Gtk.WindowPosition.CENTER,
                                                  hide_titlebar_when_maximized: true,
						  title: _("Maps") });

        // apply the last saved window size and position
        let size = Application.settings.get_value('window-size');
        if (size.n_children() == 2) {
            let width = size.get_child_value(0);
            let height = size.get_child_value(1);

            this.window.set_default_size(width.get_int32(),
                                         height.get_int32());
        }

        let position = Application.settings.get_value('window-position');
        if (position.n_children() == 2) {
            let x = position.get_child_value(0);
            let y = position.get_child_value(1);

            this.window.move(x.get_int32(),
                             y.get_int32());
        }

        if (Application.settings.get_boolean('window-maximized'))
            this.window.maximize();

        this.window.connect('delete-event',
                            Lang.bind(this, this._quit));
        this.window.connect('configure-event',
                            Lang.bind(this, this._onConfigureEvent));
        this.window.connect('window-state-event',
                            Lang.bind(this, this._onWindowStateEvent));

        let grid = new Gtk.Grid ();
        grid.set_orientation (Gtk.Orientation.VERTICAL);
        this.window.add(grid);

        this._embed = new GtkChamplain.Embed();
        this.view = this._embed.get_view();
        this.view.set_zoom_level(3);

        this._toolbar = new MainToolbar.MainToolbar (this);

        grid.add(this._toolbar.widget);
        grid.add(this._embed);

        grid.show_all();

        let ipclient = new Geocode.Ipclient();
        ipclient.server = "http://freegeoip.net/json/";
        ipclient.search_async(null, Lang.bind(this, this._onSearchComplete));
    },

    _onSearchComplete: function(ipclient, res) {
        try {
            let [location, accuracy] = ipclient.search_finish(res);

            let zoom = Utils.getZoomLevelForAccuracy(accuracy);
            this.view.go_to(location.latitude, location.longitude);
            this.view.connect("animation-completed::go-to", Lang.bind(this,
                function() {
                    // Apparently the signal is called before animation is really complete so if we don't
                    // zoom in idle, we get a crash. Perhaps a bug in libchamplain?
                    Mainloop.idle_add(Lang.bind(this,
                        function() {
                            this.view.set_zoom_level(zoom);
                        }));
                }));
        } catch (e) {
            log("Failed to find your location: " + e);
        }
    },

    _saveWindowGeometry: function() {
        let window = this.window.get_window();
        let state = window.get_state();

        if (state & Gdk.WindowState.MAXIMIZED)
            return;

        // GLib.Variant.new() can handle arrays just fine
        let size = this.window.get_size();
        let variant = GLib.Variant.new ('ai', size);
        Application.settings.set_value('window-size', variant);

        let position = this.window.get_position();
        variant = GLib.Variant.new ('ai', position);
        Application.settings.set_value('window-position', variant);
    },

    _onConfigureEvent: function(widget, event) {
        if (this._configureId != 0) {
            Mainloop.source_remove(this._configureId);
            this._configureId = 0;
        }

        this._configureId = Mainloop.timeout_add(_CONFIGURE_ID_TIMEOUT, Lang.bind(this,
            function() {
                this._saveWindowGeometry();
                return false;
            }));
    },

    _onWindowStateEvent: function(widget, event) {
        let window = widget.get_window();
        let state = window.get_state();

        if (state & Gdk.WindowState.FULLSCREEN)
            return;

        let maximized = (state & Gdk.WindowState.MAXIMIZED);
        Application.settings.set_boolean('window-maximized', maximized);
    },

    _quit: function() {
        // remove configure event handler if still there
        if (this._configureId != 0) {
            Mainloop.source_remove(this._configureId);
            this._configureId = 0;
        }

        // always save geometry before quitting
        this._saveWindowGeometry();

        return false;
    },

    showAbout: function() {
        let aboutDialog = new Gtk.AboutDialog();

        aboutDialog.artists = [ 'Jakub Steiner <jimmac@gmail.com>', 'Andreas Nilsson <nisses.mail@home.se>' ];
        aboutDialog.authors = [ 'Zeeshan Ali (Khattak) <zeeshanak@gnome.org>',
                                'Mattias Bengtsson <mattias.jc.bengtsson@gmail.com>' ];
        aboutDialog.translator_credits = _("translator-credits");
        aboutDialog.program_name = _("Maps");
        aboutDialog.comments = _("A map application for GNOME");
        aboutDialog.copyright = 'Copyright ' + String.fromCharCode(0x00A9) + ' 2011' + String.fromCharCode(0x2013) + '2013 Red Hat, Inc.';
        aboutDialog.license_type = Gtk.License.GPL_2_0;
        aboutDialog.logo_icon_name = 'gnome-maps';
        aboutDialog.version = Config.PACKAGE_VERSION;
        aboutDialog.website = 'http://live.gnome.org/Maps';
        aboutDialog.wrap_license = true;

        aboutDialog.modal = true;
        aboutDialog.transient_for = this.window;

        aboutDialog.show();
        aboutDialog.connect('response', function() {
            aboutDialog.destroy();
        });
    }
});
