// src/pages/EntityPage.tsx — Wikipedia-style article-first encyclopedia layout

import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Image as ImageIcon, GitBranch, Compass, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getEntity, getEntityTypes, getImages, softDeleteEntity,
  getWorld, getEntities, formatEntryNumber
} from '../db/operations';
import { useAppStore } from '../store/appStore';
import { pushSoftDeleteEntityToCloud } from '../services/cloudSync';
import type { Entity, EntityType, EntityImage } from '../db/schema';
import ArticleEditor from '../editor/ArticleEditor';
import LinkedEntitiesPanel from '../components/ui/LinkedEntitiesPanel';
import CanonBadge from '../components/ui/CanonBadge';
import ImageGallery from '../components/ui/ImageGallery';
import InteractiveChart from '../components/ui/InteractiveChart';
import FamilyTree from '../components/ui/FamilyTree';
import './pages.css';

interface TocItem {
  id: string;
  number: string;
  text: string;
  level: number;
}

function extractTocItems(articleJson?: string): TocItem[] {
  if (!articleJson) return [];
  try {
    const doc = JSON.parse(articleJson);
    if (!doc || !Array.isArray(doc.content)) return [];

    const items: TocItem[] = [];
    let h2Count = 0;
    let h3Count = 0;

    for (const node of doc.content) {
      if (node.type === 'heading') {
        const level = node.attrs?.level || 2;
        const text = (node.content || []).map((c: any) => c.text || '').join('').trim();
        if (!text) continue;

        let number = '';
        if (level === 2) {
          h2Count++;
          h3Count = 0;
          number = `${h2Count}`;
        } else if (level === 3) {
          h3Count++;
          number = `${h2Count || 1}.${h3Count}`;
        }

        const id = 'heading-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        items.push({ id, number, text, level });
      }
    }
    return items;
  } catch {
    return [];
  }
}

export default function EntityPage() {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();
  const { setCurrentEntity, pushRecentEntity, isOwner, currentUser } = useAppStore();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [images, setImages] = useState<EntityImage[]>([]);
  const [worldTitle, setWorldTitle] = useState('');
  const [availableEntities, setAvailableEntities] = useState<Entity[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [showFamilyTree, setShowFamilyTree] = useState(false);
  const [hideToc, setHideToc] = useState(false);

  useEffect(() => {
    if (!entityId) return;
    setCurrentEntity(entityId);
    pushRecentEntity(entityId);

    getEntity(entityId)
      .then(async e => {
        if (!e || e.deletedAt) { setNotFound(true); return; }
        setEntity(e);
        if (e.typeId === 'et-family') {
          setShowFamilyTree(true);
        }

        // Load type
        const types = await getEntityTypes();
        const t = types.find(x => x.id === e.typeId) ?? null;
        setEntityType(t);

        // Load world title
        const w = await getWorld(e.worldId);
        setWorldTitle(w?.title ?? '');

        // Load all entities for backlinks and cross-references
        const allEnts = await getEntities(e.worldId);
        setAvailableEntities(allEnts);
      })
      .catch(err => {
        console.error('Failed to load entity:', err);
        setNotFound(true);
      });

    getImages(entityId).then(setImages).catch(() => {});
  }, [entityId, setCurrentEntity, pushRecentEntity]);

  // Assign IDs to rendered headings in ArticleEditor for smooth TOC jump links
  useEffect(() => {
    if (!entity?.article) return;
    const timer = setTimeout(() => {
      document.querySelectorAll('.tiptap-content h2, .tiptap-content h3').forEach((heading) => {
        const text = heading.textContent || '';
        const id = 'heading-' + text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        heading.id = id;
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [entity?.article, entityId]);

  const tocItems = useMemo(() => extractTocItems(entity?.article), [entity?.article]);

  // Adjacent entities navigation
  const { prevEntity, nextEntity } = useMemo(() => {
    if (!entity || availableEntities.length <= 1) return { prevEntity: null, nextEntity: null };
    const sorted = [...availableEntities].sort((a, b) => {
      if (a.entryNumber !== undefined && b.entryNumber !== undefined) {
        return a.entryNumber - b.entryNumber;
      }
      return (a.title || '').localeCompare(b.title || '');
    });
    const idx = sorted.findIndex(e => e.id === entity.id);
    if (idx === -1) return { prevEntity: null, nextEntity: null };
    return {
      prevEntity: idx > 0 ? sorted[idx - 1] : null,
      nextEntity: idx < sorted.length - 1 ? sorted[idx + 1] : null,
    };
  }, [entity, availableEntities]);

  async function handleDelete() {
    if (!entity) return;
    if (!confirm(`Delete "${entity.title}"?`)) return;
    const worldId = entity.worldId;
    await softDeleteEntity(entity.id);
    if (currentUser) {
      await pushSoftDeleteEntityToCloud(entity.id, currentUser.id);
    }
    if (worldId) {
      navigate(`/world/${worldId}`);
    } else {
      navigate('/');
    }
  }

  if (notFound) return <div className="page-container"><p className="text-muted">Entity not found.</p></div>;
  if (!entity) return <div className="page-loading">Loading article…</div>;

  const portrait = images.find(i => i.role === 'portrait');
  const formattedNumber = formatEntryNumber(entity.entryNumber);

  // Format property labels according to schema if available
  const fieldLabelMap = new Map<string, string>();
  if (entityType?.defaultFields) {
    entityType.defaultFields.forEach(f => fieldLabelMap.set(f.key, f.label));
  }

  const hasProperties = entity.properties && Object.keys(entity.properties).length > 0;

  return (
    <div className="wiki-article-page">
      {/* ── 1. Wikipedia Article Header & Meta ─────────────────────────────── */}
      <header className="wiki-header">
        <div className="wiki-header-meta">
          <div className="wiki-breadcrumbs">
            <div className="wiki-nav-arrows">
              <button
                className="wiki-nav-arrow-btn"
                onClick={() => prevEntity ? navigate(`/entity/${prevEntity.id}`) : navigate(-1)}
                title={prevEntity ? `Previous: ${prevEntity.title}` : 'Go back'}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                className="wiki-nav-arrow-btn"
                onClick={() => nextEntity ? navigate(`/entity/${nextEntity.id}`) : navigate(1)}
                title={nextEntity ? `Next: ${nextEntity.title}` : 'Go forward'}
              >
                <ChevronRight size={14} />
              </button>
            </div>
            {worldTitle && <span className="wiki-breadcrumb-item">{worldTitle}</span>}
            {worldTitle && <span className="wiki-breadcrumb-sep">/</span>}
            {entityType && (
              <span
                className="wiki-breadcrumb-type"
                style={{ color: entityType.color }}
              >
                {entityType.name}
              </span>
            )}
            {formattedNumber && (
              <span className="wiki-entry-badge" title="Permanent Entry Number">
                {formattedNumber}
              </span>
            )}
            <CanonBadge status={entity.canonStatus} />
          </div>

          <div className="wiki-header-actions">
            <button
              className="wiki-action-tab active"
              title="Article view"
            >
              <FileText size={13} /> Article
            </button>
            {isOwner && (
              <button
                className="wiki-action-tab"
                onClick={() => navigate(`/entity/${entity.id}/edit`)}
                title="Edit this article"
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
            <button
              className="wiki-action-tab"
              onClick={() => navigate(`/entity/${entity.id}/graph`)}
              title="View in Network Graph"
            >
              <Compass size={13} /> Graph
            </button>
            {(entity.typeId === 'et-family' || entity.typeId === 'et-character') && (
              <button
                className={`wiki-action-tab ${showFamilyTree ? 'active' : ''}`}
                onClick={() => setShowFamilyTree(!showFamilyTree)}
                title="Toggle visual family tree"
              >
                <GitBranch size={13} /> Family Tree
              </button>
            )}
            {isOwner && (
              <button
                className="wiki-action-tab danger"
                onClick={handleDelete}
                title="Delete entity"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </div>

        <h1 className="wiki-title">
          {formattedNumber ? <span className="wiki-title-num">{formattedNumber} — </span> : null}
          {entity.title}
        </h1>

        <p className="wiki-subtitle">
          From Hexatron, the encyclopedia{worldTitle ? ` of ${worldTitle}` : ''}
        </p>

        {entity.aliases && entity.aliases.length > 0 && (
          <p className="wiki-aliases">
            (Also known as: <em>{entity.aliases.join(', ')}</em>)
          </p>
        )}

        <hr className="wiki-title-divider" />
      </header>

      {/* ── 2. Exact Layout: Main Article Column + Linked Entities Sidebar ── */}
      <div className="wiki-columns-layout">
        {/* Left / Center Area: MAIN ARTICLE AREA (Largest and most important) */}
        <main className="wiki-main-column">
          {/* Wikipedia Infobox floating on the top-right of the article */}
          {((portrait && portrait.localBlob) || hasProperties) && (
            <aside className="wiki-infobox" aria-label="Quick Facts">
              <div className="wiki-infobox-header">
                <div className="wiki-infobox-title">{entity.title}</div>
                {entityType && (
                  <div className="wiki-infobox-type">{entityType.name}</div>
                )}
              </div>

              {portrait && portrait.localBlob && (
                <div className="wiki-infobox-image-box">
                  <img
                    src={URL.createObjectURL(portrait.localBlob)}
                    alt={entity.title}
                    className="wiki-infobox-image"
                  />
                  <div className="wiki-infobox-caption">Portrait of {entity.title}</div>
                </div>
              )}

              {hasProperties && (
                <table className="wiki-infobox-table">
                  <tbody>
                    {Object.entries(entity.properties!).map(([k, v]) => {
                      const label = fieldLabelMap.get(k) || k.replace(/_/g, ' ');
                      let displayVal = String(v ?? '');
                      if (Array.isArray(v)) displayVal = v.join(', ');
                      if (typeof v === 'boolean') displayVal = v ? 'Yes' : 'No';
                      return (
                        <tr key={k}>
                          <th scope="row">{label}</th>
                          <td>{displayVal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </aside>
          )}

          {/* Table of Contents: Contents [hide] */}
          {tocItems.length > 0 && (
            <nav className="wiki-toc" aria-label="Table of contents">
              <div className="wiki-toc-header">
                <span className="wiki-toc-title">Contents</span>
                <button
                  type="button"
                  className="wiki-toc-toggle"
                  onClick={() => setHideToc(!hideToc)}
                  title={hideToc ? 'Show contents' : 'Hide contents'}
                >
                  [{hideToc ? 'show' : 'hide'}]
                </button>
              </div>
              {!hideToc && (
                <ol className="wiki-toc-list">
                  {tocItems.map(item => (
                    <li key={item.id} className={`wiki-toc-item level-${item.level}`}>
                      <a
                        href={`#${item.id}`}
                        className="wiki-toc-link"
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById(item.id);
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <span className="wiki-toc-num">{item.number}</span>
                        <span className="wiki-toc-text">{item.text}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </nav>
          )}

          {/* The Actual Article Content */}
          <div className="wiki-article-body">
            {entity.article ? (
              <ArticleEditor
                content={entity.article}
                readOnly
                worldId={entity.worldId}
                currentEntityId={entity.id}
              />
            ) : (
              <div className="wiki-article-empty">
                <p className="text-muted">This entity currently has no encyclopedia article text.</p>
                <button className="btn-link" onClick={() => navigate(`/entity/${entity.id}/edit`)}>
                  Start writing this article →
                </button>
              </div>
            )}
          </div>

          <div className="wiki-clear" />
        </main>

        {/* Right Column: Exactly ONE Linked Entities Sidebar */}
        <aside className="wiki-sidebar-column">
          <LinkedEntitiesPanel entityId={entity.id} />
        </aside>
      </div>

      {/* ── 3. Secondary Sections strictly AFTER the main article ────────── */}
      {entity.demographicDatasets && entity.demographicDatasets.length > 0 && (
        <section className="wiki-secondary-section">
          <h2 className="wiki-section-heading">Demographics &amp; Statistics</h2>
          <div className="wiki-charts-stack">
            {entity.demographicDatasets.map(ds => (
              <InteractiveChart
                key={ds.id}
                dataset={ds}
                availableEntities={availableEntities}
                interactive={true}
              />
            ))}
          </div>
        </section>
      )}

      {(showFamilyTree || entity.typeId === 'et-family') && (
        <section className="wiki-secondary-section">
          <h2 className="wiki-section-heading">Genealogy &amp; Family Tree</h2>
          <FamilyTree entity={entity} worldId={entity.worldId} />
        </section>
      )}

      {images.length > 0 && (
        <section className="wiki-secondary-section">
          <h2 className="wiki-section-heading">
            <ImageIcon size={15} /> Gallery
          </h2>
          <ImageGallery images={images} />
        </section>
      )}

      {/* ── 4. Adjacent Article Pager (Wikipedia Style) ─────────────────── */}
      {(prevEntity || nextEntity) && (
        <nav className="wiki-article-pager" aria-label="Adjacent articles">
          {prevEntity ? (
            <button
              className="wiki-pager-btn prev"
              onClick={() => navigate(`/entity/${prevEntity.id}`)}
              title={`Read previous: ${prevEntity.title}`}
            >
              <ChevronLeft size={16} />
              <div className="wiki-pager-text">
                <span className="wiki-pager-sub">Previous</span>
                <span className="wiki-pager-title truncate">{prevEntity.title}</span>
              </div>
            </button>
          ) : <div />}
          {nextEntity ? (
            <button
              className="wiki-pager-btn next"
              onClick={() => navigate(`/entity/${nextEntity.id}`)}
              title={`Read next: ${nextEntity.title}`}
            >
              <div className="wiki-pager-text align-right">
                <span className="wiki-pager-sub">Next</span>
                <span className="wiki-pager-title truncate">{nextEntity.title}</span>
              </div>
              <ChevronRight size={16} />
            </button>
          ) : <div />}
        </nav>
      )}

      {/* ── 5. Categories & Technical Metadata Details Footer ─────────────── */}
      <footer className="wiki-footer">
        {entity.tags && entity.tags.length > 0 && (
          <div className="wiki-categories-box">
            <span className="wiki-categories-label">Categories:</span>
            <div className="wiki-categories-list">
              {entity.tags.map(tag => (
                <span key={tag} className="wiki-category-tag">{tag}</span>
              ))}
            </div>
          </div>
        )}

        <details className="wiki-technical-details">
          <summary className="wiki-technical-summary">Page information &amp; technical metadata</summary>
          <div className="wiki-technical-body">
            <div><span className="wiki-tech-key">Entity ID:</span> <code>{entity.id}</code></div>
            <div><span className="wiki-tech-key">Entry Number:</span> <code>{formattedNumber || 'None'}</code></div>
            <div><span className="wiki-tech-key">World:</span> <span>{worldTitle || 'None'}</span></div>
            <div><span className="wiki-tech-key">Last updated:</span> <span>{entity.updatedAt ? new Date(entity.updatedAt).toLocaleString() : 'Unknown'}</span></div>
          </div>
        </details>
      </footer>
    </div>
  );
}
