/**
 * Local Storage and In-Memory Cache Manager
 * Provides fast local caching for sales rows, pricing catalog, and generated pricing results.
 */

const CACHE_PREFIX = "nykaa_pricing_app_v2_";
const MEMORY_CACHE = new Map();

function isStorageAvailable() {
  try {
    return typeof window !== "undefined" && typeof sessionStorage !== "undefined" && sessionStorage !== null;
  } catch {
    return false;
  }
}

export const StorageCache = {
  get(key) {
    if (MEMORY_CACHE.has(key)) {
      return MEMORY_CACHE.get(key);
    }
    if (isStorageAvailable()) {
      try {
        const serialized = sessionStorage.getItem(CACHE_PREFIX + key);
        if (serialized) {
          const data = JSON.parse(serialized);
          MEMORY_CACHE.set(key, data);
          return data;
        }
      } catch (e) {
        console.warn("StorageCache read failed for key:", key, e);
      }
    }
    return null;
  },

  set(key, data) {
    MEMORY_CACHE.set(key, data);
    if (isStorageAvailable()) {
      try {
        sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
      } catch (e) {
        // If sessionStorage quota is exceeded, memory cache still holds the data
        console.warn("StorageCache write failed for key (using in-memory fallback):", key, e);
      }
    }
  },

  has(key) {
    if (MEMORY_CACHE.has(key)) return true;
    if (isStorageAvailable()) {
      try {
        return sessionStorage.getItem(CACHE_PREFIX + key) !== null;
      } catch {
        return false;
      }
    }
    return false;
  },

  clear() {
    MEMORY_CACHE.clear();
    if (isStorageAvailable()) {
      try {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => sessionStorage.removeItem(k));
      } catch (e) {
        console.warn("StorageCache clear failed:", e);
      }
    }
  }
};
