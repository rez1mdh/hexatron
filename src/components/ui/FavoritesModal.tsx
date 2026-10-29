// src/components/ui/FavoritesModal.tsx
// Dedicated favorites view with search, filter, and removal for owner

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star, X, Search, Globe, BookOpen, Trash2, ExternalLink, ArrowUpDown
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getEntity, getWorld, formatEntryNumber } from '../../db/operations';
import type { Entity, World } from '../../db/schema';
import CanonBadge from './CanonBadge';
import './FavoritesModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function FavoritesModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate();
  const {
    favoriteEntityIds, favoriteWorldIds,
    toggleFavoriteEntity, toggleFavoriteWorld
  } = useAppStore();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'entities' | 'worlds'>('all');
  const [sortBy, setSortBy] = useState<'title' | 'type'>('title');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    Promise.all([
      Promise.all(favoriteEntityIds.map(id => getEntity(id))),
      Promise.all(favoriteWorldIds.map(id => getWorld(id))),
    ]).then(([ents, wrlds]) => {
      setEntities(ents.filter(Boolean) as Entity[]);
      setWorlds(wrlds.filter(Boolean) as World[]);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load favorites:', err);
      setLoading(false);
    });
  }, [isOpen, favoriteEntityIds, favoriteWorldIds]);

  const filteredEntities = useMemo(() => {
    let list = entities;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.typeId.toLowerCase().includes(q) ||
        (e.entryNumber && String(e.entryNumber).includes(q))
      );
    }
    return list.sort((a, b) => {
      if (sortBy === 'type') {
        const typeComp = a.typeId.localeCompare(b.typeId);
        if (typeComp !== 0) return typeComp;
      }
      return (a.title || '').localeCompare(b.title || '');
    });
  }, [entities, searchQuery, sortBy]);

  const filteredWorlds = useMemo(() => {
    let list = worlds;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(w =>
        w.title.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }, [worlds, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fav-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fav-modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="fav-modal-header">
          <div className="fav-modal-title">
            <Star size={18} className="fav-star-icon" fill="currentColor" />
            <h2>Favorites &amp; Pinned Records</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Search, Filters & Sorting */}
        <div className="fav-modal-toolbar">
          <div className="fav-search-wrap">
            <Search size={14} className="fav-search-icon" />
            <input
              type="text"
              className="fav-search-input"
              placeholder="Filter favorites by title or category…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button type="button" className="fav-clear-search" onClick={() => setSearchQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>

          <div className="fav-tabs-row">
            <div className="fav-tab-buttons">
              <button
                type="button"
                className={`fav-tab ${filterTab === 'all' ? 'active' : ''}`}
                onClick={() => setFilterTab('all')}
              >
                All ({entities.length + worlds.length})
              </button>
              <button
                type="button"
                className={`fav-tab ${filterTab === 'entities' ? 'active' : ''}`}
                onClick={() => setFilterTab('entities')}
              >
                Entities ({entities.length})
              </button>
              <button
                type="button"
                className={`fav-tab ${filterTab === 'worlds' ? 'active' : ''}`}
                onClick={() => setFilterTab('worlds')}
              >
                Worlds ({worlds.length})
              </button>
            </div>

            <button
              type="button"
              className="fav-sort-btn"
              onClick={() => setSortBy(s => s === 'title' ? 'type' : 'title')}
              title={`Sorting by ${sortBy === 'title' ? 'Name' : 'Type'}. Click to toggle.`}
            >
              <ArrowUpDown size={13} />
              <span>{sortBy === 'title' ? 'By Name' : 'By Type'}</span>
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="fav-modal-body">
          {loading ? (
            <div className="fav-loading">Loading favorites…</div>
          ) : entities.length === 0 && worlds.length === 0 ? (
            <div className="fav-empty-state">
              <Star size={32} className="fav-empty-star" />
              <h3>No Favorites Yet</h3>
              <p>
                Click the Star icon on any article or universe to pin it here for instant one-click access.
              </p>
            </div>
          ) : (
            <div className="fav-items-list">
              {/* Worlds Section */}
              {(filterTab === 'all' || filterTab === 'worlds') && filteredWorlds.length > 0 && (
                <div className="fav-group">
                  <div className="fav-group-header">
                    <Globe size={13} />
                    <span>Universes &amp; Worlds ({filteredWorlds.length})</span>
                  </div>
                  {filteredWorlds.map(w => (
                    <div
                      key={w.id}
                      className="fav-item-row"
                      onClick={() => {
                        navigate(`/world/${w.id}`);
                        onClose();
                      }}
                    >
                      <div className="fav-item-info">
                        <span className="fav-world-dot" style={{ background: w.color || 'var(--accent)' }} />
                        <span className="fav-item-title">{w.title}</span>
                        {w.description && <span className="fav-item-sub truncate">{w.description}</span>}
                      </div>
                      <div className="fav-item-actions" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          className="fav-remove-btn"
                          onClick={() => toggleFavoriteWorld(w.id)}
                          title="Remove from favorites (does not delete world)"
                        >
                          <Star size={13} fill="currentColor" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Entities Section */}
              {(filterTab === 'all' || filterTab === 'entities') && filteredEntities.length > 0 && (
                <div className="fav-group">
                  <div className="fav-group-header">
                    <BookOpen size={13} />
                    <span>Entities &amp; Articles ({filteredEntities.length})</span>
                  </div>
                  {filteredEntities.map(e => {
                    const formattedNum = formatEntryNumber(e.entryNumber);
                    return (
                      <div
                        key={e.id}
                        className="fav-item-row"
                        onClick={() => {
                          navigate(`/entity/${e.id}`);
                          onClose();
                        }}
                      >
                        <div className="fav-item-info">
                          {formattedNum && <span className="fav-entry-badge">{formattedNum}</span>}
                          <span className="fav-item-title">{e.title}</span>
                          <span className="fav-type-badge">{e.typeId.replace('et-', '')}</span>
                          <CanonBadge status={e.canonStatus} />
                        </div>
                        <div className="fav-item-actions" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            className="fav-remove-btn"
                            onClick={() => toggleFavoriteEntity(e.id)}
                            title="Remove from favorites (does not delete entity)"
                          >
                            <Star size={13} fill="currentColor" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {((filterTab === 'entities' && filteredEntities.length === 0) ||
                (filterTab === 'worlds' && filteredWorlds.length === 0) ||
                (searchQuery && filteredEntities.length === 0 && filteredWorlds.length === 0)) && (
                <div className="fav-no-results">
                  No favorites match &ldquo;{searchQuery}&rdquo;.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
