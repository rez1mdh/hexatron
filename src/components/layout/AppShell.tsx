// src/components/layout/AppShell.tsx
// Responsive shell with desktop collapse & mobile bottom navigation

import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Network, Zap } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import TopBar from './TopBar';
import ManageUniversesModal from '../ui/ManageUniversesModal';
import BackupModal from '../ui/BackupModal';
import QuickActionsDrawer from '../ui/QuickActionsDrawer';
import OfflineMediaModal from '../ui/OfflineMediaModal';
import ErrorBoundary from '../ui/ErrorBoundary';
import './layout.css';

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    theme, isManageUniversesOpen, setManageUniversesOpen,
    backupModalOpen, backupModalTab, setBackupModalOpen,
    leftSidebarOpen, setLeftSidebarOpen, toggleLeftSidebar,
    rightSidebarOpen, toggleRightSidebar,
    isQuickActionsOpen, toggleQuickActions, setQuickActionsOpen,
    isOfflineMediaOpen, setOfflineMediaOpen
  } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Ensure mobile drawers are closed on initial mount
  useEffect(() => {
    if (window.innerWidth <= 900) {
      setLeftSidebarOpen(false);
    }
  }, [setLeftSidebarOpen]);

  // Automatically close mobile drawers when route changes
  useEffect(() => {
    if (window.innerWidth <= 900) {
      setLeftSidebarOpen(false);
    }
    setQuickActionsOpen(false);
  }, [location.pathname, setLeftSidebarOpen, setQuickActionsOpen]);

  // Lock scroll when a modal mobile drawer is open
  useEffect(() => {
    const isMobileDrawerOpen = (leftSidebarOpen || rightSidebarOpen || isQuickActionsOpen) && window.innerWidth <= 900;
    const mainEl = document.querySelector('.app-main') as HTMLElement | null;
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
      if (mainEl) mainEl.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      if (mainEl) mainEl.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      if (mainEl) mainEl.style.overflow = '';
    };
  }, [leftSidebarOpen, rightSidebarOpen, isQuickActionsOpen]);

  // Keyboard accessibility: dismiss drawers on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isQuickActionsOpen) setQuickActionsOpen(false);
        if (rightSidebarOpen) toggleRightSidebar();
        if (leftSidebarOpen && window.innerWidth <= 900) setLeftSidebarOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rightSidebarOpen, leftSidebarOpen, isQuickActionsOpen, toggleRightSidebar, setLeftSidebarOpen, setQuickActionsOpen]);

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

      {/* Mobile drawer backdrops (strictly on narrow screens) */}
      {leftSidebarOpen && typeof window !== 'undefined' && window.innerWidth <= 900 && (
        <div
          className="sidebar-mobile-backdrop left"
          onClick={() => setLeftSidebarOpen(false)}
          aria-label="Close navigation drawer"
        />
      )}
      {rightSidebarOpen && typeof window !== 'undefined' && window.innerWidth <= 900 && (
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
          className={`mobile-tab-btn ${rightSidebarOpen ? 'active' : ''}`}
          onClick={toggleRightSidebar}
          aria-label="Linked Entities Panel"
        >
          <Network size={18} />
          <span>Linked</span>
        </button>

        <button
          type="button"
          className={`mobile-tab-btn ${isQuickActionsOpen ? 'active' : ''}`}
          onClick={toggleQuickActions}
          aria-label="Quick Actions & Tools"
        >
          <Zap size={18} />
          <span>Tools</span>
        </button>
      </nav>

      {/* Quick Actions Drawer (Desktop slide-sheet & Mobile bottom-sheet) */}
      <QuickActionsDrawer />

      {/* Global Modals */}
      <ManageUniversesModal
        isOpen={isManageUniversesOpen}
        onClose={() => setManageUniversesOpen(false)}
      />

      <BackupModal
        isOpen={backupModalOpen}
        initialTab={backupModalTab}
        onClose={() => setBackupModalOpen(false)}
      />

      <OfflineMediaModal
        isOpen={isOfflineMediaOpen}
        onClose={() => setOfflineMediaOpen(false)}
      />
    </div>
  );
}
