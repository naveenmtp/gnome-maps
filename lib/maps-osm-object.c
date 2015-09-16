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

#include "maps-osm-object.h"

struct _MapsOSMObjectPrivate
{
  guint64 id;
  guint version;
  guint64 changeset;

  GHashTable *tags;
};

enum {
  PROP_0,

  PROP_ID,
  PROP_VERSION,
  PROP_CHANGESET
};

G_DEFINE_ABSTRACT_TYPE_WITH_PRIVATE (MapsOSMObject, maps_osm_object,
				     G_TYPE_OBJECT)

static void
maps_osm_object_set_property (GObject      *object,
			      guint         property_id,
			      const GValue *value,
			      GParamSpec   *pspec)
{
  MapsOSMObject *osm_object = MAPS_OSMOBJECT (object);
  MapsOSMObjectPrivate *priv =
    maps_osm_object_get_instance_private (osm_object);
  
  switch (property_id)
    {
    case PROP_ID:
      priv->id = g_value_get_uint64 (value);
      break;

    case PROP_VERSION:
      g_debug ("setting version: %d\n", g_value_get_uint (value));
      priv->version = g_value_get_uint (value);
      break;

    case PROP_CHANGESET:
      priv->changeset = g_value_get_uint64 (value);
      break;

    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
      break;
    }
}

static void
maps_osm_object_get_property (GObject    *object,
			      guint       property_id,
			      GValue     *value,
			      GParamSpec *pspec)
{
  MapsOSMObject *osm_object = MAPS_OSMOBJECT (object);
  MapsOSMObjectPrivate *priv =
    maps_osm_object_get_instance_private (osm_object);

  switch (property_id)
    {
    case PROP_ID:
      g_value_set_uint64 (value,
			  priv->id);
      break;

    case PROP_VERSION:
      g_value_set_uint (value,
			priv->version);
      g_debug ("getting version: %d\n", g_value_get_uint (value));
      break;

    case PROP_CHANGESET:
      g_value_set_uint64 (value,
			  priv->changeset);
      break;

    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, property_id, pspec);
      break;
    }
}

static void
maps_osm_object_dispose (GObject *object)
{
  MapsOSMObject *osm_object = MAPS_OSMOBJECT (object);
  MapsOSMObjectPrivate *priv =
    maps_osm_object_get_instance_private (osm_object);
  
  g_hash_table_destroy (priv->tags);
  priv->tags = NULL;

  G_OBJECT_CLASS (maps_osm_object_parent_class)->dispose (object);
}

/* base implementation returning no object-specific XML attributes */
static GHashTable *
maps_osm_object_get_xml_attributes (const MapsOSMObject *object)
{
  return g_hash_table_new (g_str_hash, g_str_equal);
}

/* base implementation return no object-specific child XML nodes */
static xmlNodePtr
maps_osm_object_get_xml_child_nodes (const MapsOSMObject *object)
{
  return NULL;
}

static void
maps_osm_object_class_init (MapsOSMObjectClass *klass)
{
  GObjectClass *maps_class = G_OBJECT_CLASS (klass);
  MapsOSMObjectClass *object_class = MAPS_OSMOBJECT_CLASS (klass);
  GParamSpec *pspec;

  maps_class->dispose = maps_osm_object_dispose;
  maps_class->get_property = maps_osm_object_get_property;
  maps_class->set_property = maps_osm_object_set_property;
  object_class->get_xml_attributes = maps_osm_object_get_xml_attributes;
  object_class->get_xml_child_nodes = maps_osm_object_get_xml_child_nodes;
  
  /**
   * MapsOSMObject:id:
   *
   * The OSM id of the object.
   */
  pspec = g_param_spec_uint64 ("id",
			       "ID",
			       "ID",
			       0,
			       G_MAXUINT64,
			       0,
			       G_PARAM_READWRITE);
  g_object_class_install_property (maps_class, PROP_ID, pspec);

  /**
   * MapsOSMObject:version:
   *
   * The latest OSM version of the object.
   */
  pspec = g_param_spec_uint("version",
			    "Version",
			    "Version",
			    0,
			    G_MAXUINT,
			    0,
			    G_PARAM_READWRITE);
  g_object_class_install_property (maps_class, PROP_VERSION, pspec);

  /**
   * MapsOSMObject:changeset:
   *
   * The OSM changeset for the current upload of the object.
   */
  pspec = g_param_spec_uint64 ("changeset",
			       "Changeset",
			       "Changeset",
			       0,
			       G_MAXUINT64,
			       0,
			       G_PARAM_READWRITE);
  g_object_class_install_property (maps_class, PROP_CHANGESET, pspec);
}
  
static void
maps_osm_object_init (MapsOSMObject *object)
{
  MapsOSMObjectPrivate *priv = maps_osm_object_get_instance_private (object);

  priv->tags = g_hash_table_new_full (g_str_hash,
				      g_str_equal,
				      g_free,
				      g_free);
}

guint64
maps_osm_object_get_id (MapsOSMObject *object)
{
  guint64 id;

  g_object_get (G_OBJECT (object), "id", &id);
  return id;
}

void
maps_osm_object_set_id (MapsOSMObject *object, guint64 id)
{
  g_object_set (G_OBJECT (object), "id", id);
}

guint
maps_osm_object_get_version (MapsOSMObject *object)
{
  guint version;

  g_object_get (G_OBJECT (object), "version", &version);
  return version;
}

void
maps_osm_object_set_version (MapsOSMObject *object, guint version)
{
  g_object_set (G_OBJECT (object), "version", version);
}

guint64
maps_osm_object_get_changeset (MapsOSMObject *object)
{
  guint64 changeset;

  g_object_get (G_OBJECT (object), "changeset", &changeset);
  return changeset;
}

void
maps_osm_object_set_changset (MapsOSMObject *object, guint64 changeset)
{
  g_object_set (G_OBJECT (object), "changeset", changeset);
}

const char *
maps_osm_object_get_tag (const MapsOSMObject *object, const char *key)
{
  MapsOSMObjectPrivate *priv = maps_osm_object_get_instance_private (object);

  return g_hash_table_lookup (priv->tags, key);
}

void
maps_osm_object_set_tag (MapsOSMObject *object,
			 const char *key, const char *value)
{
  MapsOSMObjectPrivate *priv = maps_osm_object_get_instance_private (object);

  g_hash_table_insert (priv->tags, g_strdup (key), g_strdup (value));
}

void
maps_osm_object_delete_tag (MapsOSMObject *object, const char *key)
{
  MapsOSMObjectPrivate *priv = maps_osm_object_get_instance_private (object);

  g_hash_table_remove (priv->tags, key);
}

void
maps_osm_object_foreach_tag (gpointer key, gpointer value, gpointer user_data)
{
  const char *name = (const char *) key;
  const char *val = (const char *) value;
  xmlNodePtr object_node = (xmlNodePtr) user_data;

  /* skip tag if it has an empty placeholder value */
  if (val) {
    xmlNodePtr tag_node;
    
    tag_node = xmlNewNode (NULL, "tag");
    xmlNewProp (tag_node, "k", key);
    xmlNewProp (tag_node, "v", val);
    xmlAddChild (object_node, tag_node);
  }
}

void
maps_osm_object_foreach_type_attr (gpointer key, gpointer value,
				   gpointer user_data)
{
  const char *name = (const char *) key;
  const char *val = (const char *) value;
  xmlNodePtr object_node = (xmlNodePtr) user_data;

  xmlNewProp (object_node, name, val);
}

xmlDocPtr
maps_osm_object_to_xml (const MapsOSMObject *object)
{
  MapsOSMObjectPrivate *priv;
  xmlDocPtr doc;
  xmlNodePtr osm_node;
  xmlNodePtr object_node;
  const char *type;
  guint64 id;
  guint version;
  guint64 changeset;
  GHashTable *type_attrs;
  xmlNodePtr type_sub_nodes;
  
  doc = xmlNewDoc ("1.0");
  osm_node = xmlNewNode (NULL, "osm");
  priv = (MapsOSMObjectPrivate *) maps_osm_object_get_instance_private (object);
  type = MAPS_OSMOBJECT_GET_CLASS (object)->get_xml_tag_name ();
  object_node = xmlNewNode (NULL, type);

  /* add common OSM attributes */
  id = priv->id;
  version = priv->version;
  changeset = priv->changeset;

  if (id != 0) {
    char buf[32];
    g_snprintf (buf, 32, "%" G_GUINT64_FORMAT, id);
    xmlNewProp (object_node, "id", buf);
  }
    
  if (version != 0) {
    char buf[16];
    g_snprintf (buf, 16, "%d", version);
    xmlNewProp (object_node, "version", buf);
  }
    
  if (changeset != 0) {
    char buf[32];
    g_snprintf (buf, 32, "%" G_GUINT64_FORMAT, changeset);
    xmlNewProp (object_node, "changeset", buf);
  }

  /* add OSM tags */
  g_hash_table_foreach (priv->tags, maps_osm_object_foreach_tag, object_node);
  
  /* add type-specific attributes */
  type_attrs = MAPS_OSMOBJECT_GET_CLASS (object)->get_xml_attributes (object);
  g_hash_table_foreach (type_attrs, maps_osm_object_foreach_type_attr,
			 object_node);
  g_hash_table_destroy (type_attrs);

  /* add type-specific sub-nodes */
  type_sub_nodes =
    MAPS_OSMOBJECT_GET_CLASS (object)->get_xml_child_nodes (object);
  if (type_sub_nodes)
    xmlAddChildList (object_node, type_sub_nodes);

  /* add type node to top node */
  xmlAddChild (osm_node, object_node);
  xmlDocSetRootElement (doc, osm_node);
  
  return doc;
}


char *
maps_osm_object_serialize (const MapsOSMObject *object)
{
  xmlDocPtr doc;
  xmlChar *result;
  int size;
  
  doc = maps_osm_object_to_xml (object);
  xmlDocDumpMemory (doc, &result, &size);
  xmlFreeDoc (doc);
  
  return result;
}
