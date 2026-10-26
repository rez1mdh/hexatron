// src/components/graph/GraphView.tsx
// Redesigned interactive knowledge graph with bounded node sizing, hierarchy-aware scopes,
// selection dimming, label decluttering, and settled organic force physics.

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ZoomIn, ZoomOut, Maximize2, RotateCcw,
  Compass, ArrowUpRight, X, Eye, EyeOff, Pin, Play, Pause,
  Layers, Sliders, Globe, Filter, Landmark, Building2, Shield,
  Users, User, Clock, Star, Calendar, HelpCircle
} from 'lucide-react';
import { db, type Entity, type EntityType, type Relationship, type RelationshipType, type Universe, type World } from '../../db/schema';
import {
  getEntities, getEntityTypes, getRelationshipTypes, getUniverses, getWorlds, formatEntryNumber
} from '../../db/operations';
import { useAppStore } from '../../store/appStore';
import './GraphView.css';

interface Props {
  worldId?: string;
  initialSelectedEntityId?: string;
}

interface NodeData {
  id: string;
  title: string;
  entryNumber?: number;
  typeId: string;
  worldId: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pinned: boolean;
  uniqueConnections: number;
}

interface EdgeData {
  id: string;
  fromId: string;
  toId: string;
  typeId: string;
  label: string;
  reverseLabel: string;
  color: string;
  isCrossWorld: boolean;
}

type ScopeMode = 'all' | 'universe' | 'world' | 'nation' | 'local';
type CategoryFilter = 'all' | 'geography' | 'admin' | 'settlements' | 'politics' | 'peoples' | 'history';

export default function GraphView({ worldId: propWorldId, initialSelectedEntityId }: Props) {
  const navigate = useNavigate();
  const { theme } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Raw database data
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [allEntities, setAllEntities] = useState<Entity[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [relTypes, setRelTypes] = useState<RelationshipType[]>([]);
  const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);

  // Scope Selection (All Universes, Selected Universe, Selected World, Nation & Subdivisions, Local Focus)
  const [scopeMode, setScopeMode] = useState<ScopeMode>(
    initialSelectedEntityId ? 'local' : (propWorldId ? 'world' : 'all')
  );
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>('all');
  const [selectedWorldId, setSelectedWorldId] = useState<string>(propWorldId || 'all');
  const [selectedNationId, setSelectedNationId] = useState<string>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialSelectedEntityId || null);
  const [localDepth, setLocalDepth] = useState<number>(2);

  // Category Quick Filter
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Graph state
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityTypes, setSelectedEntityTypes] = useState<Set<string>>(new Set());
  const [selectedRelTypes, setSelectedRelTypes] = useState<Set<string>>(new Set());
  const [showLabels, setShowLabels] = useState(true);
  const [sizeByConnections, setSizeByConnections] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Viewport transformation & drag state
  const transformRef = useRef({ x: 0, y: 0, k: 0.9 });
  const isDraggingCanvasRef = useRef(false);
  const dragTargetNodeRef = useRef<NodeData | null>(null);
  const lastPointerPosRef = useRef({ x: 0, y: 0 });
  const initialPinchDistRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const alphaRef = useRef(0.9); // Simulation energy (settles when < 0.005)

  // 1. Load Initial Data
  useEffect(() => {
    async function init() {
      const [unis, wlds, ents, eTypes, rTypes, rels] = await Promise.all([
        getUniverses(),
        getWorlds(),
        getEntities(),
        getEntityTypes(),
        getRelationshipTypes(),
        db.relationships.filter((r: Relationship) => !r.deletedAt).toArray(),
      ]);

      setUniverses(unis);
      setWorlds(wlds);
      setAllEntities(ents);
      setEntityTypes(eTypes);
      setSelectedEntityTypes(new Set(eTypes.map(t => t.id)));
      setRelTypes(rTypes);
      setSelectedRelTypes(new Set(rTypes.map(r => r.id)));
      setAllRelationships(rels);

      if (propWorldId) {
        setSelectedWorldId(propWorldId);
        const w = wlds.find(x => x.id === propWorldId);
        if (w) setSelectedUniverseId(w.universeId);
      }

      // Default nation if present
      const defaultNation = ents.find(e => e.typeId === 'et-nation');
      if (defaultNation) setSelectedNationId(defaultNation.id);
    }
    init();
  }, [propWorldId]);

  // Lookup Maps
  const entityMap = useMemo(() => new Map(allEntities.map(e => [e.id, e])), [allEntities]);
  const entityTypeMap = useMemo(() => new Map(entityTypes.map(t => [t.id, t])), [entityTypes]);
  const relTypeMap = useMemo(() => new Map(relTypes.map(r => [r.id, r])), [relTypes]);

  // Available Nations
  const nationsList = useMemo(() => {
    return allEntities.filter(e => e.typeId === 'et-nation');
  }, [allEntities]);

  // Available worlds for universe
  const availableWorlds = useMemo(() => {
    if (selectedUniverseId === 'all') return worlds;
    return worlds.filter(w => w.universeId === selectedUniverseId);
  }, [worlds, selectedUniverseId]);

  // 2. Compute Active Entities & Relationships based on Scope & Filters
  useEffect(() => {
    if (allEntities.length === 0) return;

    let scopedEntities = allEntities;

    // A. Hierarchy Scope Filter
    if (scopeMode === 'universe' && selectedUniverseId !== 'all') {
      const allowedWorldIds = new Set(
        worlds.filter(w => w.universeId === selectedUniverseId).map(w => w.id)
      );
      scopedEntities = allEntities.filter(e => allowedWorldIds.has(e.worldId));
    } else if (scopeMode === 'world' && selectedWorldId !== 'all') {
      scopedEntities = allEntities.filter(e => e.worldId === selectedWorldId);
    } else if (scopeMode === 'nation' && selectedNationId !== 'all') {
      // Focus on Nation and all directly connected administrative units, states, cities, and governance bodies
      const nationConnectedIds = new Set<string>([selectedNationId]);
      for (const rel of allRelationships) {
        if (rel.fromEntityId === selectedNationId) nationConnectedIds.add(rel.toEntityId);
        if (rel.toEntityId === selectedNationId) nationConnectedIds.add(rel.fromEntityId);
      }
      // Also expand 1 step from Governorates to catch constituent states and cities
      const govIds = allEntities
        .filter(e => nationConnectedIds.has(e.id) && (e.typeId === 'et-governorate' || e.title.includes('Governorate')))
        .map(e => e.id);

      for (const gid of govIds) {
        for (const rel of allRelationships) {
          if (rel.fromEntityId === gid) nationConnectedIds.add(rel.toEntityId);
          if (rel.toEntityId === gid) nationConnectedIds.add(rel.fromEntityId);
        }
      }
      scopedEntities = allEntities.filter(e => nationConnectedIds.has(e.id));
    } else if (scopeMode === 'local' && selectedNodeId) {
      // Local BFS up to localDepth
      const localAllowedIds = new Set<string>([selectedNodeId]);
      let currentBorder = new Set<string>([selectedNodeId]);

      for (let hop = 0; hop < localDepth; hop++) {
        const nextBorder = new Set<string>();
        for (const rel of allRelationships) {
          if (currentBorder.has(rel.fromEntityId) && !localAllowedIds.has(rel.toEntityId)) {
            nextBorder.add(rel.toEntityId);
            localAllowedIds.add(rel.toEntityId);
          }
          if (currentBorder.has(rel.toEntityId) && !localAllowedIds.has(rel.fromEntityId)) {
            nextBorder.add(rel.fromEntityId);
            localAllowedIds.add(rel.fromEntityId);
          }
        }
        currentBorder = nextBorder;
      }
      scopedEntities = allEntities.filter(e => localAllowedIds.has(e.id));
    }

    // B. Quick Category Presets
    if (categoryFilter !== 'all') {
      scopedEntities = scopedEntities.filter(e => {
        const tid = e.typeId;
        const title = e.title.toLowerCase();
        if (categoryFilter === 'geography') {
          return ['et-planet', 'et-continent', 'et-nation', 'et-region', 'et-map'].includes(tid);
        }
        if (categoryFilter === 'admin') {
          return ['et-governorate', 'et-state', 'et-territory'].includes(tid) || title.includes('state') || title.includes('governorate');
        }
        if (categoryFilter === 'settlements') {
          return ['et-city', 'et-settlement'].includes(tid) || title.includes('city') || title.includes('citadel');
        }
        if (categoryFilter === 'politics') {
          return ['et-organization', 'et-concept'].includes(tid);
        }
        if (categoryFilter === 'peoples') {
          return ['et-ethnicity', 'et-religion', 'et-language', 'et-character', 'et-family'].includes(tid);
        }
        if (categoryFilter === 'history') {
          return ['et-era', 'et-event', 'et-timeline', 'et-calendar', 'et-theory'].includes(tid);
        }
        return true;
      });
    }

    // Filter by explicit individual entity types if modified
    scopedEntities = scopedEntities.filter(e => selectedEntityTypes.has(e.typeId));
    const activeEntityIds = new Set(scopedEntities.map(e => e.id));

    // C. Filter Edges
    const activeEdges: EdgeData[] = allRelationships
      .filter(r => activeEntityIds.has(r.fromEntityId) && activeEntityIds.has(r.toEntityId))
      .filter(r => selectedRelTypes.has(r.typeId))
      .map(r => {
        const rt = relTypeMap.get(r.typeId);
        const fromEnt = entityMap.get(r.fromEntityId);
        const toEnt = entityMap.get(r.toEntityId);
        const isCrossWorld = Boolean(fromEnt && toEnt && fromEnt.worldId !== toEnt.worldId);

        return {
          id: r.id,
          fromId: r.fromEntityId,
          toId: r.toEntityId,
          typeId: r.typeId,
          label: rt?.name || 'related to',
          reverseLabel: rt?.reverseName || 'related to',
          color: rt?.color || '#6366f1',
          isCrossWorld,
        };
      });

    // D. Calculate unique connections count (prevent multi-edges from inflating node size)
    const connectionCounts = new Map<string, Set<string>>();
    for (const edge of activeEdges) {
      if (!connectionCounts.has(edge.fromId)) connectionCounts.set(edge.fromId, new Set());
      if (!connectionCounts.has(edge.toId)) connectionCounts.set(edge.toId, new Set());
      connectionCounts.get(edge.fromId)!.add(edge.toId);
      connectionCounts.get(edge.toId)!.add(edge.fromId);
    }

    // E. Construct Bounded Nodes (strict min 9px, max 22px)
    const existingNodeMap = new Map<string, NodeData>(nodes.map(n => [n.id, n]));
    const count = scopedEntities.length;
    const angleStep = count > 0 ? (2 * Math.PI) / count : 1;
    const initialSpreadRadius = Math.min(380, 52 * Math.sqrt(Math.max(count, 1)));

    const activeNodes: NodeData[] = scopedEntities.map((e, idx) => {
      const existing = existingNodeMap.get(e.id);
      const t = entityTypeMap.get(e.typeId);
      const uniqueConn = connectionCounts.get(e.id)?.size || 0;

      // Bounded node sizing: 9px to 22px
      const radius = sizeByConnections
        ? Math.min(22, Math.max(9, 9 + Math.sqrt(uniqueConn) * 2.2))
        : 10;

      return {
        id: e.id,
        title: e.title,
        entryNumber: e.entryNumber,
        typeId: e.typeId,
        worldId: e.worldId,
        color: t?.color || '#6366f1',
        x: existing ? existing.x : Math.cos(idx * angleStep) * initialSpreadRadius + (Math.random() - 0.5) * 40,
        y: existing ? existing.y : Math.sin(idx * angleStep) * initialSpreadRadius + (Math.random() - 0.5) * 40,
        vx: existing ? existing.vx * 0.4 : 0,
        vy: existing ? existing.vy * 0.4 : 0,
        radius,
        pinned: existing ? existing.pinned : false,
        uniqueConnections: uniqueConn,
      };
    });

    setNodes(activeNodes);
    setEdges(activeEdges);

    // Reheat simulation
    alphaRef.current = 0.85;
  }, [
    allEntities, allRelationships, entityTypes, relTypes,
    scopeMode, selectedUniverseId, selectedWorldId, selectedNationId, selectedNodeId, localDepth,
    categoryFilter, selectedEntityTypes, selectedRelTypes, sizeByConnections
  ]);

  // Set of neighbor IDs for selected node (for visual highlighting and dimming)
  const neighborIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>();
    for (const edge of edges) {
      if (edge.fromId === selectedNodeId) set.add(edge.toId);
      if (edge.toId === selectedNodeId) set.add(edge.fromId);
    }
    return set;
  }, [selectedNodeId, edges]);

  // 3. Settled Force Simulation Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    let isRunning = true;
    const nodeMap = new Map<string, NodeData>(nodes.map(n => [n.id, n]));

    function step() {
      if (!isRunning) return;

      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      // Only run physics if active energy > 0.005 and not paused
      if (!isPaused && alphaRef.current > 0.005) {
        const alpha = alphaRef.current;

        // 1. Repulsion between nodes (prevents overlap)
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;

            if (dist < 320) {
              const repulsionForce = (alpha * 1900) / (dist * dist);
              const fx = (dx / dist) * repulsionForce;
              const fy = (dy / dist) * repulsionForce;
              if (!a.pinned && a !== dragTargetNodeRef.current) {
                a.vx -= fx;
                a.vy -= fy;
              }
              if (!b.pinned && b !== dragTargetNodeRef.current) {
                b.vx += fx;
                b.vy += fy;
              }
            }
          }
        }

        // 2. Attraction along edges (Hooke's spring force)
        for (const edge of edges) {
          const a = nodeMap.get(edge.fromId);
          const b = nodeMap.get(edge.toId);
          if (a && b) {
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetDist = 135;
            const delta = dist - targetDist;
            const springForce = delta * 0.038 * alpha;
            const fx = (dx / dist) * springForce;
            const fy = (dy / dist) * springForce;

            if (!a.pinned && a !== dragTargetNodeRef.current) {
              a.vx += fx;
              a.vy += fy;
            }
            if (!b.pinned && b !== dragTargetNodeRef.current) {
              b.vx -= fx;
              b.vy += fy;
            }
          }
        }

        // 3. Centering gravity & position damping
        for (const n of nodes) {
          if (n.pinned || n === dragTargetNodeRef.current) continue;

          n.vx -= n.x * 0.005 * alpha;
          n.vy -= n.y * 0.005 * alpha;

          n.x += n.vx;
          n.y += n.vy;

          // Velocity damping to ensure settling
          n.vx *= 0.70;
          n.vy *= 0.70;
        }

        // Decay simulation energy until settled
        if (!dragTargetNodeRef.current) {
          alphaRef.current *= 0.965;
          if (alphaRef.current < 0.005) {
            alphaRef.current = 0; // Settled state reached!
          }
        }
      }

      renderCanvas(ctx, cvs);
      animFrameRef.current = requestAnimationFrame(step);
    }

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [nodes, edges, selectedNodeId, hoveredNodeId, showLabels, theme, isPaused, neighborIds]);

  // 4. Render Network onto High-DPI Canvas
  function renderCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const width = canvas.width;
    const height = canvas.height;
    const { x: panX, y: panY, k: zoom } = transformRef.current;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    ctx.translate(width / 2 + panX, height / 2 + panY);
    ctx.scale(zoom, zoom);

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const isDark = theme === 'dark';
    const hasSelection = Boolean(selectedNodeId);

    // Render Edges
    for (const edge of edges) {
      const from = nodeMap.get(edge.fromId);
      const to = nodeMap.get(edge.toId);
      if (!from || !to) continue;

      const isConnectedToSelected =
        selectedNodeId && (edge.fromId === selectedNodeId || edge.toId === selectedNodeId);

      ctx.save();
      if (hasSelection && !isConnectedToSelected) {
        ctx.globalAlpha = 0.12; // Dim unrelated edges!
      }

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);

      if (edge.isCrossWorld) {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      if (isConnectedToSelected) {
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2.5;
      } else {
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.13)';
        ctx.lineWidth = 1;
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Edge labels (shown when zoomed in or connected to selected node)
      if (showLabels && (isConnectedToSelected || zoom > 0.95)) {
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        ctx.font = '9px -apple-system, sans-serif';
        ctx.fillStyle = isConnectedToSelected ? '#818cf8' : (isDark ? '#8e8e93' : '#636366');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.label, midX, midY - 6);
      }

      ctx.restore();
    }

    // Render Nodes
    for (const node of nodes) {
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const isNeighbor = neighborIds.has(node.id);

      ctx.save();

      // Dim unrelated nodes when a selection is active
      if (hasSelection && !isSelected && !isNeighbor) {
        ctx.globalAlpha = 0.22;
      }

      // Outer focus halo ring for selected node
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 6, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Main Node Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();

      // Border ring for hovered or pinned
      if (isHovered || node.pinned) {
        ctx.strokeStyle = node.pinned ? '#f59e0b' : '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Smart Label Decluttering
      const shouldShowFullLabel =
        showLabels && (isSelected || isHovered || isNeighbor || zoom >= 0.88);

      if (shouldShowFullLabel) {
        const entryNumStr = formatEntryNumber(node.entryNumber);
        const labelText = entryNumStr ? `${entryNumStr} ${node.title}` : node.title;

        ctx.font = `${isSelected ? 'bold ' : ''}11px -apple-system, sans-serif`;
        ctx.fillStyle = isDark ? '#f5f5f7' : '#1d1d1f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(labelText, node.x, node.y + node.radius + 4);
      } else if (showLabels && zoom >= 0.55 && node.uniqueConnections >= 6) {
        // Distant compact badge to prevent clutter
        const entryNumStr = formatEntryNumber(node.entryNumber);
        if (entryNumStr) {
          ctx.font = '9px -apple-system, sans-serif';
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(entryNumStr, node.x, node.y + node.radius + 3);
        }
      }

      ctx.restore();
    }

    ctx.restore();
  }

  // Handle Resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function resize() {
      if (!canvas || !canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth || 800;
      canvas.height = canvas.parentElement.clientHeight || 600;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Coordinate Conversion Helper
  function getCanvasCoords(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, clientX: 0, clientY: 0 };
    const rect = canvas.getBoundingClientRect();
    const cX = clientX - rect.left;
    const cY = clientY - rect.top;
    const { x: panX, y: panY, k: zoom } = transformRef.current;
    const x = (cX - canvas.width / 2 - panX) / zoom;
    const y = (cY - canvas.height / 2 - panY) / zoom;
    return { x, y, clientX: cX, clientY: cY };
  }

  // Pointer & Drag Interactions
  function handlePointerDown(clientX: number, clientY: number) {
    const { x, y, clientX: cX, clientY: cY } = getCanvasCoords(clientX, clientY);
    lastPointerPosRef.current = { x: cX, y: cY };

    const hit = nodes.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 6;
    });

    if (hit) {
      dragTargetNodeRef.current = hit;
      setSelectedNodeId(hit.id);
      alphaRef.current = 0.45; // Wake simulation for smooth natural spring reaction
    } else {
      isDraggingCanvasRef.current = true;
    }
  }

  function handlePointerMove(clientX: number, clientY: number) {
    const { x, y, clientX: cX, clientY: cY } = getCanvasCoords(clientX, clientY);

    if (dragTargetNodeRef.current) {
      dragTargetNodeRef.current.x = x;
      dragTargetNodeRef.current.y = y;
      dragTargetNodeRef.current.vx = 0;
      dragTargetNodeRef.current.vy = 0;
      alphaRef.current = Math.max(alphaRef.current, 0.35); // Keep physics active during drag
    } else if (isDraggingCanvasRef.current) {
      const dx = cX - lastPointerPosRef.current.x;
      const dy = cY - lastPointerPosRef.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      lastPointerPosRef.current = { x: cX, y: cY };
    } else {
      const hit = nodes.find(n => {
        const d = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
        return d <= n.radius + 6;
      });
      setHoveredNodeId(hit?.id || null);
    }
  }

  function handlePointerUp() {
    isDraggingCanvasRef.current = false;
    dragTargetNodeRef.current = null;
    initialPinchDistRef.current = null;
  }

  function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    transformRef.current.k = Math.min(3, Math.max(0.2, transformRef.current.k * zoomFactor));
  }

  function handleFit() {
    transformRef.current = { x: 0, y: 0, k: 0.9 };
    alphaRef.current = 0.5;
  }

  function handleResetLayout() {
    const count = nodes.length;
    const angleStep = (2 * Math.PI) / count;
    const spreadRadius = Math.min(360, 48 * Math.sqrt(Math.max(count, 1)));

    nodes.forEach((n, idx) => {
      n.pinned = false;
      n.x = Math.cos(idx * angleStep) * spreadRadius;
      n.y = Math.sin(idx * angleStep) * spreadRadius;
      n.vx = 0;
      n.vy = 0;
    });

    transformRef.current = { x: 0, y: 0, k: 0.9 };
    alphaRef.current = 0.9;
  }

  function togglePinNode(nodeId: string) {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, pinned: !n.pinned } : n));
  }

  // Selected Entity Details for Inspector Panel
  const selectedEntity = allEntities.find(e => e.id === selectedNodeId);
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedConnectedEdges = edges.filter(
    e => e.fromId === selectedNodeId || e.toId === selectedNodeId
  );

  return (
    <div className="graph-view-container">
      {/* Top Scope & Hierarchy Navigation Bar */}
      <div className="graph-scope-bar">
        <div className="graph-scope-group">
          <Globe size={14} className="text-muted" />
          <select
            className="graph-scope-select"
            value={scopeMode}
            onChange={e => setScopeMode(e.target.value as ScopeMode)}
            title="Scope Mode"
          >
            <option value="all">All Universes</option>
            <option value="universe">Universe View</option>
            <option value="world">World / Setting</option>
            <option value="nation">Nation & Hierarchy</option>
            {selectedNodeId && <option value="local">Local Ego Network</option>}
          </select>
        </div>

        {scopeMode === 'universe' && (
          <select
            className="graph-scope-select"
            value={selectedUniverseId}
            onChange={e => setSelectedUniverseId(e.target.value)}
            title="Select Universe"
          >
            <option value="all">Select Universe…</option>
            {universes.map(u => (
              <option key={u.id} value={u.id}>{u.title}</option>
            ))}
          </select>
        )}

        {scopeMode === 'world' && (
          <select
            className="graph-scope-select"
            value={selectedWorldId}
            onChange={e => setSelectedWorldId(e.target.value)}
            title="Select World"
          >
            <option value="all">Select World…</option>
            {availableWorlds.map(w => (
              <option key={w.id} value={w.id}>{w.title}</option>
            ))}
          </select>
        )}

        {scopeMode === 'nation' && (
          <select
            className="graph-scope-select"
            value={selectedNationId}
            onChange={e => setSelectedNationId(e.target.value)}
            title="Select Nation"
          >
            <option value="all">Select Nation…</option>
            {nationsList.map(n => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
        )}

        {scopeMode === 'local' && (
          <div className="graph-depth-stepper">
            <span className="graph-depth-label">Depth:</span>
            <button
              className={`graph-depth-btn ${localDepth === 1 ? 'active' : ''}`}
              onClick={() => setLocalDepth(1)}
              title="Direct neighbors (1 hop)"
            >
              1
            </button>
            <button
              className={`graph-depth-btn ${localDepth === 2 ? 'active' : ''}`}
              onClick={() => setLocalDepth(2)}
              title="Extended network (2 hops)"
            >
              2
            </button>
            <button
              className={`graph-depth-btn ${localDepth === 3 ? 'active' : ''}`}
              onClick={() => setLocalDepth(3)}
              title="Wide network (3 hops)"
            >
              3
            </button>
          </div>
        )}

        {/* Quick Category Filter Pills */}
        <div className="graph-category-pills">
          {(['all', 'geography', 'admin', 'settlements', 'politics', 'peoples', 'history'] as CategoryFilter[]).map(cat => (
            <button
              key={cat}
              className={`graph-cat-pill ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => {
                setCategoryFilter(cat);
                alphaRef.current = 0.6;
              }}
            >
              {cat === 'all' ? 'All Types' :
               cat === 'geography' ? 'Geography' :
               cat === 'admin' ? 'Administration' :
               cat === 'settlements' ? 'Settlements' :
               cat === 'politics' ? 'Politics & Econ' :
               cat === 'peoples' ? 'Peoples & Faith' : 'History'}
            </button>
          ))}
        </div>

        <div className="graph-scope-stats">
          <span>{nodes.length} nodes</span>
          <span>·</span>
          <span>{edges.length} connections</span>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="graph-canvas-area">
        {/* Floating Top Toolbar */}
        <div className="graph-toolbar">
          <div className="graph-toolbar-group">
            <Search size={14} className="text-muted" />
            <input
              type="text"
              className="graph-search-input"
              placeholder="Search entity name or #001…"
              value={searchQuery}
              onChange={e => {
                const q = e.target.value.toLowerCase().trim();
                setSearchQuery(e.target.value);
                const cleanQ = q.startsWith('#') ? q.slice(1) : q;

                const matched = nodes.find(n => {
                  const numStr = n.entryNumber !== undefined ? String(n.entryNumber) : '';
                  const formatted = formatEntryNumber(n.entryNumber).toLowerCase();
                  return (
                    n.title.toLowerCase().includes(q) ||
                    formatted.includes(q) ||
                    numStr === cleanQ
                  );
                });

                if (matched) {
                  setSelectedNodeId(matched.id);
                  transformRef.current.x = -matched.x * transformRef.current.k;
                  transformRef.current.y = -matched.y * transformRef.current.k;
                }
              }}
            />
          </div>

          <div className="graph-toolbar-group">
            <button
              className="graph-tool-btn"
              onClick={() => { transformRef.current.k = Math.min(3, transformRef.current.k * 1.25); }}
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button
              className="graph-tool-btn"
              onClick={() => { transformRef.current.k = Math.max(0.2, transformRef.current.k * 0.8); }}
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <button
              className="graph-tool-btn"
              onClick={handleFit}
              title="Fit to View"
            >
              <Maximize2 size={15} />
            </button>
            <button
              className="graph-tool-btn"
              onClick={handleResetLayout}
              title="Reset Organic Layout"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          <div className="graph-toolbar-group">
            <button
              className={`graph-tool-btn ${showLabels ? 'active' : ''}`}
              onClick={() => setShowLabels(!showLabels)}
              title={showLabels ? 'Hide Labels' : 'Show Labels'}
            >
              {showLabels ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <button
              className={`graph-tool-btn ${sizeByConnections ? 'active' : ''}`}
              onClick={() => setSizeByConnections(!sizeByConnections)}
              title="Toggle Bounded Connection-Based Sizing"
            >
              <Sliders size={15} />
            </button>
            <button
              className={`graph-tool-btn ${isPaused ? 'active' : ''}`}
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? 'Resume Simulation' : 'Freeze Simulation'}
            >
              {isPaused ? <Play size={15} /> : <Pause size={15} />}
            </button>
          </div>
        </div>

        {/* Canvas Engine */}
        <canvas
          ref={canvasRef}
          className="graph-canvas"
          onMouseDown={e => handlePointerDown(e.clientX, e.clientY)}
          onMouseMove={e => handlePointerMove(e.clientX, e.clientY)}
          onMouseUp={handlePointerUp}
          onTouchStart={e => {
            if (e.touches.length === 1) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
            else if (e.touches.length === 2) {
              initialPinchDistRef.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            }
          }}
          onTouchMove={e => {
            if (e.touches.length === 1) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            else if (e.touches.length === 2 && initialPinchDistRef.current) {
              const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
              transformRef.current.k = Math.min(3, Math.max(0.2, transformRef.current.k * (dist / initialPinchDistRef.current)));
              initialPinchDistRef.current = dist;
            }
          }}
          onTouchEnd={handlePointerUp}
          onWheel={onWheel}
        />

        {/* Selected Entity Inspector Panel */}
        {selectedEntity && (
          <aside className="graph-inspector-panel">
            <div className="graph-inspector-header">
              <div className="graph-inspector-title-row">
                {formatEntryNumber(selectedEntity.entryNumber) && (
                  <span className="lep-entry-number">{formatEntryNumber(selectedEntity.entryNumber)}</span>
                )}
                <span className="graph-inspector-title truncate">{selectedEntity.title}</span>
              </div>
              <button
                className="graph-inspector-close"
                onClick={() => setSelectedNodeId(null)}
                title="Deselect"
              >
                <X size={15} />
              </button>
            </div>

            <div className="graph-inspector-body">
              <div className="graph-inspector-meta">
                <span className="graph-inspector-type" style={{ color: selectedNode?.color }}>
                  {entityTypeMap.get(selectedEntity.typeId)?.name || selectedEntity.typeId}
                </span>
                <span className="graph-inspector-deg">
                  {selectedNode?.uniqueConnections || 0} unique connections
                </span>
              </div>

              {selectedEntity.tags.length > 0 && (
                <div className="graph-inspector-tags">
                  {selectedEntity.tags.map(t => (
                    <span key={t} className="graph-inspector-tag">#{t}</span>
                  ))}
                </div>
              )}

              {/* Connected Entities List */}
              <div className="graph-inspector-rels">
                <div className="graph-inspector-rels-title">
                  Connected Entities ({selectedConnectedEdges.length})
                </div>
                <div className="graph-inspector-rels-list">
                  {selectedConnectedEdges.map(edge => {
                    const otherId = edge.fromId === selectedEntity.id ? edge.toId : edge.fromId;
                    const other = entityMap.get(otherId);
                    if (!other) return null;
                    const isOutgoing = edge.fromId === selectedEntity.id;
                    const verb = isOutgoing ? edge.label : edge.reverseLabel;
                    const otherNum = formatEntryNumber(other.entryNumber);

                    return (
                      <div
                        key={edge.id}
                        className="graph-inspector-rel-item"
                        onClick={() => {
                          setSelectedNodeId(other.id);
                          const targetNode = nodes.find(n => n.id === other.id);
                          if (targetNode) {
                            transformRef.current.x = -targetNode.x * transformRef.current.k;
                            transformRef.current.y = -targetNode.y * transformRef.current.k;
                          }
                        }}
                      >
                        <span className="graph-inspector-rel-verb">{verb}</span>
                        {otherNum && <span className="lep-entry-number">{otherNum}</span>}
                        <span className="graph-inspector-rel-title truncate">{other.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="graph-inspector-actions">
                <button
                  className="btn-primary small"
                  onClick={() => navigate(`/entity/${selectedEntity.id}`)}
                >
                  <ArrowUpRight size={13} /> Open Article
                </button>
                <button
                  className={`btn-ghost small ${selectedNode?.pinned ? 'active' : ''}`}
                  onClick={() => togglePinNode(selectedEntity.id)}
                  title="Pin node in place"
                >
                  <Pin size={13} /> {selectedNode?.pinned ? 'Unpin' : 'Pin'}
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
