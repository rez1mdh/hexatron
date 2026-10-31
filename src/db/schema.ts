// src/db/schema.ts
// Dexie (IndexedDB) schema — infrastructure layer persistence.
// Core domain models are defined in src/domain/entities/models.ts and re-exported here.

import Dexie, { type Table } from 'dexie';
import type {
  CanonStatus,
  ChangeOperation,
  ImageRole,
  Universe,
  World,
  PropertyType,
  PropertyFieldDef,
  EntityType,
  ChartType,
  DemographicEntry,
  StatisticalDataset,
  Entity,
  RelationshipType,
  Relationship,
  EntityImage,
  ChangeEvent,
} from '../domain/entities/models';

export type {
  CanonStatus,
  ChangeOperation,
  ImageRole,
  Universe,
  World,
  PropertyType,
  PropertyFieldDef,
  EntityType,
  ChartType,
  DemographicEntry,
  StatisticalDataset,
  Entity,
  RelationshipType,
  Relationship,
  EntityImage,
  ChangeEvent,
};

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

    this.version(3).stores({
      entities:          'id, worldId, parentId, typeId, title, entryNumber, canonStatus, createdAt, updatedAt, deletedAt, *tags, *aliases, *linkedEntityIds',
    });
  }
}

export const db = new HexatronDB();
