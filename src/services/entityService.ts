// src/services/entityService.ts
// Composition Root wiring domain use cases, repositories, and cloud gateways into a unified service.

import { DexieEntityRepository } from '../adapters/DexieEntityRepository';
import { SupabaseCloudSyncGateway } from '../adapters/SupabaseCloudSyncGateway';
import { SaveEntityUseCase, type SaveEntityRequest, type SaveEntityResponse } from '../domain/usecases/SaveEntityUseCase';
import { GetEntityUseCase, type EntityAggregate } from '../domain/usecases/GetEntityUseCase';
import { DeleteEntityUseCase } from '../domain/usecases/DeleteEntityUseCase';
import type { Result } from '../domain/contracts/result';

// Repository and Gateway singletons
export const entityRepository = new DexieEntityRepository();
export const cloudSyncGateway = new SupabaseCloudSyncGateway();

// Use Case singletons
export const saveEntityUseCase = new SaveEntityUseCase(entityRepository, cloudSyncGateway);
export const getEntityUseCase = new GetEntityUseCase(entityRepository);
export const deleteEntityUseCase = new DeleteEntityUseCase(entityRepository, cloudSyncGateway);

/**
 * High-level facade for application components adhering to Clean Architecture.
 */
export const entityService = {
  saveEntity(request: SaveEntityRequest): Promise<Result<SaveEntityResponse>> {
    return saveEntityUseCase.execute(request);
  },

  getEntity(entityId: string): Promise<Result<EntityAggregate>> {
    return getEntityUseCase.execute(entityId);
  },

  deleteEntity(entityId: string, userId?: string): Promise<Result<{ entityId: string }>> {
    return deleteEntityUseCase.execute(entityId, userId);
  },
};

