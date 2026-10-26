// src/components/ui/ManageUniversesModal.tsx
// Comprehensive management modal for viewing, inspecting, and deleting universes and worlds

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Trash2, X, Plus, Layers, ArrowUpRight,
  AlertTriangle, Shield, CheckCircle, RefreshCw
} from 'lucide-react';
import {
  getUniverses, getWorlds, getUniverseStats, getWorldStats,
  type Universe, type World
} from '../../db/operations';
import { useAppStore } from '../../store/appStore';
import DeleteConfirmModal from './DeleteConfirmModal';
import './ManageUniversesModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

interface UniverseWithStats {
  universe: Universe;
  worlds: World[];
  stats: {
    worldCount: number;
    entityCount: number;
    relationshipCount: number;
  };
}

export default function ManageUniversesModal({ isOpen, onClose, onUpdate }: Props) {
  const navigate = useNavigate();
  const { bumpUniverseVersion } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UniverseWithStats[]>([]);
  const [worldStatsMap, setWorldStatsMap] = useState<Map<string, { entityCount: number; relationshipCount: number }>>(new Map());

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'universe' | 'world';
    id: string;
    title: string;
    stats?: { worldCount?: number; entityCount?: number; relationshipCount?: number };
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  async function loadData() {
    setLoading(true);
    try {
      const [allUnis, allWlds] = await Promise.all([
        getUniverses(),
        getWorlds(),
      ]);

      const wMap = new Map<string, { entityCount: number; relationshipCount: number }>();
      for (const w of allWlds) {
        const stats = await getWorldStats(w.id);
        wMap.set(w.id, stats);
      }
      setWorldStatsMap(wMap);

      const items: UniverseWithStats[] = [];
      for (const u of allUnis) {
        const childWorlds = allWlds.filter(w => w.universeId === u.id);
        const stats = await getUniverseStats(u.id);
        items.push({
          universe: u,
          worlds: childWorlds,
          stats,
        });
      }
      setData(items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteUniverseClick(u: UniverseWithStats) {
    setDeleteTarget({
      type: 'universe',
      id: u.universe.id,
      title: u.universe.title,
      stats: u.stats,
    });
  }

  function handleDeleteWorldClick(w: World) {
    const stats = worldStatsMap.get(w.id);
    setDeleteTarget({
      type: 'world',
      id: w.id,
      title: w.title,
      stats: {
        entityCount: stats?.entityCount || 0,
        relationshipCount: stats?.relationshipCount || 0,
      },
    });
  }

  async function handleDeleted() {
    setDeleteTarget(null);
    bumpUniverseVersion();
    await loadData();
    if (onUpdate) onUpdate();
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card manage-universes-modal-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="manage-modal-header">
          <div className="manage-modal-title-row">
            <Globe size={18} className="text-accent" />
            <h2 className="manage-modal-title">Manage Universes & Worlds</h2>
          </div>
          <div className="manage-modal-actions">
            <button
              className="btn-ghost small"
              onClick={loadData}
              title="Refresh list"
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button className="icon-btn small" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="manage-modal-body">
          {loading ? (
            <div className="manage-modal-loading">Loading universes and worlds…</div>
          ) : data.length === 0 ? (
            <div className="manage-modal-empty">
              <p>No universes found.</p>
              <button
                className="btn-primary small"
                onClick={() => {
                  onClose();
                  navigate('/new-world');
                }}
              >
                <Plus size={14} /> Create a World
              </button>
            </div>
          ) : (
            <div className="manage-universes-list">
              {data.map(({ universe: u, worlds, stats }) => (
                <div key={u.id} className="manage-universe-item">
                  <div className="manage-universe-header">
                    <div className="manage-universe-info">
                      <div className="manage-universe-title-row">
                        <span className="manage-universe-title">{u.title}</span>
                        <span className="manage-universe-badge">
                          {stats.worldCount} {stats.worldCount === 1 ? 'World' : 'Worlds'}
                        </span>
                        <span className="manage-universe-badge secondary">
                          {stats.entityCount} Entities
                        </span>
                      </div>
                      {u.description && (
                        <p className="manage-universe-desc">{u.description}</p>
                      )}
                    </div>

                    <div className="manage-universe-actions">
                      <button
                        className="btn-danger-outline small"
                        onClick={() => handleDeleteUniverseClick({ universe: u, worlds, stats })}
                        title="Delete this entire universe and all its worlds"
                      >
                        <Trash2 size={13} /> Delete Universe
                      </button>
                    </div>
                  </div>

                  {/* Child Worlds list */}
                  <div className="manage-child-worlds-list">
                    {worlds.length === 0 ? (
                      <div className="manage-no-worlds-msg">No worlds in this universe yet.</div>
                    ) : (
                      worlds.map(w => {
                        const wStats = worldStatsMap.get(w.id);
                        return (
                          <div key={w.id} className="manage-world-item">
                            <div className="manage-world-left">
                              <span
                                className="manage-world-dot"
                                style={{ background: w.color || 'var(--accent)' }}
                              />
                              <div className="manage-world-info">
                                <span className="manage-world-title">{w.title}</span>
                                <div className="manage-world-stats-line">
                                  <span>{wStats?.entityCount || 0} entities</span>
                                  <span>·</span>
                                  <span>{wStats?.relationshipCount || 0} connections</span>
                                </div>
                              </div>
                            </div>

                            <div className="manage-world-actions">
                              <button
                                className="btn-ghost small"
                                onClick={() => {
                                  onClose();
                                  navigate(`/world/${w.id}`);
                                }}
                                title="Open World View"
                              >
                                <ArrowUpRight size={13} /> Open
                              </button>
                              <button
                                className="btn-ghost small danger-hover"
                                onClick={() => handleDeleteWorldClick(w)}
                                title="Delete this world and its entities"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="manage-modal-footer">
          <button
            className="btn-primary small"
            onClick={() => {
              onClose();
              navigate('/new-world');
            }}
          >
            <Plus size={14} /> Create New World / Universe
          </button>
          <button className="btn-ghost small" onClick={onClose}>
            Done
          </button>
        </div>
      </div>

      {/* Safety Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={true}
          type={deleteTarget.type}
          id={deleteTarget.id}
          title={deleteTarget.title}
          stats={deleteTarget.stats}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
