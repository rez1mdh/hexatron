// src/domain/repositories/ICloudSyncGateway.ts
// Gateway port for cloud synchronization, keeping delivery details out of domain use cases.

import type { Entity, Relationship } from '../entities/models';
import type { Result } from '../contracts/result';

export interface ICloudSyncGateway {
  pushEntity(entity: Entity, userId: string): Promise<Result<{ entityId: string }>>;
  pushRelationships(relationships: Relationship[], userId: string): Promise<Result<{ count: number }>>;
  pushSoftDelete(entityId: string, userId: string): Promise<Result<{ entityId: string }>>;
  isConfigured(): boolean;
}

