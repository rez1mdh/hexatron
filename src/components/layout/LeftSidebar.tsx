// src/components/layout/LeftSidebar.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Plus, ChevronRight, ChevronDown, Clock, Star,
  Settings, HelpCircle, Compass, Trash2, Sliders, HardDrive
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import {
  getUniverses, getWorlds, getUniverseStats, getWorldStats,
  type Universe, type World
} from '../../db/operations';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import './layout.css';

export default function LeftSidebar() {
  const {
    leftSidebarOpen, currentWorldId, setCurrentWorld,
    setManageUniversesOpen, setBackupModalOpen, universeVersion, bumpUniverseVersion, isOwner
  } = useAppStore();
  const navigate = useNavigate();
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [expandedUniverses, setExpandedUniverses] = useState<Set<string>>(new Set());

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'universe' | 'world';
    id: string;
    title: string;
    stats?: { worldCount?: number; entityCount?: number; relationshipCount?: number };
  } | null>(null);

  useEffect(() => {
    refreshLists();
  }, [universeVersion]);

  async function refreshLists() {
    const [u, w] = await Promise.all([getUniverses(), getWorlds()]);
    setUniverses(u);
    setWorlds(w);
  }

  function toggleUniverse(id: string) {
    setExpandedUniverses(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleDeleteUniverseClick(e: React.MouseEvent, u: Universe) {
    e.stopPropagation();
    const stats = await getUniverseStats(u.id);
    setDeleteTarget({
      type: 'universe',
      id: u.id,
      title: u.title,
      stats,
    });
  }

  async function handleDeleteWorldClick(e: React.MouseEvent, w: World) {
    e.stopPropagation();
    const stats = await getWorldStats(w.id);
    setDeleteTarget({
      type: 'world',
      id: w.id,
      title: w.title,
      stats: {
        entityCount: stats.entityCount,
        relationshipCount: stats.relationshipCount,
      },
    });
  }

  async function handleDeleted() {
    const deletedId = deleteTarget?.id;
    const deletedType = deleteTarget?.type;
    setDeleteTarget(null);
    bumpUniverseVersion();
    await refreshLists();

    if (deletedType === 'world' && currentWorldId === deletedId) {
      setCurrentWorld(null);
      navigate('/');
    }
  }

  if (!leftSidebarOpen) return null;

  return (
    <nav className="left-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-section-label">Universes</span>
        {isOwner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              className="icon-btn small"
              onClick={() => setManageUniversesOpen(true)}
              title="Manage Universes & Worlds"
            >
              <Sliders size={13} />
            </button>
            <button
              className="icon-btn small"
              onClick={() => navigate('/new-world')}
              title="New World"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="sidebar-scroll">
        {universes.map(u => (
          <div key={u.id} className="universe-group">
            <div className="sidebar-row-wrapper">
              <button
                className="universe-row"
                onClick={() => { toggleUniverse(u.id); navigate(`/universe/${u.id}`); }}
              >
                <Globe size={14} className="icon-muted" />
                <span className="truncate">{u.title}</span>
                {expandedUniverses.has(u.id) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {isOwner && (
                <button
                  className="sidebar-row-delete-btn"
                  onClick={e => handleDeleteUniverseClick(e, u)}
                  title={`Delete Universe "${u.title}"`}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {expandedUniverses.has(u.id) && worlds.filter(w => w.universeId === u.id).map(w => (
              <div key={w.id} className="sidebar-row-wrapper">
                <button
                  className={`world-row ${currentWorldId === w.id ? 'active' : ''}`}
                  onClick={() => navigate(`/world/${w.id}`)}
                  style={{ '--world-color': w.color ?? 'var(--accent)' } as React.CSSProperties}
                >
                  <span className="world-dot" />
                  <span className="truncate">{w.title}</span>
                </button>
                {isOwner && (
                  <button
                    className="sidebar-row-delete-btn"
                    onClick={e => handleDeleteWorldClick(e, w)}
                    title={`Delete World "${w.title}"`}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ))}

        {universes.length === 0 && (
          <div className="sidebar-empty">
            <p>No universes yet.</p>
            <button className="btn-link" onClick={() => navigate('/new-world')}>Create your first world</button>
          </div>
        )}

        <div className="sidebar-divider" />

        <button className="sidebar-nav-item" onClick={() => navigate(currentWorldId ? `/world/${currentWorldId}/graph` : '/graph')}>
          <Compass size={14} />
          <span>Graph View</span>
        </button>

        <button className="sidebar-nav-item" onClick={() => navigate('/recent')}>
          <Clock size={14} />
          <span>Recently Visited</span>
        </button>

        <button className="sidebar-nav-item" onClick={() => navigate('/favorites')}>
          <Star size={14} />
          <span>Favorites</span>
        </button>

        <button className="sidebar-nav-item" onClick={() => navigate('/help')}>
          <HelpCircle size={14} />
          <span>Help & Guide</span>
        </button>

        {isOwner && (
          <button className="sidebar-nav-item" onClick={() => setManageUniversesOpen(true)}>
            <Settings size={14} />
            <span>Manage Universes</span>
          </button>
        )}

        <button className="sidebar-nav-item" onClick={() => setBackupModalOpen(true, 'export')}>
          <HardDrive size={14} />
          <span>Backup & Restore</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
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
    </nav>
  );
}
