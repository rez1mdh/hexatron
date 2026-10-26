// src/db/schema.ts
// Dexie (IndexedDB) schema — single source of truth for local storage

import Dexie, { type Table } from 'dexie';

// ──────────────────────────────────────────────
// Core Types
// ──────────────────────────────────────────────

export type CanonStatus = 'canon' | 'provisional' | 'disputed' | 'non_canon' | 'alternate';
export type ChangeOperation = 'create' | 'update' | 'delete' | 'relate' | 'unrelate';
export type ImageRole = 'portrait' | 'map' | 'gallery' | 'flag' | 'other';

export interface Universe {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface World {
  id: string;
  universeId: string;
  title: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

export type PropertyType = 'text' | 'number' | 'boolean' | 'date' | 'url' | 'select' | 'multiselect' | 'entity_ref';

export interface PropertyFieldDef {
  key: string;
  label: string;
  type: PropertyType;
  options?: string[]; // For select & multiselect
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
  targetTypeId?: string; // For entity_ref: optional restriction to target entity type
}

export interface EntityType {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  isBuiltIn: boolean;
  defaultFields?: PropertyFieldDef[];
  fieldsSchema?: Record<string, unknown>; // JSON Schema compatibility
}

export type ChartType = 'pie' | 'donut' | 'bar' | 'stacked_bar' | 'line';

export interface DemographicEntry {
  id: string;
  name: string;           // Category name (e.g. "Irish", "Spanish", "Urban")
  percentage?: number;    // e.g. 70
  count?: number;         // e.g. 15000000
  entityId?: string;      // Optional reference to an existing entity (Language, Culture, Ethnicity, Nation)
  color?: string;         // Optional custom hex color
}

export interface StatisticalDataset {
  id: string;
  title: string;          // e.g. "Ancestry Composition", "Ethnic Makeup (1850)", "Speakers by Country"
  category: 'ancestry' | 'ethnicity' | 'race' | 'language' | 'religion' | 'population' | 'custom';
  chartType: ChartType;
  year?: string;          // e.g. "1850", "3rd Age, Year 120"
  geographicalScope?: string;
  sourceNotes?: string;
  confidence?: 'confirmed' | 'estimated' | 'disputed' | 'approximate';
  isMutuallyExclusive?: boolean; // If true, warns if percentage total !== 100%
  totalPopulation?: number;
  entries: DemographicEntry[];
}

export interface Entity {
  id: string;
  worldId: string;
  typeId: string;
  title: string;
  entryNumber?: number;
  aliases: string[];
  // TipTap ProseMirror JSON doc stored as string for IndexedDB indexing
  article?: string;
  // Structured properties — shape defined by EntityType.fieldsSchema
  properties?: Record<string, unknown>;
  tags: string[];
  canonStatus: CanonStatus;
  // Optional historical demographic/ethnolinguistic/statistical datasets
  demographicDatasets?: StatisticalDataset[];
  // Denormalized outgoing link IDs extracted from article on save (for backlink queries)
  linkedEntityIds: string[];
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface RelationshipType {
  id: string;
  name: string;           // e.g. "parent of"
  reverseName: string;    // e.g. "child of"
  color: string;
  isBuiltIn: boolean;
}

export interface Relationship {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  typeId: string;
  worldId: string;
  canonStatus: CanonStatus;
  // Optional extra context
  dateStart?: string;
  dateEnd?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface EntityImage {
  id: string;
  entityId: string;
  role: ImageRole;
  caption?: string;
  // Blob stored locally; remote URL set after sync
  localBlob?: Blob;
  remotePath?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  sortOrder: number;
  createdAt: number;
}

// Change ledger — every mutation is appended here for sync
export interface ChangeEvent {
  id: string;             // client-generated UUID
  entityId?: string;
  table: string;          // 'entities' | 'relationships' | 'images' | etc.
  operation: ChangeOperation;
  payload: string;        // JSON string of the full record after change
  clientId: string;
  createdAt: number;
  syncedAt?: number;      // null = not yet synced
  conflict?: boolean;
}

// ──────────────────────────────────────────────
// Dexie Database
// ──────────────────────────────────────────────

export class HexatronDB extends Dexie {
  universes!: Table<Universe>;
  worlds!: Table<World>;
  entityTypes!: Table<EntityType>;
  entities!: Table<Entity>;
  relationshipTypes!: Table<RelationshipType>;
  relationships!: Table<Relationship>;
  images!: Table<EntityImage>;
  changes!: Table<ChangeEvent>;

  constructor() {
    super('hexatron');

    this.version(1).stores({
      universes:         'id, title',
      worlds:            'id, universeId, title',
      entityTypes:       'id, name, isBuiltIn',
      entities:          'id, worldId, typeId, title, canonStatus, createdAt, updatedAt, deletedAt, *tags, *aliases, *linkedEntityIds',
      relationshipTypes: 'id, name, isBuiltIn',
      relationships:     'id, fromEntityId, toEntityId, typeId, worldId, deletedAt',
      images:            'id, entityId, role, sortOrder',
      changes:           'id, table, clientId, createdAt, syncedAt',
    });

    this.version(2).stores({
      entities:          'id, worldId, typeId, title, entryNumber, canonStatus, createdAt, updatedAt, deletedAt, *tags, *aliases, *linkedEntityIds',
    });
  }
}

export const db = new HexatronDB();
