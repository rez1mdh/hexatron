// src/components/layout/AccountMenu.tsx
// Dedicated responsive Account menu component for Desktop & Android mobile
// Solves overlapping header controls by providing clean responsive trigger and dedicated mobile drawer

import React, { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  User as UserIcon, ShieldCheck, Cloud, Star, Layers, Zap,
  LogOut, ChevronDown, X, Check, Settings
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import {
  getCurrentUser,
  subscribeToAuthState,
  signOutUser,
  isCloudConfigured
} from '../../services/supabase';
import './AccountMenu.css';

interface AccountMenuProps {
  onOpenAuth: () => void;
}

export default function AccountMenu({ onOpenAuth }: AccountMenuProps) {
  const {
    isOwner,
    setFavoriteModalOpen,
    setManageUniversesOpen,
    toggleQuickActions
  } = useAppStore();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync auth state
  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
    const sub = subscribeToAuthState(user => setCurrentUser(user));
    return () => sub.unsubscribe();
  }, []);

  // Close on outside click (for desktop popover)
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const cloudConfigured = isCloudConfigured();
  const email = currentUser?.email || '';
  const username = email ? email.split('@')[0] : '';
  const initial = (username ? username[0] : (currentUser ? 'O' : 'G')).toUpperCase();

  async function handleSignOut() {
    try {
      await signOutUser();
      setIsOpen(false);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  }

  function handleActionClick(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <div className="account-menu-container" ref={menuRef}>
      {/* ── 1. Desktop Trigger Button (Hidden on Mobile) ── */}
      <button
        type="button"
        className={`account-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={
          currentUser
            ? `Signed in as Owner (${email})`
            : cloudConfigured
            ? 'Owner Sign In'
            : 'Cloud Setup & Sync'
        }
      >
        {currentUser ? (
          <>
            <span className="account-status-pip online" />
            <span className="account-trigger-username">{username}</span>
            <span className="account-trigger-owner-badge">Owner</span>
            <ChevronDown size={12} className="account-trigger-chevron" />
          </>
        ) : (
          <>
            <UserIcon size={14} className={cloudConfigured ? 'text-accent' : 'text-muted'} />
            <span>{cloudConfigured ? 'Sign In' : 'Cloud Setup'}</span>
            <ChevronDown size={12} className="account-trigger-chevron" />
          </>
        )}
      </button>

      {/* ── 2. Mobile Trigger Button (Visible on screens <= 640px) ── */}
      {currentUser ? (
        <button
          type="button"
          className="account-trigger-mobile-avatar"
          onClick={() => setIsOpen(prev => !prev)}
          aria-label={`Account menu for ${email}`}
          title={`Owner: ${email}`}
        >
          {initial}
          <span className="mobile-avatar-pip" />
        </button>
      ) : (
        <button
          type="button"
          className="account-trigger-mobile-guest"
          onClick={() => setIsOpen(prev => !prev)}
          aria-label="Account sign in and cloud sync"
          title="Sign In / Cloud Sync"
        >
          <UserIcon size={16} className={cloudConfigured ? 'text-accent' : 'text-muted'} />
        </button>
      )}

      {/* ── 3. Desktop Popover Menu ── */}
      {isOpen && (
        <div className="account-popover-desktop" role="menu">
          <div className="account-card-header">
            <span className="account-card-title">Account & Access</span>
            <button
              type="button"
              className="account-card-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close account menu"
            >
              <X size={14} />
            </button>
          </div>

          <div className="account-identity-section">
            <div className="account-card-avatar">{initial}</div>
            <div className="account-identity-info">
              {currentUser ? (
                <>
                  <div className="account-full-email" title={email}>{email}</div>
                  <div className="account-role-row">
                    <span className="account-role-badge-large">
                      <ShieldCheck size={11} /> Owner
                    </span>
                    <span className={`account-cloud-status-pill ${cloudConfigured ? '' : 'offline'}`}>
                      <span className="pip" />
                      {cloudConfigured ? 'Cloud Synced' : 'Local Storage'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="account-full-email">Guest / Public Reader</div>
                  <div className="account-role-row">
                    <span className="account-cloud-status-pill offline">
                      <span className="pip" /> Read-Only Mode
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="account-actions-list">
            <button
              type="button"
              className="account-action-item"
              onClick={() => handleActionClick(onOpenAuth)}
            >
              <Cloud size={15} />
              <span>{currentUser ? 'Cloud & Account Settings' : 'Sign In as Owner'}</span>
            </button>

            {isOwner && (
              <>
                <button
                  type="button"
                  className="account-action-item"
                  onClick={() => handleActionClick(() => setFavoriteModalOpen(true))}
                >
                  <Star size={15} />
                  <span>Favorites & Pinned</span>
                </button>

                <button
                  type="button"
                  className="account-action-item"
                  onClick={() => handleActionClick(() => setManageUniversesOpen(true))}
                >
                  <Layers size={15} />
                  <span>Manage Universes</span>
                </button>
              </>
            )}

            <button
              type="button"
              className="account-action-item"
              onClick={() => handleActionClick(toggleQuickActions)}
            >
              <Zap size={15} />
              <span>Quick Actions & Tools</span>
            </button>

            {currentUser && (
              <button
                type="button"
                className="account-action-item signout"
                onClick={handleSignOut}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Dedicated Android / Mobile Bottom Sheet ── */}
      {isOpen && (
        <div className="account-mobile-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="account-mobile-sheet"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Account details and settings"
          >
            <div className="account-card-header">
              <span className="account-card-title">Account & Workspace</span>
              <button
                type="button"
                className="account-card-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="account-identity-section">
              <div className="account-card-avatar">{initial}</div>
              <div className="account-identity-info">
                {currentUser ? (
                  <>
                    <div className="account-full-email">{email}</div>
                    <div className="account-role-row">
                      <span className="account-role-badge-large">
                        <ShieldCheck size={12} /> Owner
                      </span>
                      <span className={`account-cloud-status-pill ${cloudConfigured ? '' : 'offline'}`}>
                        <span className="pip" />
                        {cloudConfigured ? 'Cloud Synced' : 'Local Storage'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="account-full-email">Guest / Public Reader</div>
                    <div className="account-role-row">
                      <span className="account-cloud-status-pill offline">
                        <span className="pip" /> Read-Only Mode
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="account-actions-list">
              <button
                type="button"
                className="account-action-item"
                onClick={() => handleActionClick(onOpenAuth)}
              >
                <Cloud size={16} />
                <span>{currentUser ? 'Cloud & Account Settings' : 'Sign In as Owner'}</span>
              </button>

              {isOwner && (
                <>
                  <button
                    type="button"
                    className="account-action-item"
                    onClick={() => handleActionClick(() => setFavoriteModalOpen(true))}
                  >
                    <Star size={16} />
                    <span>Favorites & Pinned Articles</span>
                  </button>

                  <button
                    type="button"
                    className="account-action-item"
                    onClick={() => handleActionClick(() => setManageUniversesOpen(true))}
                  >
                    <Layers size={16} />
                    <span>Manage Universes</span>
                  </button>
                </>
              )}

              <button
                type="button"
                className="account-action-item"
                onClick={() => handleActionClick(toggleQuickActions)}
              >
                <Zap size={16} />
                <span>Quick Actions & Tools</span>
              </button>

              {currentUser && (
                <button
                  type="button"
                  className="account-action-item signout"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

