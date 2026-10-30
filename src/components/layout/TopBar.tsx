import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Terminal, ChevronLeft, ChevronRight,
  Network, Zap, Edit3, Star, Compass,
  FileText, BookOpen, GitBranch, Trash2
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getEntity, type Entity } from '../../db/operations';
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
    setFavoriteModalOpen,
    readerMode,
    toggleReaderMode,
    toggleFavoriteEntity
  } = useAppStore();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentEntity, setCurrentEntityObj] = useState<Entity | null>(null);

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

  const isEntityView = location.pathname.startsWith('/entity/') && !location.pathname.includes('/edit') && !!currentEntityId;

  useEffect(() => {
    if (isEntityView && currentEntityId) {
      getEntity(currentEntityId).then(ent => setCurrentEntityObj(ent || null));
    } else {
      setCurrentEntityObj(null);
    }
  }, [isEntityView, currentEntityId]);

  const isFavorite = currentEntityId ? favoriteEntityIds.includes(currentEntityId) : false;

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

        {/* Windows / Desktop Article Actions (only shown on desktop viewports when viewing an entity) */}
        {isEntityView && currentEntityId && (
          <div className="topbar-entity-actions desktop-only" role="toolbar" aria-label="Article Actions">
            {/* Article view button */}
            <button
              type="button"
              className={`topbar-action-pill ${location.pathname === `/entity/${currentEntityId}` && !readerMode ? 'active' : ''}`}
              onClick={() => {
                if (readerMode) toggleReaderMode();
                navigate(`/entity/${currentEntityId}`);
              }}
              title="Article view"
            >
              <FileText size={13} />
              <span className="pill-text">Article</span>
            </button>

            {/* Reader Mode Toggle */}
            <button
              type="button"
              className={`topbar-action-pill ${readerMode ? 'active text-accent' : ''}`}
              onClick={toggleReaderMode}
              title={readerMode ? 'Exit clean reading mode' : 'Switch to clean reading mode'}
            >
              <BookOpen size={13} />
              <span className="pill-text">Reader</span>
            </button>

            {/* Favorite button (Owner only) */}
            {isOwner && (
              <button
                type="button"
                className={`topbar-action-pill ${isFavorite ? 'active favorited' : ''}`}
                onClick={() => toggleFavoriteEntity(currentEntityId)}
                title={isFavorite ? 'Remove from favorites' : 'Pin to favorites'}
              >
                <Star
                  size={13}
                  fill={isFavorite ? '#f59e0b' : 'none'}
                  color={isFavorite ? '#f59e0b' : 'currentColor'}
                />
                <span className="pill-text">{isFavorite ? 'Favorited' : 'Favorite'}</span>
              </button>
            )}

            {/* Edit Article (Owner only) */}
            {isOwner && (
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

            {/* Network Graph */}
            <button
              type="button"
              className="topbar-action-pill"
              onClick={() => navigate(`/entity/${currentEntityId}/graph`)}
              title="View in Network Graph"
            >
              <Compass size={13} />
              <span className="pill-text">Graph</span>
            </button>

            {/* Family Tree (for character or family entities) */}
            {currentEntity && (currentEntity.typeId === 'et-family' || currentEntity.typeId === 'et-character') && (
              <button
                type="button"
                className="topbar-action-pill"
                onClick={() => window.dispatchEvent(new CustomEvent('hexatron-toggle-family-tree'))}
                title="Toggle visual family tree"
              >
                <GitBranch size={13} />
                <span className="pill-text">Family Tree</span>
              </button>
            )}

            {/* Delete (Owner only) */}
            {isOwner && (
              <button
                type="button"
                className="topbar-action-pill danger"
                onClick={() => window.dispatchEvent(new CustomEvent('hexatron-delete-entity'))}
                title="Delete entity"
              >
                <Trash2 size={13} />
                <span className="pill-text">Delete</span>
              </button>
            )}
          </div>
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
