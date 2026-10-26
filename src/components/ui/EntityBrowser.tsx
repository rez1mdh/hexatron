// src/components/ui/EntityBrowser.tsx
// All Entities Browser: browsable catalog with search by name/#number, universe/world/type filters, and sorting

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpDown, Globe, Compass, BookOpen } from 'lucide-react';
import {
  getEntities, getEntityTypes, getUniverses, getWorlds,
  formatEntryNumber
} from '../../db/operations';
import type { Entity, EntityType, Universe, World } from '../../db/schema';
import EntityTypeIcon from './EntityTypeIcon';
import './EntityBrowser.css';

interface Props {
  currentEntityId?: string | null;
  onNavigate?: () => void;
}

export default function EntityBrowser({ currentEntityId, onNavigate }: Props) {
  const navigate = useNavigate();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>('all');
  const [selectedWorldId, setSelectedWorldId] = useState<string>('all');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'number-asc' | 'number-desc' | 'name-asc' | 'recent'>('number-asc');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [allEnts, types, unis, wlds] = await Promise.all([
        getEntities(),
        getEntityTypes(),
        getUniverses(),
        getWorlds(),
      ]);
      setEntities(allEnts);
      setEntityTypes(types);
      setUniverses(unis);
      setWorlds(wlds);
      setLoading(false);
    }
    loadData();
  }, []);

  // Filter available worlds based on selected universe
  const availableWorlds = useMemo(() => {
    if (selectedUniverseId === 'all') return worlds;
    return worlds.filter(w => w.universeId === selectedUniverseId);
  }, [worlds, selectedUniverseId]);

  // Fast lookups
  const typeMap = useMemo(() => new Map(entityTypes.map(t => [t.id, t])), [entityTypes]);
  const worldMap = useMemo(() => new Map(worlds.map(w => [w.id, w])), [worlds]);

  // Filtered & Sorted Entities
  const filteredEntities = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.startsWith('#') ? q.slice(1) : q;

    let result = entities.filter(e => {
      // Type filter
      if (selectedTypeId !== 'all' && e.typeId !== selectedTypeId) return false;

      // World filter
      if (selectedWorldId !== 'all') {
        if (e.worldId !== selectedWorldId) return false;
      } else if (selectedUniverseId !== 'all') {
        // Universe filter
        const w = worldMap.get(e.worldId);
        if (!w || w.universeId !== selectedUniverseId) return false;
      }

      // Search query (matches title, formatted #001, raw number, aliases, or tags)
      if (q) {
        const numStr = e.entryNumber !== undefined ? String(e.entryNumber) : '';
        const formatted = formatEntryNumber(e.entryNumber).toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesNum = formatted.includes(q) || numStr === cleanQ || numStr.padStart(3, '0') === cleanQ;
        const matchesAlias = e.aliases.some(a => a.toLowerCase().includes(q));
        const matchesTag = e.tags.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesNum && !matchesAlias && !matchesTag) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'number-asc') {
        return (a.entryNumber ?? Infinity) - (b.entryNumber ?? Infinity);
      }
      if (sortBy === 'number-desc') {
        return (b.entryNumber ?? -Infinity) - (a.entryNumber ?? -Infinity);
      }
      if (sortBy === 'name-asc') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'recent') {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      }
      return 0;
    });

    return result;
  }, [entities, searchQuery, selectedUniverseId, selectedWorldId, selectedTypeId, sortBy, worldMap]);

  function handleSelect(id: string) {
    navigate(`/entity/${id}`);
    if (onNavigate) onNavigate();
  }

  return (
    <div className="entity-browser">
      <div className="eb-header">
        <div className="eb-title-row">
          <BookOpen size={14} className="eb-icon" />
          <span className="eb-title">All Entities</span>
          <span className="eb-count-badge">{filteredEntities.length}</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="eb-search-box">
        <Search size={13} className="eb-search-icon" />
        <input
          type="text"
          className="eb-search-input"
          placeholder="Search name or #001…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="eb-clear-btn" onClick={() => setSearchQuery('')}>×</button>
        )}
      </div>

      {/* Filter Row */}
      <div className="eb-controls">
        <div className="eb-select-row">
          {/* Universe filter */}
          {universes.length > 1 && (
            <select
              className="eb-select"
              value={selectedUniverseId}
              onChange={e => {
                setSelectedUniverseId(e.target.value);
                setSelectedWorldId('all');
              }}
              title="Filter by Universe"
            >
              <option value="all">All Universes</option>
              {universes.map(u => (
                <option key={u.id} value={u.id}>{u.title}</option>
              ))}
            </select>
          )}

          {/* World filter */}
          <select
            className="eb-select"
            value={selectedWorldId}
            onChange={e => setSelectedWorldId(e.target.value)}
            title="Filter by World"
          >
            <option value="all">All Worlds</option>
            {availableWorlds.map(w => (
              <option key={w.id} value={w.id}>{w.title}</option>
            ))}
          </select>
        </div>

        <div className="eb-select-row">
          {/* Entity Type Filter */}
          <select
            className="eb-select"
            value={selectedTypeId}
            onChange={e => setSelectedTypeId(e.target.value)}
            title="Filter by Type"
          >
            <option value="all">All Types</option>
            {entityTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Sort By */}
          <select
            className="eb-select"
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            title="Sort Order"
          >
            <option value="number-asc">Entry # (Low → High)</option>
            <option value="number-desc">Entry # (High → Low)</option>
            <option value="name-asc">Name (A → Z)</option>
            <option value="recent">Recently Updated</option>
          </select>
        </div>
      </div>

      {/* Entity List */}
      <div className="eb-list">
        {loading ? (
          <div className="eb-loading">Loading entities…</div>
        ) : filteredEntities.length === 0 ? (
          <div className="eb-empty">No entities match your filters.</div>
        ) : (
          filteredEntities.map(e => {
            const isCurrent = e.id === currentEntityId;
            const t = typeMap.get(e.typeId);
            const formattedNum = formatEntryNumber(e.entryNumber);

            return (
              <button
                key={e.id}
                className={`eb-item ${isCurrent ? 'active' : ''}`}
                onClick={() => handleSelect(e.id)}
                title={e.title}
              >
                <div className="eb-item-left">
                  {formattedNum && (
                    <span className="eb-item-number">{formattedNum}</span>
                  )}
                  <span className="eb-item-title truncate">{e.title}</span>
                </div>
                {t && (
                  <span
                    className="eb-item-type-badge"
                    style={{ '--type-color': t.color } as React.CSSProperties}
                  >
                    <EntityTypeIcon name={t.icon} size={11} />
                    {t.name}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
