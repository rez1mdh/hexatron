// src/pages/SearchPage.tsx — global full-text search

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { searchEntities, getEntityTypes, formatEntryNumber } from '../db/operations';
import type { Entity, EntityType } from '../db/schema';
import EntityTypeIcon from '../components/ui/EntityTypeIcon';
import CanonBadge from '../components/ui/CanonBadge';
import './pages.css';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Entity[]>([]);
  const [entityTypes, setEntityTypes] = useState<Map<string, EntityType>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    getEntityTypes().then(types => {
      const map = new Map<string, EntityType>();
      types.forEach(t => map.set(t.id, t));
      setEntityTypes(map);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 1) { setResults([]); return; }
      const r = await searchEntities(query);
      setResults(r.slice(0, 40));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard shortcut /
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="page-container search-page">
      <div className="search-bar-large">
        <Search size={18} className="search-icon-large" />
        <input
          ref={inputRef}
          type="text"
          className="search-input-large"
          placeholder="Search all entities, entry #001, articles, and tags…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
        />
        {query && (
          <button className="icon-btn" onClick={() => setQuery('')}><X size={15}/></button>
        )}
      </div>

      {query.length >= 1 && (
        <div className="search-results">
          {results.length === 0 && <p className="text-muted">No results for "{query}".</p>}
          {results.map(e => {
            const type = entityTypes.get(e.typeId);
            const formattedNum = formatEntryNumber(e.entryNumber);
            return (
              <button key={e.id} className="search-result-item" onClick={() => navigate(`/entity/${e.id}`)}>
                <div className="entity-row-icon" style={{ '--type-color': type?.color ?? 'var(--accent)' } as React.CSSProperties}>
                  {type && <EntityTypeIcon name={type.icon} size={14}/>}
                </div>
                <div className="search-result-body">
                  <span className="entity-row-title">
                    {formattedNum && (
                      <span className="lep-entry-number" style={{ marginRight: 6 }}>{formattedNum}</span>
                    )}
                    {e.title}
                  </span>
                  {e.aliases.length > 0 && <span className="entity-row-alias">{e.aliases[0]}</span>}
                  {e.tags.length > 0 && (
                    <div className="chip-list small">
                      {e.tags.map(t => <span key={t} className="tag-chip">{t}</span>)}
                    </div>
                  )}
                </div>
                <div className="entity-row-meta">
                  {type && <span className="entity-type-label" style={{ color: type.color }}>{type.name}</span>}
                  <CanonBadge status={e.canonStatus} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {query.length < 2 && (
        <div className="search-hint">
          <p>Type at least 2 characters to search across all worlds, entities, articles, and tags.</p>
          <p className="text-muted">Tip: Type <kbd>/</kbd> anywhere to focus search.</p>
        </div>
      )}
    </div>
  );
}
