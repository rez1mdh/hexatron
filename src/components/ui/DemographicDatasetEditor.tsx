// src/components/ui/DemographicDatasetEditor.tsx
// Editor for Ancestry Composition, Population Demographics, Language speakers, and historical statistics

import { useState } from 'react';
import { Plus, Trash2, PieChart, BarChart2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { StatisticalDataset, DemographicEntry, ChartType, Entity } from '../../db/schema';
import InteractiveChart from './InteractiveChart';
import './DemographicDatasetEditor.css';

interface Props {
  datasets: StatisticalDataset[];
  onChange: (datasets: StatisticalDataset[]) => void;
  availableEntities?: Entity[];
  entityType?: string; // e.g. "et-character", "et-nation", "et-language"
}

export default function DemographicDatasetEditor({
  datasets = [],
  onChange,
  availableEntities = [],
  entityType = '',
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(datasets[0]?.id || null);

  // Suggested dataset templates based on entity type
  const isCharacter = entityType === 'et-character';
  const isNation = entityType === 'et-nation';
  const isLanguage = entityType === 'et-language';

  function handleAddDataset(category: StatisticalDataset['category'], title: string, isMutuallyExclusive = true) {
    const newDs: StatisticalDataset = {
      id: 'ds-' + Date.now(),
      title,
      category,
      chartType: isMutuallyExclusive ? 'donut' : 'bar',
      isMutuallyExclusive,
      entries: [],
    };
    const next = [...datasets, newDs];
    onChange(next);
    setExpandedId(newDs.id);
  }

  function handleRemoveDataset(id: string) {
    if (!confirm('Remove this dataset?')) return;
    onChange(datasets.filter(d => d.id !== id));
  }

  function updateDataset(id: string, patch: Partial<StatisticalDataset>) {
    onChange(datasets.map(d => d.id === id ? { ...d, ...patch } : d));
  }

  function handleAddEntry(datasetId: string, name: string, percentage?: number, count?: number, entityId?: string) {
    const ds = datasets.find(d => d.id === datasetId);
    if (!ds) return;
    const newEntry: DemographicEntry = {
      id: 'entry-' + Date.now(),
      name: name.trim() || 'New Category',
      percentage,
      count,
      entityId: entityId || undefined,
    };
    updateDataset(datasetId, { entries: [...ds.entries, newEntry] });
  }

  function handleRemoveEntry(datasetId: string, entryId: string) {
    const ds = datasets.find(d => d.id === datasetId);
    if (!ds) return;
    updateDataset(datasetId, { entries: ds.entries.filter(e => e.id !== entryId) });
  }

  function handleUpdateEntry(datasetId: string, entryId: string, patch: Partial<DemographicEntry>) {
    const ds = datasets.find(d => d.id === datasetId);
    if (!ds) return;
    updateDataset(datasetId, {
      entries: ds.entries.map(e => e.id === entryId ? { ...e, ...patch } : e)
    });
  }

  return (
    <div className="demographic-dataset-editor">
      {/* Quick Add action buttons */}
      <div className="dataset-quick-add-bar">
        <span className="quick-add-label">+ Add Dataset:</span>
        {isCharacter && (
          <button
            type="button"
            className="btn-ghost small"
            onClick={() => handleAddDataset('ancestry', 'Ancestry Composition', true)}
          >
            Ancestry Composition
          </button>
        )}
        {isNation && (
          <>
            <button
              type="button"
              className="btn-ghost small"
              onClick={() => handleAddDataset('ethnicity', 'Ethnic Demographics', true)}
            >
              Ethnic Composition
            </button>
            <button
              type="button"
              className="btn-ghost small"
              onClick={() => handleAddDataset('language', 'Languages Spoken', false)}
            >
              Languages Spoken
            </button>
            <button
              type="button"
              className="btn-ghost small"
              onClick={() => handleAddDataset('religion', 'Religious Demographics', true)}
            >
              Religious Composition
            </button>
          </>
        )}
        {isLanguage && (
          <button
            type="button"
            className="btn-ghost small"
            onClick={() => handleAddDataset('language', 'Speakers by Country', false)}
          >
            Speakers by Territory
          </button>
        )}
        <button
          type="button"
          className="btn-ghost small"
          onClick={() => handleAddDataset('custom', 'Custom Historical Statistics', false)}
        >
          Custom Dataset
        </button>
      </div>

      {datasets.length === 0 ? (
        <div className="datasets-empty-box">
          <p>No demographic or historical statistical datasets added yet.</p>
          <span className="text-muted text-sm">
            You can add optional ancestry breakdowns, ethnic compositions, language statistics, or historical charts.
          </span>
        </div>
      ) : (
        <div className="datasets-accordion">
          {datasets.map(ds => {
            const isExpanded = expandedId === ds.id;
            const totalPct = ds.entries.reduce((sum, e) => sum + (e.percentage || 0), 0);
            const isWarn = ds.isMutuallyExclusive && totalPct > 0 && Math.abs(totalPct - 100) > 0.05;

            return (
              <div key={ds.id} className="dataset-card">
                {/* Header */}
                <div
                  className="dataset-card-header"
                  onClick={() => setExpandedId(isExpanded ? null : ds.id)}
                >
                  <div className="dataset-header-left">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span className="dataset-title-text">{ds.title}</span>
                    <span className="dataset-badge">{ds.category}</span>
                    {ds.year && <span className="dataset-year-badge">Year: {ds.year}</span>}
                    {isWarn && (
                      <span className="dataset-warn-pill">
                        ⚠️ Total: {totalPct.toFixed(1)}% (Incomplete draft)
                      </span>
                    )}
                  </div>

                  <div className="dataset-header-actions" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      className="icon-btn small text-danger"
                      onClick={() => handleRemoveDataset(ds.id)}
                      title="Remove dataset"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded Editor Body */}
                {isExpanded && (
                  <div className="dataset-card-body">
                    <div className="dataset-meta-grid">
                      <div className="form-field">
                        <label className="field-label-tiny">Dataset Title</label>
                        <input
                          type="text"
                          className="form-input small"
                          value={ds.title}
                          onChange={e => updateDataset(ds.id, { title: e.target.value })}
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label-tiny">Chart Type</label>
                        <select
                          className="form-select small"
                          value={ds.chartType}
                          onChange={e => updateDataset(ds.id, { chartType: e.target.value as ChartType })}
                        >
                          <option value="donut">Donut Chart</option>
                          <option value="pie">Pie Chart</option>
                          <option value="bar">Bar Chart</option>
                        </select>
                      </div>

                      <div className="form-field">
                        <label className="field-label-tiny">Year / Era (Optional)</label>
                        <input
                          type="text"
                          className="form-input small"
                          placeholder="e.g. 1850 or 3rd Age"
                          value={ds.year || ''}
                          onChange={e => updateDataset(ds.id, { year: e.target.value })}
                        />
                      </div>

                      <div className="form-field">
                        <label className="field-label-tiny">Geographical Scope (Optional)</label>
                        <input
                          type="text"
                          className="form-input small"
                          placeholder="e.g. Northern Province"
                          value={ds.geographicalScope || ''}
                          onChange={e => updateDataset(ds.id, { geographicalScope: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Table of Entries */}
                    <div className="entries-table-section">
                      <span className="field-label-tiny">Categories & Values</span>
                      <div className="entries-table">
                        <div className="entries-table-head">
                          <span className="col-name">Category / Group</span>
                          <span className="col-pct">Percentage (%)</span>
                          <span className="col-cnt">Count / Pop</span>
                          <span className="col-link">Linked Entity (Optional)</span>
                          <span className="col-act"></span>
                        </div>

                        {ds.entries.map(entry => (
                          <div key={entry.id} className="entries-table-row">
                            <input
                              type="text"
                              className="form-input small col-name"
                              value={entry.name}
                              placeholder="e.g. Irish, Spanish, Urban..."
                              onChange={e => handleUpdateEntry(ds.id, entry.id, { name: e.target.value })}
                            />
                            <input
                              type="number"
                              className="form-input small col-pct"
                              value={entry.percentage !== undefined ? entry.percentage : ''}
                              placeholder="%"
                              step="0.1"
                              onChange={e => handleUpdateEntry(ds.id, entry.id, {
                                percentage: e.target.value === '' ? undefined : Number(e.target.value)
                              })}
                            />
                            <input
                              type="number"
                              className="form-input small col-cnt"
                              value={entry.count !== undefined ? entry.count : ''}
                              placeholder="Count"
                              onChange={e => handleUpdateEntry(ds.id, entry.id, {
                                count: e.target.value === '' ? undefined : Number(e.target.value)
                              })}
                            />
                            <select
                              className="form-select small col-link"
                              value={entry.entityId || ''}
                              onChange={e => handleUpdateEntry(ds.id, entry.id, {
                                entityId: e.target.value || undefined
                              })}
                            >
                              <option value="">— No linked article —</option>
                              {availableEntities.map(ent => (
                                <option key={ent.id} value={ent.id}>
                                  {ent.title} ({ent.typeId.replace('et-', '')})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="icon-btn small text-danger col-act"
                              onClick={() => handleRemoveEntry(ds.id, entry.id)}
                              title="Delete row"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="btn-secondary small mt-2"
                        onClick={() => handleAddEntry(ds.id, '')}
                      >
                        <Plus size={12} /> Add Row
                      </button>
                    </div>

                    {/* Source / Notes */}
                    <div className="form-field mt-2">
                      <label className="field-label-tiny">Source, Citation or Methodological Notes</label>
                      <input
                        type="text"
                        className="form-input small"
                        placeholder="e.g. Imperial Census of 1850; author's estimate"
                        value={ds.sourceNotes || ''}
                        onChange={e => updateDataset(ds.id, { sourceNotes: e.target.value })}
                      />
                    </div>

                    {/* Live Preview */}
                    <div className="chart-preview-section">
                      <span className="field-label-tiny">Interactive Chart Preview</span>
                      <InteractiveChart dataset={ds} availableEntities={availableEntities} interactive={false} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
