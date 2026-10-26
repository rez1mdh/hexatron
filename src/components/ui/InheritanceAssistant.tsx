// src/components/ui/InheritanceAssistant.tsx
// Displays calculated parental ancestry estimates and suggests inherited nationality/language/culture

import { useState, useEffect } from 'react';
import { GitBranch, Plus, Check, RefreshCw, AlertCircle } from 'lucide-react';
import type { StatisticalDataset, DemographicEntry } from '../../db/schema';
import {
  calculateInheritedAncestry,
  getInheritedSuggestions,
  type CalculatedAncestryResult,
  type InheritedSuggestions
} from '../../utils/inheritance';
import './InheritanceAssistant.css';

interface Props {
  entityId?: string;
  datasets: StatisticalDataset[];
  onApplyAncestry: (newDatasets: StatisticalDataset[]) => void;
  properties: Record<string, unknown>;
  onUpdateProperties: (patch: Record<string, unknown>) => void;
}

export default function InheritanceAssistant({
  entityId,
  datasets,
  onApplyAncestry,
  properties,
  onUpdateProperties,
}: Props) {
  const [calcResult, setCalcResult] = useState<CalculatedAncestryResult | null>(null);
  const [suggestions, setSuggestions] = useState<InheritedSuggestions | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadInheritance() {
    if (!entityId) return;
    setLoading(true);
    try {
      const [res, sugg] = await Promise.all([
        calculateInheritedAncestry(entityId),
        getInheritedSuggestions(entityId),
      ]);
      setCalcResult(res);
      setSuggestions(sugg);
    } catch (e) {
      console.error('Failed to calculate inheritance:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInheritance();
  }, [entityId]);

  if (!entityId) {
    return (
      <div className="inheritance-assistant-card">
        <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>
          Save the character first to calculate inherited ancestry and suggestions from parents.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="inheritance-assistant-card">
        <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>
          Calculating parental inheritance…
        </p>
      </div>
    );
  }

  if (!calcResult || calcResult.parentsFound.length === 0) {
    return (
      <div className="inheritance-assistant-card">
        <div className="inheritance-assistant-header">
          <span className="inheritance-assistant-title">
            <GitBranch size={14} /> Inherited Parental Attributes
          </span>
          <button type="button" className="btn-ghost tiny" onClick={loadInheritance} title="Recalculate">
            <RefreshCw size={11} /> Refresh
          </button>
        </div>
        <p className="text-muted" style={{ fontSize: '0.78rem', margin: 0 }}>
          No parents recorded yet. Add parents in the <strong>Relationships</strong> tab to automatically calculate ancestry percentages and inherited affiliations.
        </p>
      </div>
    );
  }

  function handleApplyCalculatedAncestry() {
    if (!calcResult || calcResult.entries.length === 0) return;

    // Check if an ancestry dataset already exists
    const existingIndex = datasets.findIndex(d => d.category === 'ancestry');
    let nextDatasets = [...datasets];

    if (existingIndex >= 0) {
      if (!confirm('Apply newly calculated ancestry? This will update the entries in your Ancestry Composition dataset.')) {
        return;
      }
      nextDatasets[existingIndex] = {
        ...nextDatasets[existingIndex],
        entries: calcResult.entries,
      };
    } else {
      const newDataset: StatisticalDataset = {
        id: 'ds-ancestry-' + Date.now(),
        title: 'Ancestry Composition (Inherited)',
        category: 'ancestry',
        chartType: 'donut',
        isMutuallyExclusive: true,
        entries: calcResult.entries,
      };
      nextDatasets = [...datasets, newDataset];
    }

    onApplyAncestry(nextDatasets);
  }

  function appendProperty(key: string, val: string) {
    const existing = String(properties[key] || '').trim();
    const parts = existing ? existing.split(/[,/]/).map(s => s.trim()) : [];
    if (!parts.includes(val)) {
      parts.push(val);
      onUpdateProperties({ [key]: parts.join(', ') });
    }
  }

  return (
    <div className="inheritance-assistant-card">
      <div className="inheritance-assistant-header">
        <span className="inheritance-assistant-title">
          <GitBranch size={14} /> Inherited Parental Attributes
        </span>
        <span className="inheritance-badge-estimate">Calculated Estimate</span>
      </div>

      <div className="inheritance-parents-row">
        <strong>Parents:</strong> {calcResult.parentsFound.map(p => p.name).join(' & ')}
      </div>

      {/* Calculated Ancestry Breakdown */}
      {calcResult.entries.length > 0 && (
        <div className="inheritance-ancestry-preview">
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Calculated Ancestry (50% from each parent):
          </div>
          <div className="inheritance-ancestry-list">
            {calcResult.entries.map(e => (
              <span key={e.id} className="inheritance-ancestry-chip">
                {e.name}: <strong>{e.percentage}%</strong>
              </span>
            ))}
          </div>

          <button
            type="button"
            className="btn-primary small"
            onClick={handleApplyCalculatedAncestry}
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            Apply to Ancestry Dataset
          </button>
        </div>
      )}

      {/* Notes / Incomplete notices */}
      {calcResult.notes.map((note, idx) => (
        <div key={idx} className="inheritance-notice">
          • {note}
        </div>
      ))}

      {/* Distinct Suggested Affiliations (Nationality, Language, Culture, Religion) */}
      {suggestions && (
        <div className="inheritance-suggestions-section">
          {suggestions.suggestedNationalities.length > 0 && (
            <div className="inheritance-suggestion-row">
              <span className="inheritance-suggestion-label">Nationalities:</span>
              {suggestions.suggestedNationalities.map(n => (
                <button
                  key={n}
                  type="button"
                  className="inheritance-suggestion-btn"
                  onClick={() => appendProperty('nationality', n)}
                  title={`Add ${n} to nationality`}
                >
                  + {n}
                </button>
              ))}
            </div>
          )}

          {suggestions.suggestedLanguages.length > 0 && (
            <div className="inheritance-suggestion-row">
              <span className="inheritance-suggestion-label">Languages:</span>
              {suggestions.suggestedLanguages.map(l => (
                <button
                  key={l}
                  type="button"
                  className="inheritance-suggestion-btn"
                  onClick={() => appendProperty('nativeLanguage', l)}
                  title={`Add ${l} to language`}
                >
                  + {l}
                </button>
              ))}
            </div>
          )}

          {suggestions.suggestedCultures.length > 0 && (
            <div className="inheritance-suggestion-row">
              <span className="inheritance-suggestion-label">Cultures:</span>
              {suggestions.suggestedCultures.map(c => (
                <button
                  key={c}
                  type="button"
                  className="inheritance-suggestion-btn"
                  onClick={() => appendProperty('culture', c)}
                  title={`Add ${c} to culture`}
                >
                  + {c}
                </button>
              ))}
            </div>
          )}

          {suggestions.suggestedReligions.length > 0 && (
            <div className="inheritance-suggestion-row">
              <span className="inheritance-suggestion-label">Religions:</span>
              {suggestions.suggestedReligions.map(r => (
                <button
                  key={r}
                  type="button"
                  className="inheritance-suggestion-btn"
                  onClick={() => appendProperty('religion', r)}
                  title={`Add ${r} to religion`}
                >
                  + {r}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
