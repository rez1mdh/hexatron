import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Terminal, ChevronLeft, ChevronRight,
  User as UserIcon, Network, Zap, Edit3
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useAppStore } from '../../store/appStore';
import { getCurrentUser, subscribeToAuthState, isCloudConfigured } from '../../services/supabase';
import CommandPalette from '../ui/CommandPalette';
import AuthModal from '../auth/AuthModal';

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toggleLeftSidebar,
    toggleRightSidebar,
    rightSidebarOpen,
    toggleQuickActions,
    isQuickActionsOpen,
    isOwner,
    currentEntityId
  } = useAppStore();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Global Ctrl+K / Cmd+K listener & hexatron-open-palette listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    }
    function handleOpenEvent() {
      setIsPaletteOpen(true);
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('hexatron-open-palette', handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hexatron-open-palette', handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
    const sub = subscribeToAuthState(user => setCurrentUser(user));
    return () => sub.unsubscribe();
  }, []);

  const cloudConfigured = isCloudConfigured();
  const isEntityView = location.pathname.startsWith('/entity/') && !location.pathname.includes('/edit') && currentEntityId;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-btn"
          onClick={toggleLeftSidebar}
          title="Toggle Navigation Menu"
          aria-label="Toggle navigation"
        >
          <Menu size={18} />
        </button>

        <div className="topbar-nav-arrows">
          <button
            type="button"
            className="icon-btn"
            onClick={() => navigate(-1)}
            title="Go back (Alt+Left)"
            aria-label="Back"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => navigate(1)}
            title="Go forward (Alt+Right)"
            aria-label="Forward"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <span
          className="app-wordmark"
          onClick={() => navigate('/')}
          style={{ cursor: 'pointer' }}
          title="Hexatron Encyclopedia Home"
        >
          Hexatron
        </span>
      </div>

      <button
        type="button"
        className="topbar-search-btn"
        onClick={() => setIsPaletteOpen(true)}
        title="Command Palette & Search (Ctrl+K)"
        aria-label="Search"
      >
        <Terminal size={14} className="text-accent" />
        <span>Command / Search…</span>
        <kbd>Ctrl+K</kbd>
      </button>

      <div className="topbar-right">
        {/* Contextual Edit Article button */}
        {isEntityView && isOwner && (
          <button
            type="button"
            className="topbar-action-pill"
            onClick={() => navigate(`/entity/${currentEntityId}/edit`)}
            title="Edit Article"
          >
            <Edit3 size={13} />
            <span className="pill-text">Edit</span>
          </button>
        )}

        {/* Linked Entities Sidebar Toggle */}
        <button
          type="button"
          className={`icon-btn ${rightSidebarOpen ? 'active' : ''}`}
          onClick={toggleRightSidebar}
          title="Toggle Linked Entities & Entity Browser"
          aria-label="Linked Entities"
        >
          <Network size={16} />
        </button>

        {/* Quick Actions Drawer Toggle */}
        <button
          type="button"
          className={`icon-btn ${isQuickActionsOpen ? 'active' : ''}`}
          onClick={toggleQuickActions}
          title="Quick Actions & Tools"
          aria-label="Quick Actions"
        >
          <Zap size={16} className={isQuickActionsOpen ? 'text-accent' : ''} />
        </button>

        {/* Owner Account / Cloud Sync Pill */}
        <button
          type="button"
          className="topbar-account-btn"
          onClick={() => setIsAuthOpen(true)}
          title={currentUser ? `Signed in as Owner (${currentUser.email})` : (cloudConfigured ? 'Owner Sign In' : 'Cloud Setup & Sync')}
        >
          {currentUser ? (
            <>
              <span className="status-dot online" />
              <span className="account-email truncate">{currentUser.email?.split('@')[0]} (Owner)</span>
            </>
          ) : (
            <>
              <UserIcon size={14} className={cloudConfigured ? 'text-accent' : 'text-muted'} />
              <span className="account-email">{cloudConfigured ? 'Owner Sign In' : 'Cloud Setup'}</span>
            </>
          )}
        </button>
      </div>

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  );
}
