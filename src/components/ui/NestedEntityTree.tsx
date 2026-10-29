// src/components/ui/NestedEntityTree.tsx
// Obsidian-style nested collapsible entity hierarchy tree

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Globe, Folder, Search, X,
  ChevronsDown, ChevronsUp, FileText
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

  // Expanded nodes set
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem('hexatron-tree-expanded');
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Save expanded nodes to session storage
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
          // Filter out dummy "My Universe" if empty
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
    return () => { cancelled = true; };
  }, [universeVersion]);

  // Entity Type Map
  const typeMap = useMemo(() => {
    const map = new Map<string, EntityType>();
    entityTypes.forEach(t => map.set(t.id, t));
    return map;
  }, [entityTypes]);

  // Build the hierarchical tree from real database relationships & parent IDs
  const rawTree = useMemo(() => {
    // 1. Map entities by ID
    const entityById = new Map<string, Entity>();
    entities.forEach(ent => entityById.set(ent.id, ent));

    // 2. Build parent -> child entity mappings
    // Supported hierarchy relationship types:
    // child -> parent: 'rt-located-in', 'rt-member-of', 'rt-belongs-to', 'rt-child-of', 'rt-capital-of'
    // parent -> child: 'rt-parent-of'
    const childrenOfEntity = new Map<string, Set<string>>();
    const parentOfEntity = new Map<string, string>();

    // Process relationships
    relationships.forEach(rel => {
      let parentId: string | null = null;
      let childId: string | null = null;

      if (['rt-located-in', 'rt-member-of', 'rt-belongs-to', 'rt-child-of', 'rt-capital-of'].includes(rel.typeId)) {
        childId = rel.fromEntityId;
        parentId = rel.toEntityId;
      } else if (rel.typeId === 'rt-parent-of') {
        parentId = rel.fromEntityId;
        childId = rel.toEntityId;
      }

      if (parentId && childId && parentId !== childId && entityById.has(parentId) && entityById.has(childId)) {
        if (!childrenOfEntity.has(parentId)) {
          childrenOfEntity.set(parentId, new Set());
        }
        childrenOfEntity.get(parentId)!.add(childId);
        if (!parentOfEntity.has(childId)) {
          parentOfEntity.set(childId, parentId);
        }
      }
    });

    // Process explicit entity properties (e.g. parent_id, parentId, part_of)
    entities.forEach(ent => {
      if (ent.properties) {
        const propParent = ent.properties.parent_id || ent.properties.parentId || ent.properties.part_of;
        if (typeof propParent === 'string' && propParent && entityById.has(propParent) && propParent !== ent.id) {
          if (!childrenOfEntity.has(propParent)) {
            childrenOfEntity.set(propParent, new Set());
          }
          childrenOfEntity.get(propParent)!.add(ent.id);
          if (!parentOfEntity.has(ent.id)) {
            parentOfEntity.set(ent.id, propParent);
          }
        }
      }
    });

    // Helper: Recursively build entity subtree with cycle detection
    function buildEntitySubtree(entityId: string, visited: Set<string>): TreeNode | null {
      if (visited.has(entityId)) return null; // Cycle guard
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

      // Sort child entities by entryNumber or title
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
        entity: ent,
        children: childNodes,
        iconName: typeDef?.icon || 'FileText',
        iconColor: typeDef?.color || 'var(--accent)',
        entryNumber: ent.entryNumber,
      };
    }

    // 3. Construct Top-Level Tree: Universes -> Worlds -> Root Entities
    const universeNodes: TreeNode[] = universes.map(u => {
      const worldList = worlds.filter(w => w.universeId === u.id);
      const worldNodes: TreeNode[] = worldList.map(w => {
        const worldEntities = entities.filter(e => e.worldId === w.id);
        
        // Find top-level root entities in this world (entities with no parent or whose parent is in another world)
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
  }, [universes, worlds, entities, relationships, typeMap]);

  // Compute search matches and ancestor IDs to auto-expand
  const { filteredTree, searchMatches, matchedAncestorIds } = useMemo(() => {
    if (!searchTerm.trim()) {
      return { filteredTree: rawTree, searchMatches: new Set<string>(), matchedAncestorIds: new Set<string>() };
    }

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
        const filteredChild = filterNode(c, nextPath);
        if (filteredChild) matchingChildren.push(filteredChild);
      });

      if (isMatch || matchingChildren.length > 0) {
        return {
          ...node,
          children: matchingChildren,
        };
      }
      return null;
    }

    const result: TreeNode[] = [];
    rawTree.forEach(u => {
      const filtered = filterNode(u, []);
      if (filtered) result.push(filtered);
    });

    return { filteredTree: result, searchMatches: matches, matchedAncestorIds: ancestorIds };
  }, [rawTree, searchTerm]);

  // Toggle expand / collapse for a single node without opening an article
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
  }, [persistExpanded]);

  // Expand all nodes
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
  }, [rawTree, persistExpanded]);

  // Collapse all nodes
  const collapseAll = useCallback(() => {
    const empty = new Set<string>();
    setExpandedIds(empty);
    persistExpanded(empty);
  }, [persistExpanded]);

  // Auto-expand active item or current world when loaded
  useEffect(() => {
    if (currentWorldId) {
      setExpandedIds(prev => {
        if (!prev.has(currentWorldId)) {
          const next = new Set(prev);
          next.add(currentWorldId);
          // Also find parent universe of world
          const world = worlds.find(w => w.id === currentWorldId);
          if (world?.universeId) next.add(world.universeId);
          persistExpanded(next);
          return next;
        }
        return prev;
      });
    }
  }, [currentWorldId, worlds, persistExpanded]);

  // Handle clicking an entity title (navigates & auto-closes mobile drawer)
  const handleEntityClick = (entityId: string) => {
    setCurrentEntity(entityId);
    navigate(`/entity/${entityId}`);
    if (window.innerWidth <= 900) {
      setLeftSidebarOpen(false);
    }
    onSelectEntity?.();
  };

  // Handle clicking a world title
  const handleWorldClick = (worldId: string) => {
    setCurrentWorld(worldId);
    navigate(`/world/${worldId}`);
    if (window.innerWidth <= 900) {
      setLeftSidebarOpen(false);
    }
    onSelectEntity?.();
  };

  // Handle clicking a universe title
  const handleUniverseClick = (universeId: string) => {
    navigate(`/universe/${universeId}`);
    if (window.innerWidth <= 900) {
      setLeftSidebarOpen(false);
    }
    onSelectEntity?.();
  };

  // Recursive Tree Node Renderer
  const renderNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = searchTerm.trim() ? (matchedAncestorIds.has(node.id) || expandedIds.has(node.id)) : expandedIds.has(node.id);
    const isCurrent = (node.type === 'entity' && node.id === currentEntityId) || (node.type === 'world' && node.id === currentWorldId);
    const isMatched = searchMatches.has(node.id);

    return (
      <div key={node.id} className="tree-node-item">
        <div className={`tree-row-wrapper ${isCurrent ? 'active' : ''} ${isMatched ? 'search-matched' : ''}`}>
          {/* 1. Distinct Expand / Collapse Chevron Control */}
          {hasChildren ? (
            <button
              type="button"
              className="tree-expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              title={isExpanded ? `Collapse ${node.title}` : `Expand ${node.title}`}
              aria-expanded={isExpanded}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="tree-expand-spacer" />
          )}

          {/* 2. Distinct Entity Title Link / Interaction */}
          <button
            type="button"
            className="tree-node-title"
            onClick={() => {
              if (node.type === 'entity') handleEntityClick(node.id);
              else if (node.type === 'world') handleWorldClick(node.id);
              else if (node.type === 'universe') handleUniverseClick(node.id);
            }}
            title={node.title}
          >
            {node.type === 'universe' && <Globe size={14} className="icon-muted" />}
            {node.type === 'world' && <Folder size={14} style={{ color: node.iconColor }} />}
            {node.type === 'entity' && (
              <EntityTypeIcon name={node.iconName || 'FileText'} size={13} color={node.iconColor} />
            )}
            <span className="tree-node-label">{node.title}</span>
            {hasChildren && <span className="tree-badge">{node.children.length}</span>}
          </button>
        </div>

        {/* 3. Nested Children Container */}
        {hasChildren && isExpanded && (
          <div className="tree-children-container">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading && universes.length === 0) {
    return <div className="tree-empty-state">Loading hierarchy…</div>;
  }

  return (
    <div className="nested-tree-container">
      {/* Search & Collapse Toolbar */}
      <div className="nested-tree-toolbar">
        <div className="nested-tree-search">
          <Search size={13} />
          <input
            type="text"
            placeholder="Filter hierarchy…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="nested-tree-search-clear"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <button
          type="button"
          className="nested-tree-btn"
          onClick={expandAll}
          title="Expand all"
        >
          <ChevronsDown size={14} />
        </button>
        <button
          type="button"
          className="nested-tree-btn"
          onClick={collapseAll}
          title="Collapse all"
        >
          <ChevronsUp size={14} />
        </button>
      </div>

      {/* Hierarchical Tree List */}
      <div className="nested-tree-list">
        {filteredTree.length > 0 ? (
          filteredTree.map(node => renderNode(node, 0))
        ) : (
          <div className="tree-empty-state">
            {searchTerm ? 'No matching entities found.' : 'No entities in hierarchy.'}
          </div>
        )}
      </div>
    </div>
  );
}

