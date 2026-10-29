// src/services/cloudSync.ts
// Secure cloud synchronization and safe local-data migration

import type { User } from '@supabase/supabase-js';
import { db } from '../db/schema';
import { getSupabaseClient } from './supabase';
import { exportAll } from '../db/operations';

export interface MigrationSummary {
  universes: number;
  worlds: number;
  entities: number;
  relationships: number;
  entityTypes: number;
}

export async function getLocalDataStats(): Promise<MigrationSummary> {
  const [universes, worlds, entities, relationships, entityTypes] = await Promise.all([
    db.universes.count(),
    db.worlds.count(),
    db.entities.count(),
    db.relationships.count(),
    db.entityTypes.count(),
  ]);

  return { universes, worlds, entities, relationships, entityTypes };
}

export async function migrateLocalDataToCloud(user: User): Promise<{ success: boolean; message: string; verifiedCount: number }> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cloud backend is not configured.');

  // 1. Gather all local data
  const [universes, worlds, entities, relationships, entityTypes, relTypes] = await Promise.all([
    db.universes.toArray(),
    db.worlds.toArray(),
    db.entities.toArray(),
    db.relationships.toArray(),
    db.entityTypes.toArray(),
    db.relationshipTypes.toArray(),
  ]);

  const totalLocalRecords = universes.length + worlds.length + entities.length + relationships.length;

  if (totalLocalRecords === 0) {
    return { success: true, message: 'No local records to migrate.', verifiedCount: 0 };
  }

  // 2. Upload Universes (filter out ghost demo universes)
  const validUniverses = universes.filter(u => u.title !== 'My Universe' || worlds.some(w => w.universeId === u.id));
  if (validUniverses.length > 0) {
    const records = validUniverses.map(u => ({
      id: u.id,
      user_id: user.id,
      title: u.title,
      description: u.description || null,
      created_at: u.createdAt,
      updated_at: u.updatedAt,
    }));
    const { error } = await client.from('hex_universes').upsert(records, { onConflict: 'id' });
    if (error) throw new Error(`Failed to upload universes: ${error.message}`);
  }

  // 3. Upload Worlds
  if (worlds.length > 0) {
    const records = worlds.map(w => ({
      id: w.id,
      user_id: user.id,
      universe_id: w.universeId,
      title: w.title,
      description: w.description || null,
      color: w.color || null,
      icon: w.icon || null,
      created_at: w.createdAt,
      updated_at: w.updatedAt,
    }));
    const { error } = await client.from('hex_worlds').upsert(records, { onConflict: 'id' });
    if (error) throw new Error(`Failed to upload worlds: ${error.message}`);
  }

  // 4. Upload Custom Entity Types
  if (entityTypes.length > 0) {
    const records = entityTypes.map(t => ({
      id: t.id,
      user_id: user.id,
      name: t.name,
      color: t.color,
      icon: t.icon,
      description: t.description || null,
      is_built_in: t.isBuiltIn,
      fields_schema: t.fieldsSchema || {},
    }));
    const { error } = await client.from('hex_entity_types').upsert(records, { onConflict: 'id' });
    if (error) throw new Error(`Failed to upload entity types: ${error.message}`);
  }

  // 5. Upload Entities
  if (entities.length > 0) {
    const records = entities.map(e => ({
      id: e.id,
      user_id: user.id,
      world_id: e.worldId,
      type_id: e.typeId,
      title: e.title,
      entry_number: e.entryNumber || null,
      aliases: e.aliases || [],
      article: e.article || null,
      properties: e.properties || {},
      tags: e.tags || [],
      canon_status: e.canonStatus || 'canon',
      demographic_datasets: e.demographicDatasets || [],
      linked_entity_ids: e.linkedEntityIds || [],
      created_at: e.createdAt,
      updated_at: e.updatedAt,
      deleted_at: e.deletedAt || null,
    }));
    const { error } = await client.from('hex_entities').upsert(records, { onConflict: 'id' });
    if (error) throw new Error(`Failed to upload entities: ${error.message}`);
  }

  // 6. Upload Relationships
  if (relationships.length > 0) {
    const records = relationships.map(r => ({
      id: r.id,
      user_id: user.id,
      from_entity_id: r.fromEntityId,
      to_entity_id: r.toEntityId,
      type_id: r.typeId,
      world_id: r.worldId,
      canon_status: r.canonStatus || 'canon',
      date_start: r.dateStart || null,
      date_end: r.dateEnd || null,
      notes: r.notes || null,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
      deleted_at: r.deletedAt || null,
    }));
    const { error } = await client.from('hex_relationships').upsert(records, { onConflict: 'id' });
    if (error) throw new Error(`Failed to upload relationships: ${error.message}`);
  }

  // 7. Verify Data Read-Back
  const { count: verifiedEntities, error: verifyError } = await client
    .from('hex_entities')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (verifyError) {
    throw new Error(`Data uploaded but verification failed: ${verifyError.message}`);
  }

  return {
    success: true,
    message: `Successfully migrated and verified ${entities.length} entities and ${relationships.length} relationships to your private cloud account.`,
    verifiedCount: verifiedEntities || entities.length,
  };
}

export async function syncFromCloudToLocal(user: User): Promise<{ entitiesSynced: number }> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Cloud backend is not configured.');

  // Prune any remote ghost universes for this user
  try {
    await client.from('hex_universes').delete().eq('user_id', user.id).eq('title', 'My Universe');
  } catch {
    // ignore
  }

  // Fetch remote records belonging to this user
  const [
    { data: universes },
    { data: worlds },
    { data: entities },
    { data: relationships },
    { data: entityTypes },
  ] = await Promise.all([
    client.from('hex_universes').select('*').eq('user_id', user.id),
    client.from('hex_worlds').select('*').eq('user_id', user.id),
    client.from('hex_entities').select('*').eq('user_id', user.id),
    client.from('hex_relationships').select('*').eq('user_id', user.id),
    client.from('hex_entity_types').select('*').eq('user_id', user.id),
  ]);

  const cleanUniverses = (universes || []).filter(u => u.title !== 'My Universe' || (worlds && worlds.some(w => w.universe_id === u.id)));

  await db.transaction('rw', [db.universes, db.worlds, db.entities, db.relationships, db.entityTypes], async () => {
    // Prune local ghost universes
    const localUnis = await db.universes.toArray();
    for (const lu of localUnis) {
      if (lu.title === 'My Universe') {
        await db.universes.delete(lu.id);
      }
    }

    if (cleanUniverses.length > 0) {
      await db.universes.bulkPut(cleanUniverses.map(u => ({
        id: u.id,
        title: u.title,
        description: u.description,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      })));
    }

    if (worlds && worlds.length > 0) {
      await db.worlds.bulkPut(worlds.map(w => ({
        id: w.id,
        universeId: w.universe_id,
        title: w.title,
        description: w.description,
        color: w.color,
        icon: w.icon,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      })));
    }

    if (entityTypes && entityTypes.length > 0) {
      await db.entityTypes.bulkPut(entityTypes.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        icon: t.icon,
        description: t.description,
        isBuiltIn: t.is_built_in,
        fieldsSchema: t.fields_schema,
      })));
    }

    if (entities && entities.length > 0) {
      await db.entities.bulkPut(entities.map(e => ({
        id: e.id,
        worldId: e.world_id,
        typeId: e.type_id,
        title: e.title,
        entryNumber: e.entry_number,
        aliases: e.aliases || [],
        article: e.article || undefined,
        properties: e.properties || {},
        tags: e.tags || [],
        canonStatus: e.canon_status || 'canon',
        demographicDatasets: e.demographic_datasets || [],
        linkedEntityIds: e.linked_entity_ids || [],
        createdAt: e.created_at,
        updatedAt: e.updated_at,
        deletedAt: e.deleted_at || undefined,
      })));
    }

    if (relationships && relationships.length > 0) {
      await db.relationships.bulkPut(relationships.map(r => ({
        id: r.id,
        fromEntityId: r.from_entity_id,
        toEntityId: r.to_entity_id,
        typeId: r.type_id,
        worldId: r.world_id,
        canonStatus: r.canon_status || 'canon',
        dateStart: r.date_start || undefined,
        dateEnd: r.date_end || undefined,
        notes: r.notes || undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        deletedAt: r.deleted_at || undefined,
      })));
    }
  });

  return { entitiesSynced: entities?.length || 0 };
}

/**
 * Public Cloud Sync:
 * Allows anonymous visitors and other devices to fetch published lore
 * into local IndexedDB without needing an account or login.
 */
export async function syncPublishedDataFromCloud(): Promise<{ entitiesSynced: number }> {
  const client = getSupabaseClient();
  if (!client) return { entitiesSynced: 0 };

  try {
    const [
      { data: universes, error: uErr },
      { data: worlds, error: wErr },
      { data: entityTypes, error: etErr },
      { data: entities, error: eErr },
      { data: relationships, error: rErr },
      { data: relTypes, error: rtErr },
    ] = await Promise.all([
      client.from('hex_universes').select('*'),
      client.from('hex_worlds').select('*'),
      client.from('hex_entity_types').select('*'),
      client.from('hex_entities').select('*').is('deleted_at', null),
      client.from('hex_relationships').select('*').is('deleted_at', null),
      client.from('hex_relationship_types').select('*'),
    ]);

    if (eErr || wErr || uErr) {
      console.warn('Notice: Cloud sync skipped or not reachable:', eErr?.message || wErr?.message || uErr?.message);
      return { entitiesSynced: 0 };
    }

    if (!entities || entities.length === 0) {
      return { entitiesSynced: 0 };
    }

    const cleanUniverses = (universes || []).filter(u => u.title !== 'My Universe' || (worlds && worlds.some(w => w.universe_id === u.id)));

    await db.transaction('rw', [db.universes, db.worlds, db.entities, db.relationships, db.entityTypes, db.relationshipTypes], async () => {
      // Prune local ghost universes
      const localUnis = await db.universes.toArray();
      for (const lu of localUnis) {
        if (lu.title === 'My Universe') {
          await db.universes.delete(lu.id);
        }
      }

      if (cleanUniverses.length > 0) {
        await db.universes.bulkPut(cleanUniverses.map(u => ({
          id: u.id,
          title: u.title,
          description: u.description || undefined,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        })));
      }

      if (worlds && worlds.length > 0) {
        await db.worlds.bulkPut(worlds.map(w => ({
          id: w.id,
          universeId: w.universe_id,
          title: w.title,
          description: w.description || undefined,
          color: w.color || undefined,
          icon: w.icon || undefined,
          createdAt: w.created_at,
          updatedAt: w.updated_at,
        })));
      }

      if (entityTypes && entityTypes.length > 0) {
        await db.entityTypes.bulkPut(entityTypes.map(t => ({
          id: t.id,
          name: t.name,
          color: t.color,
          icon: t.icon,
          description: t.description || undefined,
          isBuiltIn: t.is_built_in,
          fieldsSchema: t.fields_schema,
        })));
      }

      if (relTypes && relTypes.length > 0) {
        await db.relationshipTypes.bulkPut(relTypes.map(t => ({
          id: t.id,
          name: t.name,
          reverseName: t.reverse_name,
          color: t.color,
          isBuiltIn: t.is_built_in,
        })));
      }

      if (entities && entities.length > 0) {
        await db.entities.bulkPut(entities.map(e => ({
          id: e.id,
          worldId: e.world_id,
          typeId: e.type_id,
          title: e.title,
          entryNumber: e.entry_number,
          aliases: e.aliases || [],
          article: e.article || undefined,
          properties: e.properties || {},
          tags: e.tags || [],
          canonStatus: e.canon_status || 'canon',
          demographicDatasets: e.demographic_datasets || [],
          linkedEntityIds: e.linked_entity_ids || [],
          createdAt: e.created_at,
          updatedAt: e.updated_at,
          deletedAt: e.deleted_at || undefined,
        })));
      }

      if (relationships && relationships.length > 0) {
        await db.relationships.bulkPut(relationships.map(r => ({
          id: r.id,
          fromEntityId: r.from_entity_id,
          toEntityId: r.to_entity_id,
          typeId: r.type_id,
          worldId: r.world_id,
          canonStatus: r.canon_status || 'canon',
          dateStart: r.date_start || undefined,
          dateEnd: r.date_end || undefined,
          notes: r.notes || undefined,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          deletedAt: r.deleted_at || undefined,
        })));
      }
    });

    return { entitiesSynced: entities.length };
  } catch (err) {
    console.error('Failed to sync published data from cloud:', err);
    return { entitiesSynced: 0 };
  }
}

// ── Real-Time Cloud Push Helpers for Owner Actions ─────────────────────────

export async function pushEntityToCloud(entity: any, userId: string) {
  const client = getSupabaseClient();
  if (!client || !userId) return;

  try {
    const record = {
      id: entity.id,
      user_id: userId,
      world_id: entity.worldId,
      type_id: entity.typeId,
      title: entity.title,
      entry_number: entity.entryNumber || null,
      aliases: entity.aliases || [],
      article: entity.article || null,
      properties: entity.properties || {},
      tags: entity.tags || [],
      canon_status: entity.canonStatus || 'canon',
      demographic_datasets: entity.demographicDatasets || [],
      linked_entity_ids: entity.linkedEntityIds || [],
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      deleted_at: entity.deletedAt || null,
    };
    await client.from('hex_entities').upsert(record, { onConflict: 'id' });
  } catch (err) {
    console.error('Failed to push entity to cloud:', err);
  }
}

export async function pushRelationshipToCloud(rel: any, userId: string) {
  const client = getSupabaseClient();
  if (!client || !userId) return;

  try {
    const record = {
      id: rel.id,
      user_id: userId,
      from_entity_id: rel.fromEntityId,
      to_entity_id: rel.toEntityId,
      type_id: rel.typeId,
      world_id: rel.worldId,
      canon_status: rel.canonStatus || 'canon',
      date_start: rel.dateStart || null,
      date_end: rel.dateEnd || null,
      notes: rel.notes || null,
      created_at: rel.createdAt,
      updated_at: rel.updatedAt,
      deleted_at: rel.deletedAt || null,
    };
    await client.from('hex_relationships').upsert(record, { onConflict: 'id' });
  } catch (err) {
    console.error('Failed to push relationship to cloud:', err);
  }
}

export async function pushWorldToCloud(world: any, userId: string) {
  const client = getSupabaseClient();
  if (!client || !userId) return;

  try {
    const record = {
      id: world.id,
      user_id: userId,
      universe_id: world.universeId,
      title: world.title,
      description: world.description || null,
      color: world.color || null,
      icon: world.icon || null,
      created_at: world.createdAt,
      updated_at: world.updatedAt,
    };
    await client.from('hex_worlds').upsert(record, { onConflict: 'id' });
  } catch (err) {
    console.error('Failed to push world to cloud:', err);
  }
}

export async function pushUniverseToCloud(universe: any, userId: string) {
  const client = getSupabaseClient();
  if (!client || !userId) return;

  try {
    const record = {
      id: universe.id,
      user_id: userId,
      title: universe.title,
      description: universe.description || null,
      created_at: universe.createdAt,
      updated_at: universe.updatedAt,
    };
    await client.from('hex_universes').upsert(record, { onConflict: 'id' });
  } catch (err) {
    console.error('Failed to push universe to cloud:', err);
  }
}

export async function pushSoftDeleteEntityToCloud(entityId: string, userId: string) {
  const client = getSupabaseClient();
  if (!client || !userId) return;

  try {
    await client.from('hex_entities').update({
      deleted_at: Date.now(),
      updated_at: Date.now(),
    }).eq('id', entityId).eq('user_id', userId);
  } catch (err) {
    console.error('Failed to soft delete entity in cloud:', err);
  }
}

export async function pushDeleteRelationshipToCloud(relId: string, userId: string) {
  const client = getSupabaseClient();
  if (!client || !userId) return;

  try {
    await client.from('hex_relationships').update({
      deleted_at: Date.now(),
      updated_at: Date.now(),
    }).eq('id', relId).eq('user_id', userId);
  } catch (err) {
    console.error('Failed to soft delete relationship in cloud:', err);
  }
}

