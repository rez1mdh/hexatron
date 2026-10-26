// src/components/ui/RelationshipEditor.tsx
// Visual First-Class Entity Relationship Editor with auto reverse labels and target entity search

import { useState } from 'react';
import { Plus, Trash2, ArrowRight, ExternalLink } from 'lucide-react';
import type { Relationship, RelationshipType, Entity, CanonStatus } from '../../db/schema';
import { createRelationship, deleteRelationship, createRelationshipType } from '../../db/operations';
import EntitySearchSelector from './EntitySearchSelector';
import './RelationshipEditor.css';

export interface PendingRelationship {
  id?: string;
  fromEntityId?: string;
  toEntityId: string;
  typeId: string;
  canonStatus: CanonStatus;
  notes?: string;
  dateStart?: string;
  dateEnd?: string;
}

interface Props {
  entityId?: string;
  worldId: string;
  existingRelationships?: Relationship[];
  pendingRelationships: PendingRelationship[];
  onPendingChange: (rels: PendingRelationship[]) => void;
  availableEntities: Entity[];
  relationshipTypes: RelationshipType[];
  onRelTypesChanged?: () => void;
  onEntityCreated?: (entity: Entity) => void;
  readOnly?: boolean;
}

export default function RelationshipEditor({
  entityId,
  worldId,
  existingRelationships = [],
  pendingRelationships,
  onPendingChange,
  availableEntities,
  relationshipTypes,
  onRelTypesChanged,
  onEntityCreated,
  readOnly = false,
}: Props) {
  // New relationship inputs
  const [targetId, setTargetId] = useState('');
  const [typeId, setTypeId] = useState(relationshipTypes[0]?.id || 'rt-member-of');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<CanonStatus>('canon');

  // Custom relationship type modal/inline creator
  const [showNewRelType, setShowNewRelType] = useState(false);
  const [newRelName, setNewRelName] = useState('');
  const [newRelRevName, setNewRelRevName] = useState('');

  const entityMap = new Map<string, Entity>(availableEntities.map(e => [e.id, e]));
  const typeMap = new Map<string, RelationshipType>(relationshipTypes.map(t => [t.id, t]));

  // Eligible targets exclude self
  const eligibleEntities = availableEntities.filter(e => !entityId || e.id !== entityId);

  async function handleCreateCustomType() {
    if (!newRelName.trim() || !newRelRevName.trim()) return;
    const slug = 'rt-' + newRelName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    try {
      const created = await createRelationshipType({
        id: slug,
        name: newRelName.trim(),
        reverseName: newRelRevName.trim(),
        color: '#7c6af7',
      });
      onRelTypesChanged?.();
      setTypeId(created.id);
      setShowNewRelType(false);
      setNewRelName('');
      setNewRelRevName('');
    } catch (e) {
      alert((e as Error).message);
    }
  }

  function handleAddPending() {
    if (!targetId) return;
    // Prevent duplicate pending
    if (pendingRelationships.some(r => r.toEntityId === targetId && r.typeId === typeId)) {
      alert('This relationship already exists.');
      return;
    }

    onPendingChange([
      ...pendingRelationships,
      {
        toEntityId: targetId,
        typeId,
        canonStatus: status,
        notes: notes.trim() || undefined,
      },
    ]);

    setTargetId('');
    setNotes('');
  }

  function handleRemovePending(index: number) {
    onPendingChange(pendingRelationships.filter((_, i) => i !== index));
  }

  async function handleDeleteExisting(relId: string) {
    if (!confirm('Remove this relationship?')) return;
    await deleteRelationship(relId);
    onPendingChange([...pendingRelationships]); // triggers re-render
  }

  return (
    <div className="relationship-editor">
      {/* Existing saved relationships */}
      {existingRelationships.length > 0 && (
        <div className="saved-relationships-list">
          <span className="rel-group-label">Saved Relationships</span>
          {existingRelationships.map(rel => {
            const isFrom = !entityId || rel.fromEntityId === entityId;
            const otherId = isFrom ? rel.toEntityId : rel.fromEntityId;
            const other = entityMap.get(otherId);
            const rType = typeMap.get(rel.typeId);
            const verb = isFrom ? rType?.name : rType?.reverseName;

            return (
              <div key={rel.id} className="rel-card">
                <span className="rel-badge">{verb || 'related to'}</span>
                <ArrowRight size={14} className="rel-arrow" />
                <span className="rel-target-title">{other?.title || 'Unknown Entity'}</span>
                {rel.notes && <span className="rel-notes">({rel.notes})</span>}
                {!readOnly && (
                  <button
                    type="button"
                    className="icon-btn small text-danger ml-auto"
                    onClick={() => handleDeleteExisting(rel.id)}
                    title="Delete relationship"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending relationships (not yet saved to DB) */}
      {pendingRelationships.length > 0 && (
        <div className="pending-relationships-list">
          <span className="rel-group-label">New Relationships (to be saved)</span>
          {pendingRelationships.map((p, idx) => {
            const target = entityMap.get(p.toEntityId);
            const rType = typeMap.get(p.typeId);
            return (
              <div key={idx} className="rel-card pending">
                <span className="rel-badge">{rType?.name || 'related to'}</span>
                <ArrowRight size={14} className="rel-arrow" />
                <span className="rel-target-title">{target?.title || 'Selected Entity'}</span>
                {p.notes && <span className="rel-notes">({p.notes})</span>}
                {!readOnly && (
                  <button
                    type="button"
                    className="icon-btn small text-danger ml-auto"
                    onClick={() => handleRemovePending(idx)}
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add new relationship row */}
      {!readOnly && (
        <div className="add-relationship-box">
          <div className="rel-input-row">
            <div className="rel-field">
              <label className="field-label-tiny">Relationship Verb</label>
              <div className="rel-select-wrapper">
                <select
                  className="form-select small"
                  value={typeId}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setShowNewRelType(true);
                    } else {
                      setTypeId(e.target.value);
                    }
                  }}
                >
                  {relationshipTypes.map(rt => (
                    <option key={rt.id} value={rt.id}>{rt.name} (reverse: {rt.reverseName})</option>
                  ))}
                  <option value="__custom__">+ Custom relationship type...</option>
                </select>
              </div>
            </div>

            <div className="rel-field flex-1">
              <label className="field-label-tiny">Target Entity</label>
              <EntitySearchSelector
                value={targetId || undefined}
                onChange={id => setTargetId(id || '')}
                availableEntities={eligibleEntities}
                placeholder="Search or create target entity…"
                worldId={worldId}
                allowCreate={true}
                onEntityCreated={onEntityCreated}
                compact={true}
              />
            </div>

            <div className="rel-field flex-1">
              <label className="field-label-tiny">Context / Notes (optional)</label>
              <input
                type="text"
                className="form-input small"
                placeholder="e.g. from 240 BCE to 280 BCE"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-primary small add-rel-btn"
              disabled={!targetId}
              onClick={handleAddPending}
            >
              <Plus size={13} /> Add
            </button>
          </div>

          {/* Inline custom relationship type creator */}
          {showNewRelType && (
            <div className="custom-rel-type-pop">
              <span className="pop-title">Create Custom Relationship Type</span>
              <div className="pop-row">
                <input
                  type="text"
                  className="form-input small"
                  placeholder="Forward verb (e.g. apprentice of)"
                  value={newRelName}
                  onChange={e => setNewRelName(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input small"
                  placeholder="Reverse verb (e.g. mentor of)"
                  value={newRelRevName}
                  onChange={e => setNewRelRevName(e.target.value)}
                />
                <button type="button" className="btn-secondary small" onClick={handleCreateCustomType}>
                  Save Type
                </button>
                <button type="button" className="btn-ghost small" onClick={() => setShowNewRelType(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
