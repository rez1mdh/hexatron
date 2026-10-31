// src/domain/usecases/SaveEntityUseCase.ts
// Application Use Case orchestrating entity validation, local persistence, and cloud synchronization.

import { Result, ok, fail, appError, ErrorCodes } from '../contracts/result';
import type { Entity, Relationship } from '../entities/models';
import type { IEntityRepository } from '../repositories/IEntityRepository';
import type { ICloudSyncGateway } from '../repositories/ICloudSyncGateway';
import { validateEntityInput, type SaveEntityInput } from '../validation/entityValidator';

export interface SaveEntityRequest {
  input: SaveEntityInput;
  userId?: string;
  relationships?: Relationship[];
}

export interface SaveEntityResponse {
  entity: Entity;
  cloudSyncPending: boolean;
  cloudSyncMessage?: string;
}

export class SaveEntityUseCase {
  constructor(
    private readonly entityRepo: IEntityRepository,
    private readonly cloudGateway: ICloudSyncGateway
  ) {}

  async execute(request: SaveEntityRequest): Promise<Result<SaveEntityResponse>> {
    // 1. Validate at boundary
    const validationResult = validateEntityInput(request.input);
    if (!validationResult.success) {
      return validationResult;
    }

    const validData = validationResult.data;

    // 2. Persist locally via repository
    let savedEntity: Entity;
    try {
      if (validData.id) {
        // Update existing entity
        savedEntity = await this.entityRepo.update(validData.id, {
          title: validData.title,
          typeId: validData.typeId,
          parentId: validData.parentId,
          aliases: validData.aliases,
          article: validData.article,
          properties: validData.properties,
          tags: validData.tags,
          canonStatus: validData.canonStatus,
          demographicDatasets: validData.demographicDatasets,
        });
      } else {
        // Create new entity
        savedEntity = await this.entityRepo.create({
          worldId: validData.worldId,
          title: validData.title,
          typeId: validData.typeId,
          parentId: validData.parentId,
          aliases: validData.aliases,
          article: validData.article,
          properties: validData.properties,
          tags: validData.tags,
          canonStatus: validData.canonStatus,
          demographicDatasets: validData.demographicDatasets,
          linkedEntityIds: [],
        });
      }
    } catch (err) {
      return fail(
        appError(
          ErrorCodes.PERSISTENCE_ERROR,
          `Failed to save entity locally: ${(err as Error).message}`
        )
      );
    }

    // 3. Attempt cloud synchronization if configured and user is authenticated
    let cloudSyncPending = false;
    let cloudSyncMessage: string | undefined;

    if (request.userId && this.cloudGateway.isConfigured()) {
      try {
        const cloudEntityResult = await this.cloudGateway.pushEntity(savedEntity, request.userId);
        if (!cloudEntityResult.success) {
          cloudSyncPending = true;
          cloudSyncMessage = cloudEntityResult.error.message;
        } else if (request.relationships && request.relationships.length > 0) {
          const relResult = await this.cloudGateway.pushRelationships(request.relationships, request.userId);
          if (!relResult.success) {
            cloudSyncPending = true;
            cloudSyncMessage = relResult.error.message;
          }
        }
      } catch (cloudErr) {
        cloudSyncPending = true;
        cloudSyncMessage = (cloudErr as Error).message;
      }
    }

    return ok({
      entity: savedEntity,
      cloudSyncPending,
      cloudSyncMessage,
    });
  }
}
