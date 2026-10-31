// src/pages/EntityPage.tsx — Wikipedia-style article-first encyclopedia layout

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Edit2, Trash2, Image as ImageIcon, GitBranch, Compass, FileText,
  ChevronLeft, ChevronRight, ChevronDown, Film, Clock, Star, BookOpen, List,
  Minimize2, Columns, ZoomIn, ZoomOut, Sliders, Folder, Layers
} from 'lucide-react';
import {
  getEntity, getEntityTypes, getImages, softDeleteEntity,
  getWorld, getEntities, formatEntryNumber, getParentEntity, getChildEntities
} from '../db/operations';
import { useAppStore } from '../store/appStore';
import { entityService } from '../services/entityService';
import { pushSoftDeleteEntityToCloud } from '../services/cloudSync';
import type { Entity, EntityType, EntityImage } from '../db/schema';
import ArticleEditor from '../editor/ArticleEditor';
import CanonBadge from '../components/ui/CanonBadge';
import MediaGallery from '../components/ui/MediaGallery';
import InteractiveChart from '../components/ui/InteractiveChart';
import FamilyTree from '../components/ui/FamilyTree';
import TableOfContents, { type TocItem } from '../components/ui/TableOfContents';
import MultiArticleWorkspace from '../components/workspace/MultiArticleWorkspace';
import { formatFullDate, formatRelativeTime, formatDateTime } from '../utils/dateFormatter';
import './pages.css';

interface Props {
  overrideEntityId?: string;
  isSecondaryPane?: boolean;
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

export default function EntityPage({ overrideEntityId, isSecondaryPane = false }: Props = {}) {
  const { entityId: paramEntityId } = useParams<{ entityId: string }>();
  const entityId = overrideEntityId || paramEntityId;
  const navigate = useNavigate();
  const {
    setCurrentEntity, pushRecentEntity, isOwner, currentUser,
    favoriteEntityIds, toggleFavoriteEntity,
    readerMode, toggleReaderMode,
    splitViewEnabled, splitSecondaryId, splitRatio, setSplitRatio,
    tabs
  } = useAppStore();

  const [entity, setEntity] = useState<Entity | null>(null);
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [images, setImages] = useState<EntityImage[]>([]);
  const [worldTitle, setWorldTitle] = useState('');
  const [availableEntities, setAvailableEntities] = useState<Entity[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [showFamilyTree, setShowFamilyTree] = useState(false);
  const [hideToc, setHideToc] = useState(false);
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);
  const [readerFontSize, setReaderFontSize] = useState<'normal' | 'large' | 'huge'>('normal');
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [parentEntity, setParentEntity] = useState<Entity | null>(null);
  const [childEntities, setChildEntities] = useState<Entity[]>([]);

  const isDraggingSplitRef = useRef(false);

  // Auto-minimize mobile article actions panel on scroll down
  useEffect(() => {
    const mainEl = document.querySelector('.app-main');
    if (!mainEl) return;

    let lastScrollTop = mainEl.scrollTop;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollTop = mainEl ? mainEl.scrollTop : 0;
          const delta = currentScrollTop - lastScrollTop;

          // If mobile actions panel is open and user scrolled downward, auto-minimize
          // (delta > 8 means scrolling down; scrolling up has delta < 0 and will NOT expand)
          if (isMobileActionsOpen && delta > 8 && currentScrollTop > 20) {
            setIsMobileActionsOpen(false);
          }

          lastScrollTop = currentScrollTop;
          ticking = false;
        });
        ticking = true;
      }
    };

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, [isMobileActionsOpen]);

  // Collapse mobile actions panel whenever entity changes
  useEffect(() => {
    setIsMobileActionsOpen(false);
  }, [entityId]);

  // Close mobile actions on click outside
  useEffect(() => {
    if (!isMobileActionsOpen) return;
    const handleDocumentClick = (e: MouseEvent) => {
      const headerMeta = document.querySelector('.wiki-sticky-header-meta');
      if (headerMeta && !headerMeta.contains(e.target as Node)) {
        setIsMobileActionsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleDocumentClick);
    return () => document.removeEventListener('pointerdown', handleDocumentClick);
  }, [isMobileActionsOpen]);

  const handleActionClick = (actionFn?: () => void) => {
    setIsMobileActionsOpen(false);
    if (actionFn) actionFn();
  };

  useEffect(() => {
    if (!entityId) return;
    if (!isSecondaryPane) {
      setCurrentEntity(entityId);
      pushRecentEntity(entityId);
    }

    entityService.getEntity(entityId)
      .then(async res => {
        if (!res.success) {
          setNotFound(true);
          return;
        }

        const { entity: e, type: t, world: w, parent, children, images: imgs } = res.data;
        setEntity(e);
        if (e.typeId === 'et-family') {
          setShowFamilyTree(true);
        }
        setEntityType(t);
        setWorldTitle(w?.title ?? '');
        setParentEntity(parent);
        setChildEntities(children);
        setImages(imgs);

        // Load all entities for backlinks and cross-references
        const allEnts = await getEntities(e.worldId);
        setAvailableEntities(allEnts);
      })
      .catch(err => {
        console.error('Failed to load entity via entityService:', err);
        setNotFound(true);
      });
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

  const childSectionTitle = useMemo(() => {
    if (!entity) return 'Subdivisions & Child Entities';
    if (entity.typeId === 'et-continent') return 'Sovereign Realms & Continental Nations';
    if (entity.typeId === 'et-nation') return 'Autonomous Governorates & Territories';
    if (entity.typeId === 'et-governorate') return 'Constituent Federal States';
    if (entity.typeId === 'et-state') return 'Cities, Settlements & Districts';
    if (entity.typeId === 'et-family') return 'Members, Heirs & Dynasty Branches';
    if (entity.typeId === 'et-organization') return 'Departments, Chambers & Affiliated Bodies';
    return 'Subdivisions & Direct Components';
  }, [entity]);

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

  const handleDelete = useCallback(async () => {
    if (!entity) return;
    if (!confirm(`Delete "${entity.title}"?`)) return;
    const worldId = entity.worldId;
    const res = await entityService.deleteEntity(entity.id, currentUser?.id);
    if (res.success) {
      if (worldId) {
        navigate(`/world/${worldId}`);
      } else {
        navigate('/');
      }
    } else {
      alert(`Failed to delete entity: ${res.error.message}`);
    }
  }, [entity, currentUser, navigate]);

  // Listen for desktop toolbar custom event triggers
  useEffect(() => {
    const handleToggleTree = () => setShowFamilyTree(prev => !prev);
    const handleDeleteEvent = () => handleDelete();
    window.addEventListener('hexatron-toggle-family-tree', handleToggleTree);
    window.addEventListener('hexatron-delete-entity', handleDeleteEvent);
    return () => {
      window.removeEventListener('hexatron-toggle-family-tree', handleToggleTree);
      window.removeEventListener('hexatron-delete-entity', handleDeleteEvent);
    };
  }, [handleDelete]);

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
  const isFavorite = favoriteEntityIds.includes(entity.id);

  // If Split View is active, render dual panes
  if (splitViewEnabled && splitSecondaryId && !isSecondaryPane) {
    return (
      <div className="split-view-wrapper" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <MultiArticleWorkspace
          currentEntityId={entity.id}
          currentTitle={entity.title}
          currentTypeId={entity.typeId}
        />
        <div className="split-view-container" style={{ flex: 1, minHeight: 0 }}>
          <div className="split-pane primary" style={{ flex: `0 0 ${splitRatio}%` }}>
            <EntityPage isSecondaryPane={true} overrideEntityId={entity.id} />
          </div>
          <div
            className="split-divider"
            onMouseDown={() => {
              isDraggingSplitRef.current = true;
              document.body.style.userSelect = 'none';
              document.body.style.cursor = 'col-resize';
            }}
          />
          <div className="split-pane secondary" style={{ flex: `0 0 ${100 - splitRatio}%` }}>
            <EntityPage isSecondaryPane={true} overrideEntityId={splitSecondaryId} />
          </div>
        </div>
      </div>
    );
  }

  const hasWorkspaceTabs = isOwner && !isSecondaryPane && !readerMode && (tabs.length > 1 || splitViewEnabled);

  return (
    <div
      className={`entity-page-container ${hasWorkspaceTabs ? 'has-workspace-tabs' : 'no-workspace-tabs'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        '--sticky-meta-offset': hasWorkspaceTabs ? '36px' : '0px',
      } as React.CSSProperties}
    >
      {/* Workspace Tab Strip (for owner, hidden in clean reader mode) */}
      {!isSecondaryPane && !readerMode && (
        <MultiArticleWorkspace
          currentEntityId={entity.id}
          currentTitle={entity.title}
          currentTypeId={entity.typeId}
        />
      )}

      <div
        className={`wiki-article-page ${readerMode ? 'reader-mode' : ''}`}
        data-size={readerFontSize}
        style={{ flex: 1, minHeight: 0 }}
      >
        {/* Reader Mode Top Bar (when reading mode is active) */}
        {readerMode && (
          <div className="reader-toolbar">
            <div className="reader-toolbar-left">
              <span className="reader-mode-pill">Reader Mode</span>
              <button
                type="button"
                className="btn-ghost tiny reader-size-btn"
                onClick={() => setReaderFontSize(f => f === 'normal' ? 'large' : f === 'large' ? 'huge' : 'normal')}
                title="Toggle text size"
                aria-label="Toggle text size"
              >
                <span className="reader-size-a">A</span>
                <span className="reader-size-label">{readerFontSize === 'normal' ? 'Standard' : readerFontSize === 'large' ? 'Large' : 'Largest'}</span>
              </button>
              {tocItems.length >= 2 && (
                <button
                  type="button"
                  className="btn-ghost tiny reader-toc-btn"
                  onClick={() => setIsMobileTocOpen(true)}
                  title="Jump to section"
                  aria-label="Table of contents"
                >
                  <List size={13} />
                  <span className="reader-toc-label">Contents ({tocItems.length})</span>
                </button>
              )}
            </div>
            <div className="reader-toolbar-right">
              <button
                type="button"
                className="btn-primary tiny reader-exit-btn"
                onClick={toggleReaderMode}
                title="Exit clean reading mode"
              >
                Exit Reader
              </button>
            </div>
          </div>
        )}

        {/* ── 1. Sticky Navigation & Article Meta Bar ──────────────────────── */}
        <div className={`wiki-sticky-header-meta ${isMobileActionsOpen ? 'mobile-actions-open' : ''}`}>
          <div className="wiki-breadcrumbs">
            <div className="wiki-nav-arrows">
              <button
                className="wiki-nav-arrow-btn"
                onClick={() => prevEntity ? navigate(`/entity/${prevEntity.id}`) : navigate(-1)}
                title={prevEntity ? `Previous entity: ${prevEntity.title}` : 'Go back'}
                aria-label="Previous entity"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                className="wiki-nav-arrow-btn"
                onClick={() => nextEntity ? navigate(`/entity/${nextEntity.id}`) : navigate(1)}
                title={nextEntity ? `Next entity: ${nextEntity.title}` : 'Go forward'}
                aria-label="Next entity"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            {worldTitle && <span className="wiki-breadcrumb-item">{worldTitle}</span>}
            {worldTitle && <span className="wiki-breadcrumb-sep">/</span>}
            {parentEntity && (
              <>
                <button
                  type="button"
                  className="wiki-breadcrumb-parent-link"
                  onClick={() => navigate(`/entity/${parentEntity.id}`)}
                  title={`Part of: ${parentEntity.title}`}
                >
                  <Folder size={11} className="mr-1 inline-block" />
                  <span>{parentEntity.title}</span>
                </button>
                <span className="wiki-breadcrumb-sep">/</span>
              </>
            )}
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

            {/* Creation & Last Edited Timestamps */}
            {(entity.createdAt || entity.updatedAt) && (
              <div
                className="wiki-timestamps-badge"
                title={`${entity.createdAt ? `Created: ${formatDateTime(entity.createdAt)}\n` : ''}${entity.updatedAt ? `Last edited: ${formatDateTime(entity.updatedAt)}` : ''}`}
              >
                <Clock size={11} className="wiki-timestamp-icon" />
                <span className="wiki-timestamp-text">
                  <span className="wiki-ts-created">{entity.createdAt ? `Created ${formatFullDate(entity.createdAt)}` : ''}</span>
                  {entity.createdAt && entity.updatedAt ? <span className="wiki-ts-sep"> · </span> : ''}
                  <span className="wiki-ts-edited">{entity.updatedAt ? `Edited ${formatRelativeTime(entity.updatedAt)}` : ''}</span>
                </span>
              </div>
            )}
          </div>

          {/* Minimized Mobile Action Handle / Toggle (Mobile only <= 768px, hidden on desktop and in reader mode) */}
          <button
            type="button"
            className={`wiki-mobile-actions-toggle ${isMobileActionsOpen ? 'active' : ''}`}
            onClick={() => setIsMobileActionsOpen(v => !v)}
            aria-expanded={isMobileActionsOpen}
            aria-label={isMobileActionsOpen ? 'Collapse article actions' : 'Expand article actions'}
            title="Article actions"
          >
            <Sliders size={13} />
            <span className="wiki-mobile-actions-toggle-text">Actions</span>
            <ChevronDown
              size={13}
              className={`wiki-mobile-actions-chevron ${isMobileActionsOpen ? 'rotated' : ''}`}
            />
          </button>

          <div className={`wiki-header-actions ${isMobileActionsOpen ? 'mobile-open' : 'mobile-minimized'}`}>
            {/* Clean Reading Mode Toggle */}
            <button
              type="button"
              className={`wiki-action-tab ${readerMode ? 'active text-accent' : ''}`}
              onClick={() => handleActionClick(toggleReaderMode)}
              title={readerMode ? 'Exit clean reading mode' : 'Switch to clean reading mode'}
            >
              <BookOpen size={13} /> Reader
            </button>

            {/* Favorite Star Button (Owner only) */}
            {isOwner && (
              <button
                type="button"
                className={`wiki-action-tab ${isFavorite ? 'favorited active' : ''}`}
                onClick={() => {
                  toggleFavoriteEntity(entity.id);
                  setIsMobileActionsOpen(false);
                }}
                title={isFavorite ? 'Remove from favorites' : 'Pin to favorites'}
                aria-label={isFavorite ? 'Remove from favorites' : 'Pin to favorites'}
              >
                <Star
                  size={13}
                  fill={isFavorite ? '#f59e0b' : 'none'}
                  color={isFavorite ? '#f59e0b' : 'currentColor'}
                />
                <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
              </button>
            )}

            <button
              type="button"
              className="wiki-action-tab active hide-in-reader"
              onClick={() => handleActionClick()}
              title="Article view"
            >
              <FileText size={13} /> Article
            </button>
            {isOwner && (
              <button
                type="button"
                className="wiki-action-tab hide-in-reader"
                onClick={() => handleActionClick(() => navigate(`/entity/${entity.id}/edit`))}
                title="Edit this article"
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
            <button
              type="button"
              className="wiki-action-tab hide-in-reader"
              onClick={() => handleActionClick(() => navigate(`/entity/${entity.id}/graph`))}
              title="View in Network Graph"
            >
              <Compass size={13} /> Graph
            </button>
            {(entity.typeId === 'et-family' || entity.typeId === 'et-character') && (
              <button
                type="button"
                className={`wiki-action-tab hide-in-reader ${showFamilyTree ? 'active' : ''}`}
                onClick={() => handleActionClick(() => setShowFamilyTree(!showFamilyTree))}
                title="Toggle visual family tree"
              >
                <GitBranch size={13} /> Family Tree
              </button>
            )}
            {isOwner && (
              <button
                type="button"
                className="wiki-action-tab danger hide-in-reader"
                onClick={() => handleActionClick(handleDelete)}
                title="Delete entity"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>
        </div>

      <header className="wiki-header">
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

      {/* ── 2. Primary Article Layout ───────────────────────────────────── */}
      <article className="wiki-main-column">
        {/* Wikipedia Infobox floating on the top-right of the article */}
          {((portrait && portrait.localBlob) || hasProperties || parentEntity) && (
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

              {(hasProperties || parentEntity) && (
                <table className="wiki-infobox-table">
                  <tbody>
                    {parentEntity && (
                      <tr className="wiki-infobox-parent-row">
                        <th scope="row">Part of</th>
                        <td>
                          <button
                            type="button"
                            className="wiki-infobox-link-btn"
                            onClick={() => navigate(`/entity/${parentEntity.id}`)}
                            title={`Navigate to parent: ${parentEntity.title}`}
                          >
                            {parentEntity.title}
                          </button>
                        </td>
                      </tr>
                    )}
                    {hasProperties && Object.entries(entity.properties!).map(([k, v]) => {
                      if (k === 'parentId' || k === 'parent_id' || k === 'part_of') return null;
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

          {/* Automatic Table of Contents with active heading tracking & smooth scrolling */}
          {tocItems.length >= 2 && (
            <TableOfContents
              items={tocItems}
              collapsed={hideToc}
              onToggleCollapsed={() => setHideToc(!hideToc)}
            />
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
      </article>

      {/* ── 3. Secondary Sections strictly AFTER the main article ────────── */}
      {/* ── Direct Child Entities / Subdivisions (Wikipedia Style) ─────── */}
      {childEntities.length > 0 && (
        <section className="wiki-secondary-section wiki-children-section">
          <h2 className="wiki-section-heading">
            <Layers size={15} /> {childSectionTitle} ({childEntities.length})
          </h2>
          <div className="wiki-children-grid">
            {childEntities.map(child => {
              const childFormattedNum = formatEntryNumber(child.entryNumber);
              return (
                <div
                  key={child.id}
                  className="wiki-child-card"
                  onClick={() => navigate(`/entity/${child.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') navigate(`/entity/${child.id}`); }}
                  title={`Read article: ${child.title}`}
                >
                  <div className="wiki-child-card-top">
                    <span className="wiki-child-card-type">{child.typeId.replace('et-', '')}</span>
                    {childFormattedNum && (
                      <span className="wiki-child-card-num">{childFormattedNum}</span>
                    )}
                  </div>
                  <h3 className="wiki-child-card-title">{child.title}</h3>
                  {child.properties && typeof child.properties.capital === 'string' && (
                    <div className="wiki-child-card-meta">
                      <span className="meta-lbl">Capital:</span> {child.properties.capital}
                    </div>
                  )}
                  {child.properties && typeof child.properties.population === 'string' && (
                    <div className="wiki-child-card-meta">
                      <span className="meta-lbl">Pop:</span> {child.properties.population}
                    </div>
                  )}
                  {child.properties && typeof child.properties.rulingCluster === 'string' && (
                    <div className="wiki-child-card-meta">
                      <span className="meta-lbl">Ruling:</span> {child.properties.rulingCluster}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

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
            <Film size={15} /> Media &amp; Visuals ({images.length})
          </h2>
          <MediaGallery images={images} onRefresh={() => entityId && getImages(entityId).then(setImages)} />
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

      {/* Mobile floating Table of Contents trigger & bottom-sheet */}
      {tocItems.length >= 2 && (
        <>
          <button
            type="button"
            className="mobile-toc-fab"
            onClick={() => setIsMobileTocOpen(true)}
            title="Table of Contents"
            aria-label="Table of Contents"
          >
            <List size={15} />
            <span>Contents</span>
          </button>

          <TableOfContents
            items={tocItems}
            isMobileDrawer
            isOpenMobile={isMobileTocOpen}
            onCloseMobile={() => setIsMobileTocOpen(false)}
          />
        </>
      )}
    </div>
  </div>
  );
}
