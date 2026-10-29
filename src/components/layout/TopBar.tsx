import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Terminal, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
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
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

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

  // Automatically collapse expanded mobile toolbar when scrolling downward in .app-main
  useEffect(() => {
    const mainEl = document.querySelector('.app-main');
    if (!mainEl) return;

    let lastScrollTop = mainEl.scrollTop;
    let ticking = false;

    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollTop = mainEl ? mainEl.scrollTop : 0;
          const delta = currentScrollTop - lastScrollTop;

          // If mobile tray is open and user scrolled downward by > 10px past initial threshold:
          if (isMobileExpanded && delta > 10 && currentScrollTop > 20) {
            setIsMobileExpanded(false);
          }

          lastScrollTop = currentScrollTop;
          ticking = false;
        });
        ticking = true;
      }
    }

    mainEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, [isMobileExpanded]);

  // Collapse mobile tray on route change
  useEffect(() => {
    setIsMobileExpanded(false);
  }, [location.pathname]);

  const isEntityView = location.pathname.startsWith('/entity/') && !location.pathname.includes('/edit') && currentEntityId;

  return (
    <header className={`topbar ${isMobileExpanded ? 'mobile-expanded' : ''}`}>
      {/* ── Desktop TopBar Layout (width > 768px) ── */}
      <div className="topbar-desktop">
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
            <Compass size={13} />
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
      </div>

      {/* ── Android / Mobile Expandable Toolbar (width <= 768px) ── */}
      <div className="topbar-mobile">
        {/* Collapsed State Tray Handle */}
        <div className="mobile-tray-bar">
          <div className="mobile-tray-left">
            <button
              type="button"
              className="mobile-tray-nav-btn"
              onClick={() => navigate(-1)}
              title="Back"
              aria-label="Go back"
            >
              <ChevronLeft size={16} />
            </button>
            <span
              className="mobile-tray-wordmark"
              onClick={() => {
                navigate('/');
                setIsMobileExpanded(false);
              }}
              title="Hexatron Home"
            >
              Hexatron
            </span>
          </div>

          <button
            type="button"
            className={`mobile-tray-handle ${isMobileExpanded ? 'active' : ''}`}
            onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            aria-expanded={isMobileExpanded}
            aria-label={isMobileExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
          >
            {isMobileExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            <span>{isMobileExpanded ? 'Close' : 'Tools & Search'}</span>
          </button>

          <div className="mobile-tray-right">
            <button
              type="button"
              className="mobile-tray-quick-search-btn"
              onClick={() => {
                setIsPaletteOpen(true);
                setIsMobileExpanded(false);
              }}
              title="Search"
              aria-label="Search encyclopedia"
            >
              <Terminal size={14} className="text-accent" />
            </button>

            <button
              type="button"
              className={`mobile-tray-toggle-btn ${isMobileExpanded ? 'active' : ''}`}
              onClick={() => setIsMobileExpanded(!isMobileExpanded)}
              title={isMobileExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
              aria-label={isMobileExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
            >
              {isMobileExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Expanded State Drawer */}
        <div className={`mobile-tray-expanded ${isMobileExpanded ? 'is-open' : ''}`}>
          <div className="mobile-expanded-content">
            {/* Search row */}
            <button
              type="button"
              className="mobile-expanded-search-btn"
              onClick={() => {
                setIsPaletteOpen(true);
                setIsMobileExpanded(false);
              }}
              aria-label="Open Command Palette & Search"
            >
              <Terminal size={14} className="text-accent" />
              <span>Search encyclopedia, lore, or commands…</span>
              <kbd className="mobile-search-badge">Search</kbd>
            </button>

            {/* Quick Actions row */}
            <div className="mobile-expanded-actions-grid">
              <button
                type="button"
                className="mobile-action-pill"
                onClick={() => {
                  navigate('/welcome');
                  setIsMobileExpanded(false);
                }}
                title="Welcome & Visitor Guide"
              >
                <Compass size={14} className="text-accent" />
                <span>Guide</span>
              </button>

              <button
                type="button"
                className="mobile-action-pill"
                onClick={() => {
                  toggleLeftSidebar();
                  setIsMobileExpanded(false);
                }}
                title="Hierarchy Tree"
              >
                <Menu size={14} />
                <span>Tree</span>
              </button>

              <button
                type="button"
                className={`mobile-action-pill ${rightSidebarOpen ? 'active' : ''}`}
                onClick={() => {
                  toggleRightSidebar();
                  setIsMobileExpanded(false);
                }}
                title="Linked Entities"
              >
                <Network size={14} />
                <span>Linked</span>
              </button>

              <button
                type="button"
                className={`mobile-action-pill ${isQuickActionsOpen ? 'active' : ''}`}
                onClick={() => {
                  toggleQuickActions();
                  setIsMobileExpanded(false);
                }}
                title="Quick Actions & Tools"
              >
                <Zap size={14} className={isQuickActionsOpen ? 'text-accent' : ''} />
                <span>Tools</span>
              </button>

              {isEntityView && isOwner && (
                <button
                  type="button"
                  className="mobile-action-pill accent"
                  onClick={() => {
                    navigate(`/entity/${currentEntityId}/edit`);
                    setIsMobileExpanded(false);
                  }}
                  title="Edit Article"
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>
              )}

              {isOwner && (
                <button
                  type="button"
                  className="mobile-action-pill"
                  onClick={() => {
                    setFavoriteModalOpen(true);
                    setIsMobileExpanded(false);
                  }}
                  title="Favorites"
                >
                  <Star
                    size={14}
                    fill={favoriteEntityIds.length + favoriteWorldIds.length > 0 ? '#f59e0b' : 'none'}
                    color={favoriteEntityIds.length + favoriteWorldIds.length > 0 ? '#f59e0b' : 'currentColor'}
                  />
                  <span>Favorites</span>
                </button>
              )}

              <div className="mobile-expanded-account-wrap">
                <AccountMenu onOpenAuth={() => {
                  setIsAuthOpen(true);
                  setIsMobileExpanded(false);
                }} />
              </div>
            </div>

            {/* Navigation arrows & collapse row */}
            <div className="mobile-expanded-footer-row">
              <div className="mobile-footer-nav">
                <button
                  type="button"
                  className="mobile-footer-nav-btn"
                  onClick={() => {
                    navigate(-1);
                    setIsMobileExpanded(false);
                  }}
                  title="Previous page"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} /> Back
                </button>
                <button
                  type="button"
                  className="mobile-footer-nav-btn"
                  onClick={() => {
                    navigate(1);
                    setIsMobileExpanded(false);
                  }}
                  title="Forward page"
                  aria-label="Forward page"
                >
                  Forward <ChevronRight size={14} />
                </button>
              </div>

              <button
                type="button"
                className="mobile-footer-collapse-btn"
                onClick={() => setIsMobileExpanded(false)}
                title="Collapse toolbar"
                aria-label="Collapse toolbar"
              >
                <ChevronUp size={13} />
                <span>Collapse</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </header>
  );
}
