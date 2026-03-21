/**
 * useSettingsStore — Uygulama ayarları için Zustand store
 * Persist middleware ile ayarlar localStorage'a kaydedilir.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const ACCENT_PRESETS = [
  { name: 'İndigo', value: '#6366f1' },
  { name: 'Mavi', value: '#3b82f6' },
  { name: 'Camgöbeği', value: '#06b6d4' },
  { name: 'Yeşil', value: '#22c55e' },
  { name: 'Turuncu', value: '#f97316' },
  { name: 'Pembe', value: '#ec4899' },
  { name: 'Kırmızı', value: '#ef4444' },
  { name: 'Mor', value: '#a855f7' },
] as const;

export const SEARCH_ENGINES = [
  { name: 'Google', value: 'google', url: 'https://www.google.com/search?q=' },
  { name: 'Bing', value: 'bing', url: 'https://www.bing.com/search?q=' },
  { name: 'DuckDuckGo', value: 'duckduckgo', url: 'https://duckduckgo.com/?q=' },
  { name: 'Yandex', value: 'yandex', url: 'https://yandex.com/search/?text=' },
] as const;

interface SettingsState {
  // Görünüm
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  theme: 'dark' | 'light';
  accentColor: string;

  // Arama & Başlangıç
  searchEngine: string;
  homepage: string;

  // Güvenlik / Filtreleme
  adblockEnabled: boolean;

  // Performans
  ramSnoozeTime: number; // 0 = Kapalı, dakika cinsinden
  networkSpeedLimit: number; // 0 = Sınırsız, Mbps cinsinden
  maxRamLimit: number; // 0 = Sınırsız, MB cinsinden

  // Aksiyonlar
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setAccentColor: (color: string) => void;
  setSearchEngine: (engine: string) => void;
  setHomepage: (url: string) => void;
  setAdblockEnabled: (enabled: boolean) => void;
  setRamSnoozeTime: (time: number) => void;
  setNetworkSpeedLimit: (limit: number) => void;
  setMaxRamLimit: (limit: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarWidth: 52,
      theme: 'dark',
      accentColor: '#6366f1',
      searchEngine: 'google',
      homepage: 'about:blank',
      adblockEnabled: true,
      ramSnoozeTime: 0,
      networkSpeedLimit: 0,
      maxRamLimit: 0,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarWidth: (width) =>
        set({ sidebarWidth: width }),

      setTheme: (theme) =>
        set({ theme }),

      setAccentColor: (color) =>
        set({ accentColor: color }),

      setSearchEngine: (engine) =>
        set({ searchEngine: engine }),

      setHomepage: (url) =>
        set({ homepage: url }),

      setAdblockEnabled: (enabled) =>
        set({ adblockEnabled: enabled }),

      setRamSnoozeTime: (time) =>
        set({ ramSnoozeTime: time }),

      setNetworkSpeedLimit: (limit) =>
        set({ networkSpeedLimit: limit }),

      setMaxRamLimit: (limit) =>
        set({ maxRamLimit: limit }),
    }),
    {
      name: 'morrow-settings',
      // Sadece kalıcı olması gereken alanları seç
      partialize: (state) => ({
        theme: state.theme,
        accentColor: state.accentColor,
        searchEngine: state.searchEngine,
        homepage: state.homepage,
        sidebarCollapsed: state.sidebarCollapsed,
        adblockEnabled: state.adblockEnabled,
        ramSnoozeTime: state.ramSnoozeTime,
        networkSpeedLimit: state.networkSpeedLimit,
        maxRamLimit: state.maxRamLimit,
      }),
    }
  )
);
