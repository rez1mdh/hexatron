import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Sun, Moon, PanelRight, Download, Upload, Terminal, HelpCircle, Compass, User as UserIcon, Cloud, ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useAppStore } from '../../store/appStore';
import { getCurrentUser, subscribeToAuthState, isCloudConfigured } from '../../services/supabase';
import { clearCacheAndReload } from '../../utils/clearCache';
import CommandPalette from '../ui/CommandPalette';
import AuthModal from '../auth/AuthModal';

export default function TopBar() {
  const { toggleLeftSidebar, toggleRightSidebar, theme, toggleTheme, setBackupModalOpen, isOwner } = useAppStore();
  const navigate = useNavigate();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Global Ctrl+K or Cmd+K or custom event for palette
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

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" onClick={toggleLeftSidebar} title="Toggle navigation">
          <Menu size={18} />
        </button>
        <div className="topbar-nav-arrows">
          <button className="icon-btn" onClick={() => navigate(-1)} title="Go back (Alt+Left)">
            <ChevronLeft size={16} />
          </button>
          <button className="icon-btn" onClick={() => navigate(1)} title="Go forward (Alt+Right)">
            <ChevronRight size={16} />
          </button>
        </div>
        <span className="app-wordmark" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          Hexatron
        </span>
      </div>

      <button className="topbar-search-btn" onClick={() => setIsPaletteOpen(true)} title="Command Palette & Search (Ctrl+K)">
        <Terminal size={14} className="text-accent" />
        <span>Command / Search…</span>
        <kbd>Ctrl+K</kbd>
      </button>

      <div className="topbar-right">
        {/* Owner Account / Cloud Sync Pill */}
        <button
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

        <button className="icon-btn" onClick={() => navigate('/graph')} title="Universe Graph View">
          <Compass size={16} />
        </button>
        <button className="icon-btn" onClick={() => navigate('/help')} title="Help Center & Guide">
          <HelpCircle size={16} />
        </button>
        <button className="icon-btn" onClick={() => setBackupModalOpen(true, 'export')} title="Export backup (.json)">
          <Download size={16} />
        </button>
        {isOwner && (
          <button className="icon-btn" onClick={() => setBackupModalOpen(true, 'import')} title="Import / Restore backup">
            <Upload size={16} />
          </button>
        )}
        <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          className="icon-btn"
          onClick={clearCacheAndReload}
          title="Clear cache and force reload latest version"
          aria-label="Clear cache and reload"
        >
          <RotateCw size={15} />
        </button>
        <button className="icon-btn" onClick={toggleRightSidebar} title="Toggle Entity Browser & Linked Entities">
          <PanelRight size={16} />
        </button>
      </div>

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  );
}
