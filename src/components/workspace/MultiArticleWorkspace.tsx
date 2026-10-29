// src/components/workspace/MultiArticleWorkspace.tsx
// Multi-article tab strip & resizable dual split-view workspace

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X, Plus, Columns, Minimize2, Search, BookOpen, Star, Sparkles
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { getEntity, formatEntryNumber } from '../../db/operations';
import type { Entity } from '../../db/schema';
import EntityTypeIcon from '../ui/EntityTypeIcon';
import EntityPage from '../../pages/EntityPage';
import './MultiArticleWorkspace.css';

interface Props {
  currentEntityId?: string;
  currentTitle?: string;
  currentTypeId?: string;
}

export default function MultiArticleWorkspace({
  currentEntityId,
  currentTitle,
  currentTypeId,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    closeAllTabs,
    splitViewEnabled,
    splitSecondaryId,
    splitRatio,
    setSplitViewEnabled,
    setSplitSecondaryId,
    setSplitRatio,
    isOwner
  } = useAppStore();

  const [isSearchingSecondary, setIsSearchingSecondary] = useState(false);
  const [secondarySearchQuery, setSecondarySearchQuery] = useState('');
  const [recentEntities, setRecentEntities] = useState<Entity[]>([]);
  const isDraggingRef = useRef(false);

  // Keep tabs synced with current entity page if owner is browsing
  useEffect(() => {
    if (!currentEntityId || !currentTitle || !isOwner) return;
    openTab({
      id: currentEntityId,
      title: currentTitle,
      typeId: currentTypeId,
    });
  }, [currentEntityId, currentTitle, currentTypeId, isOwner, openTab]);

  // Load candidates for secondary split pane
  useEffect(() => {
    if (!splitViewEnabled) return;
    const { recentEntityIds } = useAppStore.getState();
    Promise.all(recentEntityIds.slice(0, 8).map(id => getEntity(id)))
      .then(res => setRecentEntities(res.filter(Boolean) as Entity[]));
  }, [splitViewEnabled]);

  // Resizing logic for split view
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return;
      const container = document.querySelector('.split-view-container') as HTMLElement | null;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
      if (newRatio >= 25 && newRatio <= 75) {
        setSplitRatio(Math.round(newRatio));
      }
    }

    function handleMouseUp() {
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setSplitRatio]);

  // If user is not the owner or has no tabs, render nothing
  if (!isOwner || tabs.length <= 1 && !splitViewEnabled) {
    return null;
  }

  function handleTabClick(id: string) {
    navigate(`/entity/${id}`);
  }

  function handleCloseTab(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const remaining = tabs.filter(t => t.id !== id);
    closeTab(id);
    if (activeTabId === id && remaining.length > 0) {
      navigate(`/entity/${remaining[remaining.length - 1].id}`);
    } else if (remaining.length === 0) {
      navigate('/');
    }
  }

  function toggleSplit() {
    if (splitViewEnabled) {
      setSplitViewEnabled(false);
      setSplitSecondaryId(null);
    } else {
      // Pick another tab if available
      const otherTab = tabs.find(t => t.id !== currentEntityId);
      if (otherTab) {
        setSplitSecondaryId(otherTab.id);
        setSplitViewEnabled(true);
      } else {
        // Open picker
        setIsSearchingSecondary(true);
        setSplitViewEnabled(true);
      }
    }
  }

  return (
    <div className="workspace-tab-bar" aria-label="Workspace Tabs">
      <div className="workspace-tabs-scroll">
        {tabs.map(tab => {
          const isActive = tab.id === (currentEntityId || activeTabId);
          return (
            <div
              key={tab.id}
              className={`workspace-tab ${isActive ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
              title={tab.title}
            >
              {tab.typeId && <span className="workspace-tab-dot" />}
              <span className="workspace-tab-title truncate">{tab.title}</span>
              {tab.isDirty && <span className="workspace-tab-dirty" title="Unsaved changes" />}
              <button
                type="button"
                className="workspace-tab-close"
                onClick={e => handleCloseTab(e, tab.id)}
                title="Close tab (does not delete entity)"
                aria-label={`Close ${tab.title}`}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="workspace-tools">
        {/* Toggle Split-View */}
        <button
          type="button"
          className={`workspace-tool-btn ${splitViewEnabled ? 'active' : ''}`}
          onClick={toggleSplit}
          title={splitViewEnabled ? 'Close Split View (Single Article)' : 'Open Split View (Side-by-Side)'}
        >
          {splitViewEnabled ? <Minimize2 size={13} /> : <Columns size={13} />}
          <span className="tool-lbl">{splitViewEnabled ? 'Close Split' : 'Split View'}</span>
        </button>

        {/* Close All Tabs */}
        {tabs.length > 2 && (
          <button
            type="button"
            className="workspace-tool-btn"
            onClick={closeAllTabs}
            title="Close all tabs"
          >
            <X size={13} />
            <span className="tool-lbl">Close All</span>
          </button>
        )}
      </div>

      {/* Split Secondary Pane Selector Modal */}
      {isSearchingSecondary && (
        <div className="split-picker-overlay" onClick={() => setIsSearchingSecondary(false)}>
          <div className="split-picker-card" onClick={e => e.stopPropagation()}>
            <div className="split-picker-header">
              <h3>Select Second Article for Split View</h3>
              <button type="button" className="icon-btn small" onClick={() => setIsSearchingSecondary(false)}>
                <X size={14} />
              </button>
            </div>
            <div className="split-picker-body">
              <p className="split-picker-desc">
                Choose an article to view side-by-side with <strong>{currentTitle}</strong>:
              </p>
              <div className="split-candidates-list">
                {recentEntities.filter(e => e.id !== currentEntityId).map(e => (
                  <button
                    key={e.id}
                    type="button"
                    className="split-candidate-btn"
                    onClick={() => {
                      setSplitSecondaryId(e.id);
                      setIsSearchingSecondary(false);
                      openTab({ id: e.id, title: e.title, typeId: e.typeId });
                    }}
                  >
                    <BookOpen size={14} className="text-accent" />
                    <span className="candidate-title truncate">{e.title}</span>
                    <span className="candidate-type">{e.typeId.replace('et-', '')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
