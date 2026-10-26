// src/components/auth/AuthModal.tsx
// User Authentication, Cloud Sync configuration, and Local Data Migration modal

import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  X, User as UserIcon, Lock, Mail, Cloud, Download, Upload, Check, AlertCircle,
  Copy, ExternalLink, RefreshCw, Key, ShieldCheck, Database
} from 'lucide-react';
import {
  getStoredCloudConfig, saveCloudConfig, isCloudConfigured,
  getCurrentUser, signInWithEmail, signUpWithEmail, signOutUser, resetPasswordForEmail,
  subscribeToAuthState, SUPABASE_SETUP_SQL
} from '../../services/supabase';
import { getLocalDataStats, migrateLocalDataToCloud, syncFromCloudToLocal, syncPublishedDataFromCloud, type MigrationSummary } from '../../services/cloudSync';
import { exportAll } from '../../db/operations';
import { useAppStore } from '../../store/appStore';
import './AuthModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: Props) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'config' | 'account'>('signin');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Config Fields
  const [cloudUrl, setCloudUrl] = useState('');
  const [cloudKey, setCloudKey] = useState('');
  const [sqlCopied, setSqlCopied] = useState(false);

  // Migration Stats
  const [localStats, setLocalStats] = useState<MigrationSummary | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const { url, key } = getStoredCloudConfig();
    setCloudUrl(url);
    setCloudKey(key);

    const configured = isCloudConfigured();
    if (!configured) {
      setActiveTab('config');
    }

    getCurrentUser().then(user => {
      setCurrentUser(user);
      if (user) {
        setActiveTab('account');
      } else if (configured) {
        setActiveTab('signin');
      }
    });

    getLocalDataStats().then(setLocalStats);

    const sub = subscribeToAuthState(user => {
      setCurrentUser(user);
      if (user) setActiveTab('account');
    });

    return () => sub.unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const data = await signInWithEmail(email, password);
      setSuccessMsg('Signed in as owner.');
      setActiveTab('account');
      if (data.user) {
        useAppStore.getState().setCurrentUser(data.user);
        syncFromCloudToLocal(data.user).then(() => {
          useAppStore.getState().bumpUniverseVersion();
        }).catch(console.error);
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const data = await signUpWithEmail(email, password);
      if (data.session && data.user) {
        useAppStore.getState().setCurrentUser(data.user);
        setSuccessMsg('Owner account created and signed in.');
        setActiveTab('account');
      } else {
        setSuccessMsg('Owner account created! Please check your email to verify your address.');
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email) {
      setErrorMsg('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await resetPasswordForEmail(email);
      setSuccessMsg('Password reset instructions sent to your email.');
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setLoading(true);
    try {
      await signOutUser();
      setCurrentUser(null);
      useAppStore.getState().setCurrentUser(null);
      setSuccessMsg('Signed out successfully.');
      setActiveTab('signin');
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    saveCloudConfig(cloudUrl, cloudKey);
    setSuccessMsg('Backend credentials saved.');
    if (isCloudConfigured()) {
      syncPublishedDataFromCloud().then(res => {
        if (res.entitiesSynced > 0) {
          useAppStore.getState().bumpUniverseVersion();
        }
      }).catch(console.error);
      setActiveTab('signin');
    }
  }

  function handleCopySql() {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  }

  async function handleDownloadBackup() {
    const json = await exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hexatron-pre-migration-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleMigrate() {
    if (!currentUser) return;
    if (!confirm('This will upload your local universes, worlds, entities, and relationships to your private cloud account. Existing local data will be preserved. Proceed?')) {
      return;
    }

    setMigrating(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await migrateLocalDataToCloud(currentUser);
      setSuccessMsg(res.message);
    } catch (err) {
      setErrorMsg(`Migration error: ${(err as Error).message}`);
    } finally {
      setMigrating(false);
    }
  }

  async function handleSyncFromCloud() {
    if (!currentUser) return;
    setSyncing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await syncFromCloudToLocal(currentUser);
      setSuccessMsg(`Synchronized ${res.entitiesSynced} entities from cloud to this device.`);
    } catch (err) {
      setErrorMsg(`Sync error: ${(err as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }

  const cloudActive = isCloudConfigured();

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-container" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-modal-title-row">
            <Cloud size={18} className="auth-icon" />
            <h3 className="auth-modal-title">
              {currentUser ? 'Owner Account & Online Sync' : 'Owner Access & Online Sync'}
            </h3>
          </div>
          <button className="icon-btn small" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-modal-tabs">
          {currentUser ? (
            <button
              className={`auth-tab ${activeTab === 'account' ? 'active' : ''}`}
              onClick={() => setActiveTab('account')}
            >
              Account Overview
            </button>
          ) : (
            <>
              <button
                className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
                onClick={() => setActiveTab('signin')}
              >
                Owner Sign In
              </button>
              <button
                className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                onClick={() => setActiveTab('signup')}
              >
                Initial Owner Setup
              </button>
            </>
          )}
          <button
            className={`auth-tab ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            Cloud Backend {cloudActive ? '✓' : ''}
          </button>
        </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="auth-alert error">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert success">
            <Check size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body content based on tab */}
        <div className="auth-modal-body">
          {/* 1. Sign In */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="auth-form">
              {!cloudActive && (
                <div className="auth-notice">
                  <AlertCircle size={14} className="text-warning" />
                  <span>Cloud backend is not configured yet. Set your Supabase URL & Anon Key in the <strong>Cloud Backend</strong> tab.</span>
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label">Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={14} className="auth-field-icon" />
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="user@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <Lock size={14} className="auth-field-icon" />
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-actions-row">
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={handleResetPassword}
                  disabled={loading}
                >
                  Forgot password?
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !cloudActive}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </div>
            </form>
          )}

          {/* 2. Sign Up */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="auth-form">
              {!cloudActive && (
                <div className="auth-notice">
                  <AlertCircle size={14} className="text-warning" />
                  <span>Cloud backend is not configured yet. Configure your Supabase backend first.</span>
                </div>
              )}

              <div className="auth-field">
                <label className="auth-label">Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={14} className="auth-field-icon" />
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="user@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Password (min 6 characters)</label>
                <div className="auth-input-wrap">
                  <Lock size={14} className="auth-field-icon" />
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Confirm Password</label>
                <div className="auth-input-wrap">
                  <Lock size={14} className="auth-field-icon" />
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                disabled={loading || !cloudActive}
              >
                {loading ? 'Creating account…' : 'Create Free Account'}
              </button>
            </form>
          )}

          {/* 3. Account Overview & Migration */}
          {activeTab === 'account' && currentUser && (
            <div className="auth-account-view">
              <div className="auth-user-card">
                <div className="auth-user-avatar">
                  <UserIcon size={20} />
                </div>
                <div className="auth-user-details">
                  <div className="auth-user-email">{currentUser.email}</div>
                  <div className="auth-user-badge">
                    <ShieldCheck size={12} className="text-success" />
                    <span>Private Account · Protected by Row Level Security</span>
                  </div>
                </div>
              </div>

              {/* Local Data Migration Box */}
              <div className="auth-migration-card">
                <div className="auth-migration-header">
                  <Database size={15} className="text-accent" />
                  <span className="auth-migration-title">Local Data Migration</span>
                </div>
                <p className="auth-migration-desc">
                  Transfer existing local data on this device to your cloud account so it can be accessed on Android and other browsers.
                </p>

                {localStats && (
                  <div className="auth-stats-grid">
                    <div className="auth-stat-box">
                      <span className="auth-stat-num">{localStats.universes}</span>
                      <span className="auth-stat-label">Universes</span>
                    </div>
                    <div className="auth-stat-box">
                      <span className="auth-stat-num">{localStats.worlds}</span>
                      <span className="auth-stat-label">Worlds</span>
                    </div>
                    <div className="auth-stat-box">
                      <span className="auth-stat-num">{localStats.entities}</span>
                      <span className="auth-stat-label">Entities</span>
                    </div>
                    <div className="auth-stat-box">
                      <span className="auth-stat-num">{localStats.relationships}</span>
                      <span className="auth-stat-label">Relationships</span>
                    </div>
                  </div>
                )}

                <div className="auth-migration-actions">
                  <button
                    type="button"
                    className="btn-ghost small"
                    onClick={handleDownloadBackup}
                    title="Export JSON backup before uploading"
                  >
                    <Download size={13} /> Export Backup First
                  </button>
                  <button
                    type="button"
                    className="btn-primary small"
                    onClick={handleMigrate}
                    disabled={migrating}
                  >
                    {migrating ? 'Migrating…' : 'Migrate to Cloud'}
                  </button>
                </div>
              </div>

              {/* Cross-Device Cloud Sync */}
              <div className="auth-sync-card">
                <div className="auth-sync-header">
                  <RefreshCw size={14} className="text-accent" />
                  <span className="auth-sync-title">Cross-Device Sync</span>
                </div>
                <p className="auth-sync-desc">
                  Download changes from your cloud account onto this device.
                </p>
                <button
                  type="button"
                  className="btn-ghost small"
                  onClick={handleSyncFromCloud}
                  disabled={syncing}
                >
                  {syncing ? 'Syncing…' : 'Sync from Cloud to Device'}
                </button>
              </div>

              <div className="auth-footer-actions">
                <button
                  type="button"
                  className="btn-ghost small"
                  onClick={handleSignOut}
                  disabled={loading}
                  style={{ color: 'var(--danger)' }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* 4. Cloud Backend Configuration */}
          {activeTab === 'config' && (
            <div className="auth-config-view">
              <div className="auth-config-intro">
                <h4>Private Supabase Backend (Free Tier)</h4>
                <p>
                  Hexatron is offline-first. To enable multi-device sync across Windows and Android, connect your own free Supabase project. It is 100% free and your lore stays strictly private to your account.
                </p>
              </div>

              <form onSubmit={handleSaveConfig} className="auth-form">
                <div className="auth-field">
                  <label className="auth-label">Project URL</label>
                  <input
                    type="url"
                    className="auth-input"
                    placeholder="https://xyzproject.supabase.co"
                    value={cloudUrl}
                    onChange={e => setCloudUrl(e.target.value)}
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label">Anon / Public API Key</label>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                    value={cloudKey}
                    onChange={e => setCloudKey(e.target.value)}
                  />
                </div>

                <div className="auth-actions-row">
                  <button
                    type="button"
                    className="btn-ghost small"
                    onClick={handleCopySql}
                  >
                    {sqlCopied ? <Check size={13} /> : <Copy size={13} />}
                    {sqlCopied ? 'SQL Copied!' : 'Copy Supabase SQL Setup'}
                  </button>
                  <button type="submit" className="btn-primary small">
                    Save Credentials
                  </button>
                </div>
              </form>

              <div className="auth-setup-guide">
                <div className="auth-guide-step">
                  <span className="step-num">1</span>
                  <span>Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer">supabase.com</a> ($0/mo, no credit card required).</span>
                </div>
                <div className="auth-guide-step">
                  <span className="step-num">2</span>
                  <span>Click <strong>Copy Supabase SQL Setup</strong> above, then paste and run it in your project's <strong>SQL Editor</strong>.</span>
                </div>
                <div className="auth-guide-step">
                  <span className="step-num">3</span>
                  <span>Copy your Project URL & Anon Key from <strong>Project Settings → API</strong> into the fields above.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
