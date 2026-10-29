// src/components/ui/NestedEntityTree.tsx
// Redesigned Focused Hierarchical Navigation Tree for Worldbuilding Encyclopedia
// Elegant indentation, restrained violet accents, and smooth CSS-grid branch animations

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Globe, Folder, Search, X,
  ChevronsDown, ChevronsUp, Target, Layers, Eye
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import {
  getUniverses, getWorlds, getEntities, getRelationships, getEntityTypes,
  type Universe, type World, type Entity, type Relationship, type EntityType
} from '../../db/operations';
import EntityTypeIcon from './EntityTypeIcon';
import './NestedEntityTree.css';

interface Props {
  onSelectEntity?: () => void;
}

interface TreeNode {
  id: string;
  type: 'universe' | 'world' | 'entity';
  title: string;
  parentId?: string;
  entity?: Entity;
  world?: World;
  universe?: Universe;
  children: TreeNode[];
  iconName?: string;
  iconColor?: string;
  entryNumber?: number;
}

export default function NestedEntityTree({ onSelectEntity }: Props) {
  const navigate = useNavigate();
  const {
    universeVersion, currentWorldId, currentEntityId,
    setCurrentWorld, setCurrentEntity, setLeftSidebarOpen
  } = useAppStore();

  const [universes, setUniverses] = useState<Universe[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Mode: 'focused' (default: shows active entity and ancestor path) vs 'browse' (explores all children)
  const [treeMode, setTreeMode] = useState<'focused' | 'browse'>('focused');

  // Manually expanded parents in focused mode
  const [manuallyExpandedParents, setManuallyExpandedParents] = useState<Set<string>>(new Set());

  // Expanded nodes set (for collapse/expand toggle)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem('hexatron-tree-expanded');
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  const persistExpanded = useCallback((newSet: Set<string>) => {
    try {
      sessionStorage.setItem('hexatron-tree-expanded', JSON.stringify([...newSet]));
    } catch {
      // ignore
    }
  }, []);

  // Fetch all hierarchy data
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const [u, w, e, r, et] = await Promise.all([
          getUniverses(),
          getWorlds(),
          getEntities(),
          getRelationships(),
          getEntityTypes(),
        ]);
        if (!cancelled) {
          const cleanU = u.filter(uni => uni.title !== 'My Universe' || w.some(world => world.universeId === uni.id));
          setUniverses(cleanU);
          setWorlds(w);
          setEntities(e);
          setRelationships(r);
          setEntityTypes(et);
        }
      } catch (err) {
        console.error('Failed to load tree data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [universeVersion]);

  // Index maps
  const typeMap = useMemo(() => new Map(entityTypes.map(t => [t.id, t])), [entityTypes]);

  const { parentOfEntity, childrenOfEntity, entityById } = useMemo(() => {
    const parentMap = new Map<string, string>();
    const childrenMap = new Map<string, Set<string>>();
    const eMap = new Map<string, Entity>(entities.map(e => [e.id, e]));

    // Process relationships
    relationships.forEach(rel => {
      let parentId: string | undefined;
      let childId: string | undefined;

      if (rel.typeId === 'rt-part-of') {
        childId = rel.fromEntityId;
        parentId = rel.toEntityId;
      } else if (rel.typeId === 'rt-parent-of') {
        parentId = rel.fromEntityId;
        childId = rel.toEntityId;
      }

      if (parentId && childId && parentId !== childId && eMap.has(parentId) && eMap.has(childId)) {
        if (!childrenMap.has(parentId)) childrenMap.set(parentId, new Set());
        childrenMap.get(parentId)!.add(childId);
        if (!parentMap.has(childId)) parentMap.set(childId, parentId);
      }
    });

    // Process properties (parent_id, parentId, part_of)
    entities.forEach(ent => {
      if (ent.properties) {
        const propParent = ent.properties.parent_id || ent.properties.parentId || ent.properties.part_of;
        if (typeof propParent === 'string' && propParent && eMap.has(propParent) && propParent !== ent.id) {
          if (!childrenMap.has(propParent)) childrenMap.set(propParent, new Set());
          childrenMap.get(propParent)!.add(ent.id);
          if (!parentMap.has(ent.id)) parentMap.set(ent.id, propParent);
        }
      }
    });

    return { parentOfEntity: parentMap, childrenOfEntity: childrenMap, entityById: eMap };
  }, [entities, relationships]);

  // Build raw tree
  const rawTree = useMemo(() => {
    function buildEntitySubtree(entityId: string, visited: Set<string>): TreeNode | null {
      if (visited.has(entityId)) return null;
      const ent = entityById.get(entityId);
      if (!ent) return null;

      const nextVisited = new Set(visited);
      nextVisited.add(entityId);

      const typeDef = typeMap.get(ent.typeId);
      const childIds = Array.from(childrenOfEntity.get(entityId) || []);
      
      const childNodes: TreeNode[] = [];
      childIds.forEach(cId => {
        const cNode = buildEntitySubtree(cId, nextVisited);
        if (cNode) childNodes.push(cNode);
      });

      childNodes.sort((a, b) => {
        if (a.entryNumber !== undefined && b.entryNumber !== undefined) {
          return a.entryNumber - b.entryNumber;
        }
        return a.title.localeCompare(b.title);
      });

      return {
        id: ent.id,
        type: 'entity',
        title: ent.title,
        parentId: parentOfEntity.get(ent.id),
        entity: ent,
        children: childNodes,
        iconName: typeDef?.icon || 'FileText',
        iconColor: typeDef?.color || 'var(--accent)',
        entryNumber: ent.entryNumber,
      };
    }

    const universeNodes: TreeNode[] = universes.map(u => {
      const worldList = worlds.filter(w => w.universeId === u.id);
      const worldNodes: TreeNode[] = worldList.map(w => {
        const worldEntities = entities.filter(e => e.worldId === w.id);
        const rootEntityNodes: TreeNode[] = [];

        worldEntities.forEach(e => {
          const pId = parentOfEntity.get(e.id);
          const hasLocalParent = pId && entityById.has(pId) && entityById.get(pId)!.worldId === w.id;
          if (!hasLocalParent) {
            const rootNode = buildEntitySubtree(e.id, new Set());
            if (rootNode) rootEntityNodes.push(rootNode);
          }
        });

        rootEntityNodes.sort((a, b) => {
          if (a.entryNumber !== undefined && b.entryNumber !== undefined) {
            return a.entryNumber - b.entryNumber;
          }
          return a.title.localeCompare(b.title);
        });

        return {
          id: w.id,
          type: 'world',
          title: w.title,
          parentId: u.id,
          world: w,
          children: rootEntityNodes,
          iconColor: w.color || 'var(--accent)',
        };
      });

      return {
        id: u.id,
        type: 'universe',
        title: u.title,
        universe: u,
        children: worldNodes,
      };
    });

    return universeNodes;
  }, [universes, worlds, entities, entityById, parentOfEntity, childrenOfEntity, typeMap]);

  // Set of entity IDs in the active ancestor path
  const focusedPathSet = useMemo(() => {
    const path = new Set<string>();
    if (!currentEntityId) return path;

    path.add(currentEntityId);
    let cur: string | undefined = currentEntityId;
    while (cur && parentOfEntity.has(cur)) {
      const p: string | undefined = parentOfEntity.get(cur);
      if (p) {
        path.add(p);
        cur = p;
      } else {
        break;
      }
    }

    // Include world and universe of the current entity
    const ent = entityById.get(currentEntityId);
    if (ent) {
      path.add(ent.worldId);
      const world = worlds.find(w => w.id === ent.worldId);
      if (world) path.add(world.universeId);
    }

    return path;
  }, [currentEntityId, parentOfEntity, entityById, worlds]);

  // When entity selection changes, auto-expand its ancestors
  useEffect(() => {
    if (currentEntityId && focusedPathSet.size > 0) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        focusedPathSet.forEach(id => next.add(id));
        persistExpanded(next);
        return next;
      });
      // Clear manual expansions from prior selections
      setManuallyExpandedParents(new Set());

      // Auto-scroll selected node into view smoothly
      setTimeout(() => {
        const el = document.getElementById(`tree-node-${currentEntityId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 120);
    }
  }, [currentEntityId, focusedPathSet, persistExpanded]);

  // Filter tree based on search query OR focused path
  const { displayTree, searchMatches, matchedAncestorIds } = useMemo(() => {
    // 1. Search Mode
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matches = new Set<string>();
      const ancestorIds = new Set<string>();

      function filterNode(node: TreeNode, path: string[]): TreeNode | null {
        const isMatch = node.title.toLowerCase().includes(term);
        if (isMatch) {
          matches.add(node.id);
          path.forEach(id => ancestorIds.add(id));
        }

        const matchingChildren: TreeNode[] = [];
        const nextPath = [...path, node.id];

        node.children.forEach(c => {
          const res = filterNode(c, nextPath);
          if (res) matchingChildren.push(res);
        });

        if (isMatch || matchingChildren.length > 0) {
          return { ...node, children: matchingChildren };
        }
        return null;
      }

      const res: TreeNode[] = [];
      rawTree.forEach(u => {
        const filtered = filterNode(u, []);
        if (filtered) res.push(filtered);
      });

      return { displayTree: res, searchMatches: matches, matchedAncestorIds: ancestorIds };
    }

    // 2. Focused Path Mode (Default when entity is selected)
    if (treeMode === 'focused' && currentEntityId && focusedPathSet.size > 0) {
      function pruneFocused(node: TreeNode): TreeNode | null {
        if (!focusedPathSet.has(node.id)) {
          return null;
        }

        const isManuallyExpanded = manuallyExpandedParents.has(node.id);
        let filteredChildren: TreeNode[] = [];

        if (isManuallyExpanded) {
          filteredChildren = node.children;
        } else {
          filteredChildren = node.children.filter(c => focusedPathSet.has(c.id));
        }

        return {
          ...node,
          children: filteredChildren.map(c => pruneFocused(c) || c),
        };
      }

      const focusedTree: TreeNode[] = [];
      rawTree.forEach(u => {
        const pruned = pruneFocused(u);
        if (pruned) focusedTree.push(pruned);
      });

      return { displayTree: focusedTree.length > 0 ? focusedTree : rawTree, searchMatches: new Set(), matchedAncestorIds: new Set() };
    }

    // 3. Browse Mode (Full hierarchy)
    return { displayTree: rawTree, searchMatches: new Set(), matchedAncestorIds: new Set() };
  }, [rawTree, searchTerm, treeMode, currentEntityId, focusedPathSet, manuallyExpandedParents]);

  // Toggle expand/collapse control
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      persistExpanded(next);
      return next;
    });

    if (treeMode === 'focused') {
      setManuallyExpandedParents(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }
  }, [persistExpanded, treeMode]);

  const expandAll = useCallback(() => {
    const all = new Set<string>();
    function collect(node: TreeNode) {
      if (node.children.length > 0) {
        all.add(node.id);
        node.children.forEach(collect);
      }
    }
    rawTree.forEach(collect);
    setExpandedIds(all);
    persistExpanded(all);
    setTreeMode('browse');
  }, [rawTree, persistExpanded]);

  const collapseAll = useCallback(() => {
    const empty = new Set<string>();
    setExpandedIds(empty);
    persistExpanded(empty);
    setManuallyExpandedParents(new Set());
  }, [persistExpanded]);

  const handleEntityClick = (entityId: string) => {
    setCurrentEntity(entityId);
    navigate(`/entity/${entityId}`);
    if (window.innerWidth <= 900) {
      setLeftSidebarOpen(false);
    }
    onSelectEntity?.();
  };

  const handleWorldClick = (worldId: string) => {
    setCurrentWorld(worldId);
    navigate(`/world/${worldId}`);
    if (window.innerWidth <= 900) {
      setLeftSidebarOpen(false);
    }
    onSelectEntity?.();
  };

  const handleUniverseClick = (universeId: string) => {
    navigate(`/universe/${universeId}`);
    if (window.innerWidth <= 900) {
      setLeftSidebarOpen(false);
    }
    onSelectEntity?.();
  };

  // Node renderer with disciplined indentation and restrained styling
  const renderNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = searchTerm.trim()
      ? (matchedAncestorIds.has(node.id) || expandedIds.has(node.id))
      : expandedIds.has(node.id);

    // Active state: strictly the current entity (or current world if no entity is active)
    const isCurrent = node.type === 'entity' && node.id === currentEntityId;
    const isAncestor = !isCurrent && treeMode === 'focused' && focusedPathSet.has(node.id);
    const isMatched = searchMatches.has(node.id);

    const totalOriginalChildren = childrenOfEntity.get(node.id)?.size || 0;
    const isParentInFocusedPath = treeMode === 'focused' && focusedPathSet.has(node.id) && !manuallyExpandedParents.has(node.id);
    const hasHiddenSiblings = isParentInFocusedPath && totalOriginalChildren > node.children.length;

    const indentPx = depth * 14;

    return (
      <div key={node.id} id={`tree-node-${node.id}`} className="net-node-item">
        <div
          className={`net-row ${isCurrent ? 'active' : ''} ${isAncestor ? 'ancestor' : ''} ${isMatched ? 'search-matched' : ''}`}
          style={{ paddingLeft: `${indentPx + 4}px`, '--indent-depth': `${indentPx}px` } as React.CSSProperties}
        >
          {/* 1. Expand / Collapse chevron control */}
          {hasChildren || hasHiddenSiblings ? (
            <button
              type="button"
              className="net-chevron-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              title={isExpanded ? `Collapse ${node.title}` : `Expand ${node.title}`}
              aria-expanded={isExpanded}
            >
              <ChevronRight
                size={13}
                className={`net-chevron-icon ${isExpanded ? 'open' : ''}`}
              />
            </button>
          ) : (
            <span className="net-spacer" />
          )}

          {/* 2. Entity Title button (separate navigation action) */}
          <button
            type="button"
            className="net-node-btn"
            onClick={() => {
              if (node.type === 'entity') handleEntityClick(node.id);
              else if (node.type === 'world') handleWorldClick(node.id);
              else if (node.type === 'universe') handleUniverseClick(node.id);
            }}
            title={node.title}
          >
            {node.type === 'universe' && <Globe size={13} className="icon-muted" />}
            {node.type === 'world' && <Folder size={13} style={{ color: node.iconColor }} />}
            {node.type === 'entity' && (
              <EntityTypeIcon name={node.iconName || 'FileText'} size={13} color={node.iconColor} />
            )}
            <span className="net-node-label">{node.title}</span>
            {hasChildren && <span className="net-child-badge">{node.children.length}</span>}
          </button>
        </div>

        {/* 3. Option to reveal hidden siblings when in focused path */}
        {hasHiddenSiblings && isExpanded && (
          <button
            type="button"
            className="net-siblings-btn"
            style={{ '--indent-depth': `${indentPx}px` } as React.CSSProperties}
            onClick={() => {
              setManuallyExpandedParents(prev => new Set(prev).add(node.id));
            }}
            title="Reveal all children and siblings under this branch"
          >
            <Eye size={11} />
            <span>Show all {totalOriginalChildren} siblings</span>
          </button>
        )}

        {/* 4. Smooth animated branch container */}
        {(hasChildren || hasHiddenSiblings) && (
          <div
            className={`net-branch ${isExpanded ? 'open' : ''}`}
            style={{ '--indent-depth': `${indentPx}px` } as React.CSSProperties}
          >
            <div className="net-branch-inner">
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading && universes.length === 0) {
    return <div className="net-empty">Loading encyclopedia tree…</div>;
  }

  return (
    <div className="net-root">
      {/* Toolbar: Search + Mode Switcher */}
      <div className="net-toolbar">
        <div className="net-search-wrapper">
          <Search size={13} />
          <input
            type="text"
            className="net-search-input"
            placeholder="Search hierarchy…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="net-search-clear"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="net-controls-row">
          {/* Mode Switcher: Focused Path vs Browse All */}
          <div className="net-mode-toggle" role="group" aria-label="Hierarchy mode">
            <button
              type="button"
              className={`net-mode-btn ${treeMode === 'focused' ? 'active' : ''}`}
              onClick={() => {
                setTreeMode('focused');
                setManuallyExpandedParents(new Set());
              }}
              title="Focused path mode: shows current entity's ancestor chain, hiding siblings"
            >
              <Target size={11} />
              <span>Focused</span>
            </button>
            <button
              type="button"
              className={`net-mode-btn ${treeMode === 'browse' ? 'active' : ''}`}
              onClick={() => setTreeMode('browse')}
              title="Browse mode: view and expand all branches"
            >
              <Layers size={11} />
              <span>Browse</span>
            </button>
          </div>

          <div className="net-actions-group">
            <button
              type="button"
              className="net-action-icon-btn"
              onClick={expandAll}
              title="Expand all branches"
            >
              <ChevronsDown size={13} />
            </button>
            <button
              type="button"
              className="net-action-icon-btn"
              onClick={collapseAll}
              title="Collapse all branches"
            >
              <ChevronsUp size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Tree Content */}
      <div className="net-tree-list">
        {displayTree.map(node => renderNode(node, 0))}
        {displayTree.length === 0 && (
          <div className="net-empty">
            {searchTerm ? 'No matching entities found.' : 'No entities in this universe yet.'}
          </div>
        )}
      </div>
    </div>
  );
}
