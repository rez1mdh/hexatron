// src/components/layout/AppShell.tsx
// Three-column shell: left sidebar, main, right sidebar

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/appStore';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import TopBar from './TopBar';
import ManageUniversesModal from '../ui/ManageUniversesModal';
import BackupModal from '../ui/BackupModal';
import ErrorBoundary from '../ui/ErrorBoundary';
import './layout.css';

export default function AppShell() {
  const {
    theme, isManageUniversesOpen, setManageUniversesOpen,
    backupModalOpen, backupModalTab, setBackupModalOpen,
    rightSidebarOpen, toggleRightSidebar
  } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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

      {/* Mobile drawer backdrop */}
      {rightSidebarOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={toggleRightSidebar}
          aria-label="Close sidebar overlay"
        />
      )}

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
