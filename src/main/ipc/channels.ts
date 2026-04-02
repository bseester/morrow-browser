/**
 * IPC Kanal Tanımları — Tip-güvenli kanal isimleri
 * Tüm main ↔ renderer iletişimi bu kanallar üzerinden yapılır.
 */

export const IPC_CHANNELS = {
  // ─── Sekme Yönetimi ───
  TAB_CREATE: 'tab:create',
  TAB_CLOSE: 'tab:close',
  TAB_SWITCH: 'tab:switch',
  TAB_LIST: 'tab:list',
  TAB_UPDATE: 'tab:update',
  TAB_REORDER: 'tab:reorder',
  TAB_GROUP_CREATE: 'tab:group-create',
  TAB_GROUP_ADD: 'tab:group-add',
  TAB_GROUP_REMOVE: 'tab:group-remove',
  TAB_GROUP_COLLAPSE: 'tab:group-collapse',
  TAB_TOGGLE_PIP: 'tab:toggle-pip',
  TAB_EXECUTE_JS: 'tab:execute-js',
  TAB_GET_ZOOM_LEVEL: 'tab:get-zoom-level',
  TAB_SET_ZOOM_LEVEL: 'tab:set-zoom-level',

  // ─── Navigasyon ───
  NAV_GO: 'nav:go',
  NAV_BACK: 'nav:back',
  NAV_FORWARD: 'nav:forward',
  NAV_RELOAD: 'nav:reload',
  NAV_STOP: 'nav:stop',
  NAV_URL_UPDATED: 'nav:url-updated', // main → renderer bildirim
  NAV_LOADING: 'nav:loading',         // main → renderer bildirim
  NAV_TITLE_UPDATED: 'nav:title-updated',
  NAV_FULLSCREEN_UPDATE: 'nav:fullscreen-update',
  NAV_PRINT: 'nav:print',
  NAV_PRINT_PDF: 'nav:print-pdf',

  // ─── Pencere Kontrolleri ───
  WIN_MINIMIZE: 'win:minimize',
  WIN_MAXIMIZE: 'win:maximize',
  WIN_CLOSE: 'win:close',
  WIN_IS_MAXIMIZED: 'win:is-maximized',
  WIN_STATE_CHANGED: 'win:state-changed',

  // ─── Geçmiş & Yer İmleri ───
  HISTORY_GET: 'history:get',
  HISTORY_CLEAR: 'history:clear',
  BOOKMARKS_GET: 'bookmarks:get',
  BOOKMARKS_ADD: 'bookmarks:add',
  BOOKMARKS_REMOVE: 'bookmarks:remove',

  // ─── İndirme ───
  DOWNLOAD_START: 'download:start',
  DOWNLOAD_PROGRESS: 'download:progress',
  DOWNLOAD_COMPLETE: 'download:complete',

  // ─── Sayfa İçi Arama ───
  FIND_IN_PAGE: 'find:in-page',
  FIND_STOP: 'find:stop',

  // ─── Çalışma Alanları ───
  WORKSPACE_LIST: 'workspace:list',
  WORKSPACE_CREATE: 'workspace:create',
  WORKSPACE_SWITCH: 'workspace:switch',

  // ─── Eklentiler ───
  EXTENSION_LOAD: 'extension:load',
  EXTENSION_REMOVE: 'extension:remove',
  EXTENSION_LIST: 'extension:list',
  EXTENSION_INSTALL_CRX: 'extension:install-crx',

  // ─── Genel & Sistem ───
  APP_INFO: 'app:info',
  SYSTEM_GET_PERFORMANCE_METRICS: 'system:get-performance-metrics',
  SYSTEM_KILL_PROCESS: 'system:kill-process',
  SYSTEM_SET_RAM_LIMITER_ENABLED: 'system:set-ram-limiter-enabled',
  SYSTEM_SET_RAM_HARD_LIMIT: 'system:set-ram-hard-limit',
  SYSTEM_SET_RAM_SNOOZE_TIME: 'system:set-ram-snooze-time',
  SYSTEM_SET_MAX_RAM_LIMIT: 'system:set-max-ram-limit',
  SYSTEM_SET_NETWORK_LIMIT: 'system:set-network-limit',
  SYSTEM_SET_TURBO_MODE: 'system:set-turbo-mode',
  SYSTEM_DEEP_CLEAN: 'system:deep-clean',
  APP_CHECK_UPDATE: 'app:check-update',

  // ─── Temizleyici (Cleaner) ───
  SYSTEM_GET_CACHE_SIZE: 'system:get-cache-size',
  SYSTEM_CLEAR_CACHE: 'system:clear-cache',
  SYSTEM_GET_COOKIES_COUNT: 'system:get-cookies-count',
  SYSTEM_CLEAR_COOKIES: 'system:clear-cookies',
  DOWNLOADS_CLEAR_HISTORY: 'downloads:clear-history',
  
  // Custom Additions
  NAV_FAVICON_UPDATED: 'nav:favicon-updated',
  TAB_LIST_UPDATED: 'tab:list-updated',

  // Translation
  TAB_TRANSLATE: 'tab:translate',
  TAB_TRANSLATE_TOGGLE: 'tab:translate-toggle',
  TAB_TRANSLATE_CLOSE: 'tab:translate-close',
} as const;

/** Tüm kanal isimlerinin tipi */
export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
