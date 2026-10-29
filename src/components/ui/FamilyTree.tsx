// src/components/ui/FamilyTree.tsx
// Interactive, generation-accurate family tree diagram
// Supports pan, zoom, fit, proper couple units, generation tiers, and inline creation

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch, Plus, ZoomIn, ZoomOut, Maximize2, RotateCcw,
  User, Heart, Trash2, Users, ArrowUpRight
} from 'lucide-react';
import type { Entity, Relationship, RelationshipType } from '../../db/schema';
import {
  getEntities, getRelationships, createRelationship, deleteRelationship,
  getRelationshipTypes, getEntity
} from '../../db/operations';
import { computeFamilyTreeLayout, type ComputedTreeLayout, type FamilyMemberNode } from '../../utils/familyTreeLayout';
import EntitySearchSelector from './EntitySearchSelector';
import './FamilyTree.css';

interface Props {
  entity: Entity;
  worldId: string;
}

export default function FamilyTree({ entity, worldId }: Props) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [availableCharacters, setAvailableCharacters] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [layout, setLayout] = useState<ComputedTreeLayout | null>(null);

  // Pan & Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Add Family Member form state
  const [isAdding, setIsAdding] = useState(false);
  const [targetCharId, setTargetCharId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'child' | 'parent' | 'spouse' | 'sibling' | 'adopted_child'>('child');
  const [saving, setSaving] = useState(false);

  const isFamilyEntity = entity.typeId === 'et-family';

  async function loadData() {
    const allEnts = await getEntities(worldId);
    setAvailableCharacters(allEnts.filter(e => e.typeId === 'et-character'));

    // Pull all family relationships for this world to build complete multi-generation tree
    const allWorldRels = await getRelationships();
    const familyTypes = new Set(['rt-parent-of', 'rt-child-of', 'rt-spouse-of', 'rt-married-to', 'rt-sibling-of', 'rt-adopted-by']);
    const allRels = allWorldRels.filter(r => r.worldId === worldId && familyTypes.has(r.typeId));

    setRelationships(allRels);

    const computed = await computeFamilyTreeLayout(entity, allEnts, allRels, 'vertical');
    setLayout(computed);
  }

  useEffect(() => {
    loadData();
  }, [entity.id, worldId]);

  // Fit to screen
  function handleFitToScreen() {
    if (!layout || !containerRef.current) return;
    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect();
    const treeW = layout.bounds.width;
    const treeH = layout.bounds.height;

    const scaleX = (containerW - 80) / treeW;
    const scaleY = (containerH - 80) / treeH;
    const fitScale = Math.min(1.2, Math.max(0.4, Math.min(scaleX, scaleY)));

    setZoom(fitScale);
    // Center tree
    const centerX = (containerW - treeW * fitScale) / 2 - layout.bounds.minX * fitScale;
    const centerY = (containerH - treeH * fitScale) / 2 - layout.bounds.minY * fitScale;
    setPan({ x: centerX, y: centerY });
  }

  // Mouse pan handlers
  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return; // primary click only
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isPanning) return;
    setPan({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  }

  function handleMouseUp() {
    setIsPanning(false);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(2.5, Math.max(0.4, Number((z + delta).toFixed(2)))));
  }

  async function handleAddMember() {
    if (!targetCharId) return;
    setSaving(true);
    try {
      if (isFamilyEntity) {
        await createRelationship({
          fromEntityId: targetCharId,
          toEntityId: entity.id,
          typeId: 'rt-member-of',
          worldId,
          canonStatus: 'canon',
        });
      } else {
        let typeId = 'rt-child-of';
        let fromId = targetCharId;
        let toId = entity.id;

        if (selectedRole === 'child') {
          typeId = 'rt-parent-of';
          fromId = entity.id;
          toId = targetCharId;
        } else if (selectedRole === 'parent') {
          typeId = 'rt-parent-of';
          fromId = targetCharId;
          toId = entity.id;
        } else if (selectedRole === 'spouse') {
          typeId = 'rt-spouse-of';
          fromId = entity.id;
          toId = targetCharId;
        } else if (selectedRole === 'sibling') {
          typeId = 'rt-sibling-of';
          fromId = entity.id;
          toId = targetCharId;
        } else if (selectedRole === 'adopted_child') {
          typeId = 'rt-adopted-by';
          fromId = targetCharId;
          toId = entity.id;
        }

        await createRelationship({
          fromEntityId: fromId,
          toEntityId: toId,
          typeId,
          worldId,
          canonStatus: 'canon',
        });
      }

      setTargetCharId(null);
      setIsAdding(false);
      await loadData();
    } catch (err) {
      alert('Failed to add relationship: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink(nodeId: string, name: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Unlink ${name} from this family connection? (The character will NOT be deleted).`)) return;

    // Find relationships connecting this node with current entity or other nodes
    const relsToDel = relationships.filter(
      r => (r.fromEntityId === nodeId && r.toEntityId === entity.id) ||
           (r.toEntityId === nodeId && r.fromEntityId === entity.id)
    );

    for (const r of relsToDel) {
      await deleteRelationship(r.id);
    }
    await loadData();
  }

  const nodes = layout?.nodes || [];
  const edges = layout?.edges || [];
  const genLevels = layout?.generationLevels || [];

  return (
    <div className="family-tree-root">
      {/* Apple-style minimalist toolbar */}
      <div className="family-tree-toolbar">
        <div className="family-tree-title-group">
          <GitBranch size={16} color="var(--accent)" />
          <h3 className="family-tree-title">
            {isFamilyEntity ? `${entity.title} — Lineage` : `${entity.title} — Family Tree`}
          </h3>
        </div>

        <div className="family-tree-controls-group">
          <button
            type="button"
            className="family-tree-btn-tool"
            onClick={() => setZoom(z => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className="family-tree-btn-tool"
            onClick={() => setZoom(z => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            className="family-tree-btn-tool"
            onClick={handleFitToScreen}
            title="Fit Tree to View"
          >
            <Maximize2 size={14} /> Fit
          </button>
          <button
            type="button"
            className="family-tree-btn-tool"
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            title="Reset View"
          >
            <RotateCcw size={14} />
          </button>

          <button
            type="button"
            className={`family-tree-btn-tool ${isAdding ? 'active' : ''}`}
            onClick={() => setIsAdding(!isAdding)}
          >
            <Plus size={14} /> {isAdding ? 'Cancel' : 'Add Person'}
          </button>
        </div>
      </div>

      {/* Add Person Drawer */}
      {isAdding && (
        <div className="family-tree-add-drawer">
          {!isFamilyEntity && (
            <div className="family-tree-field">
              <label>Relationship Role</label>
              <select
                className="form-input small"
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value as any)}
              >
                <option value="child">Child (Son / Daughter)</option>
                <option value="parent">Parent (Father / Mother)</option>
                <option value="spouse">Spouse / Partner</option>
                <option value="sibling">Sibling (Brother / Sister)</option>
                <option value="adopted_child">Adopted Child</option>
              </select>
            </div>
          )}

          <div className="family-tree-field" style={{ flex: 1, minWidth: '240px' }}>
            <label>Select or Create Character</label>
            <EntitySearchSelector
              value={targetCharId || undefined}
              onChange={id => setTargetCharId(id ?? null)}
              availableEntities={availableCharacters.filter(c => c.id !== entity.id)}
              placeholder="Search or type to create…"
              worldId={worldId}
              allowCreate={true}
              expectedTypeId="et-character"
              compact={true}
            />
          </div>

          <button
            type="button"
            className="btn-primary small"
            onClick={handleAddMember}
            disabled={!targetCharId || saving}
          >
            {saving ? 'Linking…' : 'Link to Tree'}
          </button>
        </div>
      )}

      {/* Interactive SVG Canvas */}
      <div
        className="family-tree-canvas-wrapper"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {nodes.length <= 1 && !isFamilyEntity && edges.length === 0 ? (
          <div className="family-tree-empty-state">
            <Users size={32} style={{ opacity: 0.3 }} />
            <p>No family connections recorded yet for this character.</p>
            <button
              type="button"
              className="btn-ghost small"
              onClick={() => setIsAdding(true)}
            >
              <Plus size={14} /> Add First Family Connection
            </button>
          </div>
        ) : (
          <svg className="family-tree-svg">
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Generation guideline labels */}
              {genLevels.map(gl => (
                <g key={gl.generation}>
                  <line
                    x1={layout ? layout.bounds.minX - 500 : -500}
                    y1={gl.y - 15}
                    x2={layout ? layout.bounds.maxX + 500 : 3000}
                    y2={gl.y - 15}
                    className="generation-guide-line"
                  />
                  <text
                    x={layout ? Math.max(15, layout.bounds.minX + 20) : 15}
                    y={gl.y - 20}
                    className="generation-guide-text"
                  >
                    {gl.label}
                  </text>
                </g>
              ))}

              {/* Edge connectors */}
              {edges.map(edge => (
                <path
                  key={edge.id}
                  d={edge.path}
                  className={`family-tree-connector-line ${edge.type}`}
                />
              ))}

              {/* Node Cards */}
              {nodes.map(node => {
                const birth = node.entity.properties?.birthDate;
                const isFocus = node.id === entity.id;

                return (
                  <g
                    key={node.id}
                    className={`family-node-g ${isFocus ? 'is-focus' : ''}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => navigate(`/entity/${node.entity.id}`)}
                  >
                    <title>{node.entity.title}</title>
                    {/* Card background */}
                    <rect
                      x="0"
                      y="0"
                      width={node.width}
                      height={node.height}
                      className="family-node-rect"
                    />

                    {/* Avatar circle */}
                    <circle
                      cx="24"
                      cy="26"
                      r="13"
                      className="family-node-avatar-bg"
                    />
                    <text
                      x="24"
                      y="30"
                      textAnchor="middle"
                      fill="var(--text-secondary)"
                      fontSize="10"
                      fontWeight="600"
                    >
                      {node.entity.title.charAt(0).toUpperCase()}
                    </text>

                    {/* Name */}
                    <text
                      x="44"
                      y="24"
                      className="family-node-name-text"
                    >
                      {node.entity.title.length > 24
                        ? node.entity.title.slice(0, 22) + '…'
                        : node.entity.title}
                    </text>

                    {/* Role badge */}
                    <text
                      x="44"
                      y="39"
                      className="family-node-role-text"
                    >
                      {node.role}
                    </text>

                    {/* Optional birth year */}
                    {Boolean(birth) && (
                      <text
                        x="44"
                        y="54"
                        className="family-node-date-text"
                      >
                        b. {String(birth)}
                      </text>
                    )}

                    {/* Unlink icon if not the focus character */}
                    {!isFocus && (
                      <g
                        transform={`translate(${node.width - 20}, 14)`}
                        onClick={(e) => handleUnlink(node.id, node.entity.title, e)}
                        className="family-node-unlink-btn"
                      >
                        <title>Unlink from tree</title>
                        <rect x="-4" y="-4" width="16" height="16" fill="transparent" />
                        <line x1="0" y1="0" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="8" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}
