// src/components/ui/DynamicPropertyEditor.tsx
// Renders dynamic type-specific properties + custom properties with typed inputs

import { useState } from 'react';
import { Plus, Trash2, Link as LinkIcon, Calendar, CheckSquare, Hash, AlignLeft } from 'lucide-react';
import type { PropertyFieldDef, PropertyType, Entity } from '../../db/schema';
import EntitySearchSelector from './EntitySearchSelector';
import './DynamicPropertyEditor.css';

interface Props {
  fieldsSchema: PropertyFieldDef[];
  properties: Record<string, unknown>;
  onChange: (updatedProps: Record<string, unknown>) => void;
  availableEntities?: Entity[];
  worldId?: string;
  onEntityCreated?: (entity: Entity) => void;
}

export default function DynamicPropertyEditor({
  fieldsSchema,
  properties,
  onChange,
  availableEntities = [],
  worldId,
  onEntityCreated,
}: Props) {
  const [customKey, setCustomKey] = useState('');
  const [customType, setCustomType] = useState<PropertyType>('text');
  const [customVal, setCustomVal] = useState('');

  // Handle value change
  function updateValue(key: string, value: unknown) {
    const next = { ...properties, [key]: value };
    onChange(next);
  }

  function removeProperty(key: string) {
    const next = { ...properties };
    delete next[key];
    onChange(next);
  }

  function addCustomProperty() {
    const key = customKey.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (!key) return;
    let initialVal: unknown = customVal;
    if (customType === 'number') initialVal = customVal ? Number(customVal) : 0;
    if (customType === 'boolean') initialVal = false;
    if (customType === 'multiselect') initialVal = customVal ? customVal.split(',').map(s => s.trim()) : [];

    updateValue(key, initialVal);
    setCustomKey('');
    setCustomVal('');
  }

  // Schema-defined fields (ordered according to schema)
  const schemaKeys = new Set(fieldsSchema.map(f => f.key));
  // Additional custom keys not in schema
  const customKeys = Object.keys(properties).filter(k => !schemaKeys.has(k));

  function renderFieldInput(def: PropertyFieldDef, value: unknown) {
    switch (def.type) {
      case 'number':
        return (
          <input
            type="number"
            className="form-input"
            value={value !== undefined && value !== null ? Number(value) : ''}
            onChange={e => updateValue(def.key, e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder="0"
          />
        );

      case 'boolean':
        return (
          <label className="checkbox-toggle-label">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={Boolean(value)}
              onChange={e => updateValue(def.key, e.target.checked)}
            />
            <span className="checkbox-text">{value ? 'Yes / True' : 'No / False'}</span>
          </label>
        );

      case 'date':
        return (
          <input
            type="text"
            className="form-input"
            placeholder="e.g. 1042-05-12 or Year 350 of 2nd Era"
            value={typeof value === 'string' ? value : ''}
            onChange={e => updateValue(def.key, e.target.value)}
          />
        );

      case 'url':
        return (
          <input
            type="url"
            className="form-input"
            placeholder="https://..."
            value={typeof value === 'string' ? value : ''}
            onChange={e => updateValue(def.key, e.target.value)}
          />
        );

      case 'select':
        return (
          <select
            className="form-select"
            value={typeof value === 'string' ? value : ''}
            onChange={e => updateValue(def.key, e.target.value)}
          >
            <option value="">— Select an option —</option>
            {def.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'multiselect': {
        const selected = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="multiselect-tags-container">
            <div className="multiselect-chips">
              {selected.map(item => (
                <span key={item} className="prop-chip">
                  {item}
                  <button
                    type="button"
                    className="prop-chip-remove"
                    onClick={() => updateValue(def.key, selected.filter(s => s !== item))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {def.options && def.options.length > 0 && (
              <select
                className="form-select small mt-1"
                value=""
                onChange={e => {
                  if (e.target.value && !selected.includes(e.target.value)) {
                    updateValue(def.key, [...selected, e.target.value]);
                  }
                }}
              >
                <option value="">+ Add {def.label} option...</option>
                {def.options.filter(opt => !selected.includes(opt)).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>
        );
      }

      case 'entity_ref': {
        const selectedEntityId = typeof value === 'string' ? value : undefined;
        return (
          <EntitySearchSelector
            value={selectedEntityId}
            onChange={id => updateValue(def.key, id)}
            availableEntities={availableEntities}
            expectedTypeId={def.targetTypeId}
            placeholder={`Select or create ${def.label}…`}
            worldId={worldId}
            allowCreate={true}
            onEntityCreated={onEntityCreated}
          />
        );
      }

      case 'text':
      default:
        return (
          <input
            type="text"
            className="form-input"
            value={value !== undefined && value !== null ? String(value) : ''}
            placeholder={`Enter ${def.label.toLowerCase()}...`}
            onChange={e => updateValue(def.key, e.target.value)}
          />
        );
    }
  }

  return (
    <div className="dynamic-property-editor">
      {/* Schema defined fields */}
      {fieldsSchema.length > 0 && (
        <div className="schema-fields-grid">
          {fieldsSchema.map(field => {
            const val = properties[field.key];
            return (
              <div key={field.key} className="form-group schema-field-item">
                <label className="form-label">
                  <span>{field.label}</span>
                  {field.required && <span className="text-danger">*</span>}
                  <span className="field-type-tag">{field.type}</span>
                </label>
                {renderFieldInput(field, val)}
              </div>
            );
          })}
        </div>
      )}

      {/* Additional Custom Properties */}
      <div className="custom-props-section">
        <span className="custom-props-header">Custom Entity Properties</span>

        {customKeys.length > 0 ? (
          <div className="custom-props-list">
            {customKeys.map(k => (
              <div key={k} className="custom-prop-row">
                <code className="custom-prop-name">{k}</code>
                <input
                  type="text"
                  className="form-input small flex-1"
                  value={String(properties[k] ?? '')}
                  onChange={e => updateValue(k, e.target.value)}
                />
                <button
                  type="button"
                  className="icon-btn small text-danger"
                  onClick={() => removeProperty(k)}
                  title="Remove property"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="custom-props-empty">No extra custom properties added yet.</p>
        )}

        {/* Add custom property bar */}
        <div className="add-custom-prop-bar">
          <input
            type="text"
            className="form-input small"
            placeholder="Property name (e.g. eye_color)"
            value={customKey}
            onChange={e => setCustomKey(e.target.value)}
          />
          <input
            type="text"
            className="form-input small flex-1"
            placeholder="Value..."
            value={customVal}
            onChange={e => setCustomVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomProperty(); } }}
          />
          <button type="button" className="btn-secondary small" onClick={addCustomProperty}>
            <Plus size={13} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}
