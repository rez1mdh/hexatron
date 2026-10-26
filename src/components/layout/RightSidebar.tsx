// src/components/layout/RightSidebar.tsx
// Global application drawer hosting the All Entities Browser (separate from the individual article's Linked Entities sidebar)

import { useLocation } from 'react-router-dom';
import { BookOpen, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import EntityBrowser from '../ui/EntityBrowser';

export default function RightSidebar() {
  const { rightSidebarOpen, toggleRightSidebar, currentEntityId } = useAppStore();
  const location = useLocation();

  if (!rightSidebarOpen) return null;

  return (
    <aside className="right-sidebar">
      {/* Top Sidebar Header */}
      <div className="right-sidebar-nav">
        <div className="right-sidebar-tabs">
          <span className="rs-tab active">
            <BookOpen size={12} />
            <span>All Entities Browser</span>
          </span>
        </div>

        <button
          className="rs-close-btn"
          onClick={toggleRightSidebar}
          title="Close sidebar"
          aria-label="Close sidebar"
        >
          <X size={14} />
        </button>
      </div>

      <div className="right-sidebar-content">
        <EntityBrowser currentEntityId={currentEntityId} />
      </div>
    </aside>
  );
}
