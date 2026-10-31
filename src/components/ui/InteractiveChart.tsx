// src/components/ui/InteractiveChart.tsx
// Pure SVG responsive interactive chart component (Pie, Donut, Bar, Stacked Bar, Line)
// Supports clickable segments, legends, tooltips, and navigation to linked entities

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Calendar, MapPin, AlertTriangle } from 'lucide-react';
import type { StatisticalDataset, DemographicEntry, Entity } from '../../db/schema';
import './InteractiveChart.css';

const DEFAULT_PALETTE = [
  '#7c6af7', '#4f9ef7', '#4ff7c8', '#f7a14f', '#f75f5f',
  '#f74fa1', '#e07cf7', '#a14ff7', '#f7d44f', '#38bdf8',
  '#34d399', '#fbbf24', '#f87171', '#818cf8', '#c084fc'
];

interface Props {
  dataset: StatisticalDataset;
  availableEntities?: Entity[];
  onEntityClick?: (entityId: string) => void;
  interactive?: boolean;
}

export default function InteractiveChart({
  dataset,
  availableEntities = [],
  onEntityClick,
  interactive = true,
}: Props) {
  const navigate = useNavigate();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const entityMap = new Map<string, Entity>(availableEntities.map(e => [e.id, e]));

  const entries = dataset.entries || [];
  if (entries.length === 0) {
    return (
      <div className="chart-empty-state">
        <p>No data entries in this dataset yet.</p>
      </div>
    );
  }

  // Calculate total percentages and counts
  const totalPercentage = entries.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
  const totalCount = entries.reduce((acc, curr) => acc + (curr.count || 0), 0);

  function handleItemClick(entry: DemographicEntry) {
    if (!interactive) return;
    if (entry.entityId) {
      if (onEntityClick) {
        onEntityClick(entry.entityId);
      } else {
        navigate(`/entity/${entry.entityId}`);
      }
    }
  }

  // Helper for SVG donut / pie paths
  function renderPieOrDonut(isDonut: boolean) {
    const size = 260;
    const center = size / 2;
    const radius = 100;
    const innerRadius = isDonut ? 55 : 0;

    // Normalize values
    const effectiveTotal = totalPercentage > 0 ? totalPercentage : totalCount;
    if (effectiveTotal <= 0) {
      return <div className="chart-empty-state">No non-zero values to display.</div>;
    }

    let accumulatedAngle = 0;

    return (
      <div className="pie-chart-wrapper">
        <svg viewBox={`0 0 ${size} ${size}`} className="chart-svg">
          {entries.map((entry, idx) => {
            const val = (entry.percentage !== undefined && entry.percentage > 0)
              ? entry.percentage
              : (entry.count || 0);

            if (val <= 0) return null;

            const sliceAngle = (val / effectiveTotal) * 2 * Math.PI;
            const startAngle = accumulatedAngle;
            const endAngle = accumulatedAngle + sliceAngle;
            accumulatedAngle += sliceAngle;

            const x1 = center + radius * Math.sin(startAngle);
            const y1 = center - radius * Math.cos(startAngle);
            const x2 = center + radius * Math.sin(endAngle);
            const y2 = center - radius * Math.cos(endAngle);

            const isLargeArc = sliceAngle > Math.PI ? 1 : 0;
            const color = entry.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
            const isHovered = hoveredIdx === idx;

            let pathData = '';
            if (!isDonut) {
              pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${isLargeArc} 1 ${x2} ${y2} Z`;
            } else {
              const x3 = center + innerRadius * Math.sin(endAngle);
              const y3 = center - innerRadius * Math.cos(endAngle);
              const x4 = center + innerRadius * Math.sin(startAngle);
              const y4 = center - innerRadius * Math.cos(startAngle);
              pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${isLargeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${isLargeArc} 0 ${x4} ${y4} Z`;
            }

            return (
              <path
                key={entry.id || idx}
                d={pathData}
                fill={color}
                className={`chart-slice ${entry.entityId ? 'clickable' : ''} ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleItemClick(entry)}
              >
                <title>{`${entry.name}: ${entry.percentage ? `${entry.percentage}%` : ''} ${entry.count ? `(${entry.count.toLocaleString()})` : ''} ${entry.entityId ? '→ Click to open article' : ''}`}</title>
              </path>
            );
          })}
        </svg>

        {isDonut && (
          <div className="donut-center-info">
            <span className="donut-center-title">Total</span>
            <span className="donut-center-val">
              {totalPercentage > 0 ? `${Math.round(totalPercentage)}%` : totalCount.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Helper for Bar Chart
  function renderBarChart() {
    const maxVal = Math.max(
      ...entries.map(e => e.percentage !== undefined ? e.percentage : (e.count || 0)),
      1
    );

    return (
      <div className="bar-chart-container">
        {entries.map((entry, idx) => {
          const val = entry.percentage !== undefined ? entry.percentage : (entry.count || 0);
          const barWidthPercent = Math.min(100, Math.max(2, (val / maxVal) * 100));
          const color = entry.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={entry.id || idx}
              className={`bar-row ${entry.entityId ? 'clickable' : ''} ${isHovered ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => handleItemClick(entry)}
            >
              <div className="bar-label-col truncate">
                <span className="bar-category-name">{entry.name}</span>
                {entry.entityId && (
                  <span className="linked-indicator" title="Connected entity article">
                    <Link2 size={11} className="inline-block text-secondary" />
                  </span>
                )}
              </div>

              <div className="bar-track-col">
                <div
                  className="bar-fill"
                  style={{ width: `${barWidthPercent}%`, backgroundColor: color }}
                />
              </div>

              <div className="bar-val-col">
                {entry.percentage !== undefined && <span className="bar-val-pct">{entry.percentage}%</span>}
                {entry.count !== undefined && (
                  <span className="bar-val-cnt text-muted">({entry.count.toLocaleString()})</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Render chart body based on dataset.chartType
  let chartBody = null;
  if (dataset.chartType === 'donut') {
    chartBody = renderPieOrDonut(true);
  } else if (dataset.chartType === 'pie') {
    chartBody = renderPieOrDonut(false);
  } else {
    // Default to bar chart (or stacked bar fallback)
    chartBody = renderBarChart();
  }

  return (
    <div className="interactive-chart-card">
      <div className="chart-header">
        <div>
          <h4 className="chart-title">{dataset.title}</h4>
          <div className="chart-meta-row">
            {dataset.year && (
              <span className="chart-meta-chip">
                <Calendar size={11} className="inline-block mr-1 text-secondary" />
                <span className="tabular-nums">{dataset.year}</span>
              </span>
            )}
            {dataset.geographicalScope && (
              <span className="chart-meta-chip">
                <MapPin size={11} className="inline-block mr-1 text-secondary" />
                <span>{dataset.geographicalScope}</span>
              </span>
            )}
            {dataset.confidence && (
              <span className={`chart-meta-chip confidence-${dataset.confidence}`}>
                {dataset.confidence}
              </span>
            )}
          </div>
        </div>

        {dataset.isMutuallyExclusive && totalPercentage > 0 && Math.abs(totalPercentage - 100) > 0.05 && (
          <div className="chart-warning-badge" title="Percentages do not equal 100%">
            <AlertTriangle size={11} className="inline-block mr-1 text-warning" />
            <span>Total: {totalPercentage.toFixed(1)}% (Incomplete or estimated)</span>
          </div>
        )}
      </div>

      <div className="chart-body-layout">
        <div className="chart-visual-pane">
          {chartBody}
        </div>

        {/* Legend with linked entity badges */}
        <div className="chart-legend-pane">
          <span className="legend-heading">Categories & Breakdown</span>
          <div className="legend-items-list">
            {entries.map((entry, idx) => {
              const color = entry.color || DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];
              const isHovered = hoveredIdx === idx;
              const hasLink = Boolean(entry.entityId);

              return (
                <div
                  key={entry.id || idx}
                  className={`legend-item ${hasLink ? 'clickable' : ''} ${isHovered ? 'active' : ''}`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => handleItemClick(entry)}
                >
                  <span className="legend-color-dot" style={{ backgroundColor: color }} />
                  <span className="legend-name truncate">{entry.name}</span>
                  {hasLink && <span className="legend-link-badge" title="Click to view connected entity article">Article ↗</span>}
                  <span className="legend-value">
                    {entry.percentage !== undefined ? `${entry.percentage}%` : ''}
                    {entry.count !== undefined ? ` (${entry.count.toLocaleString()})` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {dataset.sourceNotes && (
        <div className="chart-footer-notes">
          <strong>Source / Notes:</strong> {dataset.sourceNotes}
        </div>
      )}
    </div>
  );
}
