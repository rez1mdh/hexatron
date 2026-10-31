// src/domain/usecases/GetEntityUseCase.ts
// Application Use Case for loading an entity and its surrounding domain aggregate.

import { Result, ok, fail, appError, ErrorCodes } from '../contracts/result';
import type { Entity, EntityType, World, EntityImage, Relationship } from '../entities/models';
import type { IEntityRepository } from '../repositories/IEntityRepository';

export interface EntityAggregate {
  entity: Entity;
  type: EntityType | null;
  world: World | null;
  parent: Entity | null;
  children: Entity[];
  images: EntityImage[];
  relationships: Relationship[];
}

export class GetEntityUseCase {
  constructor(private readonly entityRepo: IEntityRepository) {}

  async execute(entityId: string): Promise<Result<EntityAggregate>> {
    if (!entityId || !entityId.trim()) {
      return fail(appError(ErrorCodes.VALIDATION_ERROR, 'Entity ID is required.'));
    }

    try {
      const entity = await this.entityRepo.getById(entityId.trim());
      if (!entity || entity.deletedAt) {
        return fail(appError(ErrorCodes.NOT_FOUND, `Entity "${entityId}" was not found.`));
      }

      const [type, world, parent, children, images, relationships] = await Promise.all([
        this.entityRepo.getEntityType(entity.typeId),
        this.entityRepo.getWorld(entity.worldId),
        this.entityRepo.getParent(entity.id),
        this.entityRepo.getChildren(entity.id),
        this.entityRepo.getImages(entity.id),
        this.entityRepo.getRelationships(entity.id),
      ]);

      return ok({
        entity,
        type,
        world,
        parent,
        children,
        images,
        relationships,
      });
    } catch (err) {
      return fail(
        appError(
          ErrorCodes.PERSISTENCE_ERROR,
          `Failed to load entity: ${(err as Error).message}`
        )
      );
    }
  }
}

