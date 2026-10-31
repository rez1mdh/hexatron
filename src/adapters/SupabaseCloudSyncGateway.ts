// src/adapters/SupabaseCloudSyncGateway.ts
// Interface adapter implementing ICloudSyncGateway backed by Supabase and cloudSync services.

import type { ICloudSyncGateway } from '../domain/repositories/ICloudSyncGateway';
import type { Entity, Relationship } from '../domain/entities/models';
import { Result, ok, fail, appError, ErrorCodes } from '../domain/contracts/result';
import { isCloudConfigured } from '../services/supabase';
import {
  pushEntityToCloud,
  pushRelationshipToCloud,
  pushSoftDeleteEntityToCloud,
} from '../services/cloudSync';

export class SupabaseCloudSyncGateway implements ICloudSyncGateway {
  isConfigured(): boolean {
    return isCloudConfigured();
  }

  async pushEntity(entity: Entity, userId: string): Promise<Result<{ entityId: string }>> {
    const res = await pushEntityToCloud(entity, userId);
    if (res.success) {
      return ok({ entityId: entity.id });
    }
    return fail(appError(ErrorCodes.SYNC_FAILED, res.error || 'Failed to sync entity to cloud'));
  }

  async pushRelationships(relationships: Relationship[], userId: string): Promise<Result<{ count: number }>> {
    let pushedCount = 0;
    for (const rel of relationships) {
      const res = await pushRelationshipToCloud(rel, userId);
      if (res.success) {
        pushedCount++;
      } else {
        return fail(appError(ErrorCodes.SYNC_FAILED, res.error || 'Failed to sync relationship to cloud'));
      }
    }
    return ok({ count: pushedCount });
  }

  async pushSoftDelete(entityId: string, userId: string): Promise<Result<{ entityId: string }>> {
    try {
      await pushSoftDeleteEntityToCloud(entityId, userId);
      return ok({ entityId });
    } catch (err) {
      return fail(appError(ErrorCodes.SYNC_FAILED, (err as Error).message || 'Failed to sync soft delete to cloud'));
    }
  }
}
