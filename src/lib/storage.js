/**
 * localStorage-based persistence layer.
 * API is intentionally kept async (returns Promises) so callers don't need
 * to change if the backing store is swapped out later.
 *
 * All values are JSON-serialised before writing and deserialised on read.
 */

const PREFIX = "ai-chat:";

export const store = {
  /** Read a value. Returns `fallback` (default null) when the key is absent. */
  async get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  /** Write a value. Silently swallows QuotaExceededError. */
  async set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (err) {
      console.warn("[store] set failed:", err);
    }
  },

  /** Delete a key. */
  async del(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {}
  },

  /**
   * List all keys that start with `prefix`.
   * Returns bare key names (without the global PREFIX).
   */
  async list(prefix = "") {
    try {
      const full = PREFIX + prefix;
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(full))
        .map((k) => k.slice(PREFIX.length));
    } catch {
      return [];
    }
  },
};
