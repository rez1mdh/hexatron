// src/components/ui/QuickActionsDrawer.tsx
// Customizable Quick-Action Drawer for desktop & mobile
// Persists ordering, visibility, and preferences in localStorage

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Zap, X, GitBranch, BookOpen, Network, Compass, Edit3, PlusCircle,
  HardDrive, Layers, Download, Upload, Sun, Moon, RotateCw,
  HelpCircle, Settings, ArrowUp, ArrowDown, RotateCcw, Check,
  Search as SearchIcon
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { clearCacheAndReload } from '../../utils/clearCache';
import './QuickActionsDrawer.css';

interface QuickActionConfig {
  id: string;
  enabled: boolean;
}

const STORAGE_KEY = 'hexatron-quick-actions-config';

interface ActionDef {
  id: string;
  name: string;
  description: string;
  category: 'nav' | 'article' | 'tools' | 'system';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  ownerOnly?: boolean;
  entityOnly?: boolean;
  run: () => void;
}

export default function QuickActionsDrawer() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isQuickActionsOpen,
    setQuickActionsOpen,
    currentEntityId,
    currentWorldId,
    isOwner,
    theme,
    toggleTheme,
    setLeftSidebarOpen,
    setRightSidebarOpen,
    setManageUniversesOpen,
    setBackupModalOpen,
    setOfflineMediaOpen
  } = useAppStore();

  const [isCustomizing, setIsCustomizing] = useState(false);

  // Define master action catalog
  const masterActions = useMemo<Record<string, ActionDef>>(() => ({
    'tree': {
      id: 'tree',
      name: 'Hierarchy Tree',
      description: 'Explore structured tree of worlds and entities',
      category: 'nav',
      icon: GitBranch,
      run: () => {
        setLeftSidebarOpen(true);
      }
    },
    'browse': {
      id: 'browse',
      name: 'Browse Entities',
      description: 'Search & filter all entities in the database',
      category: 'nav',
      icon: BookOpen,
      run: () => {
        setRightSidebarOpen(true);
      }
    },
    'linked': {
      id: 'linked',
      name: 'Linked Entities',
      description: 'Inspect relationships & mentions for current entity',
      category: 'nav',
      icon: Network,
      run: () => {
        setRightSidebarOpen(true);
      }
    },
    'graph': {
      id: 'graph',
      name: 'Universe Graph',
      description: 'Visual 2D interactive knowledge graph',
      category: 'nav',
      icon: Compass,
      run: () => {
        navigate('/graph');
      }
    },
    'search': {
      id: 'search',
      name: 'Command Palette',
      description: 'Quick jump, search articles, or execute actions',
      category: 'nav',
      icon: SearchIcon,
      run: () => {
        window.dispatchEvent(new CustomEvent('hexatron-open-palette'));
      }
    },
    'edit-article': {
      id: 'edit-article',
      name: 'Edit Article',
      description: 'Update content, tags, properties and relationships',
      category: 'article',
      icon: Edit3,
      entityOnly: true,
      ownerOnly: true,
      run: () => {
        if (currentEntityId) {
          navigate(`/entity/${currentEntityId}/edit`);
        }
      }
    },
    'create-entity': {
      id: 'create-entity',
      name: 'Create New Entity',
      description: 'Add a new character, place, faction, or concept',
      category: 'article',
      icon: PlusCircle,
      ownerOnly: true,
      run: () => {
        const query = currentWorldId ? `?world=${currentWorldId}` : '';
        navigate(`/entity/new${query}`);
      }
    },
    'offline-media': {
      id: 'offline-media',
      name: 'Offline Media Storage',
      description: 'Manage downloaded images, videos, and storage limits',
      category: 'tools',
      icon: HardDrive,
      run: () => {
        setOfflineMediaOpen(true);
      }
    },
    'manage-universes': {
      id: 'manage-universes',
      name: 'Manage Universes',
      description: 'Create, edit, rename, and delete universes & worlds',
      category: 'tools',
      icon: Layers,
      ownerOnly: true,
      run: () => {
        setManageUniversesOpen(true);
      }
    },
    'export-backup': {
      id: 'export-backup',
      name: 'Export JSON Backup',
      description: 'Download full encyclopedia snapshot for safe keeping',
      category: 'tools',
      icon: Download,
      run: () => {
        setBackupModalOpen(true, 'export');
      }
    },
    'import-backup': {
      id: 'import-backup',
      name: 'Import / Restore Backup',
      description: 'Restore encyclopedia data from a local JSON backup',
      category: 'tools',
      icon: Upload,
      ownerOnly: true,
      run: () => {
        setBackupModalOpen(true, 'import');
      }
    },
    'theme': {
      id: 'theme',
      name: 'Toggle Theme',
      description: `Switch between dark and light appearance (currently ${theme})`,
      category: 'system',
      icon: theme === 'dark' ? Sun : Moon,
      run: () => {
        toggleTheme();
      }
    },
    'clear-cache': {
      id: 'clear-cache',
      name: 'Clear App Cache',
      description: 'Purge service worker cache and reload latest updates',
      category: 'system',
      icon: RotateCw,
      run: () => {
        clearCacheAndReload();
      }
    },
    'help': {
      id: 'help',
      name: 'Guide & Shortcuts',
      description: 'Markdown syntax, keyboard navigation, and tips',
      category: 'system',
      icon: HelpCircle,
      run: () => {
        navigate('/help');
      }
    }
  }), [navigate, currentEntityId, currentWorldId, theme, toggleTheme, setLeftSidebarOpen, setRightSidebarOpen, setManageUniversesOpen, setBackupModalOpen, setOfflineMediaOpen]);

  const defaultOrder = useMemo<QuickActionConfig[]>(() => [
    { id: 'tree', enabled: true },
    { id: 'search', enabled: true },
    { id: 'linked', enabled: true },
    { id: 'graph', enabled: true },
    { id: 'browse', enabled: true },
    { id: 'edit-article', enabled: true },
    { id: 'create-entity', enabled: true },
    { id: 'offline-media', enabled: true },
    { id: 'manage-universes', enabled: true },
    { id: 'export-backup', enabled: true },
    { id: 'import-backup', enabled: true },
    { id: 'theme', enabled: true },
    { id: 'clear-cache', enabled: true },
    { id: 'help', enabled: true }
  ], []);

  // Load config from localStorage
  const [config, setConfig] = useState<QuickActionConfig[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as QuickActionConfig[];
        // Merge in any new default actions that might not be in saved config
        const existingIds = new Set(parsed.map(x => x.id));
        const missing = defaultOrder.filter(x => !existingIds.has(x.id));
        return [...parsed, ...missing];
      }
    } catch {
      // Fallback
    }
    return defaultOrder;
  });

  // Save changes to localStorage
  const saveConfig = (newConfig: QuickActionConfig[]) => {
    setConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
    } catch {
      // Ignore quota errors
    }
  };

  const handleReset = () => {
    saveConfig(defaultOrder);
  };

  const handleToggle = (id: string) => {
    const updated = config.map(item =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    saveConfig(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= config.length) return;
    const next = [...config];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    saveConfig(next);
  };

  // Close on Escape
  useEffect(() => {
    if (!isQuickActionsOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isCustomizing) {
          setIsCustomizing(false);
        } else {
          setQuickActionsOpen(false);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickActionsOpen, isCustomizing, setQuickActionsOpen]);

  // Lock body scroll on mobile
  useEffect(() => {
    if (isQuickActionsOpen && window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isQuickActionsOpen]);

  // Filter actions for active view
  const activeActions = useMemo(() => {
    return config
      .filter(item => item.enabled)
      .map(item => masterActions[item.id])
      .filter((action): action is ActionDef => {
        if (!action) return false;
        if (action.ownerOnly && !isOwner) return false;
        if (action.entityOnly && !currentEntityId) return false;
        return true;
      });
  }, [config, masterActions, isOwner, currentEntityId]);

  if (!isQuickActionsOpen) return null;

  return (
    <>
      <div
        className="quick-actions-backdrop"
        onClick={() => setQuickActionsOpen(false)}
        aria-label="Close Quick Actions"
      />

      <aside className="quick-actions-panel" aria-label="Quick Actions & Tools">
        {/* Header */}
        <div className="qa-header">
          <div className="qa-title">
            <Zap size={18} className="text-accent" />
            <span>{isCustomizing ? 'Customize Quick Actions' : 'Quick Actions & Tools'}</span>
          </div>

          <div className="qa-header-controls">
            <button
              type="button"
              className={`icon-btn small ${isCustomizing ? 'active' : ''}`}
              onClick={() => setIsCustomizing(!isCustomizing)}
              title={isCustomizing ? 'Finish customizing' : 'Customize actions order & visibility'}
              aria-label="Customize"
            >
              {isCustomizing ? <Check size={15} /> : <Settings size={15} />}
            </button>

            <button
              type="button"
              className="icon-btn small"
              onClick={() => setQuickActionsOpen(false)}
              title="Close panel"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="qa-content">
          {isCustomizing ? (
            <div className="qa-customize-list">
              <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: 6 }}>
                Toggle which actions appear and use the arrows to reorder them:
              </p>
              {config.map((item, index) => {
                const def = masterActions[item.id];
                if (!def) return null;
                const IconComponent = def.icon;
                return (
                  <div key={item.id} className="qa-customize-row">
                    <label className="qa-customize-left" style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => handleToggle(item.id)}
                      />
                      <IconComponent size={14} className="qa-action-icon" />
                      <span className="qa-customize-name">{def.name}</span>
                    </label>

                    <div className="qa-reorder-buttons">
                      <span className="qa-customize-cat">{def.category}</span>
                      <button
                        type="button"
                        className="icon-btn small"
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'up')}
                        title="Move up"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn small"
                        disabled={index === config.length - 1}
                        onClick={() => handleMove(index, 'down')}
                        title="Move down"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="qa-category-section">
              <div className="qa-grid">
                {activeActions.map((action) => {
                  const IconComponent = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className="qa-action-card"
                      onClick={() => {
                        setQuickActionsOpen(false);
                        action.run();
                      }}
                    >
                      <IconComponent size={18} className="qa-action-icon" />
                      <div className="qa-action-texts">
                        <span className="qa-action-name">{action.name}</span>
                        <span className="qa-action-desc">{action.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isCustomizing && (
          <div className="qa-footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleReset}
              title="Reset order & visibility to default"
            >
              <RotateCcw size={13} style={{ marginRight: 4 }} />
              Reset Defaults
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsCustomizing(false)}
            >
              <Check size={13} style={{ marginRight: 4 }} />
              Done
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
