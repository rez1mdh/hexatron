// src/components/ui/EntityTypeModal.tsx
// Global Entity Type Manager modal: Create, edit, configure fields, safe delete

import { useState } from 'react';
import { X, Plus, Trash2, ShieldAlert, Check } from 'lucide-react';
import type { EntityType, PropertyFieldDef, PropertyType } from '../../db/schema';
import { createEntityType, updateEntityType, deleteEntityType, countEntitiesUsingType } from '../../db/operations';
import EntityTypeIcon, { AVAILABLE_ICONS } from './EntityTypeIcon';
import './EntityTypeModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entityTypes: EntityType[];
  onTypesChanged: () => void;
  initialSelectedTypeId?: string;
}

const COLOR_PALETTE = [
  '#7c6af7', '#4f9ef7', '#4ff7c8', '#6af7c8', '#a1f74f',
  '#f7a14f', '#f75f5f', '#f74fa1', '#e07cf7', '#a14ff7',
  '#f7d44f', '#f7f74f', '#4ff7f7', '#94a3b8', '#cbd5e1'
];

export default function EntityTypeModal({ isOpen, onClose, entityTypes, onTypesChanged, initialSelectedTypeId }: Props) {
  const [editingType, setEditingType] = useState<EntityType | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#7c6af7');
  const [icon, setIcon] = useState('User');
  const [defaultFields, setDefaultFields] = useState<PropertyFieldDef[]>([]);

  // New field row inputs
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<PropertyType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [inUseWarning, setInUseWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  function handleStartCreate() {
    setIsCreatingNew(true);
    setEditingType(null);
    setName('');
    setId('');
    setDescription('');
    setColor('#7c6af7');
    setIcon('Crown');
    setDefaultFields([]);
    setError(null);
    setInUseWarning(null);
  }

  function handleStartEdit(type: EntityType) {
    setIsCreatingNew(false);
    setEditingType(type);
    setName(type.name);
    setId(type.id);
    setDescription(type.description || '');
    setColor(type.color || '#7c6af7');
    setIcon(type.icon || 'User');
    setDefaultFields(type.defaultFields ? [...type.defaultFields] : []);
    setError(null);
    setInUseWarning(null);
  }

  function autoGenerateId(inputName: string) {
    if (!isCreatingNew) return;
    const slug = 'et-' + inputName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setId(slug);
  }

  function handleAddField() {
    if (!newFieldLabel.trim()) return;
    const key = newFieldKey.trim() || newFieldLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');
    if (defaultFields.some(f => f.key === key)) {
      setError(`Field key "${key}" already exists.`);
      return;
    }
    const options = (newFieldType === 'select' || newFieldType === 'multiselect')
      ? newFieldOptions.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    setDefaultFields([...defaultFields, {
      key,
      label: newFieldLabel.trim(),
      type: newFieldType,
      options,
    }]);

    setNewFieldKey('');
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
    setError(null);
  }

  function handleRemoveField(index: number) {
    setDefaultFields(defaultFields.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) { setError('Type name is required.'); return; }
    if (!id.trim()) { setError('Internal identifier is required.'); return; }

    setSaving(true);
    try {
      if (isCreatingNew) {
        await createEntityType({
          id: id.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          icon,
          defaultFields,
        });
      } else if (editingType) {
        await updateEntityType(editingType.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          color,
          icon,
          defaultFields,
        });
      }
      onTypesChanged();
      setIsCreatingNew(false);
      setEditingType(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(type: EntityType) {
    if (type.isBuiltIn) {
      alert('Built-in entity types cannot be deleted to preserve core schema integrity.');
      return;
    }
    const count = await countEntitiesUsingType(type.id);
    if (count > 0) {
      setInUseWarning(`Cannot delete "${type.name}": There are currently ${count} active entity record(s) using this type. Reassign or delete those entities first.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete custom type "${type.name}" (${type.id})?`)) {
      return;
    }

    try {
      await deleteEntityType(type.id);
      onTypesChanged();
      if (editingType?.id === type.id) {
        setEditingType(null);
        setIsCreatingNew(false);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="entity-type-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 className="modal-title">Entity Type Manager</h2>
            <span className="modal-subtitle">Define and customize entity categories and default properties</span>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {inUseWarning && (
          <div className="alert-warning">
            <ShieldAlert size={16} />
            <span>{inUseWarning}</span>
            <button className="btn-link" onClick={() => setInUseWarning(null)}>Dismiss</button>
          </div>
        )}

        {error && (
          <div className="alert-error">
            <span>{error}</span>
            <button className="btn-link" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <div className="modal-body-split">
          {/* Left panel: List of types */}
          <div className="type-list-pane">
            <div className="type-list-pane-header">
              <span className="section-label">All Categories ({entityTypes.length})</span>
              <button className="btn-primary small" onClick={handleStartCreate}>
                <Plus size={13} /> New Type
              </button>
            </div>

            <div className="type-item-scroll">
              {entityTypes.map(t => {
                const isSelected = (editingType?.id === t.id) || (!editingType && !isCreatingNew && initialSelectedTypeId === t.id);
                return (
                  <div
                    key={t.id}
                    className={`type-row-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleStartEdit(t)}
                  >
                    <span className="type-dot" style={{ backgroundColor: t.color }} />
                    <EntityTypeIcon name={t.icon} size={15} color={t.color} />
                    <div className="type-row-text">
                      <span className="type-row-name">{t.name}</span>
                      <span className="type-row-id">{t.id}</span>
                    </div>
                    {t.isBuiltIn && <span className="builtin-badge">Built-in</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: Editor / Creator form */}
          <div className="type-form-pane">
            {isCreatingNew || editingType ? (
              <div className="type-editor-form">
                <h3 className="pane-title">
                  {isCreatingNew ? 'Create Custom Entity Type' : `Edit "${editingType?.name}"`}
                </h3>

                <div className="form-group-grid">
                  <div className="form-field">
                    <label className="field-label">Display Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={name}
                      placeholder="e.g. Family, Weapon, Empire..."
                      onChange={e => { setName(e.target.value); autoGenerateId(e.target.value); }}
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">Internal Identifier *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={id}
                      disabled={!isCreatingNew}
                      placeholder="e.g. et-weapon"
                      onChange={e => setId(e.target.value)}
                    />
                    {!isCreatingNew && <span className="field-help">Stable ID cannot be changed to prevent broken database references.</span>}
                  </div>
                </div>

                <div className="form-field">
                  <label className="field-label">Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={description}
                    placeholder="Short description of this category..."
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group-grid">
                  <div className="form-field">
                    <label className="field-label">Color Accent</label>
                    <div className="color-swatches">
                      {COLOR_PALETTE.map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`color-swatch ${color === c ? 'active' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setColor(c)}
                        />
                      ))}
                      <input
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="color-picker-input"
                        title="Custom hex color"
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="field-label">Icon</label>
                    <div className="icon-selector-scroll">
                      {AVAILABLE_ICONS.map(i => (
                        <button
                          key={i}
                          type="button"
                          className={`icon-choice-btn ${icon === i ? 'active' : ''}`}
                          onClick={() => setIcon(i)}
                          title={i}
                        >
                          <EntityTypeIcon name={i} size={16} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Default property schema manager */}
                <div className="schema-section">
                  <div className="schema-section-header">
                    <div>
                      <h4 className="schema-section-title">Default Property Schema</h4>
                      <p className="schema-section-desc">
                        Properties automatically suggested on creation for entities of this type.
                      </p>
                    </div>
                  </div>

                  <div className="field-defs-list">
                    {defaultFields.length === 0 && (
                      <p className="fields-empty">No default properties defined yet for this type.</p>
                    )}
                    {defaultFields.map((f, idx) => (
                      <div key={f.key} className="field-def-row">
                        <span className="field-def-label">{f.label}</span>
                        <code className="field-def-key">{f.key}</code>
                        <span className="field-def-type">{f.type}</span>
                        {f.options && f.options.length > 0 && (
                          <span className="field-def-options">[{f.options.join(', ')}]</span>
                        )}
                        <button
                          type="button"
                          className="icon-btn small text-danger"
                          onClick={() => handleRemoveField(idx)}
                          title="Remove field"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new field row */}
                  <div className="add-field-row">
                    <input
                      type="text"
                      className="form-input small"
                      placeholder="Label (e.g. Weight)"
                      value={newFieldLabel}
                      onChange={e => setNewFieldLabel(e.target.value)}
                    />
                    <select
                      className="form-select small"
                      value={newFieldType}
                      onChange={e => setNewFieldType(e.target.value as PropertyType)}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                      <option value="url">URL</option>
                      <option value="select">Single-select</option>
                      <option value="multiselect">Multi-select</option>
                      <option value="entity_ref">Entity Reference</option>
                    </select>
                    {(newFieldType === 'select' || newFieldType === 'multiselect') && (
                      <input
                        type="text"
                        className="form-input small flex-1"
                        placeholder="Comma-separated options"
                        value={newFieldOptions}
                        onChange={e => setNewFieldOptions(e.target.value)}
                      />
                    )}
                    <button type="button" className="btn-secondary small" onClick={handleAddField}>
                      <Plus size={13} /> Add Field
                    </button>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="form-action-row">
                  {editingType && !editingType.isBuiltIn && (
                    <button
                      type="button"
                      className="btn-danger small"
                      onClick={() => handleDelete(editingType)}
                    >
                      <Trash2 size={13} /> Delete Type
                    </button>
                  )}
                  <div className="spacer" />
                  <button
                    type="button"
                    className="btn-ghost small"
                    onClick={() => { setEditingType(null); setIsCreatingNew(false); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-primary small"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    <Check size={14} /> {isCreatingNew ? 'Create Type' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="type-pane-placeholder">
                <p>Select an entity type from the list to view or edit, or click <strong>New Type</strong> to define a custom category.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
