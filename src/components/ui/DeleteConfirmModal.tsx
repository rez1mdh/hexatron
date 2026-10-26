// src/components/ui/DeleteConfirmModal.tsx
// Safe, clear confirmation modal for permanently deleting universes or worlds

import { useState } from 'react';
import { AlertTriangle, Trash2, X, Globe, Layers } from 'lucide-react';
import { deleteUniverseCascade, deleteWorldCascade } from '../../db/operations';
import './DeleteConfirmModal.css';

interface Props {
  isOpen: boolean;
  type: 'universe' | 'world';
  id: string;
  title: string;
  stats?: {
    worldCount?: number;
    entityCount?: number;
    relationshipCount?: number;
  };
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  type,
  id,
  title,
  stats,
  onClose,
  onDeleted,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleConfirmDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      if (type === 'universe') {
        await deleteUniverseCascade(id);
      } else {
        await deleteWorldCascade(id);
      }
      setIsDeleting(false);
      onDeleted();
    } catch (err) {
      console.error(err);
      setError((err as Error).message || 'Failed to delete');
      setIsDeleting(false);
    }
  }

  const isUniverse = type === 'universe';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card delete-modal-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="delete-modal-header">
          <div className="delete-modal-icon-badge">
            <AlertTriangle size={20} className="text-danger" />
          </div>
          <div className="delete-modal-title-col">
            <h2 className="delete-modal-title">
              Delete {isUniverse ? 'Universe' : 'World'}
            </h2>
            <span className="delete-modal-sub">Irreversible action</span>
          </div>
          <button className="icon-btn small" onClick={onClose} title="Cancel">
            <X size={16} />
          </button>
        </div>

        <div className="delete-modal-body">
          <p className="delete-modal-prompt">
            Are you sure you want to permanently delete{' '}
            <strong className="delete-target-name">{title}</strong>?
          </p>

          {stats && (
            <div className="delete-impact-box">
              <span className="delete-impact-label">Associated Data to be Erased:</span>
              <div className="delete-impact-pills">
                {isUniverse && stats.worldCount !== undefined && (
                  <span className="delete-pill">
                    <Globe size={12} /> {stats.worldCount} {stats.worldCount === 1 ? 'World' : 'Worlds'}
                  </span>
                )}
                {stats.entityCount !== undefined && (
                  <span className="delete-pill">
                    <Layers size={12} /> {stats.entityCount} {stats.entityCount === 1 ? 'Entity' : 'Entities'}
                  </span>
                )}
                {stats.relationshipCount !== undefined && (
                  <span className="delete-pill">
                    {stats.relationshipCount} {stats.relationshipCount === 1 ? 'Connection' : 'Connections'}
                  </span>
                )}
              </div>
            </div>
          )}

          <p className="delete-warning-text">
            This will permanently remove the {isUniverse ? 'universe' : 'world'} and cascade delete all child entities,
            lore articles, and relationships. This cannot be undone.
          </p>

          {error && <div className="delete-error-msg">{error}</div>}
        </div>

        <div className="delete-modal-footer">
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
          >
            <Trash2 size={14} />
            {isDeleting ? 'Deleting…' : `Permanently Delete ${isUniverse ? 'Universe' : 'World'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
