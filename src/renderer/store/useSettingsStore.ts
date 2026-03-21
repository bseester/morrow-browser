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

// Opera GX tarzı tam temalar (Kullanıcı İsteği)
export const GX_THEMES = [
  {
    id: 'pink-orange',
    name: 'Pembe Turuncu',
    emoji: '🌸',
    accent: '#ec4899', // Pembe yapı
    bg: '#1a0a0f',
    bgSecondary: '#251016',
    preview: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)', // Pembe -> Turuncu
  },
  {
    id: 'blue-turquoise',
    name: 'Mavi Turkuaz',
    emoji: '🌊',
    accent: '#3b82f6', // Mavi
    bg: '#0a101a',
    bgSecondary: '#101826',
    preview: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', // Mavi -> Turkuaz (Camgöbeği)
  },
  {
    id: 'blue-green',
    name: 'Mavi Yeşil',
    emoji: '🍃',
    accent: '#3b82f6', // Mavi
    bg: '#0a1210',
    bgSecondary: '#101c18',
    preview: 'linear-gradient(135deg, #3b82f6 0%, #22c55e 100%)', // Mavi -> Yeşil
  },
  {
    id: 'purple-cyan',
    name: 'Mor Camgöbeği',
    emoji: '🔮',
    accent: '#a855f7', // Mor
    bg: '#100a1a',
    bgSecondary: '#181026',
    preview: 'linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)', // Mor -> Camgöbeği
  },
] as const;

export type GXThemeId = typeof GX_THEMES[number]['id'];

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
  gxTheme: string; // GX tema id, boşsa GX tema uygulanmaz

  // Arama & Başlangıç
  searchEngine: string;
  homepage: string;
  adblockEnabled: boolean;
  tabGroupingEnabled: boolean;
  sidebarPerformanceEnabled: boolean;
  sidebarCleanerEnabled: boolean;

  // Performans
  ramSnoozeTime: number; // 0 = Kapalı, dakika cinsinden
  networkSpeedLimit: number; // 0 = Sınırsız, Mbps cinsinden
  networkLimiterEnabled: boolean;
  maxRamLimit: number; // 0 = Sınırsız, MB cinsinden
  ramLimiterEnabled: boolean;
  ramHardLimit: boolean;

  // Aksiyonlar
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setAccentColor: (color: string) => void;
  setGxTheme: (id: string) => void;
  setSearchEngine: (engine: string) => void;
  setHomepage: (url: string) => void;
  setAdblockEnabled: (enabled: boolean) => void;
  setTabGroupingEnabled: (enabled: boolean) => void;
  setSidebarPerformanceEnabled: (enabled: boolean) => void;
  setSidebarCleanerEnabled: (enabled: boolean) => void;
  setRamSnoozeTime: (time: number) => void;
  setNetworkSpeedLimit: (limit: number) => void;
  setNetworkLimiterEnabled: (enabled: boolean) => void;
  setMaxRamLimit: (limit: number) => void;
  setRamLimiterEnabled: (enabled: boolean) => void;
  setRamHardLimit: (hard: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarWidth: 52,
      theme: 'dark',
      accentColor: '#6366f1',
      gxTheme: '',
      searchEngine: 'google',
      homepage: 'about:blank',
      adblockEnabled: true,
      tabGroupingEnabled: true,
      sidebarPerformanceEnabled: true,
      sidebarCleanerEnabled: false,
      ramSnoozeTime: 0,
      networkSpeedLimit: 0,
      networkLimiterEnabled: false,
      maxRamLimit: 0,
      ramLimiterEnabled: false,
      ramHardLimit: false,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarWidth: (width) =>
        set({ sidebarWidth: width }),

      setTheme: (theme) =>
        set({ theme }),

      setAccentColor: (color) =>
        set({ accentColor: color }),

      setGxTheme: (id) => set({ gxTheme: id }),

      setSearchEngine: (engine) =>
        set({ searchEngine: engine }),

      setHomepage: (url) =>
        set({ homepage: url }),

      setAdblockEnabled: (enabled) =>
        set({ adblockEnabled: enabled }),
      setTabGroupingEnabled: (enabled) =>
        set({ tabGroupingEnabled: enabled }),
      setSidebarPerformanceEnabled: (enabled) =>
        set({ sidebarPerformanceEnabled: enabled }),
      setSidebarCleanerEnabled: (enabled) =>
        set({ sidebarCleanerEnabled: enabled }),

      setRamSnoozeTime: (time) => {
        set({ ramSnoozeTime: time });
        (window as any).electronAPI?.system?.setRamSnoozeTime?.(time);
      },

      setNetworkSpeedLimit: (limit) => {
        set({ networkSpeedLimit: limit });
        (window as any).electronAPI?.system?.setNetworkLimit?.(limit);
      },

      setNetworkLimiterEnabled: (enabled) => {
        set({ networkLimiterEnabled: enabled });
        // Eğer devre dışı bırakılıyorsa hızı 0 yapıp gönder
        const { networkSpeedLimit } = useSettingsStore.getState();
        (window as any).electronAPI?.system?.setNetworkLimit?.(enabled ? networkSpeedLimit : 0);
      },

      setMaxRamLimit: (limit) => {
        set({ maxRamLimit: limit });
        (window as any).electronAPI?.system?.setMaxRamLimit?.(limit);
      },

      setRamLimiterEnabled: (enabled) => {
        set({ ramLimiterEnabled: enabled });
        (window as any).electronAPI?.system?.setRamLimiterEnabled?.(enabled);
      },

      setRamHardLimit: (hard) => {
        set({ ramHardLimit: hard });
        (window as any).electronAPI?.system?.setRamHardLimit?.(hard);
      },
    }),
    {
      name: 'morrow-settings',
      // Sadece kalıcı olması gereken alanları seç
      partialize: (state) => ({
        theme: state.theme,
        accentColor: state.accentColor,
        gxTheme: state.gxTheme,
        searchEngine: state.searchEngine,
        homepage: state.homepage,
        sidebarCollapsed: state.sidebarCollapsed,
        adblockEnabled: state.adblockEnabled,
        tabGroupingEnabled: state.tabGroupingEnabled,
        sidebarPerformanceEnabled: state.sidebarPerformanceEnabled,
        sidebarCleanerEnabled: state.sidebarCleanerEnabled,
        ramSnoozeTime: state.ramSnoozeTime,
        networkSpeedLimit: state.networkSpeedLimit,
        networkLimiterEnabled: state.networkLimiterEnabled,
        maxRamLimit: state.maxRamLimit,
        ramLimiterEnabled: state.ramLimiterEnabled,
        ramHardLimit: state.ramHardLimit,
      }),
    }
  )
);
