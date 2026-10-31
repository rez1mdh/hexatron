// src/domain/usecases/DeleteEntityUseCase.ts
// Application Use Case for soft deleting an entity and synchronizing with the cloud.

import { Result, ok, fail, appError, ErrorCodes } from '../contracts/result';
import type { IEntityRepository } from '../repositories/IEntityRepository';
import type { ICloudSyncGateway } from '../repositories/ICloudSyncGateway';

export class DeleteEntityUseCase {
  constructor(
    private readonly entityRepo: IEntityRepository,
    private readonly cloudGateway: ICloudSyncGateway
  ) {}

  async execute(entityId: string, userId?: string): Promise<Result<{ entityId: string }>> {
    if (!entityId || !entityId.trim()) {
      return fail(appError(ErrorCodes.VALIDATION_ERROR, 'Entity ID is required.'));
    }

    try {
      await this.entityRepo.softDelete(entityId);
    } catch (err) {
      return fail(
        appError(
          ErrorCodes.PERSISTENCE_ERROR,
          `Failed to delete entity locally: ${(err as Error).message}`
        )
      );
    }

    if (userId && this.cloudGateway.isConfigured()) {
      try {
        await this.cloudGateway.pushSoftDelete(entityId, userId);
      } catch (cloudErr) {
        // Soft delete succeeded locally, log warning but don't fail the operation
        console.warn('[DeleteEntityUseCase] Cloud delete warning:', cloudErr);
      }
    }

    return ok({ entityId });
  }
}

