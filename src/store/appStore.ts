// src/store/appStore.ts
// Global Zustand store — UI state only (not DB data)

import { create } from 'zustand';

import type { User } from '@supabase/supabase-js';

interface AppStore {
  // Current navigation context
  currentWorldId: string | null;
  currentEntityId: string | null;

  // Authentication & Access Control
  currentUser: User | null;
  isOwner: boolean;
  setCurrentUser: (user: User | null) => void;

  // Sidebar state
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;

  // Theme
  theme: 'dark' | 'light';

  // Recent history (entity IDs)
  recentEntityIds: string[];

  // Favorites (entity IDs and world IDs)
  favoriteEntityIds: string[];
  favoriteWorldIds: string[];
  isFavoriteModalOpen: boolean;

  // Workspace Multi-Article Tabs
  tabs: Array<{ id: string; title: string; typeId?: string; isDirty?: boolean }>;
  activeTabId: string | null;

  // Split-View
  splitViewEnabled: boolean;
  splitSecondaryId: string | null;
  splitRatio: number;

  // Reader Mode
  readerMode: boolean;

  // Manage Universes & Worlds Modal
  isManageUniversesOpen: boolean;
  universeVersion: number;

  // Backup Modal
  backupModalOpen: boolean;
  backupModalTab: 'export' | 'import';

  // Quick Actions Drawer & Tool Modals
  isQuickActionsOpen: boolean;
  isOfflineMediaOpen: boolean;

  // Actions
  setCurrentWorld: (id: string | null) => void;
  setCurrentEntity: (id: string | null) => void;
  toggleLeftSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  toggleRightSidebar: () => void;
  setRightSidebarOpen: (open: boolean) => void;
  toggleQuickActions: () => void;
  setQuickActionsOpen: (open: boolean) => void;
  setOfflineMediaOpen: (open: boolean) => void;
  toggleTheme: () => void;
  pushRecentEntity: (id: string) => void;
  toggleFavoriteEntity: (id: string) => void;
  toggleFavoriteWorld: (id: string) => void;
  setFavoriteModalOpen: (open: boolean) => void;
  openTab: (tab: { id: string; title: string; typeId?: string }) => void;
  closeTab: (id: string) => void;
  closeAllTabs: () => void;
  setTabDirty: (id: string, isDirty: boolean) => void;
  setActiveTabId: (id: string | null) => void;
  setSplitViewEnabled: (enabled: boolean) => void;
  setSplitSecondaryId: (id: string | null) => void;
  setSplitRatio: (ratio: number) => void;
  toggleReaderMode: () => void;
  setReaderMode: (enabled: boolean) => void;
  setManageUniversesOpen: (open: boolean) => void;
  bumpUniverseVersion: () => void;
  setBackupModalOpen: (open: boolean, tab?: 'export' | 'import') => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentWorldId: null,
  currentEntityId: null,
  currentUser: null,
  isOwner: false,
  setCurrentUser: (user) => set({ currentUser: user, isOwner: Boolean(user) }),
  leftSidebarOpen: typeof window !== 'undefined' ? window.innerWidth > 900 : true,
  rightSidebarOpen: false,
  isQuickActionsOpen: false,
  isOfflineMediaOpen: false,
  theme: (localStorage.getItem('hexatron-theme') as 'dark' | 'light') ?? 'dark',
  recentEntityIds: JSON.parse(localStorage.getItem('hexatron-recent') ?? '[]'),
  favoriteEntityIds: JSON.parse(localStorage.getItem('hexatron-favorite-entities') ?? '[]'),
  favoriteWorldIds: JSON.parse(localStorage.getItem('hexatron-favorite-worlds') ?? '[]'),
  isFavoriteModalOpen: false,
  tabs: JSON.parse(sessionStorage.getItem('hexatron-workspace-tabs') ?? '[]'),
  activeTabId: null,
  splitViewEnabled: false,
  splitSecondaryId: null,
  splitRatio: 50,
  readerMode: false,
  isManageUniversesOpen: false,
  universeVersion: 0,
  backupModalOpen: false,
  backupModalTab: 'export',

  setCurrentWorld: (id) => set({ currentWorldId: id }),
  setCurrentEntity: (id) => set({ currentEntityId: id }),

  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
  toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),
  setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
  toggleQuickActions: () => set((s) => ({ isQuickActionsOpen: !s.isQuickActionsOpen })),
  setQuickActionsOpen: (open) => set({ isQuickActionsOpen: open }),
  setOfflineMediaOpen: (open) => set({ isOfflineMediaOpen: open }),

  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('hexatron-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    return { theme: next };
  }),

  pushRecentEntity: (id) => set((s) => {
    const filtered = s.recentEntityIds.filter(x => x !== id);
    const next = [id, ...filtered].slice(0, 20);
    localStorage.setItem('hexatron-recent', JSON.stringify(next));
    return { recentEntityIds: next };
  }),

  toggleFavoriteEntity: (id) => set((s) => {
    const exists = s.favoriteEntityIds.includes(id);
    const next = exists ? s.favoriteEntityIds.filter(x => x !== id) : [...s.favoriteEntityIds, id];
    localStorage.setItem('hexatron-favorite-entities', JSON.stringify(next));
    return { favoriteEntityIds: next };
  }),

  toggleFavoriteWorld: (id) => set((s) => {
    const exists = s.favoriteWorldIds.includes(id);
    const next = exists ? s.favoriteWorldIds.filter(x => x !== id) : [...s.favoriteWorldIds, id];
    localStorage.setItem('hexatron-favorite-worlds', JSON.stringify(next));
    return { favoriteWorldIds: next };
  }),

  setFavoriteModalOpen: (open) => set({ isFavoriteModalOpen: open }),

  openTab: (tab) => set((s) => {
    const existingIdx = s.tabs.findIndex(t => t.id === tab.id);
    let nextTabs = s.tabs;
    if (existingIdx === -1) {
      nextTabs = [...s.tabs, { ...tab, isDirty: false }];
    } else {
      nextTabs = s.tabs.map((t, idx) => idx === existingIdx ? { ...t, title: tab.title, typeId: tab.typeId ?? t.typeId } : t);
    }
    sessionStorage.setItem('hexatron-workspace-tabs', JSON.stringify(nextTabs));
    return { tabs: nextTabs, activeTabId: tab.id };
  }),

  closeTab: (id) => set((s) => {
    const nextTabs = s.tabs.filter(t => t.id !== id);
    let nextActive = s.activeTabId;
    if (s.activeTabId === id) {
      nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].id : null;
    }
    sessionStorage.setItem('hexatron-workspace-tabs', JSON.stringify(nextTabs));
    return { tabs: nextTabs, activeTabId: nextActive };
  }),

  closeAllTabs: () => set(() => {
    sessionStorage.removeItem('hexatron-workspace-tabs');
    return { tabs: [], activeTabId: null, splitViewEnabled: false, splitSecondaryId: null };
  }),

  setTabDirty: (id, isDirty) => set((s) => {
    const nextTabs = s.tabs.map(t => t.id === id ? { ...t, isDirty } : t);
    return { tabs: nextTabs };
  }),

  setActiveTabId: (id) => set({ activeTabId: id }),
  setSplitViewEnabled: (enabled) => set({ splitViewEnabled: enabled }),
  setSplitSecondaryId: (id) => set({ splitSecondaryId: id }),
  setSplitRatio: (ratio) => set({ splitRatio: ratio }),
  toggleReaderMode: () => set((s) => ({ readerMode: !s.readerMode })),
  setReaderMode: (enabled) => set({ readerMode: enabled }),
  setManageUniversesOpen: (open) => set({ isManageUniversesOpen: open }),
  bumpUniverseVersion: () => set((s) => ({ universeVersion: s.universeVersion + 1 })),
  setBackupModalOpen: (open, tab = 'export') => set({ backupModalOpen: open, backupModalTab: tab }),
}));
