// src/domain/entities/models.ts
// Pure enterprise domain entities — independent of frameworks, databases, and UI delivery mechanisms.

export type CanonStatus = 'canon' | 'provisional' | 'disputed' | 'non_canon' | 'alternate';
export type ChangeOperation = 'create' | 'update' | 'delete' | 'relate' | 'unrelate';
export type ImageRole = 'portrait' | 'map' | 'gallery' | 'flag' | 'video' | 'header' | 'other';
export type PropertyType = 'text' | 'number' | 'boolean' | 'date' | 'url' | 'select' | 'multiselect' | 'entity_ref';
export type ChartType = 'pie' | 'donut' | 'bar' | 'stacked_bar' | 'line';

export interface Universe {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface World {
  id: string;
  universeId: string;
  title: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PropertyFieldDef {
  key: string;
  label: string;
  type: PropertyType;
  options?: string[];
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
  targetTypeId?: string;
}

export interface EntityType {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  isBuiltIn: boolean;
  defaultFields?: PropertyFieldDef[];
  fieldsSchema?: Record<string, unknown>;
}

export interface DemographicEntry {
  id: string;
  name: string;
  percentage?: number;
  count?: number;
  entityId?: string;
  color?: string;
}

export interface StatisticalDataset {
  id: string;
  title: string;
  category: 'ancestry' | 'ethnicity' | 'race' | 'language' | 'religion' | 'population' | 'custom';
  chartType: ChartType;
  year?: string;
  geographicalScope?: string;
  sourceNotes?: string;
  confidence?: 'confirmed' | 'estimated' | 'disputed' | 'approximate';
  isMutuallyExclusive?: boolean;
  totalPopulation?: number;
  entries: DemographicEntry[];
}

export interface Entity {
  id: string;
  worldId: string;
  typeId: string;
  title: string;
  entryNumber?: number;
  parentId?: string;
  sortOrder?: number;
  aliases: string[];
  article?: string;
  properties?: Record<string, unknown>;
  tags: string[];
  canonStatus: CanonStatus;
  demographicDatasets?: StatisticalDataset[];
  linkedEntityIds: string[];
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface RelationshipType {
  id: string;
  name: string;
  reverseName: string;
  inverseName?: string;
  category?: string;
  isDirected?: boolean;
  color: string;
  isBuiltIn: boolean;
}

export interface Relationship {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  typeId: string;
  worldId: string;
  canonStatus: CanonStatus;
  dateStart?: string;
  dateEnd?: string;
  notes?: string;
  confidence?: 'confirmed' | 'rumored' | 'disputed';
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface EntityImage {
  id: string;
  entityId: string;
  role: ImageRole;
  caption?: string;
  title?: string;
  description?: string;
  mediaType?: 'image' | 'video';
  localBlob?: Blob;
  remotePath?: string;
  remoteUrl?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
  sizeBytes?: number;
  durationSeconds?: number;
  isOfflineAvailable?: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt?: number;
}

export interface ChangeEvent {
  id: string;
  table: string;
  operation: ChangeOperation;
  entityId?: string;
  payload: string;
  clientId: string;
  createdAt: number;
  syncedAt?: number;
  conflict?: boolean;
}
