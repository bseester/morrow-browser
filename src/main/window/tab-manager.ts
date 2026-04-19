
/**
 * TabManager — WebContentsView tabanlı sekme izolasyonu
 *
 * Her sekme bağımsız bir WebContentsView içinde çalışır.
 * Bu sayede bir sekmedeki çökme diğerlerini etkilemez.
 */

import { BrowserWindow, app, screen, WebContentsView, powerMonitor, type WebContents, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { IPC_CHANNELS } from '../ipc/channels';
import { SiteOptimizer } from '../engine/SiteOptimizer';

export interface TabInfo {
  id: number;
  title: string;
  url: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  favicon?: string;
  workspaceId?: string;
  isIncognito?: boolean;
  isPinned?: boolean;
  isSnoozed?: boolean;
  groupId?: string;
}

export interface TabGroupInfo {
  id: string;
  title: string;
  color: string;
  collapsed: boolean;
}

export class TabManager {
  private tabs: Map<number, WebContentsView> = new Map();
  private tabWorkspaces: Map<number, string> = new Map();
  private tabOrder: number[] = [];
  private activeTabId: number | null = null;
  private mainWindow: BrowserWindow;
  private tabCounter = 0;
  private isIncognito: boolean;
  public activeWorkspace: string = 'default';
  private sidebarPanelWidth: number = 0;
  private onNavigateCallback?: (url: string, title: string) => void;
  public contextMenuCallbacks = new Map<string, () => void>(); // Custom HTML ContextMenu callback map
  private pinnedTabIds: Set<number> = new Set();
  private fullscreenTabs: Set<number> = new Set();

  // Tab Groups logic
  private tabGroups: Map<string, TabGroupInfo> = new Map();
  private tabGroupIds: Map<number, string> = new Map(); // tabId -> groupId mapping
  
  // Dynamic layout bounds from renderer
  private dynamicBounds: { x: number, y: number, width: number, height: number } | null = null;

  // Performance logic fields
  private snoozedTabs: Set<number> = new Set();
  private tabUrls: Map<number, string> = new Map();
  private tabTitles: Map<number, string> = new Map();
  private tabFavicons: Map<number, string> = new Map();
  private tabLastAccessed: Map<number, number> = new Map();
  private ramSnoozeMinutes: number = 0;
  private maxRamLimitMb: number = 0;
  private ramLimiterEnabled: boolean = false;
  private ramHardLimit: boolean = false;
  private networkSpeedLimitMbps: number = 0;
  private turboModeEnabled: boolean = false;
  private snoozeInterval: NodeJS.Timeout | null = null;
  private searchEngineUrl: string = 'https://www.google.com/search?q=';
  private panicShortcut: string = '';
  private panicUrl: string = '';

  constructor(mainWindow: BrowserWindow, isIncognito: boolean = false) {
    this.mainWindow = mainWindow;
    this.isIncognito = isIncognito;
    this.startSnoozeTimer();
  }

  public setPanicSettings(shortcut: string, url: string): void {
    this.panicShortcut = shortcut;
    this.panicUrl = url;
    console.log(`[Panic] Settings updated: ${shortcut} -> ${url}`);
  }

  public setTurboModeEnabled(enabled: boolean): void {
    this.turboModeEnabled = enabled;
    this.applyTurboMode();
  }

  private applyTurboMode(): void {
    const optimizer = SiteOptimizer.getInstance();
    
    for (const [id, view] of this.tabs) {
      const isActive = id === this.activeTabId;
      const wc = view.webContents;
      
      if (this.turboModeEnabled && isActive) {
        // Turbo Mod AÇIK ve Aktif Sekme -> En yüksek performans
        wc.setBackgroundThrottling(false);
        optimizer.applyProfile(wc, 'turbo');
      } else {
        // Diğer durumlar (Arka plan sekmeleri veya mod kapalı)
        const url = this.tabUrls.get(id) || '';
        const mode = optimizer.getOptimizationMode(url);
        optimizer.applyProfile(wc, isActive ? mode : 'powersave');
      }
    }
  }

  public getTab(id: number): WebContentsView | undefined {
    return this.tabs.get(id);
  }

  /**
   * Veritabanından sabitlenmiş sekmeleri yükler
   */
  public loadPinnedTabs(): void {
    const { getDatabase } = require('../database/db');
    const db = getDatabase();
    const pinnedTabs = db.getPinnedTabs() || [];

    for (const tab of pinnedTabs) {
      const id = this.createTab(tab.url, tab.workspaceId || 'default');
      this.pinnedTabIds.add(id);
    }
  }

  /**
   * Yeni sekme oluşturur ve WebContentsView'ı pencereye ekler
   */
  createTab(url: string = 'about:blank', workspaceId: string = this.activeWorkspace): number {
    const logPath = path.join(app.getPath('userData'), 'nav_log.txt');
    try {
      fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] createTab called with url="${url}" workspaceId="${workspaceId}"\n`);
    } catch { }

    const effectiveWorkspaceId = workspaceId || this.activeWorkspace;
    const tabId = ++this.tabCounter;
    this.tabLastAccessed.set(tabId, Date.now());

    // Dal 4: Gizli sekme veya standart partition
    const partition = this.isIncognito ? 'in-memory:incognito' : 'persist:bseester';

    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webviewTag: false,
        partition,
        plugins: true,
        preload: path.join(__dirname, '..', 'webview-preload.js'),
      },
    });

    this.tabs.set(tabId, view);
    this.tabWorkspaces.set(tabId, effectiveWorkspaceId);
    this.tabOrder.push(tabId);

    // Navigasyon olaylarını dinle
    this.attachWebContentsListeners(tabId, view.webContents);

    // Extension sistemine kaydet
    const extManager = (global as any).extensionManager;
    if (extManager) {
      view.webContents.once('did-finish-load', () => {
        if (!view.webContents.isDestroyed()) {
          extManager.addTab(view.webContents, this.mainWindow);
        }
      });
    }

    // Chrome UA zorla
    const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    view.webContents.setUserAgent(CHROME_UA);

    // Pencereye ekle (henüz görünmez)
    this.mainWindow.contentView.addChildView(view);

    // URL'ye git
    if (url !== 'about:blank') {
      view.webContents.loadURL(url);
    }

    // Bu sekmeyi aktif yap
    this.switchToTab(tabId);

    // Renderer'a bildir
    this.notifyTabUpdate();

    return tabId;
  }

  /**
   * Sekmeyi kapatır ve kaynaklarını temizler
   */
  closeTab(tabId: number): void {
    const view = this.tabs.get(tabId);
    if (!view) return;

    // Pencereden kaldır
    try {
      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.contentView.removeChildView(view);
      }
    } catch (e) {
      // Pencere kapanırken nesne yok edilmiş olabilir
    }

    // Extension sisteminden sekmeyi düşür
    const extManager = (global as any).extensionManager;
    if (extManager) extManager.removeTab(view.webContents);

    // WebContents'i destroy et (bellek sızıntısını önle)
    try {
      view.webContents.close();
    } catch (e) {
      // ignore
    }
    this.tabs.delete(tabId);
    this.tabWorkspaces.delete(tabId);
    this.snoozedTabs.delete(tabId);
    this.tabUrls.delete(tabId);
    this.tabTitles.delete(tabId);
    this.tabLastAccessed.delete(tabId);
    this.tabGroupIds.delete(tabId); // Remove from group mapping if exists
    this.tabOrder = this.tabOrder.filter(id => id !== tabId);

    // Çıkardığımız sekme ile boşalan grupları temizle (opsiyonel ama sağlıklı)
    this.cleanupEmptyGroups();

    // Aktif sekme kapatıldıysa mevcut workspace'de başka sekme bul
    if (this.activeTabId === tabId) {
      const workspaceTabs = this.tabOrder.filter(id => this.tabWorkspaces.get(id) === this.activeWorkspace);
      if (workspaceTabs.length > 0) {
        this.switchToTab(workspaceTabs[workspaceTabs.length - 1]);
      } else {
        this.activeTabId = null;
        // Optionally create new blank tab
      }
    }

    this.notifyTabUpdate();
  }

  closeOtherTabs(keepTabId: number): void {
    const ids = Array.from(this.tabs.keys());
    for (const id of ids) {
      if (id !== keepTabId) {
        this.closeTab(id);
      }
    }
  }

  /**
   * Aktif çalışma alanını değiştirir ve sekmeleri filtreler
   */
  setActiveWorkspace(workspaceId: string): void {
    this.activeWorkspace = workspaceId;

    // Aktif workspace'e ait bir tab var mı kontrol et
    const workspaceTabs = this.tabOrder.filter(id => this.tabWorkspaces.get(id) === workspaceId);
    if (workspaceTabs.length > 0) {
      this.switchToTab(workspaceTabs[workspaceTabs.length - 1]);
    } else {
      this.activeTabId = null;
    }

    this.notifyTabUpdate();
  }

  closeTabsToRight(tabId: number): void {
    const index = this.tabOrder.indexOf(tabId);
    if (index === -1) return;

    // Sağdaki tüm tabId'leri al (index'ten sonrakiler)
    const idsToClose = this.tabOrder.slice(index + 1);
    for (const id of idsToClose) {
      this.closeTab(id);
    }
  }

  /**
   * Aktif sekmeyi değiştirir
   */
  switchToTab(tabId: number): void {
    const logPath = path.join(app.getPath('userData'), 'nav_log.txt');
    try {
      fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] switchToTab called with tabId=${tabId}. Previous activeTabId=${this.activeTabId}\n`);
    } catch { }

    if (!this.tabs.has(tabId) && !this.snoozedTabs.has(tabId)) {
      try {
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] switchToTab ABORT: tabs map doesn't contain ${tabId}\n`);
      } catch { }
      return;
    }

    this.tabLastAccessed.set(tabId, Date.now());

    // Resurrect if snoozed
    if (this.snoozedTabs.has(tabId)) {
      const url = this.tabUrls.get(tabId) || 'about:blank';
      console.log(`[TabManager] Resurrecting snoozed tab ${tabId} : ${url}`);

      const partition = this.isIncognito ? 'in-memory:incognito' : 'persist:bseester';
      const view = new WebContentsView({
        webPreferences: {
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          webviewTag: false,
          partition,
          plugins: true,
          preload: path.join(__dirname, '..', 'webview-preload.js'),
        },
      });

      this.tabs.set(tabId, view);
      this.snoozedTabs.delete(tabId);
      this.attachWebContentsListeners(tabId, view.webContents);
      this.mainWindow.contentView.addChildView(view);

      view.webContents.loadURL(url);
    }

    // Önceki aktif sekmeyi gizle
    if (this.activeTabId !== null && this.activeTabId !== tabId) {
      const prevView = this.tabs.get(this.activeTabId);
      if (prevView) {
        prevView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      }
    }

    this.activeTabId = tabId;
    this.activeWorkspace = this.tabWorkspaces.get(tabId) || this.activeWorkspace;

    // Yalnızca aktif olan (workspace'e uyan) sekmeyi göster, diğerlerini gizle
    for (const [id, view] of this.tabs) {
      if (id !== tabId) {
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      }
    }

    const extManager = (global as any).extensionManager;
    const activeView = this.tabs.get(tabId);
    if (extManager && activeView) extManager.selectTab(activeView.webContents);

    this.resizeActiveTab();
    this.notifyTabUpdate();
  }

  private rendererRoute: string = '/';

  setRendererRoute(route: string): void {
    this.rendererRoute = route;
    this.resizeActiveTab();
  }

  /**
   * Renderer'dan gelen dinamik alan bilgilerini günceller
   */
  updateTabBounds(bounds: { x: number, y: number, width: number, height: number }): void {
    if (bounds.width > 0 && bounds.height > 0) {
      this.dynamicBounds = bounds;
      // console.log(`[TabBounds] Update: ${JSON.stringify(bounds)}`); // Selective debug
      this.resizeActiveTab();
    }
  }

  /**
   * Aktif sekmeyi pencere boyutuna göre yeniden boyutlandırır.
   * Top bar yüksekliği (80px) ve sidebar genişliği (64px) düşülür.
   */
  resizeActiveTab(): void {
    if (this.activeTabId === null) return;

    const view = this.tabs.get(this.activeTabId);
    if (!view || view.webContents.isDestroyed()) return;

    if (this.rendererRoute === '/settings') {
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }

    const bounds = this.mainWindow.getContentBounds();
    const url = view.webContents.getURL();
    if (url === 'about:blank' || url === '') {
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }

    const isFullscreen = this.fullscreenTabs.has(this.activeTabId);
    if (isFullscreen) {
      view.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
      return;
    }

    if (this.dynamicBounds) {
      // Prioritize renderer-reported bounds (perfect sync with UI shifts)
      view.setBounds({
        x: this.dynamicBounds.x,
        y: this.dynamicBounds.y,
        width: this.dynamicBounds.width,
        height: this.dynamicBounds.height,
      });
    } else {
      // Fallback: Hardcoded height calculation
      const TOPBAR_HEIGHT = this.mainWindow.isFullScreen() ? 0 : 80; 
      const SIDEBAR_WIDTH = this.mainWindow.isFullScreen() ? 0 : 64;
      
      view.setBounds({
        x: SIDEBAR_WIDTH + this.sidebarPanelWidth,
        y: TOPBAR_HEIGHT,
        width: Math.max(0, bounds.width - (SIDEBAR_WIDTH + this.sidebarPanelWidth)),
        height: Math.max(0, bounds.height - TOPBAR_HEIGHT),
      });

      // Request a bounds report from the renderer just in case
      this.mainWindow.webContents.send('system:request-bounds-report');
    }
  }

  setSidebarPanelWidth(width: number): void {
    this.sidebarPanelWidth = width;
    this.resizeActiveTab();
  }

  setOnNavigate(callback: (url: string, title: string) => void): void {
    this.onNavigateCallback = callback;
  }

  // ─── Navigasyon İşlevleri ───

  goToUrl(url: string): void {
    const wc = this.getActiveWebContents();
    const logPath = path.join(app.getPath('userData'), 'nav_log.txt');

    try {
      fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] goToUrl: url="${url}" activeTabId=${this.activeTabId} wcExists=${!!wc}\n`);
    } catch (err) {
      // ignore
    }

    if (!wc) {
      try {
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] wc is null, returning\n`);
      } catch { }
      return;
    }

    // Dahili "morrow://" protokollerini kontrol et
    if (url.startsWith('morrow://')) {
      const page = url.replace('morrow://', '');
      if (page === 'history' || page === 'downloads' || page === 'newtab') {
        const targetRoute = page === 'newtab' ? '/' : `/${page}`;
        
        // 1. WebContentsView'u gizle (React router görünecek)
        if (this.activeTabId !== null) {
          const view = this.tabs.get(this.activeTabId);
          if (view) {
            view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
            view.webContents.loadURL('about:blank');
          }
          
          // 2. Tab state'ini güncelle (URL çubuğu için)
          this.tabUrls.set(this.activeTabId, url);
          this.tabTitles.set(this.activeTabId, page.charAt(0).toUpperCase() + page.slice(1));
        }

        // 3. Renderer'a navigasyon sinyali gönder
        this.mainWindow.webContents.send('system:on-navigate-router', targetRoute);
        this.notifyTabUpdate();
        return;
      }
    }

    let normalizedUrl = url;
    if (!/^https?:\/\//i.test(url) && !/^file:\/\//i.test(url) && !/^about:/i.test(url) && !/^chrome-extension:\/\//i.test(url)) {
      if (url.includes('.') && !url.includes(' ')) {
        normalizedUrl = `https://${url}`;
      } else {
        normalizedUrl = `${this.searchEngineUrl}${encodeURIComponent(url)}`;
      }
    }

    try {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] loading URL: "${normalizedUrl}"\n`);
    } catch { }

    wc.loadURL(normalizedUrl);

    // Asenkron race-condition'ı önlemek için burada doğrudan genişletiyoruz
    const bounds = this.mainWindow.getContentBounds();
    const TOPBAR_HEIGHT = 80;
    const SIDEBAR_WIDTH = 64;

    const view = this.tabs.get(this.activeTabId!);
    if (view) {
      view.setBounds({
        x: SIDEBAR_WIDTH + this.sidebarPanelWidth,
        y: TOPBAR_HEIGHT,
        width: bounds.width - (SIDEBAR_WIDTH + this.sidebarPanelWidth),
        height: bounds.height - TOPBAR_HEIGHT,
      });
    }
  }

  goBack(): void {
    const wc = this.getActiveWebContents();
    if (wc?.canGoBack()) wc.goBack();
  }

  goForward(): void {
    const wc = this.getActiveWebContents();
    if (wc?.canGoForward()) wc.goForward();
  }

  reload(): void {
    const wc = this.getActiveWebContents();
    wc?.reload();
  }

  stop(): void {
    const wc = this.getActiveWebContents();
    wc?.stop();
  }

  async translateActiveTab(): Promise<void> {
    const wc = this.getActiveWebContents();
    if (!wc) return;

    try {
      console.log('[TabManager] Starting Morrow AI Translation Engine...');

      // 1. Sayfadaki metin düğümlerini daha akıllıca topla
      const textNodes = await wc.executeJavaScript(`
        (() => {
          const nodes = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              const tag = parent.tagName.toLowerCase();
              const style = window.getComputedStyle(parent);
              
              // Skip hidden elements, scripts, code, etc.
              if (['script', 'style', 'noscript', 'code', 'pre', 'canvas', 'svg'].includes(tag)) 
                return NodeFilter.FILTER_REJECT;
              if (style.display === 'none' || style.visibility === 'hidden') 
                return NodeFilter.FILTER_REJECT;
              
              const text = node.textContent.trim();
              if (text.length < 2 || /^[\\s\\d\\W]+$/.test(text)) 
                return NodeFilter.FILTER_REJECT;
                
              return NodeFilter.FILTER_ACCEPT;
            }
          });

          let node;
          let index = 0;
          while (node = walker.nextNode()) {
            node._morrow_ai_idx = index;
            nodes.push({ index, text: node.textContent.trim() });
            index++;
          }
          return nodes;
        })()
      `);

      if (!textNodes || textNodes.length === 0) {
        console.log('[TabManager] No translatable text found.');
        return;
      }

      // Morrow AI Fetch (DeepLX Engine - Premium AI Translation)
      const { net } = require('electron');
      const morrowAIFetch = (texts: string[]): Promise<string[]> => {
        return new Promise((resolve) => {
          try {
            // Using a high-performance DeepLX instance for premium non-Google translations
            const url = 'https://deeplx.pando.io/translate'; 
            const req = net.request({ url, method: 'POST' });
            req.setHeader('Content-Type', 'application/json');
            
            let body = '';
            req.on('response', (res: any) => {
              res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
              res.on('end', () => {
                try {
                  const json = JSON.parse(body);
                  if (json.code === 200 && json.data) {
                    // DeepLX handles arrays or just one string
                    resolve([json.data]); 
                  } else {
                    resolve(texts); 
                  }
                } catch { resolve(texts); }
              });
            });
            req.on('error', () => resolve(texts));
            
            req.write(JSON.stringify({
              text: texts.join(' [M_SEP] '), // Batch separator
              source_lang: "auto",
              target_lang: "TR"
            }));
            req.end();
          } catch { resolve(texts); }
        });
      };

      // 2. Metinleri daha büyük parçalar (chunks) halinde, AI performansıyla çevir
      const chunkSize = 10; // AI context'ini korumak için makul boyut
      for (let i = 0; i < textNodes.length; i += chunkSize) {
        const chunk = textNodes.slice(i, i + chunkSize);
        const chunkTexts = chunk.map((c: any) => c.text);
        
        try {
          const [batchResult] = await morrowAIFetch(chunkTexts);
          // Separator'a göre geri böl (Bazı AI'lar separator'ı bozabilir ama TR için stabil)
          const translatedParts = batchResult.split(' [M_SEP] ');

          const translations = chunk.map((item: any, idx: number) => ({
            index: item.index,
            translated: translatedParts[idx] || item.text
          }));

          // 3. Çevrilen parçayı sayfaya anında yansıt
          await wc.executeJavaScript(`
            (() => {
              const translations = ${JSON.stringify(translations)};
              const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
              let node;
              while (node = walker.nextNode()) {
                const found = translations.find(t => t.index === node._morrow_ai_idx);
                if (found) {
                  node.textContent = found.translated;
                  delete node._morrow_ai_idx;
                }
              }
            })()
          `);
        } catch (err) {
          console.warn('[TabManager] Batch translation failed, skipping chunk', err);
        }
      }

      console.log('[TabManager] Morrow AI Translation completed successfully.');
    } catch (err) {
      console.error('[TabManager] Morrow AI Translation error:', err);
    }
  }
  // ─── Yardımcılar ───

  getActiveWebContents(): WebContents | null {
    if (this.activeTabId === null) return null;
    return this.tabs.get(this.activeTabId)?.webContents ?? null;
  }

  getActiveTabId(): number | null {
    return this.activeTabId;
  }

  /**
   * Aktif sekmenin ses seviyesini Web Audio GainNode injection ile ayarlar.
   * gain: 0.0 = sessiz, 1.0 = normal, 6.0 = 600%
   */
  async setVolume(gain: number): Promise<boolean> {
    const wc = this.getActiveWebContents();
    if (!wc || wc.isDestroyed()) return false;
    console.log(`[AudioEngine] Setting volume to: ${Math.round(gain * 100)}% for tab: ${this.activeTabId}`);
    try {
      await wc.executeJavaScript(`
        (function(gain) {
          try {
            if (window.__morrow_audio_ctx && !window.__morrow_audio_ctx.closed) {
              window.__morrow_gain_node.gain.setTargetAtTime(gain, window.__morrow_audio_ctx.currentTime, 0.01);
              return;
            }
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const gainNode = ctx.createGain();
            gainNode.gain.value = gain;
            gainNode.connect(ctx.destination);
            window.__morrow_audio_ctx = ctx;
            window.__morrow_gain_node = gainNode;

            function hookEl(el) {
              if (el.__morrow_hooked) return;
              try {
                // CORS hatasını önlemek için crossOrigin denemesi
                if (el.src && !el.src.startsWith('blob:') && !el.src.startsWith('data:')) {
                   el.crossOrigin = "anonymous";
                }
                const src = ctx.createMediaElementSource(el);
                src.connect(gainNode);
                el.__morrow_hooked = true;
                console.log("[AudioEngine] Successfully hooked element:", el.tagName);
              } catch(e) {
                console.warn("[AudioEngine] Hooking failed (likely CORS):", e.message);
                // Fallback: Boost çalışmasa da max volume yap
                el.volume = 1.0; 
              }
            }
            document.querySelectorAll('audio,video').forEach(hookEl);
            const observer = new MutationObserver(() => {
              document.querySelectorAll('audio,video').forEach(hookEl);
            });
            observer.observe(document.body, { childList: true, subtree: true });
          } catch(err) {
            console.error("[AudioEngine] Injection error:", err);
          }
        })(${gain});
      `);
      return true;
    } catch(e) {
      console.error("[AudioEngine] Main process error:", e);
      return false;
    }
  }

  togglePinTab(tabId: number): void {
    if (this.pinnedTabIds.has(tabId)) {
      this.pinnedTabIds.delete(tabId);
    } else {
      this.pinnedTabIds.add(tabId);
    }

    // Sabitlenmiş sekmeleri otomatik olarak her zaman en sola al
    const pinned = this.tabOrder.filter(id => this.pinnedTabIds.has(id));
    const unpinned = this.tabOrder.filter(id => !this.pinnedTabIds.has(id));
    this.tabOrder = [...pinned, ...unpinned];

    // Veritabanını güncelle
    const { getDatabase } = require('../database/db');
    const db = getDatabase();

    const pinnedTabs = [];
    for (const id of this.tabOrder) { // Order listesinden alarak mantıksal sıralamayı koru
      if (this.pinnedTabIds.has(id)) {
        const view = this.tabs.get(id);
        if (view) {
          const wc = view.webContents;
          const wsId = this.tabWorkspaces.get(id) || 'default';
          pinnedTabs.push({
            url: wc.getURL(),
            title: wc.getTitle(),
            workspaceId: wsId
          });
        }
      }
    }
    db.setPinnedTabs(pinnedTabs);

    this.notifyTabUpdate();
  }

  getTabList(): TabInfo[] {
    const list: TabInfo[] = [];
    for (const id of this.tabOrder) {
      const wsId = this.tabWorkspaces.get(id);
      if (wsId !== this.activeWorkspace) continue; // Sadece aktif workspace

      if (this.snoozedTabs.has(id)) {
        list.push({
          id,
          title: this.tabTitles.get(id) || 'Uyutulmuş Sekme',
          url: this.tabUrls.get(id) || '',
          isLoading: false,
          canGoBack: false,
          canGoForward: false,
          workspaceId: wsId,
          isIncognito: this.isIncognito,
          isPinned: this.pinnedTabIds.has(id),
          isSnoozed: true,
          groupId: this.tabGroupIds.get(id)
        });
        continue;
      }

      const view = this.tabs.get(id);
      if (!view) continue;
      const url = this.tabUrls.get(id) || view?.webContents.getURL() || 'about:blank';
      const title = this.tabTitles.get(id) || view?.webContents.getTitle() || 'Yeni Sekme';
      const isSnoozed = this.snoozedTabs.has(id);

      const getFaviconUrl = (url: string) => {
        try {
          if (!url || url === 'about:blank') return undefined;
          const domain = new URL(url).hostname;
          return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        } catch {
          return undefined;
        }
      };

      list.push({
        id,
        url,
        title,
        isLoading: view ? view.webContents.isLoading() : false,
        canGoBack: view ? view.webContents.canGoBack() : false,
        canGoForward: view ? view.webContents.canGoForward() : false,
        favicon: getFaviconUrl(url),
        workspaceId: this.tabWorkspaces.get(id),
        isIncognito: this.isIncognito,
        isPinned: this.pinnedTabIds.has(id),
        isSnoozed,
        groupId: this.tabGroupIds.get(id)
      });
    }
    return list;
  }

  reorderTabs(activeId: number, overId: number): void {
    const oldIndex = this.tabOrder.indexOf(activeId);
    const newIndex = this.tabOrder.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;

    // Dizide yer değiştirme (Splice)
    const [movedTab] = this.tabOrder.splice(oldIndex, 1);
    this.tabOrder.splice(newIndex, 0, movedTab);

    // Sürükle-bırak sonrasında bile pinned sekmelerin arasına
    // normal sekme karışmasını engelle (Chrome mantığı)
    const pinned = this.tabOrder.filter(id => this.pinnedTabIds.has(id));
    const unpinned = this.tabOrder.filter(id => !this.pinnedTabIds.has(id));
    this.tabOrder = [...pinned, ...unpinned];

    this.notifyTabUpdate();
  }

  getTabCount(): number {
    return this.tabs.size;
  }

  /**
   * WebContents olaylarını dinler ve Renderer'a bildirim gönderir
   */
  private attachWebContentsListeners(tabId: number, wc: WebContents): void {
    console.log(`[TabManager] attachWebContentsListeners for tab ${tabId}`);

    // Panic Shortcut'ı webview içinde de yakala (Main process listener)
    wc.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && this.panicShortcut) {
        const keys = this.panicShortcut.toLowerCase().split('+');
        const hasCtrl = keys.includes('control') || keys.includes('ctrl') || keys.includes('cmd');
        const hasShift = keys.includes('shift');
        const hasAlt = keys.includes('alt');
        const mainKey = keys.find(k => !['control', 'ctrl', 'cmd', 'shift', 'alt'].includes(k));

        const ctrlMatch = (input.control || input.meta) === hasCtrl;
        const shiftMatch = input.shift === hasShift;
        const altMatch = input.alt === hasAlt;
        const keyMatch = input.key.toLowerCase() === mainKey;

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          event.preventDefault();
          console.log(`[Panic] Triggered by shortcut: ${this.panicShortcut}`);
          this.panic(this.panicUrl);
        }
      }
    });

    wc.on('did-fail-load', (_event: any, errorCode: number, errorDescription: string, validatedURL: string, isMainFrame: boolean) => {
      if (isMainFrame && errorCode !== -3) {
        console.error(`[TabManager] Load failed: ${validatedURL} (${errorDescription})`);
      }
    });

    wc.on('did-finish-load', () => {
      const url = wc.getURL();
      if (url.includes('chromewebstore.google.com/detail/')) {
        // Extension ID'yi URL'den ayıkla (Örn: .../detail/name/ID)
        const parts = url.split('/');
        const extensionId = parts[parts.length - 1]?.split('?')[0];

        if (extensionId && extensionId.length > 20) {
          // CSS Enjeksiyonu
          wc.insertCSS(`
            #morrow-install-btn {
              position: fixed !important;
              top: 80px !important;
              right: 48px !important;
              z-index: 2147483647 !important;
              background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
              color: white !important;
              padding: 12px 24px !important;
              border-radius: 12px !important;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              font-size: 14px !important;
              font-weight: 600 !important;
              cursor: pointer !important;
              border: 1px solid rgba(255,255,255,0.2) !important;
              box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.5) !important;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
              display: flex !important;
              align-items: center !important;
              gap: 8px !important;
            }
            #morrow-install-btn:hover {
              transform: translateY(-2px) !important;
              box-shadow: 0 15px 30px -5px rgba(79, 70, 229, 0.6) !important;
              filter: brightness(1.1) !important;
            }
            #morrow-install-btn:active {
              transform: translateY(0) !important;
            }
            #morrow-install-btn.loading {
              opacity: 0.7 !important;
              cursor: wait !important;
            }
          `);

          // JS Enjeksiyonu (Button Ekleme & Click Listener)
          wc.executeJavaScript(`
            (function() {
              if (document.getElementById('morrow-install-btn')) return;
              const btn = document.createElement('button');
              btn.id = 'morrow-install-btn';
              btn.innerHTML = '<span>➕</span> Morrow Browser\\'a Ekle';
              
              btn.onclick = async () => {
                if (btn.classList.contains('loading')) return;
                btn.classList.add('loading');
                btn.innerHTML = '<span>⏳</span> Yükleniyor...';
                
                try {
                  // Preload'daki window.electronAPI veya direkt ipcRenderer üzerinden çağrım
                  const result = await window.ipcRenderer.invoke('extensions:install-crx', '${extensionId}');
                  if (result) {
                    btn.style.background = '#10b981';
                    btn.innerHTML = '<span>✅</span> Eklendi';
                  } else {
                    btn.innerHTML = '<span>❌</span> Hata Oluştu';
                    btn.classList.remove('loading');
                  }
                } catch (err) {
                  console.error('Installation failed:', err);
                  btn.innerHTML = '<span>❌</span> Başarısız';
                  btn.classList.remove('loading');
                }
              };
              document.body.appendChild(btn);
            })();
          `);
        }
      }
    });

    // ─── macOS Native Gestures (Swipe, Pinch, Smart Zoom) ───
    if (process.platform === 'darwin') {
      // 1. Swipe Navigation & Reload
      (wc as any).on('swipe', (_event: any, direction: string) => {
        const { getDatabase } = require('../database/db');
        const db = getDatabase();
        const isEnabled = db.getSettings().isTouchpadGesturesEnabled;
        console.log(`[Gesture] Swipe detected: ${direction}, Enabled: ${isEnabled}`);
        if (!isEnabled) return;

        // Visual Feedback (Renderer'a bildir)
        this.sendToRenderer(IPC_CHANNELS.GESTURE_FEEDBACK, { type: 'swipe', direction });

        if (direction === 'right') {
          if (wc.canGoBack()) {
            setTimeout(() => wc.goBack(), 150); // Animasyonun görünmesi için kısa gecikme
          }
        } else if (direction === 'left') {
          if (wc.canGoForward()) {
            setTimeout(() => wc.goForward(), 150);
          }
        } else if (direction === 'down') {
           // Reload logic handled by scroll-touch-edge for more "pull" feeling if preferred,
           // but keeping swipe:down as a secondary trigger for now.
           wc.reload();
        }
      });
 
      // 2. Pinch-to-Zoom (Smooth Magnification)
      (wc as any).on('pinch-gesture', (_event: any, gestureState: string) => {
        const { getDatabase } = require('../database/db');
        const db = getDatabase();
        const isEnabled = db.getSettings().isTouchpadGesturesEnabled;
        console.log(`[Gesture] Pinch detected: ${gestureState}, Enabled: ${isEnabled}`);
        if (!isEnabled) return;
        
        // Pinch-start and Pinch-end notifications for UI
        if (gestureState === 'begin') {
           this.sendToRenderer(IPC_CHANNELS.GESTURE_FEEDBACK, { type: 'pinch', state: 'begin' });
        } else if (gestureState === 'end') {
           const zoom = wc.getZoomFactor();
           this.sendToRenderer(IPC_CHANNELS.GESTURE_FEEDBACK, { type: 'pinch', state: 'end', zoom });
        }
      });

      // 3. Scroll Edge Detection (Pull-to-Refresh & Edge Feedback)
      (wc as any).on('scroll-touch-edge', () => {
        const { getDatabase } = require('../database/db');
        const isEnabled = getDatabase().getSettings().isTouchpadGesturesEnabled;
        console.log(`[Gesture] Scroll touch edge detected, Enabled: ${isEnabled}`);
        if (!isEnabled) return;
        
        // Bu olay sayfanın en başına ulaşıldığında tetiklenir
        this.sendToRenderer(IPC_CHANNELS.GESTURE_FEEDBACK, { type: 'edge', position: 'top' });
      });
 
      // 4. Smart Zoom (Double Tap)
      (wc as any).on('smart-zoom', () => {
        const { getDatabase } = require('../database/db');
        const isEnabled = getDatabase().getSettings().isTouchpadGesturesEnabled;
        console.log(`[Gesture] Smart zoom detected, Enabled: ${isEnabled}`);
        if (!isEnabled) return;

        const currentZoom = wc.getZoomFactor();
        const targetZoom = currentZoom > 1.0 ? 1.0 : 1.5;
        wc.setZoomFactor(targetZoom);
        this.sendToRenderer(IPC_CHANNELS.GESTURE_FEEDBACK, { type: 'zoom', value: targetZoom });
      });
    }

    // ─── Native Context Menu (Dinamik Sağ Tık) ───
    wc.on('context-menu', (_event: any, params: any) => {
      const logPath = path.join(app.getPath('userData'), 'nav_log.txt');
      try {
        fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] context-menu event fired! params: x=${params.x}, y=${params.y}\n`);
      } catch { }
      const { Menu, clipboard } = require('electron');
      const template: Electron.MenuItemConstructorOptions[] = [];

      if (params.linkURL) {
        template.push({
          label: 'Bağlantıyı Yeni Sekmede Aç',
          click: () => this.createTab(params.linkURL)
        });
        template.push({
          label: 'Bağlantıyı Gizli Sekmede Aç',
          click: () => {
            // Placeholder: Gelecekte Gizli sekme IPC'sine bağlanabilir
          }
        });
        template.push({ type: 'separator' });
        template.push({
          label: 'Bağlantı Adresini Kopyala',
          click: () => clipboard.writeText(params.linkURL)
        });
      }

      if (params.hasImageContents) {
        if (params.linkURL) template.push({ type: 'separator' });
        template.push({
          label: 'Resmi Yeni Sekmede Aç',
          click: () => this.createTab(params.srcURL)
        });
        template.push({
          label: 'Resim Adresini Kopyala',
          click: () => clipboard.writeText(params.srcURL)
        });
        template.push({
          label: 'Resmi Google Lens İle Ara',
          click: () => this.createTab(`https://lens.google.com/uploadbyurl?url=${encodeURIComponent(params.srcURL)}`)
        });
      }

      if (params.mediaType === 'video') {
        if (template.length > 0) template.push({ type: 'separator' });
        template.push({
          label: 'Resim İçinde Resim (PiP)',
          click: () => {
            wc.executeJavaScript(`
              (async () => {
                const el = document.elementFromPoint(${params.x}, ${params.y});
                const video = el?.tagName === 'VIDEO' ? el : el?.querySelector('video') || document.querySelector('video');
                if (video) {
                  try {
                    if (document.pictureInPictureElement) {
                      await document.exitPictureInPicture();
                    } else {
                      await video.requestPictureInPicture();
                    }
                  } catch (e) {
                    console.error('PiP error from context menu:', e);
                  }
                }
              })()
            `);
          }
        });
      }

      if (params.selectionText) {
        if (template.length > 0) template.push({ type: 'separator' });
        template.push({ role: 'copy', label: 'Kopyala' });
        template.push({
          label: `Seçili metni ara`,
          click: () => this.createTab(`${this.searchEngineUrl}${encodeURIComponent(params.selectionText)}`)
        });
      } else if (params.isEditable) {
        // Metin kutusundaysak
        template.push({ role: 'undo', label: 'Geri Al' });
        template.push({ role: 'redo', label: 'Yinele' });
        template.push({ type: 'separator' });
        template.push({ role: 'cut', label: 'Kes' });
        template.push({ role: 'copy', label: 'Kopyala' });
        template.push({ role: 'paste', label: 'Yapıştır' });
        template.push({ role: 'selectAll', label: 'Tümünü Seç' });

        // Yazım denetimi önerileri eklenebilir (önce spellchecker api'den geliyor)
        if (params.dictionarySuggestions.length > 0) {
          template.push({ type: 'separator' });
          for (const suggestion of params.dictionarySuggestions) {
            template.push({
              label: suggestion,
              click: () => wc.replaceMisspelling(suggestion)
            });
          }
          template.push({
            label: 'Sözlüğe Ekle',
            click: () => wc.session.addWordToSpellCheckerDictionary(params.misspelledWord)
          });
        }
      }

      // Standart Sayfa İşlemleri (Hiçbir şeye tıklanmadıysa)
      if (!params.linkURL && !params.hasImageContents && !params.selectionText && !params.isEditable) {
        template.push({
          label: 'Geri',
          enabled: wc.navigationHistory.canGoBack(),
          click: () => wc.navigationHistory.goBack()
        });
        template.push({
          label: 'İleri',
          enabled: wc.navigationHistory.canGoForward(),
          click: () => wc.navigationHistory.goForward()
        });
        template.push({
          label: 'Yeniden Yükle',
          click: () => wc.reload()
        });
        template.push({ type: 'separator' });

        template.push({
          label: 'Farklı Kaydet...',
          click: () => {
            const { dialog } = require('electron');
            dialog.showSaveDialog(this.mainWindow, {
              defaultPath: wc.getTitle() + '.html',
              filters: [{ name: 'Web Sayfası', extensions: ['html', 'htm'] }]
            }).then((result: any) => {
              if (result.filePath) {
                wc.savePage(result.filePath, 'HTMLComplete').catch(console.error);
              }
            });
          }
        });

        template.push({
          label: 'Yazdır...',
          click: () => wc.print()
        });
        template.push({ type: 'separator' });

        template.push({
          label: 'Türkçe Diline Çevir',
          click: () => this.createTab(`https://translate.google.com/translate?sl=auto&tl=tr&u=${encodeURIComponent(wc.getURL())}`)
        });
        template.push({ type: 'separator' });

        template.push({
          label: 'Sayfa Kaynağını Görüntüle',
          click: () => this.createTab(`view-source:${wc.getURL()}`)
        });

        template.push({
          label: 'İncele',
          click: () => wc.openDevTools()
        });
      }

      // ─── Native Context Menu ───
      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: this.mainWindow });
    });

    wc.on('did-start-loading', () => {
      this.sendToRenderer(IPC_CHANNELS.NAV_LOADING, { tabId, isLoading: true });
    });

    wc.on('did-stop-loading', () => {
      this.sendToRenderer(IPC_CHANNELS.NAV_LOADING, { tabId, isLoading: false });
      this.notifyTabUpdate();
    });

    wc.on('did-start-navigation', (_event: any, url: string, isMainFrame: boolean) => {
      if (isMainFrame) {
        this.tabUrls.set(tabId, url);
        this.notifyTabUpdate();
      }
    });

    wc.on('did-navigate', (_event: any, url: string) => {
      this.sendToRenderer(IPC_CHANNELS.NAV_URL_UPDATED, { tabId, url });
      this.tabUrls.set(tabId, url);
      this.tabLastAccessed.set(tabId, Date.now());
      this.notifyTabUpdate();
      if (tabId === this.activeTabId) this.resizeActiveTab();
      
      // Geçmişe ekle
      app.emit('add-to-history', { url, title: this.tabTitles.get(tabId) || url });

      const logPath = path.join(app.getPath('userData'), 'nav_log.txt');
      try {
        fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] did-navigate: callbackExists=${!!this.onNavigateCallback} isIncognito=${this.isIncognito}\n`);
      } catch { }

      if (!this.isIncognito) {
        this.onNavigateCallback?.(url, wc.getTitle());
      }
    });

    wc.on('did-navigate-in-page', (_event: any, url: string) => {
      this.sendToRenderer(IPC_CHANNELS.NAV_URL_UPDATED, { tabId, url });
      this.notifyTabUpdate();
    });

    wc.on('page-title-updated', (_event: any, title: string) => {
      this.tabTitles.set(tabId, title);
      this.sendToRenderer(IPC_CHANNELS.NAV_TITLE_UPDATED, { tabId, title });
      this.notifyTabUpdate();
      if (!this.isIncognito) {
        this.onNavigateCallback?.(wc.getURL(), title);
      }
    });

    wc.on('page-favicon-updated', (_event: any, favicons: string[]) => {
      if (favicons && favicons.length > 0) {
        this.tabFavicons.set(tabId, favicons[0]);
        this.sendToRenderer(IPC_CHANNELS.NAV_FAVICON_UPDATED, { tabId, favicon: favicons[0] });
        this.notifyTabUpdate();
      }
    });


    // Dal 4: Popupları yeni sekme olarak aç
    wc.setWindowOpenHandler((details) => {
      this.createTab(details.url);
      return { action: 'deny' };
    });

    // Ctrl + Scroll Zoom
    (wc as any).on('mouse-wheel', (event: any, _deltaX: number, deltaY: number) => {
      if (deltaY === 0) return;
      
      const isCtrl = process.platform === 'darwin' ? event.metaKey : event.ctrlKey;
      if (isCtrl) {
        const currentZoom = wc.getZoomFactor();
        const direction = deltaY > 0 ? -1 : 1; 
        const newZoom = Math.min(Math.max(currentZoom + (direction * 0.1), 0.5), 3.0);
        wc.setZoomFactor(newZoom);
        this.notifyTabUpdate();
      }
    });

    // Fullscreen handling
    wc.on('enter-html-full-screen', () => {
      this.fullscreenTabs.add(tabId);
      this.resizeActiveTab();
    });
    wc.on('leave-html-full-screen', () => {
      this.fullscreenTabs.delete(tabId);
      this.resizeActiveTab();
    });
  }

  public notifyTabUpdate(): void {
    this.sendToRenderer(IPC_CHANNELS.TAB_UPDATE, {
      tabs: this.getTabList(),
      activeTabId: this.activeTabId,
      activeWorkspaceId: this.activeWorkspace,
      groups: Array.from(this.tabGroups.values())
    });
  }

  private sendToRenderer(channel: string, ...args: any[]): void {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  // ─── Performance & RAM Management ───

  private startSnoozeTimer(): void {
    if (this.snoozeInterval) clearInterval(this.snoozeInterval);
    this.snoozeInterval = setInterval(() => {
      const idleTime = powerMonitor.getSystemIdleTime();
      // Sistem 5 dakikadan fazla boşta kaldıysa zorunlu temizlik yap
      const isSystemIdle = idleTime > 300; 
      this.checkTabsPerformance(isSystemIdle);
    }, 20000); 
  }

  private async checkTabsPerformance(forceSnooze: boolean = false): Promise<void> {
    if (!this.ramLimiterEnabled) return;

    const metrics = app.getAppMetrics();
    const now = Date.now();
    
    // Toplam Private Memory hesapla (MB)
    const totalMemoryMb = metrics.reduce((acc, current) => {
      const priv = current.memory.privateBytes || 0;
      return acc + (priv / 1024 / 1024);
    }, 0);

    // 1. Sert Sınır (Hard Limit) Kontrolü veya Force Snooze (Idle)
    if (forceSnooze || (this.ramHardLimit && this.maxRamLimitMb > 0 && totalMemoryMb > this.maxRamLimitMb)) {
      if (!forceSnooze) {
        console.log(`[TabManager] Hard internal RAM limit exceeded (${Math.round(totalMemoryMb)}MB > ${this.maxRamLimitMb}MB). Aggressive snoozing...`);
      } else {
        console.log(`[TabManager] System is idle for ${powerMonitor.getSystemIdleTime()}s. Cleaning up...`);
      }
      
      // En eski sekmeleri bul ve temizle
      const sortedTabs = Array.from(this.tabs.keys())
        .filter(id => id !== this.activeTabId && !this.pinnedTabIds.has(id))
        .sort((a, b) => (this.tabLastAccessed.get(a) || 0) - (this.tabLastAccessed.get(b) || 0));

      for (const tabId of sortedTabs) {
        this.snoozeTab(tabId);
        // Sert sınırda 1, idle modda tümünü temizleyebiliriz
        if (!forceSnooze && sortedTabs.indexOf(tabId) >= 1) break; 
      }
    }

    // 2. Normal/Yumuşak Limit Temizliği
    for (const [tabId, view] of this.tabs) {
      if (tabId === this.activeTabId) continue; 
      if (this.pinnedTabIds.has(tabId)) continue; 

      // Süre bazlı uyutma
      const lastAccess = this.tabLastAccessed.get(tabId) || 0;
      if (this.ramSnoozeMinutes > 0 && (now - lastAccess) > (this.ramSnoozeMinutes * 60000)) {
        this.snoozeTab(tabId);
        continue;
      }
    }
  }

  private snoozeTab(tabId: number): void {
    const view = this.tabs.get(tabId);
    if (!view) return;

    console.log(`[TabManager] Snoozing tab ${tabId}`);

    // Durumu kaydet
    this.tabUrls.set(tabId, view.webContents.getURL());
    this.tabTitles.set(tabId, view.webContents.getTitle());
    this.snoozedTabs.add(tabId);

    // Kaynakları serbest bırak
    this.mainWindow.contentView.removeChildView(view);
    view.webContents.close();
    this.tabs.delete(tabId);

    this.notifyTabUpdate();
  }

  // ─── Network Limiter (CDP-Based) ───

  setNetworkSpeedLimit(limitMbps: number): void {
    this.networkSpeedLimitMbps = limitMbps;

    try {
      // Her iki oturum bölümünü de al (Standart ve Gizli) + Varsayılan Oturum
      const sessions = [
        session.defaultSession,
        session.fromPartition('persist:bseester'),
        session.fromPartition('in-memory:incognito')
      ];

      if (limitMbps <= 0) {
        // Sınırlayıcıyı tamamen devre dışı bırak
        sessions.forEach(s => s.disableNetworkEmulation());
        console.log(`[NetLimiter] Network emulation DISABLED for all sessions`);
      } else {
        // Native session-based throttling uygula (Standard Mbps = 10^6 bps)
        const bytesPerSecond = Math.floor((limitMbps * 1000 * 1000) / 8);
        const config = {
          offline: false,
          latency: 20, // Daha doğal bir ağ gecikmesi (100ms yerine 20ms)
          downloadThroughput: bytesPerSecond,
          uploadThroughput: Math.floor(bytesPerSecond / 4)
        };

        sessions.forEach(s => s.enableNetworkEmulation(config));
        
        console.log(`[NetLimiter] Native session-based limit set to ${limitMbps} Mbps (for all sessions)`);
      }
    } catch (err) {
      console.error('[NetLimiter] Failed to apply native session limit:', err);
    }
  }


  // ─── Tab Management API ───

  setRamLimiterEnabled(enabled: boolean): void { this.ramLimiterEnabled = enabled; }
  setRamHardLimit(hard: boolean): void { this.ramHardLimit = hard; }
  setMaxRamLimit(limitMb: number): void { this.maxRamLimitMb = limitMb; }
  setRamSnoozeTime(minutes: number): void { this.ramSnoozeMinutes = minutes; }

  setSearchEngineUrl(url: string): void {
    this.searchEngineUrl = url;
    console.log(`[TabManager] Search engine updated: ${url}`);
  }

  panic(url?: string): void {
    console.log(`[Panic] System activated. Target URL: ${url}`);
    
    // Tüm sekmeleri (aktif ve uyutulmuş) kapat
    // Dizi kopyalamak önemli çünkü kapatırken liste değişiyor
    const allTabIds = [...this.tabOrder];
    for (const id of allTabIds) {
      try {
        this.closeTab(id);
      } catch (err) {
        console.error(`[Panic] Failed to close tab ${id}:`, err);
      }
    }
    
    // Her şeyi tamamen sıfırla
    this.tabs.clear();
    this.snoozedTabs.clear();
    this.tabOrder = [];
    
    // Belirlenen URL veya varsayılan (about:blank) aç
    this.createTab(url || 'about:blank');
  }

  closeAllTabs(): void {
    const ids = Array.from(this.tabs.keys());
    for (const id of ids) this.closeTab(id);
  }

  // ─── Tab Groups API ───

  createTabGroup(tabIds: number[], title: string, color: string): string {
    const groupId = Date.now().toString();
    this.tabGroups.set(groupId, { id: groupId, title, color, collapsed: false });
    for (const id of tabIds) {
      this.tabGroupIds.set(id, groupId);
    }
    this.notifyTabUpdate();
    return groupId;
  }

  addTabToGroup(tabId: number, groupId: string): void {
    if (this.tabGroups.has(groupId)) {
      this.tabGroupIds.set(tabId, groupId);
      this.notifyTabUpdate();
    }
  }

  removeTabFromGroup(tabId: number): void {
    this.tabGroupIds.delete(tabId);
    this.cleanupEmptyGroups();
    this.notifyTabUpdate();
  }

  toggleGroupCollapse(groupId: string): void {
    const group = this.tabGroups.get(groupId);
    if (group) {
      group.collapsed = !group.collapsed;
      this.notifyTabUpdate();
    }
  }

  updateTabGroup(groupId: string, title?: string, color?: string): void {
    const group = this.tabGroups.get(groupId);
    if (group) {
      if (title !== undefined) group.title = title;
      if (color !== undefined) group.color = color;
      this.notifyTabUpdate();
    }
  }

  private cleanupEmptyGroups(): void {
    const activeGroupIds = new Set(this.tabGroupIds.values());
    for (const groupId of this.tabGroups.keys()) {
      if (!activeGroupIds.has(groupId)) {
        this.tabGroups.delete(groupId);
      }
    }
  }

  // ─── Zoom API ───

  setZoomFactor(tabId: number, factor: number): void {
    const view = this.tabs.get(tabId || this.activeTabId!);
    if (view) {
      view.webContents.setZoomFactor(factor);
    }
  }

  getZoomFactor(tabId: number): number {
    const view = this.tabs.get(tabId || this.activeTabId!);
    if (view) {
      return view.webContents.getZoomFactor();
    }
    return 1.0;
  }

  getGroups(): TabGroupInfo[] {
    return Array.from(this.tabGroups.values());
  }
}
