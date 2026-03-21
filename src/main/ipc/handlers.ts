/**
 * IPC Handlers — Main process tarafındaki IPC dinleyicileri
 *
 * Renderer'dan gelen istekleri (invoke) karşılar ve
 * uygun TabManager/WindowManager/Engine metodlarını çağırır.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import { WindowManager } from '../window/WindowManager';
import { HistoryManager } from '../engine/history';
import { BookmarkManager } from '../engine/bookmarks';
import { FindInPage } from '../engine/search';
import { AdBlocker } from '../engine/adblocker';
import { DownloadManager } from '../engine/downloads';
import { workspaceManager } from '../engine/workspace';
import { getExtensionManager } from '../engine/extensions';
import { app } from 'electron';

const windowManagers = new Map<number, any>();
let activeWindowManager: any = null;

export function registerIPCHandlers(windowManager: WindowManager, adBlocker: AdBlocker | null): void {
  activeWindowManager = windowManager;
  const win = windowManager.getMainWindow();
  if (win) {
    windowManagers.set(win.id, windowManager);
  }

  app.on('browser-window-focus', (_event, focusWin) => {
    const wm = windowManagers.get(focusWin.id);
    if (wm) activeWindowManager = wm;
  });

  const getTabManager = () => activeWindowManager?.getTabManager() ?? windowManager.getTabManager();
  const historyManager = new HistoryManager();
  const bookmarkManager = new BookmarkManager();
  const findInPage = new FindInPage();
  const downloadManager = new DownloadManager(windowManager);

  // ─── Geçmiş Kaydı Entegrasyonu ───
  const tm = getTabManager();
  const fs = require('fs');
  const logPath = 'C:\\Users\\bseester\\tarayıcı\\nav_log.txt';
  try {
    fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] registerIPCHandlers: tmExists=${!!tm}\n`);
  } catch {}

  if (tm) {
    tm.setOnNavigate((url: string, title: string) => {
      const fs = require('fs');
      const logPath = 'C:\\Users\\bseester\\tarayıcı\\nav_log.txt';
      try {
        fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] tm.onNavigate: url="${url}" title="${title}"\n`);
      } catch {}
      historyManager.addVisit(url, title || 'Yeni Sekme');
    });
  }

  // ─── Sekme Yönetimi ───

  ipcMain.handle(IPC_CHANNELS.TAB_CREATE, (_event, url?: string) => {
    console.log('[DEBUG] TAB_CREATE called from sender:', _event.sender.getURL());
    const tabManager = getTabManager();
    if (!tabManager) {
      console.log('[DEBUG] TAB_CREATE ABORT: tabManager is null');
      return null;
    }
    const tabId = tabManager.createTab(url || 'about:blank');
    return tabId;
  });

  ipcMain.handle(IPC_CHANNELS.TAB_CLOSE, (_event, tabId: number) => {
    const tabManager = getTabManager();
    if (!tabManager) return;
    tabManager.closeTab(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_SWITCH, (_event, tabId: number) => {
    const tabManager = getTabManager();
    if (!tabManager) return;
    tabManager.switchToTab(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_LIST, () => {
    const tabManager = getTabManager();
    if (!tabManager) return { tabs: [], activeTabId: null };
    return {
      tabs: tabManager.getTabList(),
      activeTabId: tabManager.getActiveTabId(),
    };
  });

  ipcMain.handle(IPC_CHANNELS.TAB_REORDER, (_event, activeId: number, overId: number) => {
    getTabManager()?.reorderTabs(activeId, overId);
  });

  ipcMain.handle('tab:show-context-menu', (_event, tabId: number, isPinned: boolean) => {
    const tabManager = getTabManager();
    const win = windowManager.getMainWindow();
    if (!tabManager || !win) return;

    const { Menu } = require('electron');
    const template = [
      {
        label: 'Yeni Sekme',
        click: () => tabManager.createTab('about:blank')
      },
      { type: 'separator' },
      {
        label: isPinned ? '📌 Sabitlemeyi Kaldır' : '📌 Sabitle',
        click: () => tabManager.togglePinTab(tabId)
      },
      { type: 'separator' },
      {
        label: 'Diğerlerini Kapat',
        click: () => tabManager.closeOtherTabs(tabId)
      },
      {
        label: 'Sağdaki Sekmeleri Kapat',
        click: () => tabManager.closeTabsToRight(tabId)
      },
      { type: 'separator' },
      {
        label: 'Kapat',
        click: () => tabManager.closeTab(tabId)
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: win });
  });

  ipcMain.handle('tabs:close-all', () => {
    getTabManager()?.closeAllTabs();
  });

  ipcMain.handle('tabs:panic', () => {
    getTabManager()?.panic();
  });

  // ─── Navigasyon ───

  ipcMain.handle(IPC_CHANNELS.NAV_GO, (_event, url: string) => {
    const tabManager = getTabManager();
    if (tabManager) {
      if (tabManager.getActiveTabId() === null) {
        tabManager.createTab(url);
      } else {
        tabManager.goToUrl(url);
      }
    }
  });

  ipcMain.handle(IPC_CHANNELS.NAV_BACK, () => {
    getTabManager()?.goBack();
  });

  ipcMain.handle(IPC_CHANNELS.NAV_FORWARD, () => {
    getTabManager()?.goForward();
  });

  ipcMain.handle(IPC_CHANNELS.NAV_RELOAD, () => {
    getTabManager()?.reload();
  });

  ipcMain.handle(IPC_CHANNELS.NAV_STOP, () => {
    getTabManager()?.stop();
  });

  ipcMain.handle(IPC_CHANNELS.NAV_PRINT, () => {
    const wc = getTabManager()?.getActiveWebContents();
    if (wc) wc.print();
  });

  ipcMain.handle(IPC_CHANNELS.NAV_PRINT_PDF, async () => {
    const wc = getTabManager()?.getActiveWebContents();
    if (!wc) return;
    try {
      const pdf = await wc.printToPDF({});
      const { dialog } = require('electron');
      const { filePath } = await dialog.showSaveDialog(windowManager.getMainWindow()!, {
        defaultPath: 'sayfa.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (filePath) {
        require('fs').writeFileSync(filePath, pdf);
      }
    } catch (e) {
      console.error(e);
    }
  });

  // ─── Pencere Kontrolleri ───

  ipcMain.handle(IPC_CHANNELS.WIN_MINIMIZE, () => {
    activeWindowManager?.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WIN_MAXIMIZE, () => {
    activeWindowManager?.maximize();
  });

  ipcMain.handle(IPC_CHANNELS.WIN_CLOSE, () => {
    activeWindowManager?.close();
  });

  ipcMain.handle(IPC_CHANNELS.WIN_IS_MAXIMIZED, () => {
    return activeWindowManager?.isMaximized() ?? false;
  });

  // ─── Geçmiş ───

  ipcMain.handle(IPC_CHANNELS.HISTORY_GET, (_event, limit?: number) => {
    const fs = require('fs');
    const logPath = 'C:\\Users\\bseester\\tarayıcı\\nav_log.txt';
    const items = historyManager.getHistory(limit || 100);
    try {
      fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] HISTORY_GET: count=${items.length}\n`);
    } catch {}
    return items;
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_CLEAR, () => {
    historyManager.clearAll();
  });

  // ─── İndirmeler ───
  ipcMain.handle('downloads:get', (_event, limit?: number) => {
    return downloadManager.getDownloads(limit || 50);
  });

  ipcMain.handle('downloads:test', () => {
    const win = windowManager.getMainWindow();
    if (win) {
      win.webContents.downloadURL('https://raw.githubusercontent.com/electron/electron/main/README.md');
    }
    return true;
  });

  // ─── Yer İmleri ───

  ipcMain.handle(IPC_CHANNELS.BOOKMARKS_GET, () => {
    const workspaceId = getTabManager()?.activeWorkspace || 'default';
    return bookmarkManager.getAll(workspaceId);
  });

  ipcMain.handle(IPC_CHANNELS.BOOKMARKS_ADD, (_event, url: string, title: string, folder?: string) => {
    const workspaceId = getTabManager()?.activeWorkspace || 'default';
    return bookmarkManager.add(url, title, workspaceId, folder);
  });

  ipcMain.handle(IPC_CHANNELS.BOOKMARKS_REMOVE, (_event, id: number) => {
    bookmarkManager.remove(id);
  });

  // ─── Sayfa İçi Arama ───

  ipcMain.handle(IPC_CHANNELS.FIND_IN_PAGE, (_event, text: string) => {
    const wc = getTabManager()?.getActiveWebContents();
    if (wc && text) {
      findInPage.find(wc, text);
    }
  });

  ipcMain.handle(IPC_CHANNELS.FIND_STOP, () => {
    const wc = getTabManager()?.getActiveWebContents();
    if (wc) findInPage.stop(wc);
  });

  // ─── Sidebar Genişliği Yönetimi ───
  ipcMain.handle('sidebar:set-width', (_event, width: number) => {
    getTabManager()?.setSidebarPanelWidth(width);
  });

  // ─── Çoklu Pencere Sync (Overlay -> Main) ───
  ipcMain.handle('sidebar:toggle-panel', (_event, panel: string) => {
    const mainWin = windowManager.getMainWindow();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('sidebar:on-toggle-panel', panel);
    }
  });

  ipcMain.handle('system:navigate-router', (_event, path: string) => {
    const mainWin = windowManager.getMainWindow();
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send('system:on-navigate-router', path);
    }
  });

  // ─── Çalışma Alanları (Workspaces) ───
  ipcMain.handle('workspace:get-all', () => {
    return workspaceManager.getWorkspaces();
  });

  ipcMain.handle('workspace:get-active', () => {
    return workspaceManager.getActiveWorkspace();
  });

  ipcMain.handle('workspace:set-active', (_event, id: string) => {
    workspaceManager.setActiveWorkspace(id);
    const tm = getTabManager();
    if (tm) {
      tm.setActiveWorkspace(id);
    }
  });

  ipcMain.handle('workspace:add', (_event, name: string, icon?: string) => {
    return workspaceManager.addWorkspace(name, icon);
  });

  ipcMain.handle('workspace:remove', (_event, id: string) => {
    workspaceManager.removeWorkspace(id);
  });

  // ─── Dal 4: Gelişmiş Özellikler ───

  let menuOverlayWin: Electron.BrowserWindow | null = null;

  ipcMain.handle('app:toggle-chrome-menu', (_event, bounds: { x: number, y: number }) => {
    if (menuOverlayWin) {
      menuOverlayWin.close();
      menuOverlayWin = null;
      return;
    }
    const { BrowserWindow } = require('electron');
    const path = require('path');
    const mainWin = windowManager.getMainWindow();
    if (!mainWin) return;
    
    menuOverlayWin = new BrowserWindow({
      width: 280,
      height: 520,
      x: Math.floor(bounds.x),
      y: Math.floor(bounds.y),
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false, // Bazı sistemlerde shadow siyah kutu yapabiliyor, kapatalım
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      parent: mainWin,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    const { app: electronApp } = require('electron');
    const isDev = process.env.NODE_ENV === 'development' || !electronApp.isPackaged;
    
    const url = isDev 
      ? 'http://localhost:5173/#/chromemenu-overlay' 
      : `file://${path.join(__dirname, '..', '..', 'renderer', 'index.html')}#/chromemenu-overlay`;
    
    menuOverlayWin?.loadURL(url);

    menuOverlayWin?.on('blur', () => {
      if (menuOverlayWin && !menuOverlayWin.isDestroyed()) {
        menuOverlayWin.close();
        menuOverlayWin = null;
      }
    });
  });

  ipcMain.handle('app:close-chrome-menu', () => {
    console.log('[DEBUG] app:close-chrome-menu called');
    if (menuOverlayWin) {
      menuOverlayWin.close();
      menuOverlayWin = null;
    }
  });

  ipcMain.handle('app:get-suggestions', async (_event, query: string) => {
    try {
      const response = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`);
      const data = await response.json() as any;
      return data[1] || [];
    } catch (e) {
      return [];
    }
  });

  // ─── İndirme Yönetimi (Download Manager) ───
  // Dal 3 Çakışan yerel dinleyici temizlendi. (DownloadManager.ts her şeyi hallediyor!)

  // Dal 4 çakışmayı gidermek için yorum satırı yapıldı
  // ipcMain.handle('downloads:get', () => downloadHistory);

  ipcMain.handle('downloads:open', async (_event, filePath: string) => {
    const { shell } = require('electron');
    if (!filePath) return 'Dosya yolu bulunamadı.';
    return shell.openPath(filePath);
  });

  ipcMain.handle('downloads:action', (_event, { id, action }: { id: any, action: 'pause' | 'resume' | 'cancel' }) => {
    return downloadManager.action(Number(id), action);
  });

  // Dal 4 çakışmayı gidermek için yorum satırı yapıldı
  /*
  ipcMain.handle('downloads:test', () => {
    const mainWin = windowManager.getMainWindow();
    if (mainWin) {
      mainWin.webContents.downloadURL('https://raw.githubusercontent.com/electron/electron/master/README.md');
    }
  });
  */

  ipcMain.handle('app:show-main-menu', () => {
    const { Menu, app } = require('electron');
    const win = windowManager.getMainWindow();
    if (!win) return;
    
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Yeni Sekme',
        accelerator: 'CmdOrCtrl+T',
        click: () => getTabManager()?.createTab('about:blank')
      },
      {
        label: 'Yeni Pencere',
        accelerator: 'CmdOrCtrl+N',
        click: () => getTabManager()?.createTab('about:blank')
      },
      {
        label: 'Yeni Gizli Pencere',
        accelerator: 'CmdOrCtrl+Shift+N',
        click: () => {
          const incognitoWin = new WindowManager(true);
          const newWin = incognitoWin.createMainWindow();
          windowManagers.set(newWin.id, incognitoWin);
        }
      },
      { type: 'separator' },
      { label: 'Yer İmleri' },
      { label: 'Geçmiş', accelerator: 'CmdOrCtrl+H' },
      { label: 'İndirmeler', accelerator: 'CmdOrCtrl+J' },
      { type: 'separator' },
      {
        label: 'Büyüt / Küçült (Zoom)',
        submenu: [
          { label: 'Yakınlaştır', role: 'zoomIn' },
          { label: 'Uzaklaştır', role: 'zoomOut' },
          { label: 'Sıfırla', role: 'resetZoom' }
        ]
      },
      { type: 'separator' },
      {
        label: 'Yazdır...',
        accelerator: 'CmdOrCtrl+P',
        click: () => getTabManager()?.getActiveWebContents()?.print()
      },
      { type: 'separator' },
      {
        label: 'Ayarlar',
        click: () => {
           // Ayarları şimdilik yeni sekmede yerel dosya olarak açabilir veya React'a sinyal gönderebiliriz.
           getTabManager()?.createTab('http://localhost:5173/#/settings');
        }
      },
      { type: 'separator' },
      {
        label: 'Çıkış',
        click: () => app.quit()
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: win });
  });

  ipcMain.handle('app:new-incognito-window', () => {
    // Yeni bir gizli WindowManager başlat
    const incognitoWin = new WindowManager(true);
    const win = incognitoWin.createMainWindow();
    windowManagers.set(win.id, incognitoWin);

    win.on('closed', () => {
      windowManagers.delete(win.id);
      if (activeWindowManager === incognitoWin) {
        activeWindowManager = windowManager; // Geri ana pencereye dön
      }
    });
  });

  ipcMain.handle('adblock:toggle', async () => {
    const isEnabled = adBlocker?.toggle() ?? false;
    const ublockId = 'cjpalhdlnbpafiamejdnhcphjbkeiagm';
    
    try {
      if (isEnabled) {
        console.log('[AdBlock] Activating AdBlock (uBlock Origin)');
        await extensionManager.installCrx(ublockId);
      } else {
        console.log('[AdBlock] Deactivating AdBlock (uBlock Origin)');
        await extensionManager.removeExtension(ublockId);
      }
    } catch (err) {
      console.error('[AdBlock] Toggle extension action failed:', err);
    }
    
    return isEnabled;
  });

  ipcMain.handle('adblock:set-status', async (_event, enabled: boolean) => {
    if (!adBlocker) return;
    
    // Sadece durum değişirse aksiyon al (Performans için)
    if (adBlocker.isEnabled() === enabled) return;

    adBlocker.toggle(); // enabled'ı tersine çevirir. enable toggles state.
    // Wait, toggle() just toggles. If we want to strictly set, we can create a setEnabled(enabled) in AdBlocker class or force toggle.
    // Let's create a method setEnabled in AdBlocker or use toggle carefully.
    // Or just if (adBlocker.isEnabled() !== enabled) adBlocker.toggle();
    // Since we ALREADY checked that they differ, calling toggle() WILL set it to the desired `enabled` state!
    
    const ublockId = 'cjpalhdlnbpafiamejdnhcphjbkeiagm';
    try {
      if (enabled) {
        console.log('[AdBlock] Sync Enable (uBlock Origin)');
        await extensionManager.installCrx(ublockId);
      } else {
        console.log('[AdBlock] Sync Disable (uBlock Origin)');
        await extensionManager.removeExtension(ublockId);
      }
    } catch (err) {
      console.error('[AdBlock] Sync extension action failed:', err);
    }
  });

  ipcMain.handle('adblock:status', () => {
    return adBlocker?.isEnabled() ?? false;
  });

  // Dal 4 workspace çakışmalarını gidermek için yorum satırı yapıldı
  /*
  ipcMain.handle('workspace:get-all', () => {
    return workspaceManager.getWorkspaces();
  });

  ipcMain.handle('workspace:get-active', () => {
    return workspaceManager.getActiveWorkspace();
  });

  ipcMain.handle('workspace:set-active', (_event, id: string) => {
    workspaceManager.setActiveWorkspace(id);
    const tm = getTabManager();
    if (tm) {
      tm.activeWorkspace = id;
      const workspaceTabs = tm.getTabList();
      if (workspaceTabs.length > 0) {
        tm.switchToTab(workspaceTabs[0].id);
      } else {
        tm.createTab('about:blank');
      }
    }
  });

  ipcMain.handle('workspace:add', (_event, name: string, icon?: string) => {
    return workspaceManager.addWorkspace(name, icon);
  });

  ipcMain.handle('workspace:remove', (_event, id: string) => {
    workspaceManager.removeWorkspace(id);
  });
  */

  // ─── Eklentiler ───

  const extensionManager = getExtensionManager();

  // Uygulama başlangıcında eklentileri geri yükle
  extensionManager.restoreExtensions().then(() => {
    // uBlock Origin Entegrasyonu (Başlangıçta otomatik yükle)
    const ublockId = 'cjpalhdlnbpafiamejdnhcphjbkeiagm';
    extensionManager.installCrx(ublockId).catch((err) => {
      console.error('[AdBlock] uBlock Origin yükleme hatası:', err);
    });
  }).catch((err) => {
    console.error('[IPC] Eklenti geri yükleme hatası:', err);
  });

  ipcMain.handle(IPC_CHANNELS.EXTENSION_LOAD, async () => {
    return extensionManager.loadFromDialog();
  });

  ipcMain.handle(IPC_CHANNELS.EXTENSION_REMOVE, async (_event, extensionId: string) => {
    return extensionManager.removeExtension(extensionId);
  });

  ipcMain.handle(IPC_CHANNELS.EXTENSION_LIST, () => {
    return extensionManager.getLoadedExtensions();
  });

  ipcMain.handle(IPC_CHANNELS.EXTENSION_INSTALL_CRX, async (_event, extensionId: string) => {
    return extensionManager.installCrx(extensionId);
  });

  // ─── Custom HTML ContextMenu Click Forwards ───
  ipcMain.on('context-menu:click', (_event, id: string) => {
    const tm = getTabManager();
    if (!tm) return;
    const callback = tm.contextMenuCallbacks.get(id);
    if (callback) callback();
  });
}
