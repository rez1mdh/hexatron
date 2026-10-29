// src/components/dashboard/PersonalDashboard.tsx
// Polished personal dashboard for the authenticated owner

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Plus, BookOpen, Clock, Sliders, Trash2,
  Compass, Layers, Star, Edit3, GitBranch, Search,
  ExternalLink, FileText, ArrowRight, Eye, ShieldCheck,
  CheckCircle2, Sparkles, Filter, Database, RefreshCw, Cloud
} from 'lucide-react';
import {
  getUniverses, getWorlds, getEntity, getWorld,
  getRecentlyEditedEntities, formatEntryNumber,
  type Universe, type World, type Entity
} from '../../db/operations';
import { useAppStore } from '../../store/appStore';
import { formatRelativeTime } from '../../utils/dateFormatter';
import { checkArmaniteCloudStatus, syncArmanitesToCloud } from '../../services/cloudSync';
import { importArmaniteLore } from '../../db/importArmanites';
import { isCloudConfigured } from '../../services/supabase';
import CanonBadge from '../ui/CanonBadge';
import './PersonalDashboard.css';

interface Props {
  onTogglePublicView: () => void;
}

export default function PersonalDashboard({ onTogglePublicView }: Props) {
  const navigate = useNavigate();
  const {
    currentUser,
    recentEntityIds,
    favoriteEntityIds,
    favoriteWorldIds,
    toggleFavoriteEntity,
    toggleFavoriteWorld,
    setManageUniversesOpen,
    setFavoriteModalOpen,
    setLeftSidebarOpen,
    universeVersion
  } = useAppStore();

  const [universes, setUniverses] = useState<Universe[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [recentlyEdited, setRecentlyEdited] = useState<Entity[]>([]);
  const [recentlyVisited, setRecentlyVisited] = useState<Entity[]>([]);
  const [favoriteEntities, setFavoriteEntities] = useState<Entity[]>([]);
  const [favoriteWorlds, setFavoriteWorlds] = useState<World[]>([]);
  const [activeDraft, setActiveDraft] = useState<{ id: string | null; title: string; savedAt: number } | null>(null);
  const [worldSearch, setWorldSearch] = useState('');
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [syncingArmanites, setSyncingArmanites] = useState(false);
  const [armaniteStatus, setArmaniteStatus] = useState<{ isFullySynced: boolean; cloudCount: number; targetCount: number } | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isCloudConfigured() && currentUser) {
      checkArmaniteCloudStatus().then(setArmaniteStatus).catch(console.warn);
    }
  }, [currentUser, universeVersion]);

  async function handleSyncArmanites() {
    if (!currentUser) return;
    setSyncingArmanites(true);
    setSyncFeedback(null);
    try {
      await importArmaniteLore();
      const report = await syncArmanitesToCloud(currentUser);
      setSyncFeedback(report.message);
      const updated = await checkArmaniteCloudStatus();
      setArmaniteStatus(updated);
      useAppStore.getState().bumpUniverseVersion();
    } catch (err) {
      setSyncFeedback(`Sync failed: ${(err as Error).message}`);
    } finally {
      setSyncingArmanites(false);
    }
  }

  // Load real data from DB
  useEffect(() => {
    setLoading(true);

    Promise.all([
      getUniverses(),
      getWorlds(),
      getRecentlyEditedEntities(6),
      Promise.all(recentEntityIds.slice(0, 6).map(id => getEntity(id))),
      Promise.all(favoriteEntityIds.slice(0, 8).map(id => getEntity(id))),
      Promise.all(favoriteWorldIds.slice(0, 6).map(id => getWorld(id))),
    ]).then(([univs, wrlds, edited, visited, favEnts, favWrlds]) => {
      setUniverses(univs);
      setWorlds(wrlds);
      setRecentlyEdited(edited.filter(Boolean));
      setRecentlyVisited(visited.filter(Boolean) as Entity[]);
      setFavoriteEntities(favEnts.filter(Boolean) as Entity[]);
      setFavoriteWorlds(favWrlds.filter(Boolean) as World[]);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load dashboard data:', err);
      setLoading(false);
    });

    // Detect active unsaved draft in localStorage
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('hexatron_draft_'));
      if (keys.length > 0) {
        // Find most recently saved draft
        let newest: { id: string | null; title: string; savedAt: number } | null = null;
        for (const k of keys) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.form && (!newest || parsed.savedAt > newest.savedAt)) {
              newest = {
                id: parsed.entityId || null,
                title: parsed.form.title || 'Untitled Draft',
                savedAt: parsed.savedAt || Date.now(),
              };
            }
          }
        }
        setActiveDraft(newest);
      } else {
        setActiveDraft(null);
      }
    } catch {}
  }, [universeVersion, recentEntityIds, favoriteEntityIds, favoriteWorldIds]);

  // Filtered worlds
  const displayedWorlds = useMemo(() => {
    let list = worlds;
    if (selectedUniverseId !== 'all') {
      list = list.filter(w => w.universeId === selectedUniverseId);
    }
    if (worldSearch.trim()) {
      const q = worldSearch.toLowerCase();
      list = list.filter(w =>
        w.title.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [worlds, selectedUniverseId, worldSearch]);

  const totalEntitiesEstimate = useMemo(() => {
    return recentlyEdited.length + recentlyVisited.length;
  }, [recentlyEdited, recentlyVisited]);

  return (
    <div className="personal-dashboard">
      {/* ── 1. Owner Welcome Banner ────────────────────────────────────────── */}
      <div className="dash-hero">
        <div className="dash-hero-content">
          <div className="dash-hero-badge">
            <ShieldCheck size={13} className="text-accent" />
            <span>Authenticated Owner Workspace</span>
          </div>
          <h1 className="dash-hero-title">
            Welcome back{currentUser?.email ? `, ${currentUser.email.split('@')[0]}` : ''}
          </h1>
          <p className="dash-hero-desc">
            Manage your worldbuilding universes, continue recent drafts, and review recently edited articles.
          </p>

          <div className="dash-hero-stats">
            <div className="dash-stat-chip">
              <span className="dash-stat-val">{universes.length}</span>
              <span className="dash-stat-lbl">{universes.length === 1 ? 'Universe' : 'Universes'}</span>
            </div>
            <div className="dash-stat-chip">
              <span className="dash-stat-val">{worlds.length}</span>
              <span className="dash-stat-lbl">{worlds.length === 1 ? 'World' : 'Worlds'}</span>
            </div>
            <div className="dash-stat-chip">
              <span className="dash-stat-val">{favoriteEntityIds.length + favoriteWorldIds.length}</span>
              <span className="dash-stat-lbl">Pinned Favorites</span>
            </div>
          </div>
        </div>

        <div className="dash-hero-actions">
          <button
            type="button"
            className="btn-ghost small"
            onClick={onTogglePublicView}
            title="Preview how public visitors see the encyclopedia"
          >
            <Eye size={14} /> Preview Public Landing
          </button>
          <button
            type="button"
            className="btn-primary small"
            onClick={() => setManageUniversesOpen(true)}
            title="Create & manage universes and worlds"
          >
            <Sliders size={14} /> Manage Project
          </button>
        </div>
      </div>

      {/* ── 2. Active Draft Recovery Callout (if draft exists) ─────────────── */}
      {activeDraft && (
        <div className="dash-draft-callout">
          <div className="dash-draft-info">
            <Edit3 size={16} className="text-accent" />
            <div>
              <span className="dash-draft-label">Unfinished Local Draft: </span>
              <strong>{activeDraft.title}</strong>
              <span className="dash-draft-time"> (saved {formatRelativeTime(activeDraft.savedAt)})</span>
            </div>
          </div>
          <button
            type="button"
            className="btn-primary small"
            onClick={() => navigate(activeDraft.id ? `/entity/${activeDraft.id}/edit` : `/world/${worlds[0]?.id || ''}/new-entity`)}
          >
            Resume Editing →
          </button>
        </div>
      )}

      {/* ── 3. Quick Action Command Grid ───────────────────────────────────── */}
      <section className="dash-section">
        <h2 className="dash-section-title">
          <Sparkles size={15} /> Quick Actions
        </h2>
        <div className="dash-actions-grid">
          <button
            type="button"
            className="dash-action-card"
            onClick={() => {
              if (worlds.length > 0) {
                navigate(`/world/${worlds[0].id}/new-entity`);
              } else {
                navigate('/new-world');
              }
            }}
          >
            <div className="dash-action-icon accent">
              <Plus size={18} />
            </div>
            <div className="dash-action-text">
              <span className="dash-action-name">New Entity</span>
              <span className="dash-action-sub">Create article or lore entry</span>
            </div>
          </button>

          <button
            type="button"
            className="dash-action-card"
            onClick={() => setLeftSidebarOpen(true)}
          >
            <div className="dash-action-icon">
              <GitBranch size={18} />
            </div>
            <div className="dash-action-text">
              <span className="dash-action-name">Hierarchy Tree</span>
              <span className="dash-action-sub">Explore nested ancestor tree</span>
            </div>
          </button>

          <button
            type="button"
            className="dash-action-card"
            onClick={() => navigate('/graph')}
          >
            <div className="dash-action-icon">
              <Compass size={18} />
            </div>
            <div className="dash-action-text">
              <span className="dash-action-name">Universe Graph</span>
              <span className="dash-action-sub">2D connection network</span>
            </div>
          </button>

          <button
            type="button"
            className="dash-action-card"
            onClick={() => setFavoriteModalOpen(true)}
          >
            <div className="dash-action-icon amber">
              <Star size={18} />
            </div>
            <div className="dash-action-text">
              <span className="dash-action-name">Favorites</span>
              <span className="dash-action-sub">{favoriteEntityIds.length + favoriteWorldIds.length} pinned records</span>
            </div>
          </button>

          <button
            type="button"
            className="dash-action-card"
            onClick={handleSyncArmanites}
            disabled={syncingArmanites}
            title="Synchronize and verify Armanite characters, family tree, and culture to Supabase cloud"
          >
            <div className="dash-action-icon accent">
              <RefreshCw size={18} className={syncingArmanites ? 'spin' : ''} />
            </div>
            <div className="dash-action-text">
              <span className="dash-action-name">
                {syncingArmanites
                  ? 'Syncing Armanites...'
                  : armaniteStatus?.isFullySynced
                  ? `Armanites Synced (${armaniteStatus.cloudCount})`
                  : 'Sync Armanites to Cloud'}
              </span>
              <span className="dash-action-sub">
                {armaniteStatus?.isFullySynced
                  ? '110 characters verified in cloud'
                  : '110 characters + family tree'}
              </span>
            </div>
          </button>
        </div>
        {syncFeedback && (
          <div className="dash-sync-feedback-banner">
            <CheckCircle2 size={15} className="text-success" />
            <span>{syncFeedback}</span>
          </div>
        )}
      </section>

      {/* ── 4. Pinned / Favorite Entities & Universes ──────────────────────── */}
      {(favoriteEntities.length > 0 || favoriteWorlds.length > 0) && (
        <section className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">
              <Star size={15} className="text-warning" fill="currentColor" /> Pinned Favorites
            </h2>
            <button
              type="button"
              className="btn-ghost tiny"
              onClick={() => setFavoriteModalOpen(true)}
            >
              View All ({favoriteEntities.length + favoriteWorlds.length})
            </button>
          </div>

          <div className="dash-favorites-grid">
            {favoriteWorlds.map(w => (
              <div
                key={w.id}
                className="dash-fav-card world"
                onClick={() => navigate(`/world/${w.id}`)}
                style={{ '--world-color': w.color || 'var(--accent)' } as React.CSSProperties}
              >
                <div className="dash-fav-card-accent" />
                <div className="dash-fav-card-body">
                  <div className="dash-fav-card-top">
                    <span className="dash-fav-type">World</span>
                    <button
                      type="button"
                      className="dash-fav-star-btn active"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteWorld(w.id);
                      }}
                      title="Unpin from favorites"
                    >
                      <Star size={13} fill="currentColor" />
                    </button>
                  </div>
                  <span className="dash-fav-title">{w.title}</span>
                  {w.description && <span className="dash-fav-desc truncate">{w.description}</span>}
                </div>
              </div>
            ))}

            {favoriteEntities.map(e => {
              const formattedNum = formatEntryNumber(e.entryNumber);
              return (
                <div
                  key={e.id}
                  className="dash-fav-card entity"
                  onClick={() => navigate(`/entity/${e.id}`)}
                >
                  <div className="dash-fav-card-body">
                    <div className="dash-fav-card-top">
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {formattedNum && <span className="fav-entry-badge">{formattedNum}</span>}
                        <span className="dash-fav-type">{e.typeId.replace('et-', '')}</span>
                      </div>
                      <button
                        type="button"
                        className="dash-fav-star-btn active"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          toggleFavoriteEntity(e.id);
                        }}
                        title="Unpin from favorites"
                      >
                        <Star size={13} fill="currentColor" />
                      </button>
                    </div>
                    <span className="dash-fav-title">{e.title}</span>
                    <CanonBadge status={e.canonStatus} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 5. Split Columns: Recently Edited vs Recently Opened ───────────── */}
      <div className="dash-columns-split">
        {/* Left Column: Recently Edited Articles */}
        <section className="dash-section flex-1">
          <div className="dash-section-header">
            <h2 className="dash-section-title">
              <Edit3 size={15} /> Recently Edited
            </h2>
            <span className="dash-section-hint">From persistent database</span>
          </div>

          {recentlyEdited.length === 0 ? (
            <div className="dash-empty-box">
              <p>No recently edited articles yet.</p>
            </div>
          ) : (
            <div className="dash-recent-table">
              {recentlyEdited.map(e => {
                const formattedNum = formatEntryNumber(e.entryNumber);
                return (
                  <div
                    key={e.id}
                    className="dash-recent-row"
                    onClick={() => navigate(`/entity/${e.id}`)}
                  >
                    <div className="dash-recent-main">
                      {formattedNum && <span className="dash-row-num">{formattedNum}</span>}
                      <span className="dash-row-title">{e.title}</span>
                      <span className="dash-row-type">{e.typeId.replace('et-', '')}</span>
                    </div>
                    <div className="dash-recent-meta">
                      <span className="dash-row-time">{formatRelativeTime(e.updatedAt)}</span>
                      <button
                        type="button"
                        className="btn-ghost tiny"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          navigate(`/entity/${e.id}/edit`);
                        }}
                        title="Edit article"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: Recently Visited Articles */}
        <section className="dash-section flex-1">
          <div className="dash-section-header">
            <h2 className="dash-section-title">
              <Clock size={15} /> Recently Opened
            </h2>
            <span className="dash-section-hint">Browsing history</span>
          </div>

          {recentlyVisited.length === 0 ? (
            <div className="dash-empty-box">
              <p>No recently opened articles in history.</p>
            </div>
          ) : (
            <div className="dash-recent-table">
              {recentlyVisited.map(e => {
                const formattedNum = formatEntryNumber(e.entryNumber);
                return (
                  <div
                    key={e.id}
                    className="dash-recent-row"
                    onClick={() => navigate(`/entity/${e.id}`)}
                  >
                    <div className="dash-recent-main">
                      {formattedNum && <span className="dash-row-num">{formattedNum}</span>}
                      <span className="dash-row-title">{e.title}</span>
                      <span className="dash-row-type">{e.typeId.replace('et-', '')}</span>
                    </div>
                    <div className="dash-recent-meta">
                      <ArrowRight size={13} className="text-muted" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── 6. Universes & Worlds Navigator ────────────────────────────────── */}
      <section className="dash-section">
        <div className="dash-section-header">
          <h2 className="dash-section-title">
            <Globe size={15} /> Universes &amp; Worlds
          </h2>

          <div className="dash-filter-row">
            {universes.length > 1 && (
              <select
                className="form-select small"
                value={selectedUniverseId}
                onChange={e => setSelectedUniverseId(e.target.value)}
              >
                <option value="all">All Universes ({universes.length})</option>
                {universes.map(u => (
                  <option key={u.id} value={u.id}>{u.title}</option>
                ))}
              </select>
            )}

            <div className="dash-search-input-wrap">
              <Search size={13} className="dash-search-icon" />
              <input
                type="text"
                className="dash-search-input"
                placeholder="Search worlds…"
                value={worldSearch}
                onChange={e => setWorldSearch(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-ghost small"
              onClick={() => navigate('/new-world')}
            >
              <Plus size={13} /> New World
            </button>
          </div>
        </div>

        {displayedWorlds.length === 0 ? (
          <div className="dash-empty-state">
            <Globe size={28} className="text-muted opacity-40" />
            <p>No worlds match your current filter.</p>
            <button className="btn-primary small" onClick={() => navigate('/new-world')}>
              <Plus size={13} /> Create First World
            </button>
          </div>
        ) : (
          <div className="card-grid">
            {displayedWorlds.map(w => {
              const isFav = favoriteWorldIds.includes(w.id);
              return (
                <div
                  key={w.id}
                  className="world-card"
                  onClick={() => navigate(`/world/${w.id}`)}
                  style={{ '--world-color': w.color ?? 'var(--accent)' } as React.CSSProperties}
                >
                  <div className="world-card-accent" />
                  <button
                    type="button"
                    className={`dash-card-star-btn ${isFav ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteWorld(w.id);
                    }}
                    title={isFav ? 'Remove from favorites' : 'Pin to favorites'}
                  >
                    <Star size={13} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                  <div className="world-card-body">
                    <span className="world-card-title">{w.title}</span>
                    {w.description && <span className="world-card-desc truncate">{w.description}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
