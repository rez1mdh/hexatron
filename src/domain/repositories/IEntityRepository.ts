// src/domain/repositories/IEntityRepository.ts
// Port definition for entity persistence, adhering to Clean Architecture Dependency Inversion.

import type { Entity, EntityType, World, EntityImage, Relationship } from '../entities/models';

export interface IEntityRepository {
  getById(id: string): Promise<Entity | null>;
  create(entity: Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Entity>;
  update(id: string, patch: Partial<Omit<Entity, 'id' | 'createdAt' | 'worldId'>>): Promise<Entity>;
  softDelete(id: string): Promise<void>;
  listByWorld(worldId: string): Promise<Entity[]>;
  getParent(entityId: string): Promise<Entity | null>;
  getChildren(entityId: string): Promise<Entity[]>;
  getEntityType(typeId: string): Promise<EntityType | null>;
  getAllEntityTypes(): Promise<EntityType[]>;
  getWorld(worldId: string): Promise<World | null>;
  getImages(entityId: string): Promise<EntityImage[]>;
  getRelationships(entityId: string): Promise<Relationship[]>;
}

