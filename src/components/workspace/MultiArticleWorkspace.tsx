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
    reorderTabs,
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

  // Drag and Drop Tab Reordering State (Part 6)
  const [draggedTabIndex, setDraggedTabIndex] = useState<number | null>(null);
  const [dropTabIndex, setDropTabIndex] = useState<number | null>(null);
  const [dropSide, setDropSide] = useState<'left' | 'right' | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Keep tabs synced with current entity page
  useEffect(() => {
    if (!currentEntityId || !currentTitle) return;
    openTab({
      id: currentEntityId,
      title: currentTitle,
      typeId: currentTypeId,
    });
  }, [currentEntityId, currentTitle, currentTypeId, openTab]);

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

  // If no tabs are open, render nothing
  if (tabs.length === 0) {
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

  function handleDropTab(targetIdx: number, side: 'left' | 'right') {
    if (draggedTabIndex === null || draggedTabIndex === targetIdx) {
      setDraggedTabIndex(null);
      setDropTabIndex(null);
      setDropSide(null);
      return;
    }
    const nextTabs = [...tabs];
    const [movedTab] = nextTabs.splice(draggedTabIndex, 1);
    let insertIdx = targetIdx;
    if (draggedTabIndex < targetIdx) {
      insertIdx = side === 'left' ? targetIdx - 1 : targetIdx;
    } else {
      insertIdx = side === 'left' ? targetIdx : targetIdx + 1;
    }
    insertIdx = Math.max(0, Math.min(nextTabs.length, insertIdx));
    nextTabs.splice(insertIdx, 0, movedTab);
    reorderTabs(nextTabs);
    setDraggedTabIndex(null);
    setDropTabIndex(null);
    setDropSide(null);
  }

  function handleTouchStart(e: React.TouchEvent, idx: number) {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setDraggedTabIndex(idx);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (draggedTabIndex === null) return;
    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const tabElem = elem?.closest('.workspace-tab') as HTMLElement | null;
    if (tabElem && tabElem.dataset.tabIndex) {
      const idx = parseInt(tabElem.dataset.tabIndex, 10);
      const rect = tabElem.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      setDropTabIndex(idx);
      setDropSide(touch.clientX < mid ? 'left' : 'right');
    }
  }

  function handleTouchEnd() {
    if (draggedTabIndex !== null && dropTabIndex !== null && dropSide !== null) {
      handleDropTab(dropTabIndex, dropSide);
    }
    setDraggedTabIndex(null);
    setDropTabIndex(null);
    setDropSide(null);
    touchStartPos.current = null;
  }

  return (
    <div className="workspace-tab-bar" aria-label="Workspace Tabs">
      <div
        className="workspace-tabs-scroll"
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.id === (currentEntityId || activeTabId);
          const isDragging = draggedTabIndex === idx;
          const isTarget = dropTabIndex === idx;
          return (
            <div
              key={tab.id}
              data-tab-index={idx}
              className={`workspace-tab ${isActive ? 'active' : ''} ${isDragging ? 'is-dragging' : ''} ${isTarget && dropSide === 'left' ? 'drag-over-left' : ''} ${isTarget && dropSide === 'right' ? 'drag-over-right' : ''}`}
              onClick={() => handleTabClick(tab.id)}
              title={tab.title}
              draggable
              onDragStart={(e) => {
                setDraggedTabIndex(idx);
                e.dataTransfer.setData('text/plain', String(idx));
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDraggedTabIndex(null);
                setDropTabIndex(null);
                setDropSide(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggedTabIndex === null || draggedTabIndex === idx) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const mid = rect.left + rect.width / 2;
                const side = e.clientX < mid ? 'left' : 'right';
                if (dropTabIndex !== idx || dropSide !== side) {
                  setDropTabIndex(idx);
                  setDropSide(side);
                }
              }}
              onDragLeave={(e) => {
                const nextTarget = e.relatedTarget as Node | null;
                if (!e.currentTarget.contains(nextTarget)) {
                  if (dropTabIndex === idx) {
                    setDropTabIndex(null);
                    setDropSide(null);
                  }
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dropSide) {
                  handleDropTab(idx, dropSide);
                }
              }}
              onTouchStart={(e) => handleTouchStart(e, idx)}
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

        {/* Add Tab Button */}
        <button
          type="button"
          className="workspace-tab-add-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('hexatron-open-palette'))}
          title="Open article in tab (Ctrl+K)"
          aria-label="Add tab"
        >
          <Plus size={13} />
        </button>
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

