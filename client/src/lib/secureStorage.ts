import { Capacitor } from "@capacitor/core";
import { registerPlugin } from "@capacitor/core";

type SecureStoragePlugin = {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
  clear(): Promise<void>;
};

const SecureStorage = registerPlugin<SecureStoragePlugin>("SecureStorage");

/**
 * Native secure storage for refresh token on mobile.
 * Web: returns null / no-op (web uses HttpOnly cookie for refresh token).
 */
export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return null;
    const { value } = await SecureStorage.get({ key });
    return value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await SecureStorage.set({ key, value });
  },

  async remove(key: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await SecureStorage.remove({ key });
  },

  async clear(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    await SecureStorage.clear();
  },
};
