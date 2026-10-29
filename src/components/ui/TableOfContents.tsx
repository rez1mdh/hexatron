// src/components/ui/TableOfContents.tsx
// Responsive, automatic Table of Contents with active heading tracking & smooth offset scrolling

import { useState, useEffect, useMemo, useRef } from 'react';
import { List, ChevronDown, ChevronUp, ChevronRight, Hash, X } from 'lucide-react';
import './TableOfContents.css';

export interface TocItem {
  id: string;
  number: string;
  text: string;
  level: number;
}

interface Props {
  items: TocItem[];
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  className?: string;
  isMobileDrawer?: boolean;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function TableOfContents({
  items,
  collapsed = false,
  onToggleCollapsed,
  className = '',
  isMobileDrawer = false,
  isOpenMobile = false,
  onCloseMobile,
}: Props) {
  const [activeId, setActiveId] = useState<string>('');
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Set up IntersectionObserver to detect active heading as user scrolls
  useEffect(() => {
    if (items.length === 0) return;

    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const headingEls = items
      .map(item => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    if (headingEls.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find visible headings
        const visibleEntries = entries.filter(e => e.isIntersecting);
        if (visibleEntries.length > 0) {
          setActiveId(visibleEntries[0].target.id);
        }
      },
      {
        root: null,
        // Trigger when heading passes 20% down from viewport
        rootMargin: '-100px 0px -65% 0px',
        threshold: 0,
      }
    );

    headingEls.forEach(el => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [items]);

  function scrollToSection(id: string, e: React.MouseEvent) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;

    // Target scroll container (.app-main) or window
    const scrollContainer = document.querySelector('.app-main') as HTMLElement | null;
    
    // Calculate sticky header offset (TopBar ~50px + sticky metadata bar ~52px = ~110px)
    const headerOffset = 116;

    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const relativeTop = elRect.top - containerRect.top + scrollContainer.scrollTop;
      const targetScroll = Math.max(0, relativeTop - headerOffset);

      scrollContainer.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
    } else {
      const targetTop = el.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({
        top: targetTop,
        behavior: 'smooth',
      });
    }

    // Update active
    setActiveId(id);

    // If on mobile drawer, close after tapping
    if (isMobileDrawer && onCloseMobile) {
      onCloseMobile();
    }
  }

  if (items.length < 2) return null;

  // Mobile Drawer Mode
  if (isMobileDrawer) {
    if (!isOpenMobile) return null;
    return (
      <div className="toc-mobile-overlay" onClick={onCloseMobile} role="dialog" aria-modal="true">
        <div className="toc-mobile-sheet" onClick={e => e.stopPropagation()}>
          <div className="toc-mobile-header">
            <div className="toc-title-row">
              <List size={16} className="text-accent" />
              <h3>Table of Contents</h3>
              <span className="toc-count">({items.length} sections)</span>
            </div>
            <button type="button" className="icon-btn small" onClick={onCloseMobile} aria-label="Close table of contents">
              <X size={16} />
            </button>
          </div>

          <nav className="toc-nav-list" aria-label="Table of contents">
            {items.map(item => {
              const isActive = activeId === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`toc-item-link level-${item.level} ${isActive ? 'active' : ''}`}
                  onClick={e => scrollToSection(item.id, e)}
                >
                  <span className="toc-item-num">{item.number}</span>
                  <span className="toc-item-text">{item.text}</span>
                  {isActive && <span className="toc-active-marker" />}
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    );
  }

  // Desktop Inline / Sidebar Mode
  return (
    <aside className={`wiki-toc-container ${className} ${collapsed ? 'collapsed' : ''}`} aria-label="Table of contents">
      <div className="wiki-toc-card">
        <div className="wiki-toc-header" onClick={onToggleCollapsed}>
          <div className="toc-title-row">
            <List size={14} className="text-accent" />
            <span className="wiki-toc-title">Contents</span>
            <span className="toc-count">({items.length})</span>
          </div>
          {onToggleCollapsed && (
            <button
              type="button"
              className="wiki-toc-toggle-btn"
              title={collapsed ? 'Expand table of contents' : 'Collapse table of contents'}
              aria-label={collapsed ? 'Expand table of contents' : 'Collapse table of contents'}
            >
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
        </div>

        {!collapsed && (
          <nav className="toc-nav-list">
            {items.map(item => {
              const isActive = activeId === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`toc-item-link level-${item.level} ${isActive ? 'active' : ''}`}
                  onClick={e => scrollToSection(item.id, e)}
                  title={item.text}
                >
                  <span className="toc-item-num">{item.number}</span>
                  <span className="toc-item-text truncate">{item.text}</span>
                  {isActive && <span className="toc-active-marker" />}
                </a>
              );
            })}
          </nav>
        )}
      </div>
    </aside>
  );
}
