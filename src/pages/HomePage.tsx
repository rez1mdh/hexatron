// src/pages/HomePage.tsx — dashboard with universe & world management

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Globe, Plus, BookOpen, Clock, Sliders, Trash2,
  Compass, ArrowLeft, Layers, ShieldCheck, ArrowRight, Eye
} from 'lucide-react';
import {
  getUniverses, getWorlds, getEntity, getUniverseStats, getWorldStats,
  type Universe, type World, type Entity
} from '../db/operations';
import { useAppStore } from '../store/appStore';
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal';
import PersonalDashboard from '../components/dashboard/PersonalDashboard';
import './pages.css';

export default function HomePage() {
  const navigate = useNavigate();
  const { universeId } = useParams<{ universeId?: string }>();
  const {
    recentEntityIds, setManageUniversesOpen, universeVersion, bumpUniverseVersion, isOwner
  } = useAppStore();

  const [previewPublicView, setPreviewPublicView] = useState(false);
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [recentEntities, setRecentEntities] = useState<Entity[]>([]);
  const [universeStats, setUniverseStats] = useState<{ worldCount?: number; entityCount?: number; relationshipCount?: number } | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'universe' | 'world';
    id: string;
    title: string;
    stats?: { worldCount?: number; entityCount?: number; relationshipCount?: number };
  } | null>(null);

  useEffect(() => {
    getUniverses().then(setUniverses);
    getWorlds().then(setWorlds);
    Promise.all(recentEntityIds.slice(0, 6).map(id => getEntity(id)))
      .then(res => setRecentEntities(res.filter(Boolean) as Entity[]));
  }, [recentEntityIds, universeVersion]);

  useEffect(() => {
    if (universeId) {
      getUniverseStats(universeId).then(setUniverseStats);
    } else {
      setUniverseStats(null);
    }
  }, [universeId, universeVersion]);

  // First-visit or startup welcome guide redirection for public visitors
  useEffect(() => {
    if (!universeId) {
      const hasVisited = localStorage.getItem('hexatron_visited_welcome');
      const alwaysShow = localStorage.getItem('hexatron_always_show_welcome') === 'true';
      if (!isOwner && (!hasVisited || alwaysShow)) {
        navigate('/welcome', { replace: true });
      }
    }
  }, [universeId, isOwner, navigate]);

  const currentUniverse = universeId ? universes.find(u => u.id === universeId) : null;
  const displayedWorlds = universeId
    ? worlds.filter(w => w.universeId === universeId)
    : worlds;

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

  function handleDeleted() {
    const deletedType = deleteTarget?.type;
    setDeleteTarget(null);
    bumpUniverseVersion();
    if (deletedType === 'universe') {
      navigate('/');
    }
  }

  // Authenticated Owner gets the personal dashboard by default when on the root route
  if (isOwner && !universeId && !previewPublicView) {
    return <PersonalDashboard onTogglePublicView={() => setPreviewPublicView(true)} />;
  }

  return (
    <div className="page-container">
      {previewPublicView && isOwner && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.85rem'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Eye size={14} className="text-secondary" />
            <span>Previewing public visitor landing experience. Private dashboard and draft data are hidden.</span>
          </span>
          <button className="btn-primary tiny" onClick={() => setPreviewPublicView(false)}>
            Back to Dashboard
          </button>
        </div>
      )}

      {currentUniverse ? (
        /* Universe Selected Banner */
        <div className="universe-banner">
          <div className="universe-banner-top">
            <div className="universe-banner-title-area">
              <button
                className="btn-ghost small"
                onClick={() => navigate('/')}
                title="Back to all universes"
              >
                <ArrowLeft size={14} /> All Universes
              </button>
              <h1 className="universe-banner-title">{currentUniverse.title}</h1>
            </div>

            <div className="universe-banner-actions">
              <button
                className="btn-ghost small"
                onClick={() => navigate('/graph')}
                title="View Universe Graph"
              >
                <Compass size={14} /> Universe Graph
              </button>
              {isOwner && (
                <>
                  <button
                    className="btn-ghost small"
                    onClick={() => setManageUniversesOpen(true)}
                    title="Manage Universes & Worlds"
                  >
                    <Sliders size={14} /> Manage
                  </button>
                  <button
                    className="btn-ghost small danger-hover"
                    onClick={e => handleDeleteUniverseClick(e, currentUniverse)}
                    title="Delete this entire universe"
                  >
                    <Trash2 size={14} /> Delete Universe
                  </button>
                  <button
                    className="btn-primary small"
                    onClick={() => navigate('/new-world')}
                  >
                    <Plus size={14} /> New World
                  </button>
                </>
              )}
            </div>
          </div>

          {currentUniverse.description && (
            <p className="universe-banner-desc">{currentUniverse.description}</p>
          )}

          {universeStats && (
            <div className="universe-banner-stats">
              <span className="universe-banner-badge">
                <Globe size={12} /> {universeStats.worldCount} {universeStats.worldCount === 1 ? 'World' : 'Worlds'}
              </span>
              <span className="universe-banner-badge">
                <Layers size={12} /> {universeStats.entityCount} Entities
              </span>
              <span className="universe-banner-badge">
                {universeStats.relationshipCount} Connections
              </span>
            </div>
          )}
        </div>
      ) : (
        /* Global Hero */
        <div className="page-hero">
          <h1 className="page-hero-title">Hexatron</h1>
          <p className="page-hero-sub">Worldbuilding Encyclopedia</p>
        </div>
      )}

      {/* Worlds grid */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">
            <Globe size={16} /> {currentUniverse ? `Worlds in ${currentUniverse.title}` : 'Worlds'}
          </h2>
          {isOwner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn-ghost small"
                onClick={() => setManageUniversesOpen(true)}
                title="Manage Universes & Worlds"
              >
                <Sliders size={14} /> Manage Universes & Worlds
              </button>
              <button
                className="btn-primary small"
                onClick={() => navigate('/new-world')}
              >
                <Plus size={14} /> New World
              </button>
            </div>
          )}
        </div>

        <div className="card-grid">
          {displayedWorlds.map(w => (
            <div
              key={w.id}
              className="world-card"
              onClick={() => navigate(`/world/${w.id}`)}
              style={{ '--world-color': w.color ?? 'var(--accent)' } as React.CSSProperties}
            >
              <div className="world-card-accent" />
              {isOwner && (
                <button
                  className="world-card-delete-btn"
                  onClick={e => handleDeleteWorldClick(e, w)}
                  title={`Delete World "${w.title}"`}
                >
                  <Trash2 size={13} />
                </button>
              )}
              <div className="world-card-body">
                <span className="world-card-title">{w.title}</span>
                {w.description && <span className="world-card-desc">{w.description}</span>}
              </div>
            </div>
          ))}

          {isOwner && (
            <button className="world-card new-card" onClick={() => navigate('/new-world')}>
              <Plus size={24} />
              <span>New World</span>
            </button>
          )}
        </div>
      </section>

      {/* Recent Entities */}
      {recentEntities.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title"><Clock size={16} /> Recently Visited</h2>
          </div>
          <div className="recent-list">
            {recentEntities.map(e => (
              <button key={e.id} className="recent-item" onClick={() => navigate(`/entity/${e.id}`)}>
                <BookOpen size={13} />
                <span>{e.title}</span>
              </button>
            ))}
          </div>
        </section>
      )}

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
    </div>
  );
}
