import { Capacitor } from "@capacitor/core";

/**
 * Preferences wrapper that:
 * - Uses @capacitor/preferences when available (native apps)
 * - Falls back to localStorage on web or when the plugin isn't installed yet
 *
 * This avoids hard build-time dependency on @capacitor/preferences (which can fail
 * in some web-only environments until `npm install` is run).
 */

type GetResult = { value: string | null };

type PreferencesLike = {
  get: (opts: { key: string }) => Promise<GetResult>;
  set: (opts: { key: string; value: string }) => Promise<void>;
  remove: (opts: { key: string }) => Promise<void>;
};

function getCapacitorPreferences(): PreferencesLike | null {
  // Only use native plugin when running in Capacitor.
  if (!Capacitor.isNativePlatform()) return null;

  // Avoid any bundler dependency on @capacitor/preferences.
  // In native builds, the plugin is available via Capacitor.Plugins.
  const plugins: any = (Capacitor as any).Plugins;
  const pref = plugins?.Preferences;
  return (pref as PreferencesLike) || null;
}

const webFallback: PreferencesLike = {
  async get({ key }) {
    return { value: localStorage.getItem(key) };
  },
  async set({ key, value }) {
    localStorage.setItem(key, value);
  },
  async remove({ key }) {
    localStorage.removeItem(key);
  },
};

export const preferences: PreferencesLike = {
  async get(opts) {
    const cap = getCapacitorPreferences();
    return cap ? cap.get(opts) : webFallback.get(opts);
  },
  async set(opts) {
    const cap = getCapacitorPreferences();
    return cap ? cap.set(opts) : webFallback.set(opts);
  },
  async remove(opts) {
    const cap = getCapacitorPreferences();
    return cap ? cap.remove(opts) : webFallback.remove(opts);
  },
};
