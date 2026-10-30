// src/App.tsx — router

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import AppShell from './components/layout/AppShell';
import HomePage from './pages/HomePage';
import WorldPage from './pages/WorldPage';
import EntityPage from './pages/EntityPage';
import EntityEditPage from './pages/EntityEditPage';
import SearchPage from './pages/SearchPage';
import NewWorldPage from './pages/NewWorldPage';
import HelpPage from './pages/HelpPage';
import GraphPage from './pages/GraphPage';
import WelcomePage from './pages/WelcomePage';
import { db } from './db/schema';
import { seedBuiltIns } from './db/seed';
import { ensureEntityEntryNumbers, autoLinkEntitiesInWorld } from './db/operations';
import { importAurytharData } from './db/importAurythar';
import { useAppStore } from './store/appStore';
import type { User } from '@supabase/supabase-js';
import { getCurrentUser, subscribeToAuthState, isCloudConfigured } from './services/supabase';
import { syncPublishedDataFromCloud, syncArmanitesToCloud, checkArmaniteCloudStatus, syncPendingLocalEditsToCloud } from './services/cloudSync';
import { importArmaniteLore } from './db/importArmanites';

function AppInit({ children }: { children: React.ReactNode }) {
  const { theme, setCurrentUser, bumpUniverseVersion } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    // 1. Subscribe to owner auth state changes & auto-sync pending edits to cloud
    const handleAuthChange = async (user: User | null) => {
      setCurrentUser(user);
      if (user && isCloudConfigured()) {
        try {
          await syncPendingLocalEditsToCloud(user);
        } catch (err) {
          console.warn('[AppInit] Owner cloud auto-sync check error:', err);
        }
      }
    };

    getCurrentUser().then(handleAuthChange);
    const authSub = subscribeToAuthState(handleAuthChange);

    // 2. Initialize database
    seedBuiltIns()
      .then(() => ensureEntityEntryNumbers())
      .then(async () => {
        // Prune local ghost universes
        try {
          const ghosts = await db.universes.where('title').equals('My Universe').toArray();
          for (const g of ghosts) {
            await db.universes.delete(g.id);
          }
        } catch {
          // ignore
        }
        const AURYTHAR_DATA_VERSION = 'v6-armanites-cloud-uuid';
        const importedVersion = localStorage.getItem('hexatron-aurythar-version');

        if (isCloudConfigured()) {
          // Cloud mode: fetch published encyclopedia data for any device/visitor
          const res = await syncPublishedDataFromCloud();
          if (res.entitiesSynced > 0) {
            bumpUniverseVersion();
          }
        }

        // Always ensure Armanite data is seeded and migrated to UUIDs locally
        if (importedVersion !== AURYTHAR_DATA_VERSION) {
          await importArmaniteLore();
          localStorage.setItem('hexatron-aurythar-version', AURYTHAR_DATA_VERSION);
          localStorage.setItem('hexatron-aurythar-imported', 'true');
          bumpUniverseVersion();
        }
        await autoLinkEntitiesInWorld();
      })
      .catch(console.error);

    // Request persistent storage (prevents IndexedDB eviction on mobile)
    if (navigator.storage?.persist) navigator.storage.persist();

    return () => authSub.unsubscribe();
  }, []);

  return <>{children}</>;
}

function FavoritesRouteHandler() {
  const { setFavoriteModalOpen } = useAppStore();
  useEffect(() => {
    setFavoriteModalOpen(true);
  }, [setFavoriteModalOpen]);
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="universe/:universeId" element={<HomePage />} />
            <Route path="world/:worldId" element={<WorldPage />} />
            <Route path="world/:worldId/graph" element={<GraphPage />} />
            <Route path="world/:worldId/new-entity" element={<EntityEditPage />} />
            <Route path="entity/:entityId" element={<EntityPage />} />
            <Route path="entity/:entityId/edit" element={<EntityEditPage mode="edit" />} />
            <Route path="entity/:entityId/graph" element={<GraphPage />} />
            <Route path="graph" element={<GraphPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="new-world" element={<NewWorldPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="welcome" element={<WelcomePage />} />
            <Route path="about" element={<WelcomePage />} />
            <Route path="guide" element={<WelcomePage />} />
            <Route path="recent" element={<Navigate to="/" />} />
            <Route path="favorites" element={<FavoritesRouteHandler />} />
            <Route path="settings" element={<Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </AppInit>
    </BrowserRouter>
  );
}
