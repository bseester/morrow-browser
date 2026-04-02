/**
 * Preload Script — Güvenli IPC Köprüsü
 *
 * contextBridge ile renderer'a güvenli bir API sunar.
 * Node.js API'leri renderer'a ASLA doğrudan açılmaz.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './ipc/channels';

/**
 * Renderer'a açılan güvenli API
 * window.electronAPI olarak erişilebilir
 */
const electronAPI = {
  // ─── Sekme Yönetimi ───
  tabs: {
    create: (url?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAB_CREATE, url),
    close: (tabId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAB_CLOSE, tabId),
    switchTo: (tabId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAB_SWITCH, tabId),
    getList: () =>
      ipcRenderer.invoke(IPC_CHANNELS.TAB_LIST),
    reorder: (activeId: number, overId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAB_REORDER, activeId, overId),
    showContextMenu: (tabId: number, isPinned: boolean) =>
      ipcRenderer.invoke('tab:show-context-menu', tabId, isPinned),
    closeAll: () => ipcRenderer.invoke('tabs:close-all'),
    panic: (url?: string) => ipcRenderer.invoke('tabs:panic', url),

    togglePip: () => ipcRenderer.invoke(IPC_CHANNELS.TAB_TOGGLE_PIP),
    executeJavaScript: (script: string, tabId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAB_EXECUTE_JS, script, tabId),
    getZoomFactor: (tabId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAB_GET_ZOOM_LEVEL, tabId),
    setZoomFactor: (factor: number, tabId?: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAB_SET_ZOOM_LEVEL, factor, tabId),
    onUpdate: (callback: (data: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: unknown) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.TAB_UPDATE, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.TAB_UPDATE, listener);
    },
    group: {
      create: (tabIds: number[], title?: string, color?: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.TAB_GROUP_CREATE, tabIds, title, color),
      addTab: (tabId: number, groupId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.TAB_GROUP_ADD, tabId, groupId),
      removeTab: (tabId: number) =>
        ipcRenderer.invoke(IPC_CHANNELS.TAB_GROUP_REMOVE, tabId),
      toggleCollapse: (groupId: string) =>
        ipcRenderer.invoke(IPC_CHANNELS.TAB_GROUP_COLLAPSE, groupId),
    },
    translate: () =>
      ipcRenderer.invoke(IPC_CHANNELS.TAB_TRANSLATE),
    toggleTranslatePrompt: (bounds: { x: number, y: number }) =>
      ipcRenderer.invoke(IPC_CHANNELS.TAB_TRANSLATE_TOGGLE, bounds),
    closeTranslatePrompt: () =>
      ipcRenderer.invoke(IPC_CHANNELS.TAB_TRANSLATE_CLOSE),
  },

  // ─── Navigasyon ───
  nav: {
    go: (url: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.NAV_GO, url),
    back: () =>
      ipcRenderer.invoke(IPC_CHANNELS.NAV_BACK),
    forward: () =>
      ipcRenderer.invoke(IPC_CHANNELS.NAV_FORWARD),
    reload: () =>
      ipcRenderer.invoke(IPC_CHANNELS.NAV_RELOAD),
    stop: () =>
      ipcRenderer.invoke(IPC_CHANNELS.NAV_STOP),
    onUrlUpdated: (callback: (data: { tabId: number; url: string }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { tabId: number; url: string }) =>
        callback(data);
      ipcRenderer.on(IPC_CHANNELS.NAV_URL_UPDATED, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.NAV_URL_UPDATED, listener);
    },
    onLoading: (callback: (data: { tabId: number; isLoading: boolean }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { tabId: number; isLoading: boolean }) =>
        callback(data);
      ipcRenderer.on(IPC_CHANNELS.NAV_LOADING, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.NAV_LOADING, listener);
    },
    onTitleUpdated: (callback: (data: { tabId: number; title: string }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { tabId: number; title: string }) =>
        callback(data);
      ipcRenderer.on(IPC_CHANNELS.NAV_TITLE_UPDATED, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.NAV_TITLE_UPDATED, listener);
    },
    onFullscreenUpdate: (callback: (data: { tabId: number; isFullscreen: boolean }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { tabId: number; isFullscreen: boolean }) =>
        callback(data);
      ipcRenderer.on(IPC_CHANNELS.NAV_FULLSCREEN_UPDATE, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.NAV_FULLSCREEN_UPDATE, listener);
    },
    print: () => ipcRenderer.invoke(IPC_CHANNELS.NAV_PRINT),
    printToPDF: () => ipcRenderer.invoke(IPC_CHANNELS.NAV_PRINT_PDF),
  },

  // ─── Pencere Kontrolleri ───
  window: {
    minimize: () =>
      ipcRenderer.invoke(IPC_CHANNELS.WIN_MINIMIZE),
    maximize: () =>
      ipcRenderer.invoke(IPC_CHANNELS.WIN_MAXIMIZE),
    close: () =>
      ipcRenderer.invoke(IPC_CHANNELS.WIN_CLOSE),
    isMaximized: () =>
      ipcRenderer.invoke(IPC_CHANNELS.WIN_IS_MAXIMIZED),
    onStateChanged: (callback: (data: { isMaximized: boolean }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { isMaximized: boolean }) =>
        callback(data);
      ipcRenderer.on(IPC_CHANNELS.WIN_STATE_CHANGED, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.WIN_STATE_CHANGED, listener);
    },
  },

  // ─── Geçmiş ───
  history: {
    get: (limit?: number) => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_GET, limit),
    clear: () => ipcRenderer.invoke(IPC_CHANNELS.HISTORY_CLEAR),
    search: (query: string, limit?: number) => ipcRenderer.invoke('history:search', query, limit),
  },

  // ─── Yer İmleri ───
  bookmarks: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_GET),
    add: (url: string, title: string, folder?: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_ADD, url, title, folder),
    remove: (id: number) => ipcRenderer.invoke(IPC_CHANNELS.BOOKMARKS_REMOVE, id),
  },

  // ─── Sayfa İçi Arama ───
  find: {
    inPage: (text: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.FIND_IN_PAGE, text),
    stop: () =>
      ipcRenderer.invoke(IPC_CHANNELS.FIND_STOP),
  },

  // ─── Dal 4: Gelişmiş Özellikler ───
  system: {
    newIncognitoWindow: () => ipcRenderer.invoke('app:new-incognito-window'),
    showMainMenu: () => ipcRenderer.invoke('app:show-main-menu'),
    toggleChromeMenu: (bounds: { x: number, y: number }) => ipcRenderer.invoke('app:toggle-chrome-menu', bounds),
    closeChromeMenu: () => ipcRenderer.invoke('app:close-chrome-menu'),
    getSuggestions: (query: string) => ipcRenderer.invoke('app:get-suggestions', query),
    setPanicSettings: (shortcut: string, url: string) => ipcRenderer.invoke('system:set-panic-settings', shortcut, url),
    getSavedPasswords: () => ipcRenderer.invoke('password:get-all'),
    deleteSavedPassword: (id: string) => ipcRenderer.invoke('password:delete', id),
    confirmSavePassword: (origin: string, username: string, pass: string) => ipcRenderer.invoke('password:confirm-save', origin, username, pass),
    onPasswordPrompt: (callback: (data: { origin: string, username: string, password: string }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('password:prompt-save', listener);
      return () => ipcRenderer.removeListener('password:prompt-save', listener);
    },
    onPasswordPromptData: (callback: (data: any) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('password:prompt-data', listener);
      return () => ipcRenderer.removeListener('password:prompt-data', listener);
    },
    onPasswordPromptResolved: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('password:prompt-resolved', listener);
      return () => ipcRenderer.removeListener('password:prompt-resolved', listener);
    },
    togglePasswordPrompt: (bounds: { x: number, y: number, data: any }) => ipcRenderer.invoke('password:toggle-prompt', bounds),
    closePasswordPrompt: (resolved?: boolean) => ipcRenderer.invoke('password:close-prompt', resolved),
    navigateMainRouter: (path: string) => ipcRenderer.invoke('system:navigate-router', path),
    setRouteState: (route: string) => ipcRenderer.invoke('system:set-route-state', route),
    onNavigateMainRouter: (callback: (path: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: string) => callback(data);
      ipcRenderer.on('system:on-navigate-router', listener);
      return () => { ipcRenderer.removeListener('system:on-navigate-router', listener); };
    },
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_INFO),
    getPerformanceMetrics: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_PERFORMANCE_METRICS),
    killProcess: (pid: number) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_KILL_PROCESS, pid),
    setRamLimiterEnabled: (enabled: boolean) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SET_RAM_LIMITER_ENABLED, enabled),
    setRamHardLimit: (hard: boolean) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SET_RAM_HARD_LIMIT, hard),
    setMaxRamLimit: (limitMb: number) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SET_MAX_RAM_LIMIT, limitMb),
    setRamSnoozeTime: (minutes: number) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SET_RAM_SNOOZE_TIME, minutes),
    setTurboMode: (enabled: boolean) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SET_TURBO_MODE, enabled),
    deepClean: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_DEEP_CLEAN),
    setNetworkLimit: (limitMbps: number) => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SET_NETWORK_LIMIT, limitMbps),
    checkUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.APP_CHECK_UPDATE),
    getCacheSize: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_CACHE_SIZE),
    clearCache: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_CLEAR_CACHE),
    getCookiesCount: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_GET_COOKIES_COUNT),
    clearCookies: () => ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_CLEAR_COOKIES),
    onUpdateStarted: (callback: (data: { version: string }) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('update:started', listener);
      return () => ipcRenderer.removeListener('update:started', listener);
    },
    onUpdateProgress: (callback: (data: { progress: number, version: string }) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('update:progress', listener);
      return () => ipcRenderer.removeListener('update:progress', listener);
    },
    onUpdateError: (callback: (data: { message: string }) => void) => {
      const listener = (_e: any, data: any) => callback(data);
      ipcRenderer.on('update:error', listener);
      return () => ipcRenderer.removeListener('update:error', listener);
    },
    isDefaultBrowser: () => ipcRenderer.invoke('system:is-default-browser'),
    setAsDefaultBrowser: () => ipcRenderer.invoke('system:set-as-default-browser'),
  },
  downloads: {
    get: () => ipcRenderer.invoke('downloads:get'),
    test: () => ipcRenderer.invoke('downloads:test'),
    action: (id: string, action: 'pause' | 'resume' | 'cancel') => ipcRenderer.invoke('downloads:action', { id, action }),
    open: (filePath: string) => ipcRenderer.invoke('downloads:open', filePath),
    onStart: (cb: any) => {
      const listener = (_e: any, data: any) => cb(data);
      ipcRenderer.on('downloads:start', listener);
      return () => ipcRenderer.removeListener('downloads:start', listener);
    },
    onProgress: (cb: any) => {
      const listener = (_e: any, data: any) => cb(data);
      ipcRenderer.on('downloads:progress', listener);
      return () => ipcRenderer.removeListener('downloads:progress', listener);
    },
    onComplete: (cb: any) => {
      const listener = (_e: any, data: any) => cb(data);
      ipcRenderer.on('downloads:complete', listener);
      return () => ipcRenderer.removeListener('downloads:complete', listener);
    },
    clearHistory: () => ipcRenderer.invoke(IPC_CHANNELS.DOWNLOADS_CLEAR_HISTORY),
  },
  adblock: {
    toggle: () => ipcRenderer.invoke('adblock:toggle'),
    getStatus: () => ipcRenderer.invoke('adblock:status'),
  },
  workspace: {
    getAll: () => ipcRenderer.invoke('workspace:get-all'),
    getActive: () => ipcRenderer.invoke('workspace:get-active'),
    setActive: (id: string) => ipcRenderer.invoke('workspace:set-active', id),
    add: (name: string, icon?: string) => ipcRenderer.invoke('workspace:add', name, icon),
    remove: (id: string) => ipcRenderer.invoke('workspace:remove', id),
  },
  sidebar: {
    setPanelWidth: (width: number) => ipcRenderer.invoke('sidebar:set-width', width),
    togglePanel: (panel: string) => ipcRenderer.invoke('sidebar:toggle-panel', panel),
    onTogglePanel: (callback: (panel: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: string) => callback(data);
      ipcRenderer.on('sidebar:on-toggle-panel', listener);
      return () => { ipcRenderer.removeListener('sidebar:on-toggle-panel', listener); };
    },
  },
  extensions: {
    load: () => ipcRenderer.invoke(IPC_CHANNELS.EXTENSION_LOAD),
    remove: (extensionId: string) => ipcRenderer.invoke(IPC_CHANNELS.EXTENSION_REMOVE, extensionId),
    list: () => ipcRenderer.invoke(IPC_CHANNELS.EXTENSION_LIST),
    installCrx: (extensionId: string) => ipcRenderer.invoke(IPC_CHANNELS.EXTENSION_INSTALL_CRX, extensionId),
  },

  // ─── Custom HTML ContextMenu ───
  contextMenu: {
    onShow: (cb: (data: any) => void) => {
      const listener = (_e: any, data: any) => cb(data);
      ipcRenderer.on('context-menu:show', listener);
      return () => { ipcRenderer.removeListener('context-menu:show', listener); };
    },
    click: (id: string) => {
      ipcRenderer.send('context-menu:click', id);
    }
  },

  // ─── Platform Bilgisi ───
  platform: process.platform as 'win32' | 'darwin' | 'linux',
};

// Güvenli köprü ile window.electronAPI olarak dışa aktar
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript tipi — renderer tarafında kullanılacak
export type ElectronAPI = typeof electronAPI;

// ─── Web Mağazası Interception ───
declare const window: any;
declare const document: any;
declare const setInterval: any;

if (typeof window !== 'undefined' && window.location.hostname.includes('chromewebstore.google.com')) {
  // Orijinal butonu tetiklemek yerine sayfanın sağ üstüne kendi Ekle butonumuzu yerleştiriyoruz
  setInterval(() => {
    if (!document || !document.documentElement) return; // DOM henüz yüklenmediyse bekle
    // Chrome'a geçin uyarı bantlarını gizle
    const alerts = document.querySelectorAll('div[role="alert"], div.msg-container, header');
    alerts.forEach((alert: any) => {
      if (alert.innerText && alert.innerText.includes('Chrome')) {
        alert.style.display = 'none';
      }
    });

    // Zaten butonumuzu eklediysek çık
    if (document.getElementById('morrow-install-btn')) return;

    const match = window.location.pathname.match(/\/([a-z]{32})(\/|$|\?)/);
    if (!match) return;

    const id = match[1];
    
    // Web store kendi DOM'unu manipüle edebildiği için Body yerine document.documentElement'e asıyoruz
    const btn = document.createElement('button');
    btn.id = 'morrow-install-btn';
    btn.innerText = '✨ Morrow Tarayıcıya Ekle';

    // CSS styling tab-manager.ts üzerinden insertCSS ile yapılır (CSP kısıtlamalarını aşmak için)

    btn.onclick = () => {
      btn.innerText = 'İndiriliyor... Lütfen Bekleyin ⏳';
      
      ipcRenderer.invoke(IPC_CHANNELS.EXTENSION_INSTALL_CRX, id).then((ext) => {
        if (ext) {
          btn.innerText = '✅ Başarıyla Kuruldu!';
          setTimeout(() => { btn.style.display = 'none'; }, 5000);
        } else {
          btn.innerText = '❌ Hata Oluştu';
          setTimeout(() => { btn.innerText = '✨ Morrow Tarayıcıya Ekle'; }, 3000);
        }
      });
    };
    
    // Web store React shadow dom vb siliyorsa, en dış objeye html etiketine ekle 
    document.documentElement.appendChild(btn);
  }, 1000);
}
