// src/utils/clearCache.ts
// Clears PWA Service Workers, CacheStorage, and reloads the application

export async function clearCacheAndReload(): Promise<void> {
  try {
    // 1. Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }

    // 2. Clear CacheStorage
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
  } catch (err) {
    console.warn('Error clearing cache:', err);
  }

  // 3. Force reload with cache buster query parameter
  const url = new URL(window.location.href);
  url.searchParams.set('_reload', Date.now().toString());
  window.location.href = url.toString();
}

