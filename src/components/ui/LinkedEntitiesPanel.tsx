// src/components/ui/LinkedEntitiesPanel.tsx
// Canonical Wikipedia-style Linked Entities sidebar panel with independent expand/collapse

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2, Plus, Search, X, Globe, Shield,
  Users, User, Clock, Star, Compass
} from 'lucide-react';
import {
  getEntity, getEntityTypes, getEntityRelationshipsWithDetails, getBacklinks,
  formatEntryNumber, type EntityRelationshipDetail
} from '../../db/operations';
import { useAppStore } from '../../store/appStore';
import type { Entity, EntityType } from '../../db/schema';
import EntityTypeIcon from './EntityTypeIcon';
import './LinkedEntitiesPanel.css';

interface Props {
  entityId: string;
  onNavigate?: () => void;
  compact?: boolean;
}

interface CategorizedItem {
  detail: EntityRelationshipDetail;
  verbs: { label: string; direction: 'outgoing' | 'incoming' }[];
}

interface CategoryGroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  items: CategorizedItem[];
}

export default function LinkedEntitiesPanel({ entityId, onNavigate, compact = false }: Props) {
  const navigate = useNavigate();
  const { isOwner } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [details, setDetails] = useState<EntityRelationshipDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Reset search and load data when entityId changes
  useEffect(() => {
    if (!entityId) return;
    setLoading(true);
    setSearchQuery('');

    let isMounted = true;
    Promise.all([
      getEntity(entityId),
      getEntityTypes(),
      getEntityRelationshipsWithDetails(entityId),
      getBacklinks(entityId),
    ])
      .then(([ent, types, relDetails, backlinks]) => {
        if (!isMounted) return;
        setCurrentEntity(ent ?? null);
        setEntityTypes(types);

        // Convert backlinks that aren't already represented into details
        const existingTargetIds = new Set(relDetails.map(d => d.otherEntity?.id).filter(Boolean));
        const backlinkDetails: EntityRelationshipDetail[] = (backlinks || [])
          .filter(be => !existingTargetIds.has(be.id) && be.id !== entityId)
          .map(be => ({
            relationship: {
              id: `backlink-${be.id}`,
              worldId: be.worldId,
              fromEntityId: be.id,
              toEntityId: entityId,
              typeId: 'rt-mentioned-in',
              canonStatus: be.canonStatus,
              createdAt: be.createdAt,
              updatedAt: be.updatedAt,
            },
            relType: {
              id: 'rt-mentioned-in',
              name: 'mentions',
              reverseName: 'mentioned in article',
              inverseTypeId: undefined,
              isDirected: true,
              isBuiltIn: true,
              color: '#38bdf8',
            },
            direction: 'incoming',
            otherEntity: be,
          }));

        setDetails([...relDetails, ...backlinkDetails]);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load linked entities:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [entityId]);

  // Build entity type lookup map
  const typeMap = useMemo(() => {
    const map = new Map<string, EntityType>();
    for (const t of entityTypes) {
      map.set(t.id, t);
    }
    return map;
  }, [entityTypes]);

  // Deduplicate target entities and accumulate all relationship verbs
  const uniqueEntitiesMap = useMemo(() => {
    const map = new Map<string, CategorizedItem>();
    for (const item of details) {
      if (!item.otherEntity) continue;
      const targetId = item.otherEntity.id;
      const verb = item.direction === 'outgoing'
        ? item.relType?.name || 'related to'
        : item.relType?.reverseName || 'related to';

      const existing = map.get(targetId);
      if (existing) {
        if (!existing.verbs.some(v => v.label.toLowerCase() === verb.toLowerCase() && v.direction === item.direction)) {
          existing.verbs.push({ label: verb, direction: item.direction });
        }
      } else {
        map.set(targetId, {
          detail: item,
          verbs: [{ label: verb, direction: item.direction }],
        });
      }
    }
    return map;
  }, [details]);

  const uniqueList = useMemo(() => Array.from(uniqueEntitiesMap.values()), [uniqueEntitiesMap]);

  // Meaningful Wikipedia-style categories: Characters, Nations, Locations, Events & Eras, Organizations, Culture & Faiths, Other
  const categorizedGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    // 1. Filter items if search query is active
    const filteredItems = uniqueList.filter(item => {
      const e = item.detail.otherEntity;
      if (!e) return false;
      if (!q) return true;
      const titleMatch = e.title.toLowerCase().includes(q);
      const numMatch = formatEntryNumber(e.entryNumber).toLowerCase().includes(q);
      const aliasMatch = e.aliases?.some(a => a.toLowerCase().includes(q)) ?? false;
      const verbMatch = item.verbs.some(v => v.label.toLowerCase().includes(q));
      return titleMatch || numMatch || aliasMatch || verbMatch;
    });

    // 2. Initialize canonical category buckets
    const groupBucketMap = new Map<string, CategoryGroup>();

    function addGroup(id: string, title: string, icon: React.ComponentType<{ size?: number; className?: string }>) {
      groupBucketMap.set(id, { id, title, icon, items: [] });
    }

    addGroup('characters', 'Characters', User);
    addGroup('nations', 'Nations', Shield);
    addGroup('locations', 'Locations', Globe);
    addGroup('events', 'Events & Eras', Clock);
    addGroup('organizations', 'Organizations', Users);
    addGroup('culture', 'Culture & Faiths', Star);
    addGroup('other', 'Other Types', Compass);

    // 3. Classify each item into the canonical category
    for (const item of filteredItems) {
      const other = item.detail.otherEntity;
      if (!other) continue;
      const oType = other.typeId;

      if (oType === 'et-character' || oType === 'et-family') {
        groupBucketMap.get('characters')?.items.push(item);
      } else if (oType === 'et-nation') {
        groupBucketMap.get('nations')?.items.push(item);
      } else if ([
        'et-location', 'et-planet', 'et-continent', 'et-region',
        'et-city', 'et-settlement', 'et-state', 'et-governorate',
        'et-territory', 'et-map'
      ].includes(oType)) {
        groupBucketMap.get('locations')?.items.push(item);
      } else if (['et-event', 'et-era', 'et-timeline', 'et-calendar'].includes(oType)) {
        groupBucketMap.get('events')?.items.push(item);
      } else if (oType === 'et-organization') {
        groupBucketMap.get('organizations')?.items.push(item);
      } else if (['et-religion', 'et-language', 'et-ethnicity', 'et-culture'].includes(oType)) {
        groupBucketMap.get('culture')?.items.push(item);
      } else {
        // Custom entity type or concept/theory
        if (oType && typeMap.has(oType)) {
          const typeDef = typeMap.get(oType)!;
          const customGroupId = `custom-${typeDef.id}`;
          if (!groupBucketMap.has(customGroupId)) {
            groupBucketMap.set(customGroupId, {
              id: customGroupId,
              title: typeDef.name,
              icon: Compass,
              items: [],
            });
          }
          groupBucketMap.get(customGroupId)?.items.push(item);
        } else {
          groupBucketMap.get('other')?.items.push(item);
        }
      }
    }

    // 4. Sort items alphabetically within each group
    for (const group of groupBucketMap.values()) {
      group.items.sort((a, b) =>
        (a.detail.otherEntity?.title || '').localeCompare(b.detail.otherEntity?.title || '')
      );
    }

    // 5. Return only non-empty groups
    return Array.from(groupBucketMap.values()).filter(g => g.items.length > 0);
  }, [uniqueList, searchQuery, typeMap]);

  // Independent accordion expand/collapse toggle
  function toggleCategory(categoryId: string, e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCollapsedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }

  function handleExpandAll(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCollapsedCategories({});
  }

  function handleCollapseAll(e?: React.MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const allCollapsed: Record<string, boolean> = {};
    for (const g of categorizedGroups) {
      allCollapsed[g.id] = true;
    }
    setCollapsedCategories(allCollapsed);
  }

  function handleEntityClick(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/entity/${id}`);
    if (onNavigate) onNavigate();
  }

  const allAreCollapsed = categorizedGroups.length > 0 &&
    categorizedGroups.every(g => collapsedCategories[g.id] === true);

  return (
    <div className={`linked-entities-panel ${compact ? 'compact' : ''}`}>
      {/* Canonical Sidebar Header */}
      <div className="lep-header">
        <div className="lep-title-row">
          <Link2 size={13} className="lep-icon" />
          <span className="lep-title">Linked Entities</span>
          <span className="lep-count-badge" title="Total unique linked entities">
            {uniqueList.length}
          </span>
        </div>

        <div className="lep-actions">
          {categorizedGroups.length > 1 && (
            <button
              type="button"
              className="lep-text-toggle-btn"
              onClick={allAreCollapsed ? handleExpandAll : handleCollapseAll}
              title={allAreCollapsed ? 'Expand all categories' : 'Collapse all categories'}
            >
              {allAreCollapsed ? 'Expand all' : 'Collapse all'}
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              className="lep-add-btn"
              onClick={(e) => {
                e.preventDefault();
                navigate(`/entity/${entityId}/edit`);
              }}
              title="Add or edit relationships"
            >
              <Plus size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Filter search box for quick lookup */}
      {uniqueList.length > 5 && (
        <div className="lep-search-box">
          <Search size={12} className="lep-search-icon" />
          <input
            type="text"
            placeholder="Filter linked entities…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="lep-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="lep-search-clear"
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <X size={11} />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="lep-loading">Loading relationships…</div>
      ) : uniqueList.length === 0 ? (
        <div className="lep-empty">
          <p>No connected entities yet.</p>
          {isOwner && (
            <button
              type="button"
              className="lep-empty-add-btn"
              onClick={() => navigate(`/entity/${entityId}/edit`)}
            >
              <Plus size={12} /> Add Relationship
            </button>
          )}
        </div>
      ) : categorizedGroups.length === 0 ? (
        <div className="lep-empty">
          <p>No matches found for "{searchQuery}".</p>
          <button type="button" className="lep-empty-add-btn" onClick={() => setSearchQuery('')}>
            Clear Filter
          </button>
        </div>
      ) : (
        <div className="lep-categories-stack">
          {categorizedGroups.map(group => {
            const isCollapsed = collapsedCategories[group.id] === true;

            return (
              <div key={group.id} className="lep-category-section">
                <button
                  type="button"
                  className="lep-category-header"
                  onClick={(e) => toggleCategory(group.id, e)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`lep-group-${group.id}`}
                  title={`${isCollapsed ? 'Expand' : 'Collapse'} ${group.title}`}
                >
                  <div className="lep-cat-title-left">
                    <span className="lep-disclosure-symbol">{isCollapsed ? '▶' : '▼'}</span>
                    <span className="lep-cat-title">{group.title}</span>
                    <span className="lep-cat-count">({group.items.length})</span>
                  </div>
                </button>

                {!isCollapsed && (
                  <ul id={`lep-group-${group.id}`} className="lep-entity-list">
                    {group.items.map(({ detail: { otherEntity }, verbs }) => {
                      if (!otherEntity) return null;
                      const formattedNum = formatEntryNumber(otherEntity.entryNumber);

                      return (
                        <li key={otherEntity.id} className="lep-entity-item">
                          <button
                            type="button"
                            className="lep-entity-link"
                            onClick={(e) => handleEntityClick(otherEntity.id, e)}
                            title={`Open article for ${otherEntity.title}`}
                          >
                            <EntityTypeIcon name={otherEntity.typeId} size={12} className="lep-item-icon" />
                            {formattedNum && <span className="lep-entry-number">{formattedNum}</span>}
                            <span className="lep-item-title">{otherEntity.title}</span>
                            {verbs.length > 0 && (
                              <span className="lep-item-verb" title={verbs.map(v => v.label).join(', ')}>
                                ({verbs[0].label})
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
