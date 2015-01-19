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

#include "maps-osm-node.h"

struct _MapsOSMNodePrivate
{
  double lon;
  double lat;
};

enum {
  PROP_0,

  PROP_LON,
  PROP_LAT
};

G_DEFINE_TYPE_WITH_PRIVATE (MapsOSMNode, maps_osm_node,
			    MAPS_TYPE_OSMOBJECT)


static void
maps_osm_node_set_property (GObject      *object,
			    guint         property_id,
			    const GValue *value,
			    GParamSpec   *pspec)
{
  MapsOSMNode *node = MAPS_OSMNODE (object);

  switch (property_id)
    {
    case PROP_LON:
      node->priv->lon = g_value_get_double (value);
      break;

    case PROP_LAT:
      node->priv->lat = g_value_get_double (value);
      break;

    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
      break;
    }
}

static void
maps_osm_node_get_property (GObject    *object,
			    guint       property_id,
			    GValue     *value,
			    GParamSpec *pspec)
{
  MapsOSMNode *node = MAPS_OSMNODE (object);

  switch (property_id)
    {
    case PROP_LON:
      g_value_set_double (value,
			  node->priv->lon);
      break;

    case PROP_LAT:
      g_value_set_double (value,
			  node->priv->lat);
      break;

    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
      break;
    }
}

static const char *
maps_osm_node_get_xml_tag_name (void)
{
  return "node";
}

static GHashTable *
maps_osm_node_get_xml_attributes (const MapsOSMObject *object)
{
  const MapsOSMNode *node = MAPS_OSMNODE (object);
  GHashTable *attributes;
  char buf[G_ASCII_DTOSTR_BUF_SIZE];
  
  attributes = g_hash_table_new_full (g_str_hash, g_str_equal,
				      NULL, g_free);

  g_ascii_dtostr (buf, sizeof (buf), node->priv->lon);
  g_hash_table_insert (attributes, "lon", g_strdup (buf));
  g_ascii_dtostr (buf, sizeof (buf), node->priv->lat);  
  g_hash_table_insert (attributes, "lat", g_strdup (buf)); 

  return attributes;
}

static void
maps_osm_node_class_init (MapsOSMNodeClass *klass)
{
  GObjectClass *node_class = G_OBJECT_CLASS (klass);
  MapsOSMObjectClass *object_class = MAPS_OSMOBJECT_CLASS (klass);
  GParamSpec *pspec;

  node_class->get_property = maps_osm_node_get_property;
  node_class->set_property = maps_osm_node_set_property;
  object_class->get_xml_tag_name = maps_osm_node_get_xml_tag_name;
  object_class->get_xml_attributes = maps_osm_node_get_xml_attributes;

  /**
   * MapsOSMNode:lon:
   *
   * The longitude of the node.
   */
  pspec = g_param_spec_double ("lon",
  			       "Longitude",
  			       "Longitude",
  			       -180.0,
  			       180.0,
  			       0.0,
  			       G_PARAM_READWRITE);
  g_object_class_install_property (node_class, PROP_LON, pspec);

  /**
   * MapsOSMNode:lat:
   *
   * The latitude of the node.
   */
  pspec = g_param_spec_double ("lat",
  			       "Latitude",
  			       "Latitude",
  			       -90.0,
  			       90.0,
  			       0.0,
  			       G_PARAM_READWRITE);
  g_object_class_install_property (node_class, PROP_LAT, pspec);
}

static void
maps_osm_node_init (MapsOSMNode *node)
{
  node->priv = maps_osm_node_get_instance_private (node);

  node->priv->lon = 0.0;
  node->priv->lat = 0.0;
}

MapsOSMNode *
maps_osm_node_new (guint64 id, guint version, guint64 changeset,
		   double lon, double lat)
{
  return g_object_new (MAPS_TYPE_OSMNODE,
		       "id", id,
		       "version", version,
		       "changeset", changeset,
		       "lon", lon,
		       "lat", lat, NULL);
}

double
maps_osm_node_get_lon (MapsOSMNode *node)
{
  double lon;

  g_object_get (node, "lon", &lon);
  return lon;
}

void
maps_osm_node_set_lon (MapsOSMNode *node, double lon)
{
  g_object_set (node, "lon", lon);
}

double
maps_osm_node_get_lat (MapsOSMNode *node)
{
  double lat;

  g_object_get (node, "lat", &lat);
  return lat;
}

void
maps_osm_node_set_lat (MapsOSMNode *node, double lat)
{
  g_object_set (node, "lat", lat);
}
