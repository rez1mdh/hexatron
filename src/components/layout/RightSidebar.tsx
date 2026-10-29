// src/components/layout/RightSidebar.tsx
// Global drawer hosting Linked Entities and All Entities Browser

import { useState, useEffect } from 'react';
import { BookOpen, Network, X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import EntityBrowser from '../ui/EntityBrowser';
import LinkedEntitiesPanel from '../ui/LinkedEntitiesPanel';

export default function RightSidebar() {
  const { rightSidebarOpen, toggleRightSidebar, setRightSidebarOpen, currentEntityId } = useAppStore();
  const [activeTab, setActiveTab] = useState<'linked' | 'browser'>('linked');

  useEffect(() => {
    if (currentEntityId) {
      setActiveTab('linked');
    } else {
      setActiveTab('browser');
    }
  }, [currentEntityId]);

  if (!rightSidebarOpen) return null;

  return (
    <aside className="right-sidebar" aria-label="Entity Explorer">
      {/* Top Sidebar Header */}
      <div className="right-sidebar-nav">
        <div className="right-sidebar-tabs">
          {currentEntityId && (
            <button
              type="button"
              className={`rs-tab ${activeTab === 'linked' ? 'active' : ''}`}
              onClick={() => setActiveTab('linked')}
            >
              <Network size={12} />
              <span>Linked Entities</span>
            </button>
          )}
          <button
            type="button"
            className={`rs-tab ${activeTab === 'browser' ? 'active' : ''}`}
            onClick={() => setActiveTab('browser')}
          >
            <BookOpen size={12} />
            <span>All Entities</span>
          </button>
        </div>

        <button
          type="button"
          className="rs-close-btn"
          onClick={toggleRightSidebar}
          title="Close panel"
          aria-label="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="right-sidebar-content">
        {activeTab === 'linked' && currentEntityId ? (
          <LinkedEntitiesPanel
            entityId={currentEntityId}
            onNavigate={() => {
              if (window.innerWidth <= 900) setRightSidebarOpen(false);
            }}
          />
        ) : (
          <EntityBrowser
            currentEntityId={currentEntityId}
            onNavigate={() => {
              if (window.innerWidth <= 900) setRightSidebarOpen(false);
            }}
          />
        )}
      </div>
    </aside>
  );
}
