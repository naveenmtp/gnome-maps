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
 * with GNOME Maps; if not, see <http://www.gnu.org/licenses/>
 *
 * Author: Marcus Lundblad <ml@update.uu.se>
 */

#ifndef __MAPS_OSM_CHANGESET_H__
#define __MAPS_OSM_CHANGESET_H__

#include "maps-osm-object.h"

#include <glib-object.h>

#define MAPS_TYPE_OSMCHANGESET maps_osm_changeset_get_type ()
G_DECLARE_FINAL_TYPE(MapsOSMChangeset, maps_osm_changeset, MAPS, OSMCHANGESET,
		     MapsOSMObject)

struct _MapsOSMChangeset
{
  MapsOSMObject parent_instance;
};

struct _MapsOSMChangesetClass
{
  MapsOSMObjectClass parent_class;
};

/**
 * maps_osm_changeset_new:
 * @comment: (nullable): A comment about the OSM change, optional
 * @source: (nullable): The source of the OSM change, optional
 */
MapsOSMChangeset *maps_osm_changeset_new (const char *comment,
					  const char *source,
					  const char *created_by);

#endif /* __MAPS_OSM_CHANGESET_H__ */

