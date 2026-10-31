// src/domain/validation/entityValidator.ts
// Boundary validation for entity mutations according to api-and-interface-design principles.

import { Result, ok, fail, appError, ErrorCodes } from '../contracts/result';
import type { CanonStatus, StatisticalDataset } from '../entities/models';

export interface SaveEntityInput {
  id?: string;
  worldId: string;
  typeId: string;
  title: string;
  parentId?: string;
  aliases?: string[];
  article?: string;
  properties?: Record<string, unknown>;
  tags?: string[];
  canonStatus?: CanonStatus;
  demographicDatasets?: StatisticalDataset[];
}

export interface ValidatedEntityInput {
  id?: string;
  worldId: string;
  typeId: string;
  title: string;
  parentId?: string;
  aliases: string[];
  article?: string;
  properties: Record<string, unknown>;
  tags: string[];
  canonStatus: CanonStatus;
  demographicDatasets?: StatisticalDataset[];
}

const VALID_CANON_STATUSES: CanonStatus[] = [
  'canon',
  'provisional',
  'disputed',
  'non_canon',
  'alternate',
];

export function validateEntityInput(input: unknown): Result<ValidatedEntityInput> {
  if (!input || typeof input !== 'object') {
    return fail(appError(ErrorCodes.VALIDATION_ERROR, 'Entity input must be an object.'));
  }

  const raw = input as Partial<SaveEntityInput>;

  // Title validation
  if (!raw.title || typeof raw.title !== 'string' || !raw.title.trim()) {
    return fail(appError(ErrorCodes.VALIDATION_ERROR, 'Entity title is required.'));
  }
  const title = raw.title.trim();
  if (title.length > 255) {
    return fail(appError(ErrorCodes.VALIDATION_ERROR, 'Entity title cannot exceed 255 characters.'));
  }

  // World ID validation
  if (!raw.worldId || typeof raw.worldId !== 'string' || !raw.worldId.trim()) {
    return fail(appError(ErrorCodes.VALIDATION_ERROR, 'World ID is required.'));
  }

  // Type ID validation
  if (!raw.typeId || typeof raw.typeId !== 'string' || !raw.typeId.trim()) {
    return fail(appError(ErrorCodes.VALIDATION_ERROR, 'Entity Type ID is required.'));
  }

  // Canon status validation
  let canonStatus: CanonStatus = 'canon';
  if (raw.canonStatus) {
    if (!VALID_CANON_STATUSES.includes(raw.canonStatus)) {
      return fail(
        appError(
          ErrorCodes.VALIDATION_ERROR,
          `Invalid canon status: "${raw.canonStatus}". Must be one of: ${VALID_CANON_STATUSES.join(', ')}`
        )
      );
    }
    canonStatus = raw.canonStatus;
  }

  // Aliases validation & normalization
  const aliases = Array.isArray(raw.aliases)
    ? raw.aliases.map(a => String(a).trim()).filter(Boolean)
    : [];

  // Tags validation & normalization
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)
    : [];

  // Properties validation
  const properties = raw.properties && typeof raw.properties === 'object' && !Array.isArray(raw.properties)
    ? { ...raw.properties }
    : {};

  // Clean parentId
  const parentId = raw.parentId && typeof raw.parentId === 'string' && raw.parentId.trim()
    ? raw.parentId.trim()
    : undefined;

  return ok({
    id: raw.id,
    worldId: raw.worldId.trim(),
    typeId: raw.typeId.trim(),
    title,
    parentId,
    aliases,
    article: typeof raw.article === 'string' ? raw.article : undefined,
    properties,
    tags,
    canonStatus,
    demographicDatasets: Array.isArray(raw.demographicDatasets) ? raw.demographicDatasets : undefined,
  });
}
