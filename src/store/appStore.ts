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

  // Manage Universes & Worlds Modal
  isManageUniversesOpen: boolean;
  universeVersion: number;

  // Backup Modal
  backupModalOpen: boolean;
  backupModalTab: 'export' | 'import';

  // Actions
  setCurrentWorld: (id: string | null) => void;
  setCurrentEntity: (id: string | null) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  toggleTheme: () => void;
  pushRecentEntity: (id: string) => void;
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
  leftSidebarOpen: true,
  rightSidebarOpen: false,
  theme: (localStorage.getItem('hexatron-theme') as 'dark' | 'light') ?? 'dark',
  recentEntityIds: JSON.parse(localStorage.getItem('hexatron-recent') ?? '[]'),
  isManageUniversesOpen: false,
  universeVersion: 0,
  backupModalOpen: false,
  backupModalTab: 'export',

  setCurrentWorld: (id) => set({ currentWorldId: id }),
  setCurrentEntity: (id) => set({ currentEntityId: id }),

  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  toggleRightSidebar: () => set((s) => ({ rightSidebarOpen: !s.rightSidebarOpen })),

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

  setManageUniversesOpen: (open) => set({ isManageUniversesOpen: open }),
  bumpUniverseVersion: () => set((s) => ({ universeVersion: s.universeVersion + 1 })),
  setBackupModalOpen: (open, tab = 'export') => set({ backupModalOpen: open, backupModalTab: tab }),
}));
