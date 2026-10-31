// src/domain/contracts/result.ts
// Standardized Result type and application error contracts following api-and-interface-design principles.

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function fail<E = AppError>(error: E): Result<never, E> {
  return { success: false, error };
}

export function appError(code: string, message: string, details?: unknown): AppError {
  return { code, message, details };
}

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  PERSISTENCE_ERROR: 'PERSISTENCE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SYNC_FAILED: 'SYNC_FAILED',
  CONFLICT: 'CONFLICT',
} as const;
