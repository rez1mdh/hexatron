// src/components/ui/BackupModal.tsx
// Self-describing JSON backup export, inspection, validation, and safe merge/restore

import { useState, useEffect, useRef } from 'react';
import {
  Download, Upload, X, CheckCircle2, AlertTriangle, FileText,
  Layers, Globe, Shield, RefreshCw, HardDrive, ArrowRight, Check
} from 'lucide-react';
import {
  exportAll, validateBackup, restoreBackup, mergeBackup,
  getUniverses, getWorlds, getEntities, getRelationships,
  type BackupValidationReport, type RestoreReport, type MergeReport
} from '../../db/operations';
import { useAppStore } from '../../store/appStore';
import './BackupModal.css';

interface Props {
  isOpen: boolean;
  initialTab?: 'export' | 'import';
  onClose: () => void;
}

export default function BackupModal({ isOpen, initialTab = 'export', onClose }: Props) {
  const { bumpUniverseVersion } = useAppStore();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);

  // Current DB stats for Export view
  const [currentStats, setCurrentStats] = useState<{
    universes: number;
    worlds: number;
    entities: number;
    relationships: number;
  }>({ universes: 0, worlds: 0, entities: 0, relationships: 0 });

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Import state
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null);
  const [validationReport, setValidationReport] = useState<BackupValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<RestoreReport | MergeReport | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setExportSuccessMsg(null);
      setSelectedFile(null);
      setValidationReport(null);
      setImportResult(null);
      setConfirmRestore(false);
      loadCurrentStats();
    }
  }, [isOpen, initialTab]);

  async function loadCurrentStats() {
    try {
      const [u, w, e, r] = await Promise.all([
        getUniverses(),
        getWorlds(),
        getEntities(),
        getRelationships(),
      ]);
      setCurrentStats({
        universes: u.length,
        worlds: w.length,
        entities: e.length,
        relationships: r.length,
      });
    } catch (err) {
      console.error(err);
    }
  }

  // ── Export Handler ──────────────────────────────────────────────────────────
  async function handleDownloadBackup() {
    setIsExporting(true);
    setExportSuccessMsg(null);
    try {
      const json = await exportAll();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const todayStr = new Date().toISOString().split('T')[0];
      const filename = `worldbuilding-backup-${todayStr}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const sizeKb = (blob.size / 1024).toFixed(1);
      setExportSuccessMsg(`Successfully generated and downloaded "${filename}" (${sizeKb} KB).`);
    } catch (err) {
      console.error(err);
      alert('Failed to export backup: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  }

  // ── Import File Handling & Validation ───────────────────────────────────────
  async function handleFileSelect(file: File) {
    if (!file) return;
    setSelectedFile({ name: file.name, size: file.size });
    setIsValidating(true);
    setValidationReport(null);
    setImportResult(null);
    setConfirmRestore(false);

    try {
      const text = await file.text();
      const report = await validateBackup(text);
      setValidationReport(report);
    } catch (err) {
      console.error(err);
      alert('Error reading backup file: ' + (err as Error).message);
    } finally {
      setIsValidating(false);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  // ── Merge Execution ─────────────────────────────────────────────────────────
  async function handleExecuteMerge() {
    if (!validationReport?.normalizedData) return;
    setIsImporting(true);
    try {
      const result = await mergeBackup(validationReport.normalizedData);
      setImportResult(result);
      bumpUniverseVersion();
      loadCurrentStats();
    } catch (err) {
      console.error(err);
      alert('Merge failed: ' + (err as Error).message);
    } finally {
      setIsImporting(false);
    }
  }

  // ── Restore Execution ───────────────────────────────────────────────────────
  async function handleExecuteRestore() {
    if (!validationReport?.normalizedData) return;
    setIsImporting(true);
    try {
      const result = await restoreBackup(validationReport.normalizedData, { createSnapshot: true });
      setImportResult(result);
      bumpUniverseVersion();
      loadCurrentStats();
    } catch (err) {
      console.error(err);
      alert('Restore failed: ' + (err as Error).message);
    } finally {
      setIsImporting(false);
    }
  }

  if (!isOpen) return null;

  const today = new Date().toISOString().split('T')[0];
  const suggestedFilename = `worldbuilding-backup-${today}.json`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card backup-modal-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="backup-modal-header">
          <div className="backup-modal-title-row">
            <HardDrive size={18} className="text-accent" />
            <h2 className="backup-modal-title">Backup & Restore Center</h2>
          </div>
          <button className="icon-btn small" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="backup-tab-bar">
          <button
            className={`backup-tab-btn ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            <Download size={15} /> Export Backup (.json)
          </button>
          <button
            className={`backup-tab-btn ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <Upload size={15} /> Import / Restore Backup
          </button>
        </div>

        {/* Modal Body */}
        <div className="backup-modal-body">
          {activeTab === 'export' ? (
            /* ── EXPORT TAB ────────────────────────────────────────────────── */
            <>
              <div className="backup-info-card">
                <p>
                  Create a complete, self-describing <strong>.json</strong> backup of your private
                  worldbuilding encyclopedia. The file includes all universes, worlds, continents, nations,
                  characters, articles, custom fields, permanent entry numbers, images, and graph relationships.
                </p>
                <p>
                  The backup is stored in a clean, human-readable JSON format that can be inspected in any text editor,
                  archived for long-term safety, and restored into Hexatron at any time.
                </p>
              </div>

              <div>
                <span className="import-mode-label">Current Database Scope to be Exported:</span>
                <div className="backup-stats-grid">
                  <div className="backup-stat-box">
                    <span className="backup-stat-value">{currentStats.universes}</span>
                    <span className="backup-stat-label">Universes</span>
                  </div>
                  <div className="backup-stat-box">
                    <span className="backup-stat-value">{currentStats.worlds}</span>
                    <span className="backup-stat-label">Worlds</span>
                  </div>
                  <div className="backup-stat-box">
                    <span className="backup-stat-value">{currentStats.entities}</span>
                    <span className="backup-stat-label">Entities</span>
                  </div>
                  <div className="backup-stat-box">
                    <span className="backup-stat-value">{currentStats.relationships}</span>
                    <span className="backup-stat-label">Connections</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="import-mode-label">Target Filename:</span>
                <div className="backup-filename-preview">
                  <FileText size={14} className="text-accent" />
                  <span>{suggestedFilename}</span>
                </div>
              </div>

              {exportSuccessMsg && (
                <div className="backup-result-card">
                  <div className="backup-result-title">
                    <CheckCircle2 size={16} /> Backup Downloaded
                  </div>
                  <p className="backup-result-text">{exportSuccessMsg}</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
                <button
                  className="btn-primary"
                  onClick={handleDownloadBackup}
                  disabled={isExporting}
                >
                  <Download size={15} />
                  {isExporting ? 'Generating Backup…' : 'Download Full Backup (.json)'}
                </button>
              </div>
            </>
          ) : (
            /* ── IMPORT TAB ────────────────────────────────────────────────── */
            <>
              {/* File Selector Dropzone */}
              {!validationReport && !importResult && (
                <>
                  <div
                    className="backup-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileSelect(file);
                    }}
                  >
                    <div className="backup-dropzone-icon">
                      <Upload size={22} />
                    </div>
                    <div>
                      <p className="backup-dropzone-text">Click or drag & drop your backup file here</p>
                      <p className="backup-dropzone-sub">Accepts <code>.json</code> backup files created by Hexatron</p>
                    </div>
                    <button type="button" className="btn-ghost small">
                      Browse Computer
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                  />

                  {isValidating && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      <RefreshCw size={14} className="animate-spin" style={{ display: 'inline', marginRight: 6 }} />
                      Validating backup file contents…
                    </div>
                  )}
                </>
              )}

              {/* Validation Summary Card */}
              {validationReport && !importResult && (
                <>
                  <div className={`validation-card ${validationReport.isValid ? 'valid' : 'invalid'}`}>
                    <div className="validation-header-row">
                      <div className="validation-title">
                        {validationReport.isValid ? (
                          <CheckCircle2 size={18} className="text-success" />
                        ) : (
                          <AlertTriangle size={18} className="text-danger" />
                        )}
                        <span>{selectedFile?.name}</span>
                      </div>
                      <span className={`validation-badge ${validationReport.isValid ? 'success' : 'error'}`}>
                        {validationReport.format}
                      </span>
                    </div>

                    {validationReport.exportedAt && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Exported on {new Date(validationReport.exportedAt).toLocaleString()}
                      </div>
                    )}

                    {/* Errors */}
                    {validationReport.errors.length > 0 && (
                      <ul className="validation-errors-list">
                        {validationReport.errors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    )}

                    {/* Warnings */}
                    {validationReport.warnings.length > 0 && (
                      <ul className="validation-warnings-list">
                        {validationReport.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    )}
                  </div>

                  {/* Summary of Records in Backup */}
                  <div>
                    <span className="import-mode-label">Backup Records Summary:</span>
                    <div className="backup-stats-grid">
                      <div className="backup-stat-box">
                        <span className="backup-stat-value">{validationReport.counts.universeCount}</span>
                        <span className="backup-stat-label">Universes</span>
                      </div>
                      <div className="backup-stat-box">
                        <span className="backup-stat-value">{validationReport.counts.worldCount}</span>
                        <span className="backup-stat-label">Worlds</span>
                      </div>
                      <div className="backup-stat-box">
                        <span className="backup-stat-value">{validationReport.counts.entityCount}</span>
                        <span className="backup-stat-label">Entities</span>
                      </div>
                      <div className="backup-stat-box">
                        <span className="backup-stat-value">{validationReport.counts.relationshipCount}</span>
                        <span className="backup-stat-label">Connections</span>
                      </div>
                    </div>
                  </div>

                  {/* Diff Analysis */}
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>+{validationReport.diff.newEntitiesCount}</strong> new entities
                    </span>
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>{validationReport.diff.existingEntitiesCount}</strong> existing matches
                    </span>
                    {validationReport.diff.conflictingEntryNumbers > 0 && (
                      <span style={{ color: '#f59e0b' }}>
                        <strong>{validationReport.diff.conflictingEntryNumbers}</strong> entry number overlaps (auto-resolved during merge)
                      </span>
                    )}
                  </div>

                  {/* Mode Choices */}
                  {validationReport.isValid && (
                    <div className="import-modes-container">
                      <span className="import-mode-label">Choose Import Action:</span>

                      {/* Mode A: Merge */}
                      <div className="import-mode-card">
                        <div className="import-mode-title-row">
                          <span className="import-mode-title">
                            <Layers size={16} className="text-accent" /> Mode 1: Merge / Import (Recommended)
                          </span>
                          <button
                            className="btn-primary small"
                            onClick={handleExecuteMerge}
                            disabled={isImporting}
                          >
                            <Layers size={13} />
                            {isImporting ? 'Merging…' : 'Merge into Database'}
                          </button>
                        </div>
                        <p className="import-mode-desc">
                          Safe & non-destructive. Adds missing entities, worlds, and relationships while
                          preserving all of your existing records. Any conflicting entry numbers will be
                          assigned next available numbers.
                        </p>
                      </div>

                      {/* Mode B: Restore */}
                      <div className="import-mode-card danger">
                        <div className="import-mode-title-row">
                          <span className="import-mode-title">
                            <Shield size={16} className="text-danger" /> Mode 2: Restore / Replace (Clean Overwrite)
                          </span>
                        </div>
                        <p className="import-mode-desc">
                          Replaces your current local database with this backup. An emergency snapshot
                          of your current database will be saved to your browser prior to replacement.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={confirmRestore}
                              onChange={e => setConfirmRestore(e.target.checked)}
                            />
                            I understand this will overwrite current local records
                          </label>
                          <button
                            className="btn-danger small"
                            onClick={handleExecuteRestore}
                            disabled={isImporting || !confirmRestore}
                          >
                            <RefreshCw size={13} className={isImporting ? 'animate-spin' : ''} />
                            {isImporting ? 'Restoring…' : 'Restore from Backup'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <button
                      className="btn-ghost small"
                      onClick={() => {
                        setSelectedFile(null);
                        setValidationReport(null);
                      }}
                    >
                      ← Choose a different file
                    </button>
                  </div>
                </>
              )}

              {/* Execution Success Result Card */}
              {importResult && (
                <div className="backup-result-card">
                  <div className="backup-result-title">
                    <CheckCircle2 size={18} />
                    {importResult.mode === 'restore' ? 'Database Restored Successfully' : 'Merge Completed Successfully'}
                  </div>
                  <p className="backup-result-text">
                    {importResult.mode === 'restore' ? (
                      `Restored ${(importResult as RestoreReport).restoredCounts.universeCount} Universes, ` +
                      `${(importResult as RestoreReport).restoredCounts.worldCount} Worlds, ` +
                      `${(importResult as RestoreReport).restoredCounts.entityCount} Entities, and ` +
                      `${(importResult as RestoreReport).restoredCounts.relationshipCount} Relationships. ` +
                      `An emergency snapshot was saved to local storage.`
                    ) : (
                      `Added ${(importResult as MergeReport).addedEntities} new entities, ` +
                      `updated ${(importResult as MergeReport).updatedEntities} existing entities, ` +
                      `and added ${(importResult as MergeReport).addedRelationships} relationships. ` +
                      `Resolved ${(importResult as MergeReport).conflictsResolved} entry number conflicts.`
                    )}
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button
                      className="btn-primary small"
                      onClick={() => {
                        onClose();
                        window.location.reload();
                      }}
                    >
                      <Check size={14} /> Refresh View
                    </button>
                    <button
                      className="btn-ghost small"
                      onClick={() => {
                        setSelectedFile(null);
                        setValidationReport(null);
                        setImportResult(null);
                      }}
                    >
                      Import Another
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="backup-modal-footer">
          <button className="btn-ghost small" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
