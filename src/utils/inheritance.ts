// src/utils/inheritance.ts
// Automatic ancestry percentage calculations and separate demographic suggestions

import type { Entity, StatisticalDataset, DemographicEntry } from '../db/schema';
import { getEntity, getRelationships } from '../db/operations';

export interface CalculatedAncestryResult {
  parentsFound: { id: string; name: string; isAdoptive?: boolean; ancestryTotal: number }[];
  entries: DemographicEntry[];
  isIncomplete: boolean;
  notes: string[];
}

export interface InheritedSuggestions {
  suggestedNationalities: string[];
  suggestedLanguages: string[];
  suggestedCultures: string[];
  suggestedReligions: string[];
  parentNames: string[];
}

/**
 * Calculates inherited ancestry composition:
 * Child % = (0.5 * Parent A %) + (0.5 * Parent B %) summed per category.
 */
export async function calculateInheritedAncestry(
  childId: string,
  visitedIds = new Set<string>()
): Promise<CalculatedAncestryResult> {
  if (visitedIds.has(childId)) {
    return {
      parentsFound: [],
      entries: [],
      isIncomplete: true,
      notes: ['Ancestry inheritance loop detected.'],
    };
  }
  visitedIds.add(childId);

  const rels = await getRelationships(childId);
  const parentEntries: { entity: Entity; isAdoptive: boolean }[] = [];

  for (const r of rels) {
    if (r.deletedAt) continue;
    const isChild =
      (r.fromEntityId === childId && (r.typeId === 'rt-child-of' || r.typeId === 'rt-adopted-by')) ||
      (r.toEntityId === childId && r.typeId === 'rt-parent-of');

    if (isChild) {
      const pId = r.fromEntityId === childId ? r.toEntityId : r.fromEntityId;
      const parent = await getEntity(pId);
      if (parent && !parent.deletedAt) {
        // Only biological by default for genetic ancestry, note adoptive
        const isAdoptive = r.typeId === 'rt-adopted-by';
        parentEntries.push({ entity: parent, isAdoptive });
      }
    }
  }

  // Deduplicate parents
  const uniqueParents = Array.from(new Map(parentEntries.map(p => [p.entity.id, p])).values());

  const notes: string[] = [];
  const parentsFound: CalculatedAncestryResult['parentsFound'] = [];

  if (uniqueParents.length === 0) {
    return {
      parentsFound: [],
      entries: [],
      isIncomplete: true,
      notes: ['No recorded parents found for this character.'],
    };
  }

  // Weight per parent (default 1 / N, for 2 parents = 0.5 each)
  const biologicalParents = uniqueParents.filter(p => !p.isAdoptive);
  const activeParents = biologicalParents.length > 0 ? biologicalParents : uniqueParents;
  const weightPerParent = 1 / activeParents.length;

  let isIncomplete = activeParents.length < 2;
  if (activeParents.length === 1) {
    notes.push(`Only one parent (${activeParents[0].entity.title}) is recorded; ancestry represents 50% known heritage.`);
  }

  // Map of combined ancestry: normalizedName -> { name, percentage, entityId }
  const combinedMap = new Map<string, { name: string; percentage: number; entityId?: string }>();

  for (const { entity: parent, isAdoptive } of activeParents) {
    const ancestryDs = (parent.demographicDatasets || []).find(d => d.category === 'ancestry');
    const parentEntries = ancestryDs?.entries || [];

    const totalPct = parentEntries.reduce((sum, e) => sum + (e.percentage || 0), 0);
    parentsFound.push({
      id: parent.id,
      name: parent.title,
      isAdoptive,
      ancestryTotal: totalPct,
    });

    if (!ancestryDs || parentEntries.length === 0) {
      isIncomplete = true;
      notes.push(`Parent "${parent.title}" has no ancestry breakdown recorded.`);
      continue;
    }

    if (Math.abs(totalPct - 100) > 1) {
      isIncomplete = true;
      notes.push(`Parent "${parent.title}" ancestry totals ${totalPct}% (differs from 100%).`);
    }

    // Accumulate weighted percentages
    for (const entry of parentEntries) {
      const key = (entry.entityId || entry.name).toLowerCase().trim();
      const existing = combinedMap.get(key);
      const contribution = (entry.percentage || 0) * weightPerParent;

      if (existing) {
        existing.percentage += contribution;
      } else {
        combinedMap.set(key, {
          name: entry.name,
          percentage: contribution,
          entityId: entry.entityId,
        });
      }
    }
  }

  // If one parent was missing in a two-parent model, add "Unknown" 50%
  if (activeParents.length === 1) {
    combinedMap.set('unknown', {
      name: 'Unknown / Unrecorded Parent',
      percentage: 50,
    });
  }

  const calculatedEntries: DemographicEntry[] = Array.from(combinedMap.values()).map(item => ({
    id: 'entry-calc-' + Math.random().toString(36).slice(2, 9),
    name: item.name,
    percentage: Math.round(item.percentage * 10) / 10,
    entityId: item.entityId,
  }));

  return {
    parentsFound,
    entries: calculatedEntries,
    isIncomplete,
    notes,
  };
}

/**
 * Suggests distinct affiliations (Nationality, Language, Culture, Religion)
 * from recorded parents without confusing or averaging them.
 */
export async function getInheritedSuggestions(childId: string): Promise<InheritedSuggestions> {
  const rels = await getRelationships(childId);
  const parentIds = new Set<string>();

  for (const r of rels) {
    if (r.deletedAt) continue;
    if (
      (r.fromEntityId === childId && (r.typeId === 'rt-child-of' || r.typeId === 'rt-adopted-by')) ||
      (r.toEntityId === childId && r.typeId === 'rt-parent-of')
    ) {
      parentIds.add(r.fromEntityId === childId ? r.toEntityId : r.fromEntityId);
    }
  }

  const nationalities = new Set<string>();
  const languages = new Set<string>();
  const cultures = new Set<string>();
  const religions = new Set<string>();
  const parentNames: string[] = [];

  for (const pid of parentIds) {
    const parent = await getEntity(pid);
    if (!parent || parent.deletedAt) continue;
    parentNames.push(parent.title);

    const props = parent.properties || {};

    if (props.nationality && typeof props.nationality === 'string' && props.nationality.trim()) {
      props.nationality.split(/[,/]/).map(s => s.trim()).filter(Boolean).forEach(n => nationalities.add(n));
    }
    if (props.nativeLanguage && typeof props.nativeLanguage === 'string' && props.nativeLanguage.trim()) {
      props.nativeLanguage.split(/[,/]/).map(s => s.trim()).filter(Boolean).forEach(l => languages.add(l));
    }
    if (props.culture && typeof props.culture === 'string' && props.culture.trim()) {
      props.culture.split(/[,/]/).map(s => s.trim()).filter(Boolean).forEach(c => cultures.add(c));
    }
    if (props.religion && typeof props.religion === 'string' && props.religion.trim()) {
      props.religion.split(/[,/]/).map(s => s.trim()).filter(Boolean).forEach(r => religions.add(r));
    }
  }

  return {
    suggestedNationalities: Array.from(nationalities),
    suggestedLanguages: Array.from(languages),
    suggestedCultures: Array.from(cultures),
    suggestedReligions: Array.from(religions),
    parentNames,
  };
}
