/**
 * TabManager — WebContentsView tabanlı sekme izolasyonu
 *
 * Her sekme bağımsız bir WebContentsView içinde çalışır.
 * Bu sayede bir sekmedeki çökme diğerlerini etkilemez.
 */

import {
  BrowserWindow,
  WebContentsView,
  session,
  type WebContents,
} from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';

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
  private contextMenuCallbacks = new Map<string, () => void>(); // Custom HTML ContextMenu callback map
  private pinnedTabIds: Set<number> = new Set();
  private ramSnoozeMinutes: number = 0;
  private maxRamLimitMb: number = 0;
  private tabLastAccessed: Map<number, number> = new Map();
  private snoozedTabs: Set<number> = new Set();
  private tabUrls: Map<number, string> = new Map();
  private snoozeInterval: any = null;

  constructor(mainWindow: BrowserWindow, isIncognito: boolean = false) {
    this.mainWindow = mainWindow;
    this.isIncognito = isIncognito;
    this.startSnoozeTimer();
  }

  /**
   * Yeni sekme oluşturur ve WebContentsView'ı pencereye ekler
   */
  createTab(url: string = 'about:blank', workspaceId: string = this.activeWorkspace): number {
    const fs = require('fs');
    const logPath = 'C:\\Users\\bseester\\tarayıcı\\nav_log.txt';
    try {
      fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] createTab called with url="${url}" workspaceId="${workspaceId}"\n`);
    } catch {}

    const tabId = ++this.tabCounter;

    // Dal 4: Gizli sekme veya standart partition
    const partition = this.isIncognito ? 'in-memory:incognito' : '';

    const view = new WebContentsView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webviewTag: false,
        partition,
        plugins: true,
      },
    });

    this.tabs.set(tabId, view);
    this.tabWorkspaces.set(tabId, workspaceId);
    this.tabOrder.push(tabId);
    this.tabUrls.set(tabId, url);
    this.tabLastAccessed.set(tabId, Date.now());

    // Navigasyon olaylarını dinle
    this.attachWebContentsListeners(tabId, view.webContents);

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

    // WebContents'i destroy et (bellek sızıntısını önle)
    try {
      view.webContents.close();
    } catch (e) {
      // ignore
    }
    this.tabs.delete(tabId);
    this.tabWorkspaces.delete(tabId);
    this.tabOrder = this.tabOrder.filter(id => id !== tabId);

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
    const fs = require('fs');
    const logPath = 'C:\\Users\\bseester\\tarayıcı\\nav_log.txt';
    try {
      fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] switchToTab called with tabId=${tabId}. Previous activeTabId=${this.activeTabId}\n`);
    } catch {}

    // Önceki aktif sekmeyi gizle
    if (this.activeTabId !== null && this.activeTabId !== tabId) {
      const prevView = this.tabs.get(this.activeTabId);
      if (prevView) {
        prevView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      }
    }

    // Sekme uyutulmuşsa uyandır
    if (this.snoozedTabs.has(tabId)) {
      this.snoozedTabs.delete(tabId);
      const view = this.tabs.get(tabId);
      const url = this.tabUrls.get(tabId);
      if (view && url && url !== 'about:blank') {
        console.log(`[TabManager] Waking up tab ${tabId} to ${url}`);
        view.webContents.loadURL(url);
      }
    }

    this.tabLastAccessed.set(tabId, Date.now());
    this.activeTabId = tabId;
    this.activeWorkspace = this.tabWorkspaces.get(tabId) || this.activeWorkspace;
    
    // Yalnızca aktif olan (workspace'e uyan) sekmeyi göster, diğerlerini gizle
    for (const [id, view] of this.tabs) {
      if (id !== tabId) {
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      }
    }

    this.resizeActiveTab();
    this.notifyTabUpdate();
  }

  /**
   * Aktif sekmeyi pencere boyutuna göre yeniden boyutlandırır.
   * Top bar yüksekliği (80px) ve sidebar genişliği (52px) düşülür.
   */
  resizeActiveTab(): void {
    if (this.activeTabId === null) return;

    const view = this.tabs.get(this.activeTabId);
    if (!view) return;

    const bounds = this.mainWindow.getContentBounds();
    const url = view.webContents.getURL();
    if (url === 'about:blank' || url === '') {
      // React tabanlı Hızlı Erişim / Yeni Sekme ekranının görünmesi ve tıklanabilmesi için gizle
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 });
      return;
    }

    const TOPBAR_HEIGHT = 80; // TopBar (40px) + WindowControls (40px)
    const SIDEBAR_WIDTH = 52 + this.sidebarPanelWidth;

    view.setBounds({
      x: SIDEBAR_WIDTH,
      y: TOPBAR_HEIGHT,
      width: bounds.width - SIDEBAR_WIDTH,
      height: bounds.height - TOPBAR_HEIGHT,
    });
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
    const fs = require('fs');
    const logPath = 'C:\\Users\\bseester\\tarayıcı\\nav_log.txt';
    
    try {
      fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] goToUrl: url="${url}" activeTabId=${this.activeTabId} wcExists=${!!wc}\n`);
    } catch (err) {
      // ignore
    }

    if (!wc) {
      try {
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] wc is null, returning\n`);
      } catch {}
      return;
    }

    let normalizedUrl = url;
    if (!/^https?:\/\//i.test(url) && !/^file:\/\//i.test(url) && !/^about:/i.test(url) && !/^chrome-extension:\/\//i.test(url)) {
      if (url.includes('.') && !url.includes(' ')) {
        normalizedUrl = `https://${url}`;
      } else {
        normalizedUrl = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
      }
    }

    try {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] loading URL: "${normalizedUrl}"\n`);
    } catch {}

    wc.loadURL(normalizedUrl);
    
    // Asenkron race-condition'ı önlemek için burada doğrudan genişletiyoruz
    const bounds = this.mainWindow.getContentBounds();
    const TOPBAR_HEIGHT = 80;
    const SIDEBAR_WIDTH = 52 + this.sidebarPanelWidth;

    const view = this.tabs.get(this.activeTabId!);
    if (view) {
      view.setBounds({
        x: SIDEBAR_WIDTH,
        y: TOPBAR_HEIGHT,
        width: bounds.width - SIDEBAR_WIDTH,
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

  // ─── Yardımcılar ───

  getActiveWebContents(): WebContents | null {
    if (this.activeTabId === null) return null;
    return this.tabs.get(this.activeTabId)?.webContents ?? null;
  }

  getActiveTabId(): number | null {
    return this.activeTabId;
  }

  togglePinTab(tabId: number): void {
    if (this.pinnedTabIds.has(tabId)) {
      this.pinnedTabIds.delete(tabId);
    } else {
      this.pinnedTabIds.add(tabId);
    }

    // Veritabanını güncelle
    const { getDatabase } = require('../database/db');
    const db = getDatabase();
    
    const pinnedTabs = [];
    for (const [id, view] of this.tabs) {
      if (this.pinnedTabIds.has(id)) {
        const wc = view.webContents;
        const wsId = this.tabWorkspaces.get(id) || 'default';
        pinnedTabs.push({
          url: wc.getURL(),
          title: wc.getTitle(),
          workspaceId: wsId
        });
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

      const view = this.tabs.get(id);
      if (!view) continue;
      const wc = view.webContents;
      list.push({
        id,
        title: wc.getTitle() || 'Yeni Sekme',
        url: wc.getURL(),
        isLoading: wc.isLoading(),
        canGoBack: wc.canGoBack(),
        canGoForward: wc.canGoForward(),
        workspaceId: wsId,
        isIncognito: this.isIncognito,
        isPinned: this.pinnedTabIds.has(id),
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

    this.notifyTabUpdate();
  }

  getTabCount(): number {
    return this.tabs.size;
  }

  /**
   * WebContents olaylarını dinler ve Renderer'a bildirim gönderir
   */
  private attachWebContentsListeners(tabId: number, wc: WebContents): void {
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

    // ─── Native Context Menu (Dinamik Sağ Tık) ───
    wc.on('context-menu', (_event, params) => {
      const fs = require('fs');
      try {
        fs.appendFileSync('C:\\Users\\bseester\\tarayıcı\\nav_log.txt', `\n[${new Date().toISOString()}] context-menu event fired! params: x=${params.x}, y=${params.y}\n`);
      } catch {}
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

      if (params.selectionText) {
        if (template.length > 0) template.push({ type: 'separator' });
        template.push({ role: 'copy', label: 'Kopyala' });
        template.push({
          label: `${params.selectionText.substring(0, 15)}... için Google'da ara`,
          click: () => this.createTab(`https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`)
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

    wc.on('did-navigate', (_event, url) => {
      this.sendToRenderer(IPC_CHANNELS.NAV_URL_UPDATED, { tabId, url });
      this.notifyTabUpdate();
      if (tabId === this.activeTabId) this.resizeActiveTab();

      const fs = require('fs');
      const logPath = 'C:\\Users\\bseester\\tarayıcı\\nav_log.txt';
      try {
        fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] did-navigate: callbackExists=${!!this.onNavigateCallback} isIncognito=${this.isIncognito}\n`);
      } catch {}

      if (!this.isIncognito) {
        this.onNavigateCallback?.(url, wc.getTitle());
      }

      // Uyutma maskesi için url'i güncelle
      if (!this.snoozedTabs.has(tabId) && url !== 'about:blank') {
        this.tabUrls.set(tabId, url);
      }
    });

    wc.on('did-navigate-in-page', (_event, url) => {
      this.sendToRenderer(IPC_CHANNELS.NAV_URL_UPDATED, { tabId, url });
      if (tabId === this.activeTabId) this.resizeActiveTab();
    });

    wc.on('page-title-updated', (_event, title) => {
      this.sendToRenderer(IPC_CHANNELS.NAV_TITLE_UPDATED, { tabId, title });
      this.notifyTabUpdate();
      if (!this.isIncognito) {
        this.onNavigateCallback?.(wc.getURL(), title);
      }
    });

    // Yeni pencere açma isteklerini yakala → yeni sekmede aç
    wc.setWindowOpenHandler(({ url }) => {
      this.createTab(url);
      return { action: 'deny' };
    });



    // Ana Pencereden Bağımsız Kısayol Dinleyicisi (Örn: WebContent'e tıklanmışken Ctrl+P çalışması için)
    wc.on('before-input-event', (event, input) => {
      // F12 ile DevTools'u Aç/Kapat
      if (input.key === 'F12' && (input.type === 'keyDown' || input.type === 'keyUp')) {
        if (input.type === 'keyDown') {
          wc.toggleDevTools();
        }
        event.preventDefault();
        return;
      }

      // Ctrl+P veya Cmd+P yazdır komutu
      if ((input.control || input.meta) && input.key.toLowerCase() === 'p') {
        event.preventDefault();
        wc.print();
        return;
      }
      
      // Gerekirse Ctrl+F (Sayfa içi arama) IPC çağrısı yapılabilir
    });
  }

  /**
   * Renderer process'e IPC mesajı gönderir
   */
  private sendToRenderer(channel: string, data: unknown): void {
    try {
      this.mainWindow.webContents.send(channel, data);
    } catch {
      // Pencere kapatılmış olabilir
    }
  }

  /**
   * Tüm sekme listesini Renderer'a bildirir
   */
  notifyTabUpdate(): void {
    this.sendToRenderer(IPC_CHANNELS.TAB_UPDATE, {
      tabs: this.getTabList(),
      activeTabId: this.activeTabId,
      activeWorkspaceId: this.activeWorkspace,
    });
  }

  /**
   * Tüm sekmeleri kapatır ve bir adet boş sekme açar
   */
  closeAllTabs(): void {
    const ids = Array.from(this.tabs.keys());
    for (const id of ids) {
      if (this.pinnedTabIds.has(id)) continue; // Sabitlenen sekmelere DOKUNMA
      this.closeTab(id);
    }
    // Eğer geriye sıfır sekme kaldıysa boş sekme aç (Tüm sekmeler kapanmışsa)
    if (this.getTabCount() === 0) {
      this.createTab('about:blank');
    }
  }

  /**
   * Tüm sekmeleri kapatıp Google'ı açar (Panic Butonu)
   */
  panic(): void {
    // 1. Sabitlenen Sekmeleri Temizle (Unpin All)
    this.pinnedTabIds.clear();

    // 2. Veritabanını Sıfırla
    const { getDatabase } = require('../database/db');
    getDatabase().setPinnedTabs([]);

    // 3. Tüm Sekmeleri Kapat
    const ids = Array.from(this.tabs.keys());
    for (const id of ids) {
      this.closeTab(id);
    }
    this.createTab('https://www.google.com');
  }

  /**
   * Hafızadaki sabitli sekmeleri yükler
   */
  loadPinnedTabs(): void {
    const { getDatabase } = require('../database/db');
    const db = getDatabase();
    const pinnedTabs = db.getPinnedTabs();
    
    if (pinnedTabs && pinnedTabs.length > 0) {
      for (const pinned of pinnedTabs) {
        const tabId = this.createTab(pinned.url, pinned.workspaceId || 'default');
        this.pinnedTabIds.add(tabId);
      }
    } else {
      this.createTab('about:blank');
    }
  }

  /**
   * Tüm sekmeleri temizler (uygulama kapanırken)
   */
  destroyAll(): void {
    if (this.snoozeInterval) clearInterval(this.snoozeInterval);
    for (const [id] of this.tabs) {
      this.closeTab(id);
    }
  }

  setRamSnoozeTime(minutes: number): void {
    this.ramSnoozeMinutes = minutes;
    console.log(`[TabManager] RAM Snooze time set to ${minutes} mins`);
  }

  setMaxRamLimit(limitMb: number): void {
    this.maxRamLimitMb = limitMb;
    console.log(`[TabManager] Max RAM Limit set to ${limitMb} MB`);
  }

  private startSnoozeTimer(): void {
    this.snoozeInterval = setInterval(() => {
      const now = Date.now();
      const { app } = require('electron');

      // ─── 1. Kademe: Acil Durum Toplam RAM Limiti ───
      try {
        const metrics = app.getAppMetrics();
        const totalWorkingSetKB = metrics.reduce((sum: number, m: any) => sum + m.memory.workingSetSize, 0);
        const totalAppRamMB = Math.floor(totalWorkingSetKB / 1024);

        if (this.maxRamLimitMb > 0 && totalAppRamMB >= this.maxRamLimitMb) {
          console.log(`[TabManager] EMERGENCY: RAM limit exceeded (${totalAppRamMB}MB >= ${this.maxRamLimitMb}MB). Snoozing oldest tab.`);
          
          const inactiveTabs = Array.from(this.tabs.keys())
            .filter(id => id !== this.activeTabId && !this.snoozedTabs.has(id))
            .sort((a, b) => (this.tabLastAccessed.get(a) || 0) - (this.tabLastAccessed.get(b) || 0));

          if (inactiveTabs.length > 0) {
            this.snoozeTab(inactiveTabs[0]); // En eski pasif sekmeyi uyut
            return; // Bu turda sadece 1 adet uyutmak yeterli (cycle freni)
          }
        }
      } catch (e) {
        console.error('[TabManager] RAM Metrics calculation failed', e);
      }

      // ─── 2. Kademe: Süreye Dayalı Sekme Uyutma (Tab Snooze) ───
      if (this.ramSnoozeMinutes <= 0) return;

      for (const [id, view] of this.tabs) {
        if (id === this.activeTabId) continue;
        if (this.snoozedTabs.has(id)) continue;

        const lastAccess = this.tabLastAccessed.get(id) || now;
        const idleMinutes = (now - lastAccess) / 60000;

        if (idleMinutes >= this.ramSnoozeMinutes) {
          this.snoozeTab(id);
        }
      }
    }, 15000); // 15 saniyede bir kontrol (Acil durumlar için dah hızlı)
  }

  private snoozeTab(tabId: number): void {
    const view = this.tabs.get(tabId);
    if (!view) return;

    const url = view.webContents.getURL();
    if (url === 'about:blank' || url === '') return;

    console.log(`[TabManager] Snoozing tab ${tabId} (${url})`);
    this.snoozedTabs.add(tabId);
    this.tabUrls.set(tabId, url); // Son geçerli url'i kurtar

    view.webContents.loadURL('about:blank');
    this.notifyTabUpdate();
  }
}
