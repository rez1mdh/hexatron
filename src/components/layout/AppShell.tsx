// src/components/layout/AppShell.tsx
// Responsive shell with desktop collapse & mobile bottom navigation

import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Compass, Network, Sun, Moon } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import TopBar from './TopBar';
import ManageUniversesModal from '../ui/ManageUniversesModal';
import BackupModal from '../ui/BackupModal';
import ErrorBoundary from '../ui/ErrorBoundary';
import './layout.css';

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    theme, toggleTheme, isManageUniversesOpen, setManageUniversesOpen,
    backupModalOpen, backupModalTab, setBackupModalOpen,
    leftSidebarOpen, setLeftSidebarOpen, toggleLeftSidebar,
    rightSidebarOpen, toggleRightSidebar
  } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Automatically close mobile drawers when route changes
  useEffect(() => {
    if (window.innerWidth <= 900) {
      setLeftSidebarOpen(false);
    }
  }, [location.pathname, setLeftSidebarOpen]);

  // Lock body scroll when a modal mobile drawer is open
  useEffect(() => {
    const isMobileDrawerOpen = (leftSidebarOpen || rightSidebarOpen) && window.innerWidth <= 900;
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [leftSidebarOpen, rightSidebarOpen]);

  // Keyboard accessibility: dismiss drawers on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (rightSidebarOpen) toggleRightSidebar();
        if (leftSidebarOpen && window.innerWidth <= 900) setLeftSidebarOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rightSidebarOpen, leftSidebarOpen, toggleRightSidebar, setLeftSidebarOpen]);

  return (
    <div className="app-layout">
      <LeftSidebar />
      <div className="app-main-col">
        <TopBar />
        <main className="app-main">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      <RightSidebar />

      {/* Mobile drawer backdrops */}
      {leftSidebarOpen && (
        <div
          className="sidebar-mobile-backdrop left"
          onClick={() => setLeftSidebarOpen(false)}
          aria-label="Close navigation drawer"
        />
      )}
      {rightSidebarOpen && (
        <div
          className="sidebar-mobile-backdrop right"
          onClick={toggleRightSidebar}
          aria-label="Close linked entities drawer"
        />
      )}

      {/* Android / Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-tab-btn ${leftSidebarOpen ? 'active' : ''}`}
          onClick={toggleLeftSidebar}
          aria-label="Open Hierarchy Tree Drawer"
        >
          <Menu size={18} />
          <span>Tree</span>
        </button>

        <button
          type="button"
          className="mobile-tab-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('hexatron-open-palette'))}
          aria-label="Search"
        >
          <Search size={18} />
          <span>Search</span>
        </button>

        <button
          type="button"
          className={`mobile-tab-btn ${location.pathname.includes('/graph') ? 'active' : ''}`}
          onClick={() => navigate('/graph')}
          aria-label="Graph View"
        >
          <Compass size={18} />
          <span>Graph</span>
        </button>

        <button
          type="button"
          className={`mobile-tab-btn ${rightSidebarOpen ? 'active' : ''}`}
          onClick={toggleRightSidebar}
          aria-label="Linked Entities Panel"
        >
          <Network size={18} />
          <span>Linked</span>
        </button>

        <button
          type="button"
          className="mobile-tab-btn"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>Theme</span>
        </button>
      </nav>

      <ManageUniversesModal
        isOpen={isManageUniversesOpen}
        onClose={() => setManageUniversesOpen(false)}
      />

      <BackupModal
        isOpen={backupModalOpen}
        initialTab={backupModalTab}
        onClose={() => setBackupModalOpen(false)}
      />
    </div>
  );
}
