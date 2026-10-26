// src/components/ui/EntitySearchSelector.tsx
// Searchable selector for existing entities that also allows inline creation of missing entities on-the-fly

import { useState, useRef, useEffect } from 'react';
import { Search, Plus, ExternalLink, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Entity, EntityType } from '../../db/schema';
import { createEntity, getEntityTypes, formatEntryNumber } from '../../db/operations';
import EntityTypeIcon from './EntityTypeIcon';
import './EntitySearchSelector.css';

interface Props {
  value?: string;                         // Currently selected entity ID
  onChange: (entityId: string | undefined, entity?: Entity) => void;
  availableEntities: Entity[];
  expectedTypeId?: string;                // e.g. "et-religion", "et-language", "et-family"
  placeholder?: string;
  worldId?: string;
  allowCreate?: boolean;
  onEntityCreated?: (entity: Entity) => void;
  compact?: boolean;
}

export default function EntitySearchSelector({
  value,
  onChange,
  availableEntities,
  expectedTypeId,
  placeholder = 'Search or select entity…',
  worldId,
  allowCreate = true,
  onEntityCreated,
  compact = false,
}: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [selectedTypeForNew, setSelectedTypeForNew] = useState<string>(expectedTypeId || 'et-concept');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getEntityTypes().then(setEntityTypes);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedEntity = availableEntities.find(e => e.id === value);

  // Filter candidates
  const cleanQuery = query.trim().toLowerCase();
  const rawNumQuery = cleanQuery.startsWith('#') ? cleanQuery.slice(1) : cleanQuery;

  const filtered = availableEntities.filter(e => {
    if (expectedTypeId && e.typeId !== expectedTypeId) return false;
    if (!cleanQuery) return true;
    const numStr = e.entryNumber !== undefined ? String(e.entryNumber) : '';
    const formatted = formatEntryNumber(e.entryNumber).toLowerCase();
    return (
      e.title.toLowerCase().includes(cleanQuery) ||
      formatted.includes(cleanQuery) ||
      numStr === rawNumQuery ||
      numStr.padStart(3, '0') === rawNumQuery ||
      e.aliases.some(a => a.toLowerCase().includes(cleanQuery))
    );
  }).slice(0, 8);

  const exactMatchExists = availableEntities.some(e => e.title.toLowerCase() === cleanQuery);

  async function handleCreateNew() {
    if (!cleanQuery || !worldId) return;
    try {
      const typeToUse = expectedTypeId || selectedTypeForNew;
      const created = await createEntity({
        worldId,
        typeId: typeToUse,
        title: query.trim(),
        aliases: [],
        tags: [],
        canonStatus: 'canon',
      });
      onEntityCreated?.(created);
      onChange(created.id, created);
      setIsOpen(false);
      setQuery('');
    } catch (err) {
      alert('Could not create entity: ' + (err as Error).message);
    }
  }

  const typeMap = new Map(entityTypes.map(t => [t.id, t]));

  return (
    <div className={`entity-search-selector ${compact ? 'compact' : ''}`} ref={containerRef}>
      {selectedEntity ? (
        <div className="selected-entity-chip">
          <span className="chip-type-tag" style={{ color: typeMap.get(selectedEntity.typeId)?.color }}>
            <EntityTypeIcon name={typeMap.get(selectedEntity.typeId)?.icon || 'BookOpen'} size={12} />
          </span>
          {formatEntryNumber(selectedEntity.entryNumber) && (
            <span className="lep-entry-number" style={{ fontSize: '0.72rem' }}>
              {formatEntryNumber(selectedEntity.entryNumber)}
            </span>
          )}
          <span className="chip-title truncate">{selectedEntity.title}</span>
          <button
            type="button"
            className="chip-open-btn"
            onClick={() => navigate(`/entity/${selectedEntity.id}`)}
            title="Open entity article"
          >
            <ExternalLink size={11} />
          </button>
          <button
            type="button"
            className="chip-clear-btn"
            onClick={() => onChange(undefined)}
            title="Clear selection"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="selector-input-box">
          <input
            type="text"
            className="form-input small selector-search-input"
            placeholder={placeholder}
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          />
          <Search size={13} className="selector-search-icon" />
        </div>
      )}

      {isOpen && !selectedEntity && (
        <div className="selector-dropdown-menu">
          {filtered.length > 0 && (
            <div className="dropdown-section">
              <span className="dropdown-section-title">Existing Entities</span>
              {filtered.map(e => {
                const t = typeMap.get(e.typeId);
                return (
                  <div
                    key={e.id}
                    className="dropdown-item"
                    onClick={() => {
                      onChange(e.id, e);
                      setIsOpen(false);
                      setQuery('');
                    }}
                  >
                    <span className="item-type-dot" style={{ backgroundColor: t?.color }} />
                    {formatEntryNumber(e.entryNumber) && (
                      <span className="lep-entry-number" style={{ fontSize: '0.7rem' }}>
                        {formatEntryNumber(e.entryNumber)}
                      </span>
                    )}
                    <span className="item-title truncate">{e.title}</span>
                    <span className="item-type-badge">{t?.name || e.typeId.replace('et-', '')}</span>
                  </div>
                );
              })}
            </div>
          )}

          {filtered.length === 0 && cleanQuery && (
            <div className="dropdown-empty">No matching existing entity found.</div>
          )}

          {allowCreate && cleanQuery && !exactMatchExists && worldId && (
            <div className="dropdown-create-section">
              <button
                type="button"
                className="dropdown-create-btn"
                onClick={handleCreateNew}
              >
                <Plus size={14} className="text-accent" />
                <span>
                  Create new <strong>{typeMap.get(expectedTypeId || selectedTypeForNew)?.name || 'Entity'}</strong>: "{query.trim()}"
                </span>
              </button>

              {!expectedTypeId && (
                <div className="create-type-picker">
                  <span className="picker-label">as type:</span>
                  <select
                    className="form-select tiny"
                    value={selectedTypeForNew}
                    onChange={e => setSelectedTypeForNew(e.target.value)}
                  >
                    {entityTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
