// src/components/layout/LeftSidebar.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Plus, ChevronRight, ChevronDown, Clock, Star,
  Settings, HelpCircle, Compass, Trash2, Sliders, X,
  FolderTree, PanelLeftClose, RotateCw, HardDrive, Sparkles
} from 'lucide-react';
import { clearCacheAndReload } from '../../utils/clearCache';
import { useAppStore } from '../../store/appStore';
import { usePetStore } from '../../store/petStore';
import {
  getUniverses, getWorlds, getUniverseStats, getWorldStats,
  type Universe, type World
} from '../../db/operations';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import NestedEntityTree from '../ui/NestedEntityTree';
import './layout.css';

export default function LeftSidebar() {
  const {
    leftSidebarOpen, toggleLeftSidebar, setLeftSidebarOpen, currentWorldId, setCurrentWorld,
    setManageUniversesOpen, setBackupModalOpen, universeVersion, bumpUniverseVersion, isOwner,
    setOfflineMediaOpen
  } = useAppStore();
  const navigate = useNavigate();
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [expandedUniverses, setExpandedUniverses] = useState<Set<string>>(new Set());
  const [sidebarTab, setSidebarTab] = useState<'tree' | 'universes'>('tree');

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
    // Filter ghost "My Universe" if empty
    const cleanU = u.filter(uni => uni.title !== 'My Universe' || w.some(world => world.universeId === uni.id));
    setUniverses(cleanU);
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

  const handleNavClick = (path: string) => {
    navigate(path);
    if (window.innerWidth <= 900) {
      setLeftSidebarOpen(false);
    }
  };

  if (!leftSidebarOpen) return null;

  return (
    <nav className="left-sidebar" aria-label="Main Navigation">
      <div className="sidebar-header">
        <div className="sidebar-tab-switcher">
          <button
            type="button"
            className={`sidebar-view-tab ${sidebarTab === 'tree' ? 'active' : ''}`}
            onClick={() => setSidebarTab('tree')}
            title="Obsidian-style Entity Tree"
          >
            <FolderTree size={13} />
            <span>Tree</span>
          </button>
          <button
            type="button"
            className={`sidebar-view-tab ${sidebarTab === 'universes' ? 'active' : ''}`}
            onClick={() => setSidebarTab('universes')}
            title="Universes & Worlds"
          >
            <Globe size={13} />
            <span>Worlds</span>
          </button>
        </div>

        <div className="sidebar-header-actions">
          {isOwner && (
            <>
              <button
                className="icon-btn small"
                onClick={() => setManageUniversesOpen(true)}
                title="Manage Universes & Worlds"
              >
                <Sliders size={13} />
              </button>
              <button
                className="icon-btn small"
                onClick={() => handleNavClick('/new-world')}
                title="New World"
              >
                <Plus size={14} />
              </button>
            </>
          )}
          {/* Collapse sidebar toggle button (desktop & mobile) */}
          <button
            type="button"
            className="icon-btn small sidebar-collapse-btn"
            onClick={toggleLeftSidebar}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={14} className="desktop-only-icon" />
            <X size={15} className="mobile-only-icon" />
          </button>
        </div>
      </div>

      <div className="sidebar-scroll">
        {sidebarTab === 'tree' ? (
          <NestedEntityTree onSelectEntity={() => {
            if (window.innerWidth <= 900) setLeftSidebarOpen(false);
          }} />
        ) : (
          <div className="sidebar-universes-list">
            {universes.map(u => (
              <div key={u.id} className="universe-group">
                <div className="sidebar-row-wrapper">
                  <button
                    className="universe-row"
                    onClick={() => { toggleUniverse(u.id); handleNavClick(`/universe/${u.id}`); }}
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
                      onClick={() => handleNavClick(`/world/${w.id}`)}
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
                <button className="btn-link" onClick={() => handleNavClick('/new-world')}>Create your first world</button>
              </div>
            )}
          </div>
        )}

        <div className="sidebar-divider" />

        <button className="sidebar-nav-item" onClick={() => handleNavClick(currentWorldId ? `/world/${currentWorldId}/graph` : '/graph')}>
          <Compass size={14} />
          <span>Graph View</span>
        </button>

        <button className="sidebar-nav-item" onClick={() => handleNavClick('/recent')}>
          <Clock size={14} />
          <span>Recently Visited</span>
        </button>

        <button className="sidebar-nav-item" onClick={() => handleNavClick('/favorites')}>
          <Star size={14} />
          <span>Favorites</span>
        </button>

        <button className="sidebar-nav-item" onClick={() => handleNavClick('/help')}>
          <HelpCircle size={14} />
          <span>Help & Guide</span>
        </button>

        {isOwner && (
          <button className="sidebar-nav-item" onClick={() => { setManageUniversesOpen(true); if (window.innerWidth <= 900) setLeftSidebarOpen(false); }}>
            <Settings size={14} />
            <span>Manage Universes</span>
          </button>
        )}

        <button className="sidebar-nav-item" onClick={() => { setBackupModalOpen(true, 'export'); if (window.innerWidth <= 900) setLeftSidebarOpen(false); }}>
          <Settings size={14} />
          <span>Export Backup</span>
        </button>

        <button
          className="sidebar-nav-item"
          onClick={() => {
            usePetStore.getState().setPetsModalOpen(true);
            if (window.innerWidth <= 900) setLeftSidebarOpen(false);
          }}
          title="Companions & Pets Settings"
        >
          <Sparkles size={14} className="text-accent" />
          <span>Companions & Pets</span>
        </button>

        <button className="sidebar-nav-item" onClick={() => { setOfflineMediaOpen(true); if (window.innerWidth <= 900) setLeftSidebarOpen(false); }}>
          <HardDrive size={14} />
          <span>Offline Media Manager</span>
        </button>

        <button className="sidebar-nav-item" onClick={clearCacheAndReload} title="Clear browser cache and force reload">
          <RotateCw size={14} />
          <span>Clear Cache & Reload</span>
        </button>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={true}
          type={deleteTarget.type}
          id={deleteTarget.id}
          title={deleteTarget.title}
          stats={deleteTarget.stats}
          onDeleted={handleDeleted}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </nav>
  );
}
