import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Terminal, ChevronLeft, ChevronRight,
  Network, Zap, Edit3, Star, Compass
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import CommandPalette from '../ui/CommandPalette';
import AuthModal from '../auth/AuthModal';
import AccountMenu from './AccountMenu';

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
    currentEntityId,
    favoriteEntityIds,
    favoriteWorldIds,
    setFavoriteModalOpen
  } = useAppStore();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

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
        {/* Welcome & Visitor Guide */}
        <button
          type="button"
          className="topbar-action-pill"
          onClick={() => navigate('/welcome')}
          title="Welcome & Visitor Guide"
          aria-label="Welcome Guide"
        >
          <Compass size={13} className="text-accent" />
          <span className="pill-text">Guide</span>
        </button>

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

        {/* Favorites & Pinned Records (Owner only) */}
        {isOwner && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => setFavoriteModalOpen(true)}
            title="Favorites & Pinned Records"
            aria-label="Favorites"
          >
            <Star
              size={16}
              fill={favoriteEntityIds.length + favoriteWorldIds.length > 0 ? '#f59e0b' : 'none'}
              color={favoriteEntityIds.length + favoriteWorldIds.length > 0 ? '#f59e0b' : 'currentColor'}
            />
          </button>
        )}

        {/* Dedicated Responsive Account & Access Menu */}
        <AccountMenu onOpenAuth={() => setIsAuthOpen(true)} />
      </div>

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  );
}
