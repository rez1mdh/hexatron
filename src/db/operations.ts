// src/db/operations.ts
// All read/write helpers. Components never touch db directly — they use these.

import { v4 as uuidv4 } from 'uuid';
import { db, type Entity, type World, type Universe, type Relationship, type EntityImage, type ChangeEvent, type EntityType, type RelationshipType } from './schema';

export type { Entity, World, Universe, Relationship, EntityImage, ChangeEvent, EntityType, RelationshipType } from './schema';

const CLIENT_ID = (() => {
  let id = localStorage.getItem('hexatron-client-id');
  if (!id) { id = uuidv4(); localStorage.setItem('hexatron-client-id', id); }
  return id;
})();

// ── Helpers ────────────────────────────────────────────────────────────────

import { linkMentionsInArticleString } from '../utils/entityLinker';

export function extractLinkedEntityIds(article?: string): string[] {
  if (!article) return [];
  try {
    const doc = JSON.parse(article);
    const ids: string[] = [];
    function walk(node: Record<string, unknown>) {
      if (node.type === 'entityLink' && node.attrs && (node.attrs as Record<string,unknown>).entityId) {
        ids.push((node.attrs as Record<string,unknown>).entityId as string);
      }
      if (Array.isArray(node.content)) {
        (node.content as Record<string, unknown>[]).forEach(walk);
      }
    }
    walk(doc);
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

export async function autoLinkEntitiesInWorld(worldId?: string): Promise<number> {
  const allEntities = await db.entities.filter(e => !e.deletedAt).toArray();
  const targetEntities = worldId ? allEntities.filter(e => e.worldId === worldId) : allEntities;
  let updatedCount = 0;

  for (const ent of targetEntities) {
    if (!ent.article) continue;
    const worldCandidates = allEntities.filter(e => e.worldId === ent.worldId);
    const updatedArticle = linkMentionsInArticleString(ent.article, worldCandidates, ent.id);
    if (updatedArticle && updatedArticle !== ent.article) {
      const linkedEntityIds = extractLinkedEntityIds(updatedArticle);
      await db.entities.update(ent.id, {
        article: updatedArticle,
        linkedEntityIds,
        updatedAt: Date.now(),
      });
      updatedCount++;
    }
  }
  return updatedCount;
}

async function appendChange(table: string, operation: ChangeEvent['operation'], payload: unknown, entityId?: string) {
  await db.changes.add({
    id: uuidv4(),
    table,
    operation,
    entityId,
    payload: JSON.stringify(payload),
    clientId: CLIENT_ID,
    createdAt: Date.now(),
  });
}

// ── Universes ──────────────────────────────────────────────────────────────

export async function getUniverses() {
  return db.universes.toArray();
}

export async function createUniverse(title: string, description?: string): Promise<Universe> {
  const now = Date.now();
  const record: Universe = { id: uuidv4(), title, description, createdAt: now, updatedAt: now };
  await db.universes.add(record);
  await appendChange('universes', 'create', record);
  return record;
}

export async function updateUniverse(id: string, patch: Partial<Pick<Universe, 'title' | 'description'>>) {
  const updated = { ...patch, updatedAt: Date.now() };
  await db.universes.update(id, updated);
  const full = await db.universes.get(id);
  await appendChange('universes', 'update', full, id);
}

// ── Worlds ─────────────────────────────────────────────────────────────────

export async function getWorlds(universeId?: string) {
  if (universeId) return db.worlds.where('universeId').equals(universeId).toArray();
  return db.worlds.toArray();
}

export async function getWorld(id: string) {
  return db.worlds.get(id);
}

export async function createWorld(universeId: string, title: string, description?: string, color?: string): Promise<World> {
  const now = Date.now();
  const record: World = { id: uuidv4(), universeId, title, description, color, createdAt: now, updatedAt: now };
  await db.worlds.add(record);
  await appendChange('worlds', 'create', record);
  return record;
}

export async function updateWorld(id: string, patch: Partial<Pick<World, 'title' | 'description' | 'color' | 'icon'>>) {
  const updated = { ...patch, updatedAt: Date.now() };
  await db.worlds.update(id, updated);
  const full = await db.worlds.get(id);
  await appendChange('worlds', 'update', full);
}

export async function deleteWorld(id: string) {
  await deleteWorldCascade(id);
}

export async function deleteWorldCascade(worldId: string): Promise<void> {
  const entities = await db.entities.where('worldId').equals(worldId).toArray();
  const entityIds = entities.map(e => e.id);

  // Delete relationships attached to this world or its entities
  const rels = await db.relationships
    .filter(r => r.worldId === worldId || entityIds.includes(r.fromEntityId) || entityIds.includes(r.toEntityId))
    .toArray();
  for (const r of rels) {
    await db.relationships.delete(r.id);
  }

  // Delete images and entities
  for (const eid of entityIds) {
    const imgs = await db.images.where('entityId').equals(eid).toArray();
    for (const img of imgs) {
      await db.images.delete(img.id);
    }
    await db.entities.delete(eid);
  }

  // Delete world record
  await db.worlds.delete(worldId);
  await appendChange('worlds', 'delete', { id: worldId });
}

export async function deleteUniverseCascade(universeId: string): Promise<void> {
  const worlds = await db.worlds.where('universeId').equals(universeId).toArray();
  for (const w of worlds) {
    await deleteWorldCascade(w.id);
  }
  await db.universes.delete(universeId);
  await appendChange('universes', 'delete', { id: universeId });
}

export async function getWorldStats(worldId: string): Promise<{ entityCount: number; relationshipCount: number }> {
  const entityCount = await db.entities.where('worldId').equals(worldId).filter(e => !e.deletedAt).count();
  const relationshipCount = await db.relationships.where('worldId').equals(worldId).filter(r => !r.deletedAt).count();
  return { entityCount, relationshipCount };
}

export async function getUniverseStats(universeId: string): Promise<{ worldCount: number; entityCount: number; relationshipCount: number }> {
  const worlds = await db.worlds.where('universeId').equals(universeId).toArray();
  const worldIds = new Set(worlds.map(w => w.id));
  const entityCount = await db.entities.filter(e => worldIds.has(e.worldId) && !e.deletedAt).count();
  const relationshipCount = await db.relationships.filter(r => worldIds.has(r.worldId) && !r.deletedAt).count();
  return { worldCount: worlds.length, entityCount, relationshipCount };
}

// ── Entities ───────────────────────────────────────────────────────────────

// ── Entry Number Helpers ───────────────────────────────────────────────────

export function formatEntryNumber(num?: number): string {
  if (num === undefined || num === null || isNaN(num)) return '';
  return `#${String(num).padStart(3, '0')}`;
}

export async function getNextEntryNumber(): Promise<number> {
  const storedSeq = parseInt(localStorage.getItem('hexatron-entry-seq') || '0', 10);
  const entities = await db.entities.toArray();
  let max = isNaN(storedSeq) ? 0 : storedSeq;
  for (const e of entities) {
    if (typeof e.entryNumber === 'number' && e.entryNumber > max) {
      max = e.entryNumber;
    }
  }
  const next = max + 1;
  localStorage.setItem('hexatron-entry-seq', String(next));
  return next;
}

export async function ensureEntityEntryNumbers(): Promise<void> {
  const entities = await db.entities.toArray();
  const withoutNumber = entities.filter(e => typeof e.entryNumber !== 'number');
  if (withoutNumber.length === 0) return;

  let currentMax = 0;
  for (const e of entities) {
    if (typeof e.entryNumber === 'number' && e.entryNumber > currentMax) {
      currentMax = e.entryNumber;
    }
  }
  const storedSeq = parseInt(localStorage.getItem('hexatron-entry-seq') || '0', 10);
  if (!isNaN(storedSeq) && storedSeq > currentMax) {
    currentMax = storedSeq;
  }

  // Sort unnumbered entities by creation date so older entities get earlier entry numbers
  withoutNumber.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  for (const e of withoutNumber) {
    currentMax += 1;
    await db.entities.update(e.id, { entryNumber: currentMax });
  }
  localStorage.setItem('hexatron-entry-seq', String(currentMax));
}

export async function getEntities(worldId?: string) {
  if (worldId) {
    return db.entities.where('worldId').equals(worldId).filter(e => !e.deletedAt).toArray();
  }
  return db.entities.filter(e => !e.deletedAt).toArray();
}

export async function getRecentlyEditedEntities(limit = 8): Promise<Entity[]> {
  try {
    return await db.entities
      .orderBy('updatedAt')
      .reverse()
      .filter(e => !e.deletedAt)
      .limit(limit)
      .toArray();
  } catch {
    const all = await db.entities.filter(e => !e.deletedAt).toArray();
    return all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, limit);
  }
}

export async function getEntity(id: string) {
  const direct = await db.entities.get(id);
  if (direct) return direct;

  // Fallback: lookup by alias, legacy ID, sourceId, or lowercase title
  const idLower = id.toLowerCase().trim();
  const matched = await db.entities.filter(e => {
    if (e.deletedAt) return false;
    if (e.title.toLowerCase() === idLower) return true;
    if (e.aliases && e.aliases.some(a => a.toLowerCase() === idLower)) return true;
    const props = e.properties as Record<string, unknown> | undefined;
    if (props && (props.legacyId === id || props.sourceId === id)) return true;
    return false;
  }).first();

  return matched;
}

export async function searchEntities(query: string, worldId?: string): Promise<Entity[]> {
  const q = query.toLowerCase().trim();
  const cleanQ = q.startsWith('#') ? q.slice(1) : q;
  let collection = db.entities.filter(e => !e.deletedAt);
  if (worldId) collection = collection.filter(e => e.worldId === worldId);
  const results = await collection.toArray();
  return results.filter(e => {
    const entryNumStr = e.entryNumber !== undefined ? String(e.entryNumber) : '';
    const formattedNum = formatEntryNumber(e.entryNumber).toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      formattedNum.includes(q) ||
      (cleanQ.length > 0 && entryNumStr === cleanQ) ||
      (cleanQ.length > 0 && entryNumStr.padStart(3, '0') === cleanQ) ||
      e.aliases.some(a => a.toLowerCase().includes(q)) ||
      e.tags.some(t => t.toLowerCase().includes(q)) ||
      (e.article && e.article.toLowerCase().includes(q))
    );
  });
}

export async function createEntity(data: Omit<Entity, 'id' | 'createdAt' | 'updatedAt' | 'linkedEntityIds'>): Promise<Entity> {
  const now = Date.now();
  const linkedEntityIds = extractLinkedEntityIds(data.article);
  const entryNumber = data.entryNumber ?? (await getNextEntryNumber());
  const record: Entity = { ...data, entryNumber, id: uuidv4(), linkedEntityIds, createdAt: now, updatedAt: now };
  await db.entities.add(record);
  await appendChange('entities', 'create', record, record.id);
  return record;
}

export async function updateEntity(id: string, patch: Partial<Omit<Entity, 'id' | 'createdAt' | 'worldId'>>): Promise<void> {
  const now = Date.now();
  const existing = await db.entities.get(id);
  if (!existing) throw new Error(`Entity ${id} not found`);
  const article = patch.article !== undefined ? patch.article : existing.article;
  const linkedEntityIds = extractLinkedEntityIds(article);
  const updated = { ...patch, linkedEntityIds, updatedAt: now };
  await db.entities.update(id, updated);
  const full = await db.entities.get(id);
  await appendChange('entities', 'update', full, id);
}

export async function softDeleteEntity(id: string) {
  const now = Date.now();
  await db.entities.update(id, { deletedAt: now, updatedAt: now });
  await appendChange('entities', 'delete', { id }, id);
}

export async function deleteEntityPermanently(id: string) {
  await db.entities.delete(id);
  // Also clean up any relationships attached to this entity
  const rels = await db.relationships
    .filter(r => r.fromEntityId === id || r.toEntityId === id)
    .toArray();
  for (const r of rels) {
    await db.relationships.delete(r.id);
  }
  await appendChange('entities', 'delete', { id });
}

// ── Backlinks ──────────────────────────────────────────────────────────────

export async function getBacklinks(entityId: string): Promise<Entity[]> {
  return db.entities
    .filter(e => !e.deletedAt && Array.isArray(e.linkedEntityIds) && e.linkedEntityIds.includes(entityId))
    .toArray();
}

// ── Relationships ──────────────────────────────────────────────────────────

export async function getRelationships(entityId?: string): Promise<Relationship[]> {
  if (!entityId) {
    return db.relationships.filter(r => !r.deletedAt).toArray();
  }
  const from = await db.relationships.where('fromEntityId').equals(entityId).filter(r => !r.deletedAt).toArray();
  const to   = await db.relationships.where('toEntityId').equals(entityId).filter(r => !r.deletedAt).toArray();
  return [...from, ...to];
}

export async function createRelationship(data: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>): Promise<Relationship> {
  const now = Date.now();
  const record: Relationship = { ...data, id: uuidv4(), createdAt: now, updatedAt: now };
  await db.relationships.add(record);
  await appendChange('relationships', 'create', record);
  return record;
}

export async function deleteRelationship(id: string) {
  const now = Date.now();
  await db.relationships.update(id, { deletedAt: now, updatedAt: now });
  await appendChange('relationships', 'delete', { id });
}

// ── Images & Media ──────────────────────────────────────────────────────────

export async function getImages(entityId: string): Promise<EntityImage[]> {
  return db.images.where('entityId').equals(entityId).sortBy('sortOrder');
}

export async function addImage(data: Omit<EntityImage, 'id' | 'createdAt'>): Promise<EntityImage> {
  const record: EntityImage = {
    ...data,
    id: uuidv4(),
    createdAt: Date.now(),
    isOfflineAvailable: data.localBlob ? true : false,
    fileSize: data.localBlob ? data.localBlob.size : data.fileSize,
  };
  await db.images.add(record);
  await appendChange('images', 'create', { ...record, localBlob: undefined }); // don't serialise blob
  return record;
}

export async function updateImage(id: string, updates: Partial<EntityImage>): Promise<void> {
  await db.images.update(id, updates);
  await appendChange('images', 'update', { id, ...updates, localBlob: undefined });
}

export async function deleteImage(id: string): Promise<void> {
  await db.images.delete(id);
  await appendChange('images', 'delete', { id });
}

/**
 * Downloads remote media file into local IndexedDB for permanent offline access
 */
export async function downloadMediaForOffline(id: string): Promise<{ success: boolean; size?: number; error?: string }> {
  const media = await db.images.get(id);
  if (!media) return { success: false, error: 'Media record not found.' };

  const targetUrl = media.remoteUrl || media.remotePath;
  if (!targetUrl) {
    if (media.localBlob) {
      return { success: true, size: media.localBlob.size };
    }
    return { success: false, error: 'No remote URL available to download.' };
  }

  // Check quota if available
  if (navigator.storage && navigator.storage.estimate) {
    const { quota, usage } = await navigator.storage.estimate();
    if (quota && usage && quota - usage < 10 * 1024 * 1024) {
      return { success: false, error: 'Insufficient browser storage quota available.' };
    }
  }

  try {
    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const blob = await res.blob();
    await db.images.update(id, {
      localBlob: blob,
      fileSize: blob.size,
      mimeType: blob.type || media.mimeType,
      isOfflineAvailable: true,
    });
    return { success: true, size: blob.size };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Removes local offline copy of media without deleting the remote/online record
 */
export async function removeOfflineMediaCopy(id: string): Promise<void> {
  const media = await db.images.get(id);
  if (!media) return;
  // If no remote URL exists, retain the file so the user doesn't lose unique content
  if (!media.remoteUrl && !media.remotePath) {
    throw new Error('Cannot remove offline copy: this media only exists locally and has no remote URL.');
  }
  await db.images.update(id, {
    localBlob: undefined,
    isOfflineAvailable: false,
  });
}

/**
 * Lists all offline-downloaded media across all entities
 */
export async function getAllOfflineMedia(): Promise<EntityImage[]> {
  const all = await db.images.toArray();
  return all.filter(m => m.localBlob || m.isOfflineAvailable);
}

/**
 * Computes total offline media storage usage in bytes
 */
export async function getTotalOfflineStorageUsage(): Promise<number> {
  const offline = await getAllOfflineMedia();
  return offline.reduce((acc, m) => acc + (m.localBlob?.size || m.fileSize || 0), 0);
}

// ── Entity Types ───────────────────────────────────────────────────────────

export async function getEntityTypes(): Promise<EntityType[]> {
  return db.entityTypes.toArray();
}

export async function getEntityType(id: string): Promise<EntityType | undefined> {
  return db.entityTypes.get(id);
}

export async function createEntityType(typeData: Omit<EntityType, 'isBuiltIn'> & { isBuiltIn?: boolean }): Promise<EntityType> {
  const existing = await db.entityTypes.get(typeData.id);
  if (existing) {
    throw new Error(`An entity type with ID "${typeData.id}" already exists.`);
  }
  const record: EntityType = {
    ...typeData,
    isBuiltIn: typeData.isBuiltIn ?? false,
  };
  await db.entityTypes.add(record);
  await appendChange('entityTypes', 'create', record);
  return record;
}

export async function updateEntityType(id: string, patch: Partial<Omit<EntityType, 'id' | 'isBuiltIn'>>) {
  const existing = await db.entityTypes.get(id);
  if (!existing) throw new Error('Entity type not found');
  await db.entityTypes.update(id, patch);
  const updated = await db.entityTypes.get(id);
  await appendChange('entityTypes', 'update', updated);
  return updated;
}

export async function countEntitiesUsingType(typeId: string): Promise<number> {
  return db.entities.where('typeId').equals(typeId).filter(e => !e.deletedAt).count();
}

export async function deleteEntityType(id: string, force = false): Promise<{ success: boolean; count: number }> {
  const existing = await db.entityTypes.get(id);
  if (!existing) throw new Error('Entity type not found');
  const count = await countEntitiesUsingType(id);
  if (count > 0 && !force) {
    return { success: false, count };
  }
  await db.entityTypes.delete(id);
  await appendChange('entityTypes', 'delete', { id });
  return { success: true, count };
}

// ── Relationship Types ─────────────────────────────────────────────────────

export async function getRelationshipTypes(): Promise<RelationshipType[]> {
  return db.relationshipTypes.toArray();
}

export async function createRelationshipType(typeData: Omit<RelationshipType, 'isBuiltIn'> & { isBuiltIn?: boolean }): Promise<RelationshipType> {
  const existing = await db.relationshipTypes.get(typeData.id);
  if (existing) throw new Error(`Relationship type with ID "${typeData.id}" already exists.`);
  const record: RelationshipType = {
    ...typeData,
    isBuiltIn: typeData.isBuiltIn ?? false,
  };
  await db.relationshipTypes.add(record);
  await appendChange('relationshipTypes', 'create', record);
  return record;
}

// ── Relationships (Extended) ───────────────────────────────────────────────

export interface EntityRelationshipDetail {
  relationship: Relationship;
  relType?: RelationshipType;
  direction: 'outgoing' | 'incoming';
  otherEntity?: Entity;
}

export async function getEntityRelationshipsWithDetails(entityId: string): Promise<EntityRelationshipDetail[]> {
  const allRels = await getRelationships(entityId);
  const relTypes = await getRelationshipTypes();
  const typeMap = new Map(relTypes.map(t => [t.id, t]));

  const otherIds = [...new Set(allRels.map(r => r.fromEntityId === entityId ? r.toEntityId : r.fromEntityId))];
  const otherEntities = await Promise.all(otherIds.map(id => getEntity(id)));
  const entityMap = new Map<string, Entity>();
  otherEntities.forEach(e => { if (e) entityMap.set(e.id, e); });

  return allRels.map(r => {
    const isOutgoing = r.fromEntityId === entityId;
    const otherId = isOutgoing ? r.toEntityId : r.fromEntityId;
    return {
      relationship: r,
      relType: typeMap.get(r.typeId),
      direction: isOutgoing ? 'outgoing' : 'incoming',
      otherEntity: entityMap.get(otherId),
    };
  });
}

// ── Export / Import (V2 Self-Describing Format & Robust Modes) ────────────────

export interface HexatronBackupMetadata {
  universeCount: number;
  worldCount: number;
  entityCount: number;
  relationshipCount: number;
  entityTypeCount: number;
  relationshipTypeCount: number;
  imageCount: number;
  appVersion?: string;
}

export interface HexatronBackupData {
  universes: Universe[];
  worlds: World[];
  entityTypes: EntityType[];
  entities: Entity[];
  relationshipTypes: RelationshipType[];
  relationships: Relationship[];
  images: (Omit<EntityImage, 'localBlob'> & { dataUrl?: string })[];
}

export interface HexatronBackup {
  format: 'hexatron-backup';
  version: 2;
  app: 'Hexatron World Builder';
  schemaVersion: 2;
  exportedAt: string;
  metadata: HexatronBackupMetadata;
  data: HexatronBackupData;
}

export interface BackupValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  format: string;
  version: number;
  exportedAt?: string;
  counts: HexatronBackupMetadata;
  diff: {
    existingEntitiesCount: number;
    newEntitiesCount: number;
    conflictingEntryNumbers: number;
    unresolvedWorldRefs: number;
    unresolvedEntityRefs: number;
  };
  normalizedData?: HexatronBackupData;
}

export interface RestoreReport {
  success: boolean;
  mode: 'restore';
  restoredCounts: HexatronBackupMetadata;
}

export interface MergeReport {
  success: boolean;
  mode: 'merge';
  addedUniverses: number;
  addedWorlds: number;
  addedEntities: number;
  updatedEntities: number;
  addedRelationships: number;
  addedTypes: number;
  conflictsResolved: number;
}

async function safeBlobToDataUrl(blob: Blob): Promise<string | undefined> {
  if (typeof FileReader === 'undefined') return undefined;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(blob);
  });
}

function safeDataUrlToBlob(dataUrl: string): Blob | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const parts = dataUrl.split(';base64,');
    const contentType = parts[0]?.split(':')[1] || 'image/png';
    const raw = window.atob(parts[1] || '');
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
  } catch (err) {
    console.warn('Failed to convert dataUrl to Blob:', err);
    return undefined;
  }
}

export async function exportAll(): Promise<string> {
  const [universes, worlds, entityTypes, entities, relationshipTypes, relationships, rawImages] = await Promise.all([
    db.universes.toArray(),
    db.worlds.toArray(),
    db.entityTypes.toArray(),
    db.entities.toArray(),
    db.relationshipTypes.toArray(),
    db.relationships.toArray(),
    db.images.toArray(),
  ]);

  // Convert local image blobs to Base64 dataUrls so image assets survive backup/restore
  const images = await Promise.all(rawImages.map(async img => {
    let dataUrl: string | undefined = undefined;
    if (img.localBlob) {
      try {
        dataUrl = await safeBlobToDataUrl(img.localBlob);
      } catch (e) {
        console.warn('Failed to encode image blob to dataUrl:', e);
      }
    }
    const { localBlob, ...rest } = img;
    return { ...rest, dataUrl };
  }));

  const backup: HexatronBackup = {
    format: 'hexatron-backup',
    version: 2,
    app: 'Hexatron World Builder',
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    metadata: {
      universeCount: universes.length,
      worldCount: worlds.length,
      entityCount: entities.length,
      relationshipCount: relationships.length,
      entityTypeCount: entityTypes.length,
      relationshipTypeCount: relationshipTypes.length,
      imageCount: images.length,
      appVersion: '2.0.0',
    },
    data: {
      universes,
      worlds,
      entityTypes,
      entities,
      relationshipTypes,
      relationships,
      images,
    },
  };

  return JSON.stringify(backup, null, 2);
}

export async function validateBackup(jsonString: string): Promise<BackupValidationReport> {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return {
      isValid: false,
      errors: ['File is not valid JSON: ' + (e as Error).message],
      warnings: [],
      format: 'unknown',
      version: 0,
      counts: {
        universeCount: 0,
        worldCount: 0,
        entityCount: 0,
        relationshipCount: 0,
        entityTypeCount: 0,
        relationshipTypeCount: 0,
        imageCount: 0,
      },
      diff: {
        existingEntitiesCount: 0,
        newEntitiesCount: 0,
        conflictingEntryNumbers: 0,
        unresolvedWorldRefs: 0,
        unresolvedEntityRefs: 0,
      },
    };
  }

  // Detect format & version (support v2 "hexatron-backup" and legacy v1)
  const isV2 = parsed && parsed.format === 'hexatron-backup' && parsed.data;
  const isV1 = parsed && parsed.version === 1 && (parsed.entities || parsed.universes || parsed.worlds);

  if (!isV2 && !isV1 && !parsed.entities && !parsed.worlds) {
    errors.push('Unrecognized backup format. Expected a Hexatron backup file.');
  }

  const rawData = isV2 ? parsed.data : parsed;
  const universes: Universe[] = Array.isArray(rawData?.universes) ? rawData.universes : [];
  const worlds: World[] = Array.isArray(rawData?.worlds) ? rawData.worlds : [];
  const entityTypes: EntityType[] = Array.isArray(rawData?.entityTypes) ? rawData.entityTypes : [];
  const entities: Entity[] = Array.isArray(rawData?.entities) ? rawData.entities : [];
  const relationshipTypes: RelationshipType[] = Array.isArray(rawData?.relationshipTypes) ? rawData.relationshipTypes : [];
  const relationships: Relationship[] = Array.isArray(rawData?.relationships) ? rawData.relationships : [];
  const images = Array.isArray(rawData?.images) ? rawData.images : [];

  if (entities.length === 0 && worlds.length === 0 && universes.length === 0) {
    warnings.push('The backup file does not contain any universes, worlds, or entities.');
  }

  // Check malformed entities
  let malformedEntities = 0;
  for (const e of entities) {
    if (!e || typeof e !== 'object' || !e.id || !e.title) {
      malformedEntities++;
    }
  }
  if (malformedEntities > 0) {
    errors.push(`Found ${malformedEntities} malformed entity records missing an ID or title.`);
  }

  // Check world references
  const backupWorldIds = new Set(worlds.map(w => w.id));
  const currentWorldIds = new Set((await db.worlds.toArray()).map(w => w.id));
  let unresolvedWorldRefs = 0;
  for (const e of entities) {
    if (e.worldId && !backupWorldIds.has(e.worldId) && !currentWorldIds.has(e.worldId)) {
      unresolvedWorldRefs++;
    }
  }
  if (unresolvedWorldRefs > 0) {
    warnings.push(`${unresolvedWorldRefs} entities reference worlds not found in this backup or current database.`);
  }

  // Check relationship entity references
  const backupEntityIds = new Set(entities.map(e => e.id));
  const currentEntityIds = new Set((await db.entities.toArray()).map(e => e.id));
  let unresolvedEntityRefs = 0;
  for (const r of relationships) {
    const fromExists = backupEntityIds.has(r.fromEntityId) || currentEntityIds.has(r.fromEntityId);
    const toExists = backupEntityIds.has(r.toEntityId) || currentEntityIds.has(r.toEntityId);
    if (!fromExists || !toExists) {
      unresolvedEntityRefs++;
    }
  }
  if (unresolvedEntityRefs > 0) {
    warnings.push(`${unresolvedEntityRefs} relationships reference entities that are not present.`);
  }

  // Check diff with current database
  const currentEntities = await db.entities.toArray();
  const currentEntitiesById = new Map(currentEntities.map(e => [e.id, e]));
  const currentEntryNumbers = new Map<number, Entity>();
  for (const ce of currentEntities) {
    if (ce.entryNumber !== undefined) {
      currentEntryNumbers.set(ce.entryNumber, ce);
    }
  }

  let existingEntitiesCount = 0;
  let newEntitiesCount = 0;
  let conflictingEntryNumbers = 0;

  for (const e of entities) {
    if (currentEntitiesById.has(e.id)) {
      existingEntitiesCount++;
    } else {
      newEntitiesCount++;
      if (e.entryNumber !== undefined) {
        const conflict = currentEntryNumbers.get(e.entryNumber);
        if (conflict && conflict.id !== e.id) {
          conflictingEntryNumbers++;
        }
      }
    }
  }

  if (conflictingEntryNumbers > 0) {
    warnings.push(`${conflictingEntryNumbers} incoming entities have entry numbers matching different entities in the current database. During merge, these will be assigned unique new entry numbers to prevent conflicts.`);
  }

  const counts: HexatronBackupMetadata = {
    universeCount: universes.length,
    worldCount: worlds.length,
    entityCount: entities.length,
    relationshipCount: relationships.length,
    entityTypeCount: entityTypes.length,
    relationshipTypeCount: relationshipTypes.length,
    imageCount: images.length,
    appVersion: parsed.appVersion || '2.0.0',
  };

  const normalizedData: HexatronBackupData = {
    universes,
    worlds,
    entityTypes,
    entities,
    relationshipTypes,
    relationships,
    images,
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    format: isV2 ? 'hexatron-backup v2' : (isV1 ? 'legacy v1' : 'custom/partial'),
    version: parsed.version || (isV2 ? 2 : 1),
    exportedAt: parsed.exportedAt,
    counts,
    diff: {
      existingEntitiesCount,
      newEntitiesCount,
      conflictingEntryNumbers,
      unresolvedWorldRefs,
      unresolvedEntityRefs,
    },
    normalizedData,
  };
}

export async function restoreBackup(
  backupData: HexatronBackupData,
  options: { createSnapshot?: boolean } = { createSnapshot: true }
): Promise<RestoreReport> {
  // 1. Create safety snapshot in localStorage if requested
  if (options.createSnapshot && typeof localStorage !== 'undefined') {
    try {
      const currentJson = await exportAll();
      localStorage.setItem('hexatron-pre-restore-snapshot', currentJson);
      localStorage.setItem('hexatron-pre-restore-snapshot-time', new Date().toISOString());
    } catch (e) {
      console.warn('Failed to save pre-restore snapshot to localStorage:', e);
    }
  }

  // 2. Clear existing data and bulk put incoming records in a single transaction
  await db.transaction('rw',
    [db.universes, db.worlds, db.entityTypes, db.entities, db.relationshipTypes, db.relationships, db.images],
    async () => {
      // Clear data tables
      await Promise.all([
        db.universes.clear(),
        db.worlds.clear(),
        db.entities.clear(),
        db.relationships.clear(),
        db.images.clear(),
      ]);

      // Insert backup data
      if (backupData.universes?.length) await db.universes.bulkPut(backupData.universes);
      if (backupData.worlds?.length) await db.worlds.bulkPut(backupData.worlds);
      if (backupData.entityTypes?.length) await db.entityTypes.bulkPut(backupData.entityTypes);
      if (backupData.relationshipTypes?.length) await db.relationshipTypes.bulkPut(backupData.relationshipTypes);
      if (backupData.entities?.length) await db.entities.bulkPut(backupData.entities);
      if (backupData.relationships?.length) await db.relationships.bulkPut(backupData.relationships);

      // Restore images with blobs
      if (backupData.images?.length) {
        const restoredImages = backupData.images.map(img => {
          let localBlob: Blob | undefined = undefined;
          if (img.dataUrl) {
            localBlob = safeDataUrlToBlob(img.dataUrl);
          }
          const { dataUrl, ...rest } = img;
          return { ...rest, localBlob };
        });
        await db.images.bulkPut(restoredImages);
      }
    }
  );

  await ensureEntityEntryNumbers();

  // Flag so that AppInit does not overwrite or re-seed default Aurythar over this restored data
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('hexatron-aurythar-imported', 'true');
  }

  return {
    success: true,
    mode: 'restore',
    restoredCounts: {
      universeCount: backupData.universes.length,
      worldCount: backupData.worlds.length,
      entityCount: backupData.entities.length,
      relationshipCount: backupData.relationships.length,
      entityTypeCount: backupData.entityTypes.length,
      relationshipTypeCount: backupData.relationshipTypes.length,
      imageCount: backupData.images.length,
    },
  };
}

export async function mergeBackup(backupData: HexatronBackupData): Promise<MergeReport> {
  let addedUniverses = 0;
  let addedWorlds = 0;
  let addedEntities = 0;
  let updatedEntities = 0;
  let addedRelationships = 0;
  let addedTypes = 0;
  let conflictsResolved = 0;

  // Existing DB index lookups
  const existingUniverses = new Set((await db.universes.toArray()).map(u => u.id));
  const existingWorlds = new Set((await db.worlds.toArray()).map(w => w.id));
  const existingEntities = await db.entities.toArray();
  const existingEntityMap = new Map(existingEntities.map(e => [e.id, e]));
  const existingEntryNumbers = new Set(existingEntities.map(e => e.entryNumber).filter(n => n !== undefined));

  const existingTypes = new Set((await db.entityTypes.toArray()).map(t => t.id));
  const existingRelTypes = new Set((await db.relationshipTypes.toArray()).map(t => t.id));
  const existingRels = await db.relationships.toArray();
  const existingRelKeys = new Set(existingRels.map(r => `${r.fromEntityId}_${r.toEntityId}_${r.typeId}`));

  // Merge universes
  for (const u of backupData.universes || []) {
    if (!existingUniverses.has(u.id)) {
      await db.universes.add(u);
      addedUniverses++;
    }
  }

  // Merge worlds
  for (const w of backupData.worlds || []) {
    if (!existingWorlds.has(w.id)) {
      await db.worlds.add(w);
      addedWorlds++;
    }
  }

  // Merge entity types & relationship types
  for (const et of backupData.entityTypes || []) {
    if (!existingTypes.has(et.id)) {
      await db.entityTypes.add(et);
      addedTypes++;
    }
  }
  for (const rt of backupData.relationshipTypes || []) {
    if (!existingRelTypes.has(rt.id)) {
      await db.relationshipTypes.add(rt);
      addedTypes++;
    }
  }

  // Merge entities
  let nextAvailNum = await getNextEntryNumber();
  const entitiesToPut: Entity[] = [];

  for (const incoming of backupData.entities || []) {
    const existing = existingEntityMap.get(incoming.id);
    if (existing) {
      // Entity already exists with this stable ID: update if incoming has newer updatedAt
      if ((incoming.updatedAt || 0) > (existing.updatedAt || 0)) {
        entitiesToPut.push({
          ...incoming,
          entryNumber: existing.entryNumber ?? incoming.entryNumber, // preserve established entryNumber
        });
        updatedEntities++;
      }
    } else {
      // New entity
      let assignedEntryNumber = incoming.entryNumber;
      if (assignedEntryNumber !== undefined && existingEntryNumbers.has(assignedEntryNumber)) {
        // Collision with another entity: assign new unique number
        assignedEntryNumber = nextAvailNum++;
        conflictsResolved++;
      } else if (assignedEntryNumber === undefined) {
        assignedEntryNumber = nextAvailNum++;
      }
      if (assignedEntryNumber !== undefined) {
        existingEntryNumbers.add(assignedEntryNumber);
      }
      entitiesToPut.push({
        ...incoming,
        entryNumber: assignedEntryNumber,
      });
      addedEntities++;
    }
  }

  if (entitiesToPut.length > 0) {
    await db.entities.bulkPut(entitiesToPut);
  }

  // Merge relationships
  const relsToAdd: Relationship[] = [];
  for (const r of backupData.relationships || []) {
    const key = `${r.fromEntityId}_${r.toEntityId}_${r.typeId}`;
    if (!existingRelKeys.has(key)) {
      relsToAdd.push(r);
      existingRelKeys.add(key);
      addedRelationships++;
    }
  }
  if (relsToAdd.length > 0) {
    await db.relationships.bulkPut(relsToAdd);
  }

  // Merge images
  const existingImageIds = new Set((await db.images.toArray()).map(img => img.id));
  const imagesToAdd: EntityImage[] = [];
  for (const img of backupData.images || []) {
    if (!existingImageIds.has(img.id)) {
      let localBlob: Blob | undefined = undefined;
      if (img.dataUrl) {
        localBlob = safeDataUrlToBlob(img.dataUrl);
      }
      const { dataUrl, ...rest } = img;
      imagesToAdd.push({ ...rest, localBlob });
    }
  }
  if (imagesToAdd.length > 0) {
    await db.images.bulkPut(imagesToAdd);
  }

  await ensureEntityEntryNumbers();

  return {
    success: true,
    mode: 'merge',
    addedUniverses,
    addedWorlds,
    addedEntities,
    updatedEntities,
    addedRelationships,
    addedTypes,
    conflictsResolved,
  };
}

export async function importAll(jsonString: string): Promise<void> {
  const report = await validateBackup(jsonString);
  if (!report.isValid || !report.normalizedData) {
    throw new Error(report.errors.join('; ') || 'Invalid backup file');
  }
  await restoreBackup(report.normalizedData);
}

// ── Hierarchical Parent-Child Operations ───────────────────────────────────

export async function getParentEntity(entityId: string): Promise<Entity | null> {
  const ent = await db.entities.get(entityId);
  if (!ent || ent.deletedAt) return null;

  // 1. Direct parentId
  if (ent.parentId) {
    const parent = await db.entities.get(ent.parentId);
    if (parent && !parent.deletedAt) return parent;
  }

  // 2. Properties fallback (parentId, parent_id, part_of)
  const propParent = ent.properties?.parentId || ent.properties?.parent_id || ent.properties?.part_of;
  if (typeof propParent === 'string' && propParent) {
    const parent = await db.entities.get(propParent);
    if (parent && !parent.deletedAt) return parent;
  }

  // 3. rt-part-of relationship (child -> parent)
  const partOfRel = await db.relationships
    .where('fromEntityId').equals(entityId)
    .filter(r => !r.deletedAt && r.typeId === 'rt-part-of')
    .first();
  if (partOfRel) {
    const parent = await db.entities.get(partOfRel.toEntityId);
    if (parent && !parent.deletedAt) return parent;
  }

  // 4. rt-parent-of relationship (parent -> child)
  const parentOfRel = await db.relationships
    .where('toEntityId').equals(entityId)
    .filter(r => !r.deletedAt && r.typeId === 'rt-parent-of')
    .first();
  if (parentOfRel) {
    const parent = await db.entities.get(parentOfRel.fromEntityId);
    if (parent && !parent.deletedAt) return parent;
  }

  return null;
}

export async function getChildEntities(parentEntityId: string): Promise<Entity[]> {
  const childMap = new Map<string, Entity>();

  // 1. Directly indexed parentId
  const directChildren = await db.entities
    .where('parentId').equals(parentEntityId)
    .filter(e => !e.deletedAt)
    .toArray();
  for (const c of directChildren) {
    childMap.set(c.id, c);
  }

  // 2. Query rt-part-of relationships (child -> parent)
  const partOfRels = await db.relationships
    .where('toEntityId').equals(parentEntityId)
    .filter(r => !r.deletedAt && r.typeId === 'rt-part-of')
    .toArray();
  for (const r of partOfRels) {
    if (!childMap.has(r.fromEntityId)) {
      const c = await db.entities.get(r.fromEntityId);
      if (c && !c.deletedAt) childMap.set(c.id, c);
    }
  }

  // 3. Query rt-parent-of relationships (parent -> child)
  const parentOfRels = await db.relationships
    .where('fromEntityId').equals(parentEntityId)
    .filter(r => !r.deletedAt && r.typeId === 'rt-parent-of')
    .toArray();
  for (const r of parentOfRels) {
    if (!childMap.has(r.toEntityId)) {
      const c = await db.entities.get(r.toEntityId);
      if (c && !c.deletedAt) childMap.set(c.id, c);
    }
  }

  // Sort children by entryNumber if available, or sortOrder, or title
  const result = Array.from(childMap.values());
  result.sort((a, b) => {
    if (typeof a.sortOrder === 'number' && typeof b.sortOrder === 'number') {
      return a.sortOrder - b.sortOrder;
    }
    if (typeof a.entryNumber === 'number' && typeof b.entryNumber === 'number') {
      return a.entryNumber - b.entryNumber;
    }
    return a.title.localeCompare(b.title);
  });
  return result;
}

/**
 * Validates whether candidateDescendantId is a descendant of ancestorId.
 * Used to strictly prevent circular folder nesting.
 */
export async function isDescendantOf(candidateDescendantId: string, ancestorId: string): Promise<boolean> {
  if (candidateDescendantId === ancestorId) return true;
  const visited = new Set<string>();
  let currentId: string | undefined = candidateDescendantId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const parent = await getParentEntity(currentId);
    if (!parent) break;
    if (parent.id === ancestorId) return true;
    currentId = parent.id;
  }
  return false;
}

export async function updateEntityParent(
  entityId: string,
  newParentId: string | undefined,
  newOrder?: number
): Promise<void> {
  if (newParentId === entityId) {
    throw new Error('An entity cannot be its own parent.');
  }

  if (newParentId) {
    const wouldCreateCycle = await isDescendantOf(newParentId, entityId);
    if (wouldCreateCycle) {
      throw new Error('Circular hierarchy detected: cannot move an entity inside its own child or descendant.');
    }
  }

  const existing = await db.entities.get(entityId);
  if (!existing) throw new Error(`Entity ${entityId} not found.`);

  const now = Date.now();
  const updatedProps = {
    ...(existing.properties || {}),
    parentId: newParentId || null,
    part_of: newParentId || null,
  };

  const patch: Partial<Entity> = {
    parentId: newParentId,
    properties: updatedProps,
    updatedAt: now,
  };
  if (newOrder !== undefined) {
    patch.sortOrder = newOrder;
  }

  await db.entities.update(entityId, patch);
  const updatedEntity = await db.entities.get(entityId);
  await appendChange('entities', 'update', updatedEntity, entityId);

  // Update or delete rt-part-of relationship
  const existingRels = await db.relationships
    .where('fromEntityId').equals(entityId)
    .filter(r => !r.deletedAt && r.typeId === 'rt-part-of')
    .toArray();
  for (const r of existingRels) {
    await db.relationships.update(r.id, { deletedAt: now, updatedAt: now });
    await appendChange('relationships', 'delete', { id: r.id });
  }

  if (newParentId) {
    const newRel: Relationship = {
      id: uuidv4(),
      fromEntityId: entityId,
      toEntityId: newParentId,
      typeId: 'rt-part-of',
      worldId: existing.worldId,
      canonStatus: existing.canonStatus || 'canon',
      createdAt: now,
      updatedAt: now,
    };
    await db.relationships.add(newRel);
    await appendChange('relationships', 'create', newRel);
  }
}

