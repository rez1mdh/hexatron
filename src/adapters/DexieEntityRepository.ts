// src/adapters/DexieEntityRepository.ts
// Interface adapter implementing IEntityRepository backed by Dexie IndexedDB.

import type { IEntityRepository } from '../domain/repositories/IEntityRepository';
import type { Entity, EntityType, World, EntityImage, Relationship } from '../domain/entities/models';
import {
  getEntity,
  createEntity,
  updateEntity,
  softDeleteEntity,
  getEntities,
  getParentEntity,
  getChildEntities,
  getEntityTypes,
  getWorld,
  getImages,
  getRelationships,
} from '../db/operations';

export class DexieEntityRepository implements IEntityRepository {
  async getById(id: string): Promise<Entity | null> {
    const e = await getEntity(id);
    return (e as Entity) ?? null;
  }

  async create(data: Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Entity> {
    const created = await createEntity(data);
    return created as Entity;
  }

  async update(id: string, patch: Partial<Omit<Entity, 'id' | 'createdAt' | 'worldId'>>): Promise<Entity> {
    await updateEntity(id, patch);
    const updated = await getEntity(id);
    if (!updated) {
      throw new Error(`Entity ${id} was not found after update`);
    }
    return updated as Entity;
  }

  async softDelete(id: string): Promise<void> {
    await softDeleteEntity(id);
  }

  async listByWorld(worldId: string): Promise<Entity[]> {
    const list = await getEntities(worldId);
    return list as Entity[];
  }

  async getParent(entityId: string): Promise<Entity | null> {
    const p = await getParentEntity(entityId);
    return (p as Entity) ?? null;
  }

  async getChildren(entityId: string): Promise<Entity[]> {
    const children = await getChildEntities(entityId);
    return children as Entity[];
  }

  async getEntityType(typeId: string): Promise<EntityType | null> {
    const types = await getEntityTypes();
    const match = types.find(t => t.id === typeId);
    return (match as EntityType) ?? null;
  }

  async getAllEntityTypes(): Promise<EntityType[]> {
    const types = await getEntityTypes();
    return types as EntityType[];
  }

  async getWorld(worldId: string): Promise<World | null> {
    const w = await getWorld(worldId);
    return (w as World) ?? null;
  }

  async getImages(entityId: string): Promise<EntityImage[]> {
    const images = await getImages(entityId);
    return images as EntityImage[];
  }

  async getRelationships(entityId: string): Promise<Relationship[]> {
    const rels = await getRelationships(entityId);
    return rels as Relationship[];
  }
}

