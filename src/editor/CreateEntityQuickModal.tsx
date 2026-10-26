// src/editor/CreateEntityQuickModal.tsx
// Compact modal to create a genuine entity directly from editor text selection and link it inline

import { useState, useEffect } from 'react';
import { Sparkles, X, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { createEntity, getEntityTypes, searchEntities, formatEntryNumber } from '../db/operations';
import { pushEntityToCloud } from '../services/cloudSync';
import { useAppStore } from '../store/appStore';
import type { Entity, EntityType } from '../db/schema';
import EntityTypeIcon from '../components/ui/EntityTypeIcon';
import './editor.css';

interface Props {
  initialTitle: string;
  worldId?: string;
  isOpen: boolean;
  onClose: () => void;
  onCreatedAndLinked: (entity: Entity) => void;
  onSelectExisting: (entity: Entity) => void;
}

export default function CreateEntityQuickModal({
  initialTitle,
  worldId,
  isOpen,
  onClose,
  onCreatedAndLinked,
  onSelectExisting,
}: Props) {
  const { currentUser, currentWorldId } = useAppStore();
  const [title, setTitle] = useState(initialTitle);
  const [typeId, setTypeId] = useState('et-character');
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [similarEntities, setSimilarEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setError(null);
  }, [initialTitle, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    getEntityTypes().then(types => {
      setEntityTypes(types);
      if (types.length > 0 && !types.some(t => t.id === typeId)) {
        setTypeId(types[0].id);
      }
    });
  }, [isOpen]);

  // Check for similar existing entities as user types
  useEffect(() => {
    if (!isOpen || !title.trim()) {
      setSimilarEntities([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await searchEntities(title.trim(), worldId);
        // Exclude exact non-matches that don't share word stems
        setSimilarEntities(results.slice(0, 3));
      } catch {
        setSimilarEntities([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [title, worldId, isOpen]);

  if (!isOpen) return null;

  async function handleCreate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Entity title cannot be empty.');
      return;
    }

    const targetWorldId = worldId || currentWorldId;
    if (!targetWorldId) {
      setError('Cannot determine active world. Please select or create a world first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newRecord = await createEntity({
        worldId: targetWorldId,
        typeId,
        title: cleanTitle,
        aliases: [],
        tags: [],
        canonStatus: 'canon',
        properties: {},
      });

      // Synchronize to cloud if logged in
      if (currentUser) {
        pushEntityToCloud(newRecord, currentUser.id).catch(err => {
          console.warn('Background sync notice:', err);
        });
      }

      onCreatedAndLinked(newRecord);
    } catch (err) {
      setError((err as Error).message || 'Failed to create entity in database.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="link-modal-backdrop" onClick={onClose}>
      <div className="create-quick-modal" onClick={e => e.stopPropagation()}>
        <div className="link-modal-header">
          <div className="link-modal-title">
            <Sparkles size={16} className="text-accent" />
            <span>Create Entity from Selection</span>
          </div>
          <button
            type="button"
            className="link-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="create-quick-body">
          {error && (
            <div className="create-quick-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group mb-3">
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Entity Title
            </label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. The Trafloriede Flower"
              autoFocus
              required
            />
          </div>

          <div className="form-group mb-3">
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Entity Type
            </label>
            <div className="quick-type-grid">
              {entityTypes.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`quick-type-btn ${typeId === t.id ? 'active' : ''}`}
                  onClick={() => setTypeId(t.id)}
                  style={{ '--type-color': t.color } as React.CSSProperties}
                >
                  <EntityTypeIcon name={t.icon} size={13} />
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Similar Existing Match Check */}
          {similarEntities.length > 0 && (
            <div className="quick-similar-box">
              <div className="quick-similar-title">
                <span>Similar existing entity found — did you mean:</span>
              </div>
              <div className="quick-similar-list">
                {similarEntities.map(sim => (
                  <button
                    key={sim.id}
                    type="button"
                    className="quick-similar-item"
                    onClick={() => onSelectExisting(sim)}
                    title={`Link to existing "${sim.title}" instead`}
                  >
                    <div className="quick-similar-item-left">
                      <EntityTypeIcon name={sim.typeId} size={13} />
                      <span className="quick-similar-name">{sim.title}</span>
                      {formatEntryNumber(sim.entryNumber) && (
                        <span className="lep-entry-number">{formatEntryNumber(sim.entryNumber)}</span>
                      )}
                    </div>
                    <span className="quick-similar-action">
                      Link instead <ArrowRight size={12} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="create-quick-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading || !title.trim()}
            >
              {loading ? (
                'Creating…'
              ) : (
                <>
                  <CheckCircle size={14} /> Create &amp; Link
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
