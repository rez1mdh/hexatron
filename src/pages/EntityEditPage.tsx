// src/pages/EntityEditPage.tsx — create/edit entity form + dynamic schema + relationships + editor

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, Plus, Trash2, Upload, Layers, Link as LinkIcon, Settings2, Image as ImageIcon } from 'lucide-react';
import {
  getEntity, createEntity, updateEntity, getEntityTypes,
  addImage, getImages, deleteImage, updateImage, getEntities, getRelationships, createRelationship, getRelationshipTypes, getWorlds, softDeleteEntity
} from '../db/operations';
import { useAppStore } from '../store/appStore';
import { pushEntityToCloud, pushRelationshipToCloud, pushSoftDeleteEntityToCloud } from '../services/cloudSync';
import type { Entity, EntityType, CanonStatus, Relationship, RelationshipType, StatisticalDataset, EntityImage, ImageRole } from '../db/schema';
import ArticleEditor from '../editor/ArticleEditor';
import EntityTypeIcon from '../components/ui/EntityTypeIcon';
import EntityTypeModal from '../components/ui/EntityTypeModal';
import DynamicPropertyEditor from '../components/ui/DynamicPropertyEditor';
import RelationshipEditor, { type PendingRelationship } from '../components/ui/RelationshipEditor';
import DemographicDatasetEditor from '../components/ui/DemographicDatasetEditor';
import InheritanceAssistant from '../components/ui/InheritanceAssistant';
import InsertMediaModal from '../components/ui/InsertMediaModal';
import { Film } from 'lucide-react';
import './pages.css';

interface Props {
  mode?: 'create' | 'edit';
}

export default function EntityEditPage({ mode }: Props) {
  const { entityId, worldId } = useParams<{ entityId?: string; worldId?: string }>();
  const navigate = useNavigate();
  const { isOwner, currentUser } = useAppStore();
  const isEdit = mode === 'edit' || !!entityId;

  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<RelationshipType[]>([]);
  const [availableEntities, setAvailableEntities] = useState<Entity[]>([]);
  const [existingRelationships, setExistingRelationships] = useState<Relationship[]>([]);
  const [pendingRelationships, setPendingRelationships] = useState<PendingRelationship[]>([]);

  const [form, setForm] = useState<{
    title: string;
    typeId: string;
    aliases: string[];
    tags: string[];
    canonStatus: CanonStatus;
    article: string;
    properties: Record<string, unknown>;
    demographicDatasets: StatisticalDataset[];
  }>({
    title: '',
    typeId: 'et-character',
    aliases: [],
    tags: [],
    canonStatus: 'canon',
    article: '',
    properties: {},
    demographicDatasets: [],
  });

  const [aliasInput, setAliasInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [isDirty, setIsDirty] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingMedia, setExistingMedia] = useState<EntityImage[]>([]);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'properties' | 'demographics' | 'relationships' | 'media'>('details');

  // Entity Type Manager Modal state
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

  async function loadData() {
    const types = await getEntityTypes();
    setEntityTypes(types);
    const relTypes = await getRelationshipTypes();
    setRelationshipTypes(relTypes);

    if (worldId) {
      const ents = await getEntities(worldId);
      setAvailableEntities(ents);
    }
    if (entityId) {
      const media = await getImages(entityId);
      setExistingMedia(media);
    }
  }

  useEffect(() => {
    loadData();

    if (isEdit && entityId) {
      getEntity(entityId).then(async e => {
        if (!e) return;
        setForm({
          title: e.title,
          typeId: e.typeId,
          aliases: e.aliases || [],
          tags: e.tags || [],
          canonStatus: e.canonStatus,
          article: e.article ?? '',
          properties: e.properties ?? {},
          demographicDatasets: e.demographicDatasets || [],
        });
        const rels = await getRelationships(entityId);
        setExistingRelationships(rels);
        const ents = await getEntities(e.worldId);
        setAvailableEntities(ents);
      });
    }
  }, [entityId, isEdit, worldId]);

  function setField<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(f => ({ ...f, [key]: val }));
    setIsDirty(true);
  }

  // Warn user before leaving page if unsaved changes exist
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const currentType = entityTypes.find(t => t.id === form.typeId);

  function addAlias() {
    const v = aliasInput.trim();
    if (!v || form.aliases.includes(v)) return;
    setField('aliases', [...form.aliases, v]);
    setAliasInput('');
  }

  function addTag() {
    const v = tagInput.trim().toLowerCase();
    if (!v || form.tags.includes(v)) return;
    setField('tags', [...form.tags, v]);
    setTagInput('');
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!form.title.trim()) return alert('Title is required.');
    setSaving(true);
    setSaveStatus('saving');
    try {
      let wId = worldId ?? (isEdit ? (await getEntity(entityId!))?.worldId : undefined);
      if (!wId) {
        // Fallback to active store world or first existing world in database
        const { currentWorldId } = useAppStore.getState();
        wId = currentWorldId ?? (await getWorlds())[0]?.id;
      }
      if (!wId) throw new Error('No world exists yet. Please create a world first.');

      const data = {
        worldId: wId,
        typeId: form.typeId,
        title: form.title.trim(),
        aliases: form.aliases,
        tags: form.tags,
        canonStatus: form.canonStatus,
        article: form.article || undefined,
        properties: form.properties,
        demographicDatasets: form.demographicDatasets.length > 0 ? form.demographicDatasets : undefined,
      };

      let savedId: string;
      if (isEdit && entityId) {
        await updateEntity(entityId, data);
        savedId = entityId;
      } else {
        const created = await createEntity(data);
        savedId = created.id;
      }

      // Synchronize entity to cloud if owner is authenticated
      if (currentUser) {
        const fullEntity = await getEntity(savedId);
        if (fullEntity) {
          await pushEntityToCloud(fullEntity, currentUser.id);
        }
      }

      // Save pending relationships
      if (pendingRelationships.length > 0) {
        for (const p of pendingRelationships) {
          const createdRel = await createRelationship({
            fromEntityId: savedId,
            toEntityId: p.toEntityId,
            typeId: p.typeId,
            worldId: wId,
            canonStatus: p.canonStatus,
            notes: p.notes,
          });
          if (currentUser) {
            await pushRelationshipToCloud(createdRel, currentUser.id);
          }
        }
      }

      // Save portrait image if picked
      if (imageFile) {
        const blob = await imageFile.arrayBuffer().then(ab => new Blob([ab], { type: imageFile.type }));
        await addImage({
          entityId: savedId,
          role: 'portrait',
          localBlob: blob,
          mimeType: imageFile.type,
          caption: form.title,
          sortOrder: 0,
        });
      }

      setIsDirty(false);
      setSaveStatus('saved');
      navigate(`/entity/${savedId}`);
    } catch (err) {
      setSaveStatus('failed');
      alert('Save failed: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!entityId) return;
    if (!confirm(`Are you sure you want to delete "${form.title || 'this entity'}"?`)) return;
    setSaving(true);
    try {
      await softDeleteEntity(entityId);
      if (currentUser) {
        await pushSoftDeleteEntityToCloud(entityId, currentUser.id);
      }
      const wId = worldId ?? (await getEntity(entityId))?.worldId;
      if (wId) {
        navigate(`/world/${wId}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      alert('Delete failed: ' + (err as Error).message);
      setSaving(false);
    }
  }

  if (!isOwner) {
    return (
      <div className="page-container narrow" style={{ paddingTop: 60, textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--surface-raised)', padding: 32, borderRadius: 12, border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Owner Access Required</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
            This encyclopedia is currently in public read-only mode. Creating or modifying articles, entities, and relationships requires signing in as the verified owner.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn-ghost small" onClick={() => navigate(-1)}>
              Go Back
            </button>
            <button
              className="btn-primary small"
              onClick={() => navigate(entityId ? `/entity/${entityId}` : (worldId ? `/world/${worldId}` : '/'))}
            >
              View Published Content
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="entity-edit-page">
      <div className="edit-header">
        <h2 className="edit-title">{isEdit ? 'Edit Entity' : 'New Entity'}</h2>
        <div className="edit-actions">
          {/* Save Status Feedback */}
          {saveStatus === 'saving' && (
            <span className="editor-save-status saving">
              <span className="lep-status-dot" style={{ background: '#f59e0b', width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
              Saving…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="editor-save-status saved">
              <span className="lep-status-dot" style={{ background: '#10b981', width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
              Saved
            </span>
          )}
          {saveStatus === 'failed' && (
            <span className="editor-save-status failed">
              <span className="lep-status-dot" style={{ background: '#ef4444', width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
              Save Failed
            </span>
          )}

          {isEdit && (
            <button
              type="button"
              className="btn-ghost small"
              onClick={handleDelete}
              disabled={saving}
              style={{ color: '#ef4444' }}
              title="Delete this entity"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button className="btn-ghost small" onClick={() => navigate(-1)}>
            <X size={14} /> Cancel
          </button>
          <button className="btn-primary small" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : (saveStatus === 'failed' ? 'Retry Save' : 'Save Entity')}
          </button>
        </div>
      </div>

      <div className="edit-body">
        {/* Left: Metadata, Properties, and Relationships Panel */}
        <aside className="edit-meta-panel">
          {/* Subtabs for clean organization */}
          <div className="meta-subnav">
            <button
              className={`meta-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={`meta-tab-btn ${activeTab === 'properties' ? 'active' : ''}`}
              onClick={() => setActiveTab('properties')}
            >
              Properties {currentType?.defaultFields?.length ? `(${currentType.defaultFields.length})` : ''}
            </button>
            <button
              className={`meta-tab-btn ${activeTab === 'demographics' ? 'active' : ''}`}
              onClick={() => setActiveTab('demographics')}
            >
              Demographics & Charts {form.demographicDatasets.length > 0 ? `(${form.demographicDatasets.length})` : ''}
            </button>
            <button
              className={`meta-tab-btn ${activeTab === 'relationships' ? 'active' : ''}`}
              onClick={() => setActiveTab('relationships')}
            >
              Relationships {(existingRelationships.length + pendingRelationships.length) > 0 ? `(${existingRelationships.length + pendingRelationships.length})` : ''}
            </button>
            <button
              className={`meta-tab-btn ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              Media {existingMedia.length > 0 ? `(${existingMedia.length})` : ''}
            </button>
          </div>

          {activeTab === 'details' && (
            <div className="tab-pane-content">
              {/* Type selector header + Manage button */}
              <div className="form-row-header">
                <label className="form-label mb-0">Entity Type</label>
                <button
                  type="button"
                  className="btn-ghost tiny"
                  onClick={() => setIsTypeModalOpen(true)}
                  title="Manage or create custom entity categories"
                >
                  <Plus size={12} /> Manage Types
                </button>
              </div>

              <div className="type-select-grid">
                {entityTypes.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className={`type-select-btn ${form.typeId === t.id ? 'active' : ''}`}
                    style={{ '--type-color': t.color } as React.CSSProperties}
                    onClick={() => setField('typeId', t.id)}
                  >
                    <EntityTypeIcon name={t.icon} size={14} />
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>

              {/* Title */}
              <label className="form-label">Name / Title *</label>
              <input
                className="form-input"
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="e.g. Eldoria, John, Excalibur..."
              />

              {/* Aliases */}
              <label className="form-label">Aliases / Also Known As</label>
              <div className="tag-input-row">
                <input
                  className="form-input"
                  value={aliasInput}
                  onChange={e => setAliasInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addAlias()}
                  placeholder="Add alias + Enter"
                />
                <button type="button" className="btn-ghost small" onClick={addAlias}><Plus size={13}/></button>
              </div>
              <div className="chip-list">
                {form.aliases.map(a => (
                  <span key={a} className="chip">
                    {a}
                    <button type="button" onClick={() => setField('aliases', form.aliases.filter(x => x !== a))}>×</button>
                  </span>
                ))}
              </div>

              {/* Tags */}
              <label className="form-label">Tags</label>
              <div className="tag-input-row">
                <input
                  className="form-input"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  placeholder="Add tag + Enter"
                />
                <button type="button" className="btn-ghost small" onClick={addTag}><Plus size={13}/></button>
              </div>
              <div className="chip-list">
                {form.tags.map(t => (
                  <span key={t} className="chip tag-chip">
                    {t}
                    <button type="button" onClick={() => setField('tags', form.tags.filter(x => x !== t))}>×</button>
                  </span>
                ))}
              </div>

              {/* Canon status */}
              <label className="form-label">Canon Status</label>
              <select
                className="form-select"
                value={form.canonStatus}
                onChange={e => setField('canonStatus', e.target.value as CanonStatus)}
              >
                <option value="canon">Canon</option>
                <option value="provisional">Provisional</option>
                <option value="disputed">Disputed</option>
                <option value="non_canon">Non-Canon</option>
                <option value="alternate">Alternate Timeline</option>
              </select>

              {/* Portrait */}
              <label className="form-label">Portrait / Cover Image</label>
              {imagePreview && <img src={imagePreview} alt="preview" className="image-preview" />}
              <label className="btn-ghost small file-upload-btn">
                <Upload size={13}/> {imageFile ? imageFile.name : 'Choose image…'}
                <input type="file" accept="image/*" onChange={handleImagePick} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          {activeTab === 'properties' && (
            <div className="tab-pane-content">
              <DynamicPropertyEditor
                fieldsSchema={currentType?.defaultFields ?? []}
                properties={form.properties}
                onChange={props => setField('properties', props)}
                availableEntities={availableEntities}
              />
            </div>
          )}

          {activeTab === 'demographics' && (
            <div className="tab-pane-content">
              {form.typeId === 'et-character' && (
                <InheritanceAssistant
                  entityId={entityId}
                  datasets={form.demographicDatasets}
                  onApplyAncestry={datasets => setField('demographicDatasets', datasets)}
                  properties={form.properties}
                  onUpdateProperties={patch => setField('properties', { ...form.properties, ...patch })}
                />
              )}
              <DemographicDatasetEditor
                datasets={form.demographicDatasets}
                onChange={datasets => setField('demographicDatasets', datasets)}
                availableEntities={availableEntities}
                entityType={form.typeId}
              />
            </div>
          )}

          {activeTab === 'media' && (
            <div className="tab-pane-content">
              <div className="form-row-header">
                <label className="form-label mb-0">Attached Media & Videos</label>
                <button
                  type="button"
                  className="btn-ghost tiny"
                  onClick={() => setIsMediaModalOpen(true)}
                  title="Attach new image or video"
                >
                  <Plus size={12} /> Add Media
                </button>
              </div>

              {existingMedia.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <Film size={24} style={{ margin: '0 auto 6px', display: 'block', opacity: 0.5 }} />
                  <p>No media attached to this entity yet.</p>
                  <button
                    type="button"
                    className="btn-link"
                    style={{ marginTop: 6 }}
                    onClick={() => setIsMediaModalOpen(true)}
                  >
                    Attach first image or video
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {existingMedia.map(m => {
                    const isVid = m.mediaType === 'video' || m.role === 'video';
                    const src = m.localBlob ? URL.createObjectURL(m.localBlob) : (m.remoteUrl || m.remotePath);
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: 8,
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <div style={{ width: 44, height: 36, background: '#000', borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isVid ? <Film size={18} color="var(--accent)" /> : src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={18} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">
                            {m.title || m.caption || (isVid ? 'Video' : 'Image')}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Role: {m.role} • {m.isOfflineAvailable ? 'Offline Ready' : 'Remote'}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="icon-btn small"
                          style={{ color: '#ef4444' }}
                          onClick={async () => {
                            if (confirm('Delete this media attachment?')) {
                              await deleteImage(m.id);
                              if (entityId) {
                                const updated = await getImages(entityId);
                                setExistingMedia(updated);
                              }
                            }
                          }}
                          title="Delete media"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Right: article editor */}
        <div className="edit-article-panel">
          <label className="form-label">Wiki Article</label>
          <div className="editor-wrapper">
            <ArticleEditor
              content={form.article}
              onChange={json => setField('article', json)}
              worldId={worldId}
              placeholder={`Write about ${form.title || 'this entity'}…\n\nTip: Type [[ to link to another entity.`}
            />
          </div>
        </div>
      </div>

      {/* Entity Type Manager Modal */}
      <EntityTypeModal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        entityTypes={entityTypes}
        onTypesChanged={loadData}
        initialSelectedTypeId={form.typeId}
      />

      {/* Insert / Attach Media Modal */}
      <InsertMediaModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSaveMedia={async (data) => {
          if (!entityId) {
            alert('Please save the entity first before attaching media.');
            return;
          }
          await addImage({
            entityId,
            role: data.role,
            caption: data.caption,
            title: data.title,
            description: data.description,
            mediaType: data.mediaType,
            localBlob: data.file,
            remoteUrl: data.remoteUrl,
            sortOrder: existingMedia.length,
          });
          const updated = await getImages(entityId);
          setExistingMedia(updated);
        }}
      />
    </div>
  );
}
