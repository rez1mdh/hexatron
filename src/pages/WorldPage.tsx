// src/pages/WorldPage.tsx — entity list for a world + creation

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Compass, Trash2 } from 'lucide-react';
import { getWorld, getEntities, getEntityTypes, softDeleteEntity, formatEntryNumber, getWorldStats } from '../db/operations';
import { useAppStore } from '../store/appStore';
import type { World, Entity, EntityType } from '../db/schema';
import EntityTypeIcon from '../components/ui/EntityTypeIcon';
import CanonBadge from '../components/ui/CanonBadge';
import EntityTypeModal from '../components/ui/EntityTypeModal';
import DeleteConfirmModal from '../components/ui/DeleteConfirmModal';
import './pages.css';

export default function WorldPage() {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const { setCurrentWorld, setCurrentEntity, bumpUniverseVersion, isOwner } = useAppStore();
  const [world, setWorld] = useState<World | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityTypes, setEntityTypes] = useState<Map<string, EntityType>>(new Map());
  const [filterType, setFilterType] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [worldStats, setWorldStats] = useState<{ entityCount: number; relationshipCount: number }>({ entityCount: 0, relationshipCount: 0 });

  useEffect(() => {
    if (!worldId) return;
    setCurrentWorld(worldId);
    setCurrentEntity(null);
    getWorld(worldId).then(w => setWorld(w ?? null));
    getEntities(worldId).then(setEntities);
    getWorldStats(worldId).then(setWorldStats);
    getEntityTypes().then(types => {
      const map = new Map<string, EntityType>();
      types.forEach(t => map.set(t.id, t));
      setEntityTypes(map);
    });
  }, [worldId]);

  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  function reloadData() {
    if (!worldId) return;
    getWorld(worldId).then(w => setWorld(w ?? null));
    getEntities(worldId).then(setEntities);
    getEntityTypes().then(types => {
      const map = new Map<string, EntityType>();
      types.forEach(t => map.set(t.id, t));
      setEntityTypes(map);
    });
  }

  const filtered = entities.filter(e => {
    const matchType = filterType ? e.typeId === filterType : true;
    const matchSearch = search ? (
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.aliases.some(a => a.toLowerCase().includes(search.toLowerCase()))
    ) : true;
    return matchType && matchSearch;
  });

  async function handleDelete(e: Entity, ev: React.MouseEvent) {
    ev.stopPropagation();
    if (!confirm(`Delete "${e.title}"? This cannot be undone easily.`)) return;
    await softDeleteEntity(e.id);
    setEntities(prev => prev.filter(x => x.id !== e.id));
  }

  if (!world) return <div className="page-loading">Loading…</div>;

  const usedTypes = [...new Set(entities.map(e => e.typeId))];

  return (
    <div className="page-container">
      <div className="world-page-header" style={{ '--world-color': world.color ?? 'var(--accent)' } as React.CSSProperties}>
        <div className="world-page-accent" />
        <div className="world-page-title-row">
          <h1 className="world-page-title">{world.title}</h1>
          <div className="world-header-btns">
            <button className="btn-ghost" onClick={() => navigate(`/world/${worldId}/graph`)} title="View world network graph">
              <Compass size={14} /> Graph View
            </button>
            {isOwner && (
              <>
                <button className="btn-ghost" onClick={() => setIsTypeModalOpen(true)} title="Manage custom entity categories">
                  <Plus size={14} /> Manage Types
                </button>
                <button className="btn-ghost danger-hover" onClick={() => setIsDeleteModalOpen(true)} title="Delete this world and its contents">
                  <Trash2 size={14} /> Delete World
                </button>
                <button className="btn-primary" onClick={() => navigate(`/world/${worldId}/new-entity`)}>
                  <Plus size={15}/> New Entity
                </button>
              </>
            )}
          </div>
        </div>
        {world.description && <p className="world-page-desc">{world.description}</p>}
        <div className="world-stats">
          <span>{entities.length} entities</span>
        </div>
      </div>

      {/* Filters */}
      <div className="entity-filters">
        <div className="search-field">
          <Search size={13} />
          <input
            type="text"
            placeholder="Filter entities…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="type-filters">
          <button className={`type-chip ${!filterType ? 'active' : ''}`} onClick={() => setFilterType('')}>All</button>
          {usedTypes.map(tid => {
            const t = entityTypes.get(tid);
            if (!t) return null;
            return (
              <button
                key={tid}
                className={`type-chip ${filterType === tid ? 'active' : ''}`}
                onClick={() => setFilterType(filterType === tid ? '' : tid)}
                style={{ '--chip-color': t.color } as React.CSSProperties}
              >
                <EntityTypeIcon name={t.icon} size={11} />
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Entity list */}
      <div className="entity-list">
        {filtered.length === 0 && (
          <div className="list-empty">
            {entities.length === 0
              ? <><p>No entities in this world yet.</p><button className="btn-primary" onClick={() => navigate(`/world/${worldId}/new-entity`)}><Plus size={14}/> Create First Entity</button></>
              : <p>No entities match your filter.</p>
            }
          </div>
        )}
        {filtered.map(e => {
          const type = entityTypes.get(e.typeId);
          return (
            <button
              key={e.id}
              className="entity-row"
              onClick={() => navigate(`/entity/${e.id}`)}
            >
              <div className="entity-row-icon" style={{ '--type-color': type?.color ?? 'var(--accent)' } as React.CSSProperties}>
                {type && <EntityTypeIcon name={type.icon} size={14} />}
              </div>
              <div className="entity-row-body">
                <span className="entity-row-title">
                  {formatEntryNumber(e.entryNumber) ? (
                    <span className="lep-entry-number" style={{ marginRight: 6 }}>{formatEntryNumber(e.entryNumber)}</span>
                  ) : null}
                  {e.title}
                </span>
                {e.aliases.length > 0 && <span className="entity-row-alias">{e.aliases[0]}</span>}
              </div>
              <div className="entity-row-meta">
                {type && <span className="entity-type-label" style={{ color: type.color }}>{type.name}</span>}
                <CanonBadge status={e.canonStatus} />
              </div>
              {isOwner && (
                <button className="entity-row-delete" onClick={ev => handleDelete(e, ev)} title="Delete">×</button>
              )}
            </button>
          );
        })}
      </div>

      <EntityTypeModal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        entityTypes={Array.from(entityTypes.values())}
        onTypesChanged={reloadData}
      />

      {world && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          type="world"
          id={world.id}
          title={world.title}
          stats={{
            entityCount: worldStats.entityCount,
            relationshipCount: worldStats.relationshipCount,
          }}
          onClose={() => setIsDeleteModalOpen(false)}
          onDeleted={() => {
            setIsDeleteModalOpen(false);
            bumpUniverseVersion();
            setCurrentWorld(null);
            navigate('/');
          }}
        />
      )}
    </div>
  );
}
