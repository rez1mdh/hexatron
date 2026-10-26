// src/utils/entityLinker.ts
// Robust, deterministic inline entity linking and disambiguation for TipTap ProseMirror docs

import type { Entity } from '../db/schema';

export interface EntityCandidate {
  id: string;
  title: string;
  typeId: string;
  matchedName: string;
  isAlias: boolean;
}

export interface EntityIndex {
  // Normalized lowercased name -> unique entity candidate
  uniqueNames: Map<string, EntityCandidate>;
  // Normalized lowercased name -> candidates if ambiguous
  ambiguousNames: Map<string, EntityCandidate[]>;
  // Terms sorted by character length descending (longest match wins)
  sortedTerms: string[];
  // Terms belonging to current entity (to exclude from linking and prevent sub-matches)
  selfTerms: string[];
}

// Common words / stop words to avoid false positive links if an alias or short name matches
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'it', 'its', 'as', 'that', 'this', 'from', 'be',
  'all', 'any', 'one', 'two', 'new', 'old', 'day', 'war', 'act', 'law', 'fsa'
]);

/**
 * Builds an index of entity names and aliases.
 * Respects uniqueness, detects ambiguities, and sorts terms longest-first.
 */
export function buildEntityNameIndex(entities: Entity[], currentEntityId?: string): EntityIndex {
  const nameToCandidates = new Map<string, EntityCandidate[]>();
  const selfTerms: string[] = [];

  for (const ent of entities) {
    if (!ent || ent.deletedAt) continue;

    const namesToAdd: { text: string; isAlias: boolean }[] = [
      { text: ent.title, isAlias: false }
    ];

    if (Array.isArray(ent.aliases)) {
      for (const alias of ent.aliases) {
        if (alias && typeof alias === 'string') {
          namesToAdd.push({ text: alias, isAlias: true });
        }
      }
    }

    // If this is the current entity being viewed, save its names as self-terms
    // so we don't self-link and don't match sub-entity words inside its own title
    if (currentEntityId && ent.id === currentEntityId) {
      for (const { text } of namesToAdd) {
        const clean = text.trim();
        if (clean.length > 2) selfTerms.push(clean);
      }
      continue;
    }

    for (const { text, isAlias } of namesToAdd) {
      const clean = text.trim();
      // Skip empty or too short terms (<= 2 chars)
      if (clean.length <= 2) continue;

      const norm = clean.toLowerCase();
      // Skip pure stop words unless it's a multi-word proper noun
      if (STOP_WORDS.has(norm) && !clean.includes(' ')) continue;

      const candidate: EntityCandidate = {
        id: ent.id,
        title: ent.title,
        typeId: ent.typeId,
        matchedName: clean,
        isAlias,
      };

      const existing = nameToCandidates.get(norm);
      if (existing) {
        // If it's the exact same entity (e.g. repeated alias), don't treat as ambiguous
        if (!existing.some(c => c.id === ent.id)) {
          existing.push(candidate);
        }
      } else {
        nameToCandidates.set(norm, [candidate]);
      }
    }
  }

  const uniqueNames = new Map<string, EntityCandidate>();
  const ambiguousNames = new Map<string, EntityCandidate[]>();

  for (const [norm, candidates] of nameToCandidates.entries()) {
    if (candidates.length === 1) {
      uniqueNames.set(norm, candidates[0]);
    } else {
      ambiguousNames.set(norm, candidates);
    }
  }

  // Sort unique terms by character length descending so longer/more specific names match first
  const sortedTerms = Array.from(uniqueNames.keys()).sort((a, b) => b.length - a.length);
  selfTerms.sort((a, b) => b.length - a.length);

  return { uniqueNames, ambiguousNames, sortedTerms, selfTerms };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface MatchSpan {
  start: number;
  end: number;
  candidate: EntityCandidate;
  matchedText: string;
}

/**
 * Finds non-overlapping entity mentions in a plain text string.
 * Preserves URLs, emails, and self-mentions from being matched.
 */
function findEntityMatches(text: string, index: EntityIndex): MatchSpan[] {
  if (!text || (index.sortedTerms.length === 0 && index.selfTerms.length === 0)) return [];

  const occupied = new Array<boolean>(text.length).fill(false);

  // 1. Identify excluded regions: URLs and emails
  const urlRegex = /(?:https?:\/\/|www\.)[^\s<>()]+|(?:[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let urlMatch: RegExpExecArray | null;
  while ((urlMatch = urlRegex.exec(text)) !== null) {
    for (let i = urlMatch.index; i < urlMatch.index + urlMatch[0].length; i++) {
      occupied[i] = true;
    }
  }

  // 2. Mark self-mentions as occupied so they are not linked and sub-terms do not match inside them
  for (const selfTerm of index.selfTerms) {
    const escaped = escapeRegex(selfTerm);
    const regex = new RegExp(`(?<=^|[^a-zA-Z0-9])${escaped}(?=[^a-zA-Z0-9]|$)`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      for (let i = m.index; i < m.index + m[0].length; i++) {
        occupied[i] = true;
      }
    }
  }

  // 3. Match terms in order of length descending (longest first)
  const matches: MatchSpan[] = [];
  for (const term of index.sortedTerms) {
    const candidate = index.uniqueNames.get(term);
    if (!candidate) continue;

    // Word boundary regex: check that term is preceded and followed by non-alphanumeric or string boundary
    const escaped = escapeRegex(term);
    const regex = new RegExp(`(?<=^|[^a-zA-Z0-9])${escaped}(?=[^a-zA-Z0-9]|$)`, 'gi');

    let m: RegExpExecArray | null;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;

      // Check if any character in this span is already occupied
      let collides = false;
      for (let i = start; i < end; i++) {
        if (occupied[i]) {
          collides = true;
          break;
        }
      }

      if (!collides) {
        matches.push({
          start,
          end,
          candidate,
          matchedText: m[0],
        });
        for (let i = start; i < end; i++) occupied[i] = true;
      }
    }
  }

  // Sort matches by start index ascending
  return matches.sort((a, b) => a.start - b.start);
}

/**
 * Transforms a single ProseMirror text node into an array of nodes,
 * converting matched entity names into { type: 'entityLink', attrs: { entityId, label } }.
 */
function transformTextNode(node: any, index: EntityIndex): any[] {
  if (node.type !== 'text' || typeof node.text !== 'string') return [node];

  // Do not link inside code marks or external link marks
  if (Array.isArray(node.marks)) {
    const hasCode = node.marks.some((m: any) => m.type === 'code');
    const hasLink = node.marks.some((m: any) => m.type === 'link');
    if (hasCode || hasLink) return [node];
  }

  const matches = findEntityMatches(node.text, index);
  if (matches.length === 0) return [node];

  const result: any[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      result.push({
        type: 'text',
        text: node.text.slice(cursor, match.start),
        marks: node.marks,
      });
    }

    result.push({
      type: 'entityLink',
      attrs: {
        entityId: match.candidate.id,
        label: match.matchedText,
      },
    });

    cursor = match.end;
  }

  if (cursor < node.text.length) {
    result.push({
      type: 'text',
      text: node.text.slice(cursor),
      marks: node.marks,
    });
  }

  return result;
}

/**
 * Recursively walks a ProseMirror document JSON structure and converts entity mentions into entityLink nodes.
 */
export function linkMentionsInDoc(doc: any, entities: Entity[], currentEntityId?: string): any {
  if (!doc || typeof doc !== 'object') return doc;

  const index = buildEntityNameIndex(entities, currentEntityId);
  if (index.sortedTerms.length === 0 && index.selfTerms.length === 0) return doc;

  function walk(node: any): any {
    if (!node || typeof node !== 'object') return node;

    // Do not link inside codeBlock or existing entityLink
    if (node.type === 'codeBlock' || node.type === 'entityLink') {
      return node;
    }

    if (node.type === 'text') {
      return transformTextNode(node, index);
    }

    if (Array.isArray(node.content)) {
      const newContent: any[] = [];
      for (const child of node.content) {
        const transformed = walk(child);
        if (Array.isArray(transformed)) {
          newContent.push(...transformed);
        } else if (transformed) {
          newContent.push(transformed);
        }
      }
      return { ...node, content: newContent };
    }

    return node;
  }

  return walk(doc);
}

/**
 * Helper to process an article JSON string.
 * Returns the transformed JSON string if modifications occurred, or original string if unchanged.
 */
export function linkMentionsInArticleString(articleJsonStr?: string, entities?: Entity[], currentEntityId?: string): string {
  if (!articleJsonStr || !entities || entities.length === 0) return articleJsonStr || '';
  try {
    const doc = JSON.parse(articleJsonStr);
    const transformed = linkMentionsInDoc(doc, entities, currentEntityId);
    return JSON.stringify(transformed);
  } catch {
    return articleJsonStr;
  }
}
