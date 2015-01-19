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

#include "maps-osm-changeset.h"

G_DEFINE_TYPE (MapsOSMChangeset, maps_osm_changeset,
	       MAPS_TYPE_OSMOBJECT)

static const char *
maps_osm_changeset_get_xml_tag_name (void)
{
  return "changeset";
}

static void
maps_osm_changeset_class_init (MapsOSMChangesetClass *klass)
{
  MapsOSMObjectClass *object_class = MAPS_OSMOBJECT_CLASS (klass);

  object_class->get_xml_tag_name = maps_osm_changeset_get_xml_tag_name;
}

static void
maps_osm_changeset_init (MapsOSMChangeset *changeset)
{
}

MapsOSMChangeset *
maps_osm_changeset_new (const char *comment, const char *source,
			const char *created_by)
{
  MapsOSMChangeset *changeset = g_object_new (MAPS_TYPE_OSMCHANGESET, NULL);

  if (comment)
    maps_osm_object_set_tag (MAPS_OSMOBJECT (changeset), "comment", comment);

  if (source)
    maps_osm_object_set_tag (MAPS_OSMOBJECT (changeset), "source", source);

  if (created_by)
    maps_osm_object_set_tag (MAPS_OSMOBJECT (changeset), "created_by",
			     created_by);

  return changeset;
}
