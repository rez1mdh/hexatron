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
import { seedBuiltIns } from './db/seed';
import { ensureEntityEntryNumbers, autoLinkEntitiesInWorld } from './db/operations';
import { importAurytharData } from './db/importAurythar';
import { useAppStore } from './store/appStore';
import { getCurrentUser, subscribeToAuthState, isCloudConfigured } from './services/supabase';
import { syncPublishedDataFromCloud } from './services/cloudSync';

function AppInit({ children }: { children: React.ReactNode }) {
  const { theme, setCurrentUser, bumpUniverseVersion } = useAppStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    // 1. Subscribe to owner auth state changes
    getCurrentUser().then(user => setCurrentUser(user));
    const authSub = subscribeToAuthState(user => setCurrentUser(user));

    // 2. Initialize database
    seedBuiltIns()
      .then(() => ensureEntityEntryNumbers())
      .then(async () => {
        const AURYTHAR_DATA_VERSION = 'v4-trafloriede-extended';
        const importedVersion = localStorage.getItem('hexatron-aurythar-version');

        if (isCloudConfigured()) {
          // Cloud mode: fetch published encyclopedia data for any device/visitor
          const res = await syncPublishedDataFromCloud();
          if (res.entitiesSynced > 0) {
            bumpUniverseVersion();
          } else if (importedVersion !== AURYTHAR_DATA_VERSION) {
            await importAurytharData(true);
            localStorage.setItem('hexatron-aurythar-version', AURYTHAR_DATA_VERSION);
            bumpUniverseVersion();
          }
        } else {
          // Local offline fallback
          if (importedVersion !== AURYTHAR_DATA_VERSION) {
            await importAurytharData(true);
            localStorage.setItem('hexatron-aurythar-version', AURYTHAR_DATA_VERSION);
            localStorage.setItem('hexatron-aurythar-imported', 'true');
            bumpUniverseVersion();
          }
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
            <Route path="recent" element={<Navigate to="/" />} />
            <Route path="favorites" element={<Navigate to="/" />} />
            <Route path="settings" element={<Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </AppInit>
    </BrowserRouter>
  );
}
