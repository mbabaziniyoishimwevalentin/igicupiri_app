import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Simple JSON storage helper usable on web and native
// Web: localStorage; Native: Expo SecureStore
export const storage = {
  async set(key: string, value: any) {
    const payload = JSON.stringify(value);
    if (isWeb) {
      try { localStorage.setItem(key, payload); } catch {}
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SecureStore = require('expo-secure-store');
      await SecureStore.setItemAsync(key, payload);
    } catch {}
  },
  async get<T = any>(key: string, fallback: T): Promise<T> {
    if (isWeb) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
      } catch { return fallback; }
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SecureStore = require('expo-secure-store');
      const raw = await SecureStore.getItemAsync(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch { return fallback; }
  },
  async remove(key: string) {
    if (isWeb) {
      try { localStorage.removeItem(key); } catch {}
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SecureStore = require('expo-secure-store');
      await SecureStore.deleteItemAsync(key);
    } catch {}
  }
};

export default storage;
