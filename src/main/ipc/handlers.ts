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
import { getDatabase } from '../database/db';
import { app, shell } from 'electron';
import { execSync } from 'child_process';

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
  
  // ─── 1. Performans & Sistem Limitleri (ÖNCELİKLİ) ───
  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_PERFORMANCE_METRICS, () => {
    try {
      const metrics = app.getAppMetrics();
      const tm = getTabManager();
      if (!tm) return { ramMB: 0, cpuPercent: 0, tabMetrics: [] };

      const activeTabs = tm.getTabList();
      const tabMetrics: { id: number, pid: number, name: string, cpu: number, ramMB: number }[] = [];
      
      let totalRamKB = 0;
      let totalCpu = 0;

      // Tüm süreçler için hızlı bir PID haritası çıkar
      const metricsMap = new Map<number, any>();
      for (const m of metrics) {
        metricsMap.set(m.pid, m);
        totalCpu += m.cpu.percentCPUUsage;
        const pMem = m.memory.privateBytes || m.memory.workingSetSize || 0;
        totalRamKB += pMem;
      }

      // Sadece aktif sekmeler için detaylı veri topla
      for (const tab of activeTabs) {
        const view = tm.getTab(tab.id);
        if (!view) continue;

        const pid = view.webContents.getOSProcessId();
        const foundMetric = metricsMap.get(pid);
        
        if (foundMetric) {
          const ramKB = foundMetric.memory.privateBytes || foundMetric.memory.workingSetSize || 0;
          tabMetrics.push({
            id: tab.id, // Sekme ID'sini ekledik
            pid,
            name: tab.title || new URL(tab.url).hostname || 'Sekme',
            cpu: Math.floor(foundMetric.cpu.percentCPUUsage),
            ramMB: Math.floor(ramKB / 1024)
          });
        }
      }

      return {
        ramMB: Math.floor(totalRamKB / 1024),
        cpuPercent: Math.floor(totalCpu),
        tabMetrics
      };
    } catch (e) {
      console.error('[Performance] Metric collection error:', e);
      return { ramMB: 0, cpuPercent: 0, tabMetrics: [] };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_KILL_PROCESS, (_event, pid: number) => {
    try {
      if (pid) process.kill(pid);
      return true;
    } catch (e) {
      console.error('Failed to kill process', pid, e);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_SET_RAM_LIMITER_ENABLED, (_event, enabled: boolean) => {
    getTabManager()?.setRamLimiterEnabled(enabled);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_SET_RAM_HARD_LIMIT, (_event, hard: boolean) => {
    getTabManager()?.setRamHardLimit(hard);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_SET_MAX_RAM_LIMIT, (_event, limitMb: number) => {
    getTabManager()?.setMaxRamLimit(limitMb);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_SET_RAM_SNOOZE_TIME, (_event, minutes: number) => {
    getTabManager()?.setRamSnoozeTime(minutes);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_SET_TURBO_MODE, (_event, enabled: boolean) => {
    getTabManager()?.setTurboModeEnabled(enabled);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_DEEP_CLEAN, async () => {
    try {
      const { session } = require('electron');
      // 1. Cache temizliği
      await session.defaultSession.clearCache();
      await session.defaultSession.clearHostResolverCache();
      await session.defaultSession.clearStorageData({
        storages: ['shader_cache', 'filesystem', 'indexdb', 'websql']
      });
      
      // 2. TabManager'a tüm sekmeleri optimize etmesini söyle
      getTabManager()?.setTurboModeEnabled(true); // Temizlik sonrası kısa süreli boost
      setTimeout(() => getTabManager()?.setTurboModeEnabled(false), 2000); // 2 saniye sonra normale dön
      
      return { success: true, message: 'Morrow Engine: Derin temizlik tamamlandı!' };
    } catch (e) {
      console.error('Deep clean failed:', e);
      return { success: false, message: 'Temizlik sırasında hata oluştu.' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_SET_NETWORK_LIMIT, (_event, limitMbps: number) => {
    try {
      console.log(`[IPC] SYSTEM_SET_NETWORK_LIMIT: ${limitMbps}`);
      const tm = getTabManager();
      if (!tm) {
        console.warn('[IPC] TabManager is NOT initialized yet!');
        return;
      }
      tm.setNetworkSpeedLimit(limitMbps);
    } catch (e) {
      console.error('[IPC] Network limit error:', e);
    }
  });

  ipcMain.handle('system:set-search-engine-url', (_event, url: string) => {
    getTabManager()?.setSearchEngineUrl(url);
  });
  
  ipcMain.handle('system:set-panic-settings', (_event, shortcut: string, url: string) => {
    getTabManager()?.setPanicSettings(shortcut, url);
  });

  ipcMain.handle('system:is-default-browser', () => {
    try {
      // Artık sadece çok temel bir kontrol yapıyoruz. Güvenilmez Registry okumalarını kaldırdık.
      // Her durumda kullanıcının ayarlar sayfasından butona tekrar basmasına izin vereceğiz.
      return app.isDefaultProtocolClient('http');
    } catch (err) {
      return false;
    }
  });

  // Windows için Tarayıcı Tescili (StartMenuInternet & RegisteredApplications)
  function registerAsWindowsBrowser() {
    if (process.platform !== 'win32') return;
    
    const { writeFileSync, unlinkSync } = require('fs');
    const { join } = require('path');
    const tmp = require('os').tmpdir();
    
    const exePath = app.getPath('exe');
    const isDev = !app.isPackaged;
    // Geliştirme aşamasındayken appPath geçerli, pakette boş
    const appPath = isDev ? app.getAppPath() : '';
    const appName = 'Morrow Browser';
    const progId = isDev ? 'MorrowHTML.Dev' : 'MorrowHTML'; 
    
    console.log(`[DefaultBrowser] Registering: name=${appName}, progId=${progId}, isDev=${isDev}`);

    const script = `
      $ErrorActionPreference = "SilentlyContinue"
      $exePath = "${exePath.replace(/\\/g, '\\\\')}"
      $appName = "${appName}"
      $progId = "${progId}"
      $appPath = "${appPath.replace(/\\/g, '\\\\')}"
      $isDev = ${isDev ? '$true' : '$false'}

      # Komut satırı argümanlarını hazırla
      $openCommand = if ($isDev) { "\\"\$exePath\\" \\"\$appPath\\" \\"%1\\"" } else { "\\"\$exePath\\" \\"%1\\"" }
      $iconString = "\$exePath,0"

      # 1. Temel ProgId Tanımlaması (Classes\\MorrowHTML)
      $classPath = "HKCU:\\Software\\Classes\\$progId"
      New-Item -Path $classPath -Force | Out-Null
      Set-ItemProperty -Path $classPath -Name "(Default)" -Value "$appName HTML Document"
      Set-ItemProperty -Path $classPath -Name "URL Protocol" -Value "" -PropertyType String

      # Open Command
      $cmdPath = "$classPath\\shell\\open\\command"
      New-Item -Path $cmdPath -Force | Out-Null
      Set-ItemProperty -Path $cmdPath -Name "(Default)" -Value $openCommand

      # Application Details
      $appInfoPath = "$classPath\\Application"
      New-Item -Path $appInfoPath -Force | Out-Null
      Set-ItemProperty -Path $appInfoPath -Name "ApplicationName" -Value $appName
      Set-ItemProperty -Path $appInfoPath -Name "ApplicationIcon" -Value $iconString
      Set-ItemProperty -Path $appInfoPath -Name "ApplicationDescription" -Value "Morrow Browser - Modern Web Experience"

      # 2. Capabilities (Windows Ayarları için En Kritik Bölüm)
      $clientPath = "HKCU:\\Software\\Clients\\StartMenuInternet\\$appName"
      New-Item -Path $clientPath -Force | Out-Null
      Set-ItemProperty -Path $clientPath -Name "(Default)" -Value $appName

      $capPath = "$clientPath\\Capabilities"
      New-Item -Path $capPath -Force | Out-Null
      Set-ItemProperty -Path $capPath -Name "ApplicationName" -Value $appName
      Set-ItemProperty -Path $capPath -Name "ApplicationIcon" -Value $iconString
      Set-ItemProperty -Path $capPath -Name "ApplicationDescription" -Value "Morrow Browser - Modern Web"

      # Desteklenen Protokoller
      $urlAssoc = "$capPath\\URLAssociations"
      New-Item -Path $urlAssoc -Force | Out-Null
      Set-ItemProperty -Path $urlAssoc -Name "http" -Value $progId
      Set-ItemProperty -Path $urlAssoc -Name "https" -Value $progId
      Set-ItemProperty -Path $urlAssoc -Name "ftp" -Value $progId
      Set-ItemProperty -Path $urlAssoc -Name "mailto" -Value $progId

      # Desteklenen Dosya Uzantıları
      $fileAssoc = "$capPath\\FileAssociations"
      New-Item -Path $fileAssoc -Force | Out-Null
      Set-ItemProperty -Path $fileAssoc -Name ".htm" -Value $progId
      Set-ItemProperty -Path $fileAssoc -Name ".html" -Value $progId
      Set-ItemProperty -Path $fileAssoc -Name ".shtml" -Value $progId
      Set-ItemProperty -Path $fileAssoc -Name ".xhtml" -Value $progId
      Set-ItemProperty -Path $fileAssoc -Name ".xht" -Value $progId
      Set-ItemProperty -Path $fileAssoc -Name ".pdf" -Value $progId
      Set-ItemProperty -Path $fileAssoc -Name ".webp" -Value $progId
      Set-ItemProperty -Path $fileAssoc -Name ".svg" -Value $progId

      # 3. Ayarlara Kayıt (RegisteredApplications)
      $regAppPath = "HKCU:\\Software\\RegisteredApplications"
      New-Item -Path $regAppPath -Force | Out-Null
      Set-ItemProperty -Path $regAppPath -Name $appName -Value "Software\\Clients\\StartMenuInternet\\$appName\\Capabilities"

      # Ekstra: Geçerli Kullanıcı için Local Machine eşdeğeri sınıfları da kaydet
      $extHtmlPath = "HKCU:\\Software\\Classes\\.html\\OpenWithProgids"
      New-Item -Path $extHtmlPath -Force | Out-Null
      Set-ItemProperty -Path $extHtmlPath -Name $progId -Value "" -PropertyType String

      $extHtmPath = "HKCU:\\Software\\Classes\\.htm\\OpenWithProgids"
      New-Item -Path $extHtmPath -Force | Out-Null
      Set-ItemProperty -Path $extHtmPath -Name $progId -Value "" -PropertyType String
    `;

    const scriptPath = join(tmp, `register_morrow_${Date.now()}.ps1`);
    try {
      writeFileSync(scriptPath, script, { encoding: 'utf16le' });
      execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, { windowsHide: true });
      console.log('[DefaultBrowser] Robust registration flow completed');
    } catch (err) {
      console.error('[DefaultBrowser] Registration flow failed:', err);
    } finally {
      try { unlinkSync(scriptPath); } catch (e) {}
    }
  }

  ipcMain.handle('system:set-as-default-browser', async () => {
    const isWindows = process.platform === 'win32';
    try {
      if (isWindows) {
        // Tescil scriptini baştan sona çalıştır
        registerAsWindowsBrowser();
      }

      // 1. Electron API ile protocol client'ları kaydet (Windows alt yapısına yardımcı olur)
      app.setAsDefaultProtocolClient('http');
      app.setAsDefaultProtocolClient('https');

      if (isWindows) {
        const { shell } = require('electron');
        const appName = encodeURIComponent('Morrow Browser');
        try {
          await shell.openExternal(`ms-settings:defaultapps?registeredApp=${appName}`);
        } catch (e) {
          await shell.openExternal('ms-settings:defaultapps');
        }
      }
      return true;
    } catch (err) {
      console.error('[DefaultBrowser] Application set failed:', err);
      return false;
    }
  });

  // ─── 2. İndirme Yönetimi (ÖNCELİKLİ) ───
  const activeDownloads = new Map<string, Electron.DownloadItem>();
  const { session } = require('electron');
  const { getDatabase } = require('../database/db');

  // Ortak indirme işleyici fonksiyonu
  const handleDownload = async (event: any, item: Electron.DownloadItem, wc: any) => {
    const id = Date.now().toString();
    const filename = item.getFilename();
    const url = item.getURL();
    const totalBytes = item.getTotalBytes();
    const startedAt = new Date().toISOString();

    activeDownloads.set(id, item);

    const data: any = {
      id,
      filename,
      url,
      totalBytes,
      receivedBytes: 0,
      state: 'progressing',
      startedAt,
      savePath: '',
      icon: null, // İkonu asenkron alacağız
    };

    // İkonu al
    const updateIcon = async (path?: string) => {
      try {
        const icon = await app.getFileIcon(path || filename, { size: 'normal' });
        data.icon = icon.toDataURL();
        windowManager.getMainWindow()?.webContents.send('downloads:progress', data);
      } catch (e) {
        // İkon alınamazsa sessizce devam et
      }
    };

    // İlk ikon alımı (dosya adı uzantısına göre)
    updateIcon();

    // DB'ye kaydet
    try {
      const db = getDatabase();
      const dbDownloads = db.getDownloads();
      dbDownloads.unshift(data);
      db.setDownloads(dbDownloads);

      windowManager.getMainWindow()?.webContents.send('downloads:start', data);

      item.on('updated', (_e: any, state: 'progressing' | 'interrupted') => {
        if (state === 'interrupted') {
          data.state = 'interrupted';
        } else if (state === 'progressing') {
          data.receivedBytes = item.getReceivedBytes();
          data.state = 'progressing';
          const ratio = totalBytes > 0 ? data.receivedBytes / totalBytes : -1;
          windowManager.getMainWindow()?.setProgressBar(ratio);
          
          // Eğer savePath yeni belirlendiyse ikonu güncelle (daha doğru ikon için)
          if (!data.savePath && item.getSavePath()) {
            data.savePath = item.getSavePath();
            updateIcon(data.savePath);
          }
        }
        windowManager.getMainWindow()?.webContents.send('downloads:progress', data);
      });

      item.once('done', (_e: any, state: 'completed' | 'cancelled' | 'interrupted') => {
        activeDownloads.delete(id);
        data.state = state;
        if (state === 'completed') {
          data.receivedBytes = totalBytes;
          data.savePath = item.getSavePath();
          updateIcon(data.savePath); // Final ikon (mesela .exe'nin kendi ikonu)
        }
        
        // DB'yi güncelle
        const db2 = getDatabase();
        const all = db2.getDownloads();
        const idx = all.findIndex((d: any) => d.id === id);
        if (idx >= 0) { all[idx] = data; db2.setDownloads(all); }

        windowManager.getMainWindow()?.setProgressBar(-1);
        windowManager.getMainWindow()?.webContents.send('downloads:complete', data);
      });
    } catch (err) {
      console.error('[Downloads] Error initializing download:', err);
    }
  };

  // Tüm oturum bölümleri için dinleyiciyi bağla
  session.defaultSession.on('will-download', handleDownload);
  session.fromPartition('persist:bseester').on('will-download', handleDownload);
  session.fromPartition('in-memory:incognito').on('will-download', handleDownload);

  // DB'den geçmiş indirmeleri ve aktif oturum indirmelerini döndür
  ipcMain.handle('downloads:get', () => {
    const db = getDatabase();
    return db.getDownloads().slice(0, 100); // Son 100 indirme
  });

  ipcMain.handle('downloads:action', (_event, { id, action }: { id: string, action: 'pause' | 'resume' | 'cancel' }) => {
    const item = activeDownloads.get(id);
    if (!item) return false;
    if (action === 'pause') item.pause();
    else if (action === 'resume') item.resume();
    else if (action === 'cancel') item.cancel();
    return true;
  });

  ipcMain.handle('downloads:open', async (_event, filePath: string) => {
    const { shell } = require('electron');
    if (!filePath) return 'Dosya yolu bulunamadı.';
    return shell.openPath(filePath);
  });

  ipcMain.handle('downloads:test', () => {
    const mainWin = windowManager.getMainWindow();
    if (mainWin) {
      mainWin.webContents.downloadURL('https://raw.githubusercontent.com/electron/electron/master/README.md');
    }
  });

  ipcMain.handle(IPC_CHANNELS.APP_INFO, () => {
    return { version: app.getVersion() };
  });

  ipcMain.handle(IPC_CHANNELS.APP_CHECK_UPDATE, async () => {
    const { handleCheckUpdate } = await import('../updater');
    return handleCheckUpdate();
  });

  const historyManager = new HistoryManager();
  const bookmarkManager = new BookmarkManager();
  const findInPage = new FindInPage();

  // Ana pencerenin TabManager'ına geçmiş kaydetme olayını bağla
  windowManager.getTabManager()?.setOnNavigate((url, title) => {
    historyManager.addVisit(url, title);
  });
  
  // ─── Sekme Yönetimi ───


  ipcMain.handle(IPC_CHANNELS.TAB_TOGGLE_PIP, async () => {
    const wc = getTabManager()?.getActiveWebContents();
    if (!wc) return false;
    
    // Find first playing video or any video and trigger PiP
    try {
      await wc.executeJavaScript(`
        (async () => {
          const videos = Array.from(document.querySelectorAll('video'));
          const playingVideo = videos.find(v => !v.paused && v.readyState >= 2) || videos[0];
          if (playingVideo) {
            if (document.pictureInPictureElement) {
              await document.exitPictureInPicture();
            } else {
              await playingVideo.requestPictureInPicture();
            }
            return true;
          }
          return false;
        })()
      `);
      return true;
    } catch (e) {
      console.error('PiP error:', e);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TAB_CREATE, (_event, url?: string, workspaceId?: string) => {
    console.log(`[IPC] TAB_CREATE: url=${url}, workspaceId=${workspaceId}`);
    const tm = getTabManager();
    if (!tm) return null;
    return tm.createTab(url || 'about:blank', workspaceId);
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
      activeWorkspaceId: tabManager.activeWorkspace,
      groups: tabManager.getGroups(),
    };
  });

  ipcMain.handle(IPC_CHANNELS.TAB_REORDER, (_event, activeId: number, overId: number) => {
    getTabManager()?.reorderTabs(activeId, overId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_GET_ZOOM_LEVEL, (_event, tabId?: number) => {
    return getTabManager()?.getZoomFactor(tabId || 0) || 1.0;
  });

  ipcMain.handle(IPC_CHANNELS.TAB_SET_ZOOM_LEVEL, (_event, factor: number, tabId?: number) => {
    getTabManager()?.setZoomFactor(tabId || 0, factor);
  });

  // ─── Sekme Grupları (Yeni Özellik) ───
  ipcMain.handle(IPC_CHANNELS.TAB_GROUP_CREATE, (_event, tabIds: number[], title?: string, color?: string) => {
    getTabManager()?.createTabGroup(tabIds, title, color);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_GROUP_ADD, (_event, tabId: number, groupId: string) => {
    getTabManager()?.addTabToGroup(tabId, groupId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_GROUP_REMOVE, (_event, tabId: number) => {
    getTabManager()?.removeTabFromGroup(tabId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_GROUP_COLLAPSE, (_event, groupId: string) => {
    getTabManager()?.toggleGroupCollapse(groupId);
  });

  ipcMain.handle(IPC_CHANNELS.TAB_GROUP_UPDATE, (_event, groupId: string, title?: string, color?: string) => {
    getTabManager()?.updateTabGroup(groupId, title, color);
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
        label: 'Sağdaki ile Grupla',
        click: () => {
          const tabs = tabManager.getTabList();
          const index = tabs.findIndex((t: any) => t.id === tabId);
          if (index !== -1 && index < tabs.length - 1) {
            const rightTab = tabs[index + 1];
            tabManager.createTabGroup([tabId, rightTab.id], 'Yeni Grup');
          }
        }
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

  ipcMain.handle('tabs:panic', (event, url) => {
    getTabManager()?.panic(url);
  });

  ipcMain.on(IPC_CHANNELS.TAB_REPORT_BOUNDS, (_event, bounds: { x: number, y: number, width: number, height: number }) => {
    getTabManager()?.updateTabBounds(bounds);
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

  ipcMain.handle('history:search', (_event, query: string, limit?: number) => {
    return historyManager.search(query, limit || 20);
  });

  ipcMain.handle('history:get-status', () => {
    return getDatabase().getSettings().isHistoryEnabled;
  });

  ipcMain.handle('history:set-status', (_event, enabled: boolean) => {
    getDatabase().setSettings({ isHistoryEnabled: enabled });
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_GET, (_event, limit?: number) => {
    return historyManager.getHistory(limit || 100);
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_CLEAR, () => {
    historyManager.clearAll();
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

  ipcMain.handle('system:set-route-state', (_event, route: string) => {
    getTabManager()?.setRendererRoute(route);
  });

  // ─── Dal 4: Gelişmiş Özellikler ───

  let menuOverlayWin: Electron.BrowserWindow | null = null;

  ipcMain.handle('app:toggle-chrome-menu', (_event, bounds: { x: number, y: number }) => {
    const x = Math.floor(bounds.x);
    const y = Math.floor(bounds.y);
    
    if (menuOverlayWin && !menuOverlayWin.isDestroyed()) {
      if (menuOverlayWin.isVisible()) {
        menuOverlayWin.hide();
      } else {
        menuOverlayWin.setOpacity(0);
        menuOverlayWin.setPosition(x, y);
        menuOverlayWin.show();
        setTimeout(() => {
          if (menuOverlayWin && !menuOverlayWin.isDestroyed()) {
            menuOverlayWin.setOpacity(1);
          }
        }, 30);
      }
      return;
    }

    const { BrowserWindow } = require('electron');
    const path = require('path');
    
    const win = new BrowserWindow({
      width: 330,
      height: 610,
      x: x,
      y: y,
      frame: false,
      transparent: true,
      hasShadow: false, 
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: true,
      thickFrame: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    menuOverlayWin = win;

    const { app: electronApp } = require('electron');
    const isDev = process.env.NODE_ENV === 'development' || !electronApp.isPackaged;
    
    const url = isDev 
      ? 'http://localhost:5173/#/chromemenu-overlay' 
      : `file://${path.join(__dirname, '..', '..', 'renderer', 'index.html')}#/chromemenu-overlay`;
    
    win.loadURL(url);

    win.once('ready-to-show', () => {
      if (!win.isDestroyed()) {
        win.setOpacity(0);
        win.show();
        setTimeout(() => {
          if (!win.isDestroyed()) win.setOpacity(1);
        }, 50);
      }
    });

    win.on('blur', () => {
      if (!win.isDestroyed()) {
        win.hide();
      }
    });
  });

  ipcMain.handle('app:close-chrome-menu', () => {
    console.log('[DEBUG] app:close-chrome-menu called');
    if (menuOverlayWin && !menuOverlayWin.isDestroyed()) {
      menuOverlayWin.hide();
    }
  });

  // ─── Password Prompt Overlay ───
  let passwordPromptWin: any = null;
  let currentPasswordData: any = null;

  ipcMain.handle('password:toggle-prompt', (event, bounds: { x: number, y: number, data: any }) => {
    try {
      const path = require('path');
      if (!passwordPromptWin || passwordPromptWin.isDestroyed()) {
        const { BrowserWindow } = require('electron');
        passwordPromptWin = new BrowserWindow({
          width: 440,
          height: 400,
          frame: false,
          transparent: true,
          hasShadow: false, 
          resizable: false,
          alwaysOnTop: true,
          skipTaskbar: true,
          focusable: true,
          thickFrame: false,
          show: false,
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
          ? 'http://localhost:5173/#/password-prompt-overlay' 
          : `file://${path.join(__dirname, '..', '..', 'renderer', 'index.html')}#/password-prompt-overlay`;
        
        passwordPromptWin.loadURL(url);

        passwordPromptWin.on('blur', () => {
          if (!passwordPromptWin?.isDestroyed()) {
            passwordPromptWin?.hide();
          }
        });
      }

      currentPasswordData = bounds.data;
      const x = Math.round(bounds.x);
      const y = Math.round(bounds.y);

      passwordPromptWin.setBounds({ x, y, width: 440, height: 400 });

      if (passwordPromptWin.isVisible()) {
        passwordPromptWin.hide();
      } else {
        passwordPromptWin.once('ready-to-show', () => {
          if (!passwordPromptWin?.isDestroyed()) {
             passwordPromptWin?.show();
             passwordPromptWin?.webContents.send('password:prompt-data', currentPasswordData);
          }
        });
        passwordPromptWin.show();
        passwordPromptWin.webContents.send('password:prompt-data', currentPasswordData);
      }
    } catch (e) {
      console.error(e);
    }
  });

  ipcMain.handle('password:close-prompt', (event, resolved) => {
    if (passwordPromptWin && !passwordPromptWin.isDestroyed()) {
      passwordPromptWin.hide();
    }
    // Ana penceredeki Key ikonunu gizlemek için 'password:prompt-resolved' sinyali
    if (resolved) {
      const win = activeWindowManager ? activeWindowManager.getMainWindow() : windowManager.getMainWindow();
      win?.webContents.send('password:prompt-resolved');
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

  ipcMain.handle('app:is-incognito', () => {
    return activeWindowManager?.isIncognito ?? false;
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

  // ─── Password Manager Handlers ───
  // Site üzerinden gelen yakalama isteği, arayüze (topbar) onay (prompt) çıkarması için iletilir.
  ipcMain.on('password:save', async (event, origin, username, password) => {
    const win = activeWindowManager ? activeWindowManager.getMainWindow() : windowManager.getMainWindow();
    if (!win) return;
    try {
      // Diyalog yerine arayüze pasla
      win.webContents.send('password:prompt-save', { origin, username, password });
    } catch (err) {
      console.error('[PasswordManager] Sinyal Hatası:', err);
    }
  });

  // Arayüz kullanıcı "Kaydet" dedikten sonra bu ucunu tetikler
  ipcMain.handle('password:confirm-save', async (event, origin, username, password) => {
    const { safeStorage } = require('electron');
    try {
      const pText = password == null ? '' : String(password);
      const uText = username == null ? '' : String(username);
      
      let encrypted = pText; 
      if (pText.length > 0 && safeStorage.isEncryptionAvailable()) {
         encrypted = safeStorage.encryptString(pText).toString('base64');
      } else if (pText.length > 0) {
         encrypted = Buffer.from(pText).toString('base64'); // Basit yedek obfuskasyon
      }

      const { getDatabase } = require('../database/db');
      const db = getDatabase();
      const passwords = db.getPasswords();
      
      // Aynı origin ve username varsa güncelle
      const existingIdx = passwords.findIndex((p: any) => p.origin === origin && p.username === uText);
      if (existingIdx !== -1) {
         passwords[existingIdx].encryptedPassword = encrypted;
      } else {
         passwords.push({ id: Date.now().toString(), origin, username: uText, encryptedPassword: encrypted });
      }
      db.setPasswords(passwords);
      console.log(`[PasswordManager] Kaydedildi: ${origin}`);
      return { success: true };
    } catch (err) {
      console.error('[PasswordManager] Kayıt Hatası:', err);
      return { success: false, error: err };
    }
  });

  ipcMain.handle('password:get', (event, origin) => {
    const { safeStorage } = require('electron');
    const { getDatabase } = require('../database/db');
    const db = getDatabase();
    
    const rootOrigin = origin; // Tam origin örn: https://github.com
    const passwords = db.getPasswords().filter((p: any) => p.origin === rootOrigin);
    
    const credentials = passwords.map((p: any) => {
      let decrypted = '';
      try {
        if (safeStorage.isEncryptionAvailable()) {
          decrypted = safeStorage.decryptString(Buffer.from(p.encryptedPassword, 'base64'));
        } else {
          decrypted = Buffer.from(p.encryptedPassword, 'base64').toString('utf8');
        }
      } catch (err) {
        decrypted = p.encryptedPassword; 
      }
      return { id: p.id, username: p.username, password: decrypted };
    });

    return credentials;
  });

  ipcMain.handle('password:get-all', () => {
    const { safeStorage } = require('electron');
    const { getDatabase } = require('../database/db');
    const db = getDatabase();
    
    const passwords = db.getPasswords();
    
    const credentials = passwords.map((p: any) => {
      let decrypted = '';
      try {
        if (safeStorage.isEncryptionAvailable()) {
          decrypted = safeStorage.decryptString(Buffer.from(p.encryptedPassword, 'base64'));
        } else {
          decrypted = Buffer.from(p.encryptedPassword, 'base64').toString('utf8');
        }
      } catch (err) {
        decrypted = p.encryptedPassword; 
      }
      return { id: p.id, origin: p.origin, username: p.username, password: decrypted };
    });

    return credentials;
  });

  ipcMain.handle('password:delete', (event, id) => {
    const { getDatabase } = require('../database/db');
    const db = getDatabase();
    const passwords = db.getPasswords();
    db.setPasswords(passwords.filter((p: any) => p.id !== id));
    return true;
  });

  ipcMain.handle('adblock:toggle', () => {
    return adBlocker?.toggle() ?? false;
  });

  ipcMain.handle('adblock:status', () => {
    return adBlocker?.isEnabled() ?? false;
  });

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
      tm.notifyTabUpdate();
      console.log(`[IPC] workspace:set-active updated for TabManager to: ${id}`);
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

  ipcMain.handle('workspace:reorder', (_event, newOrder: any[]) => {
    workspaceManager.reorderWorkspaces(newOrder);
  });

  ipcMain.handle('workspace:update', (_event, id: string, name: string, icon: string) => {
    return workspaceManager.updateWorkspace(id, name, icon);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_SET_TOUCHPAD_GESTURES_ENABLED, (_event, enabled: boolean) => {
    const { getDatabase } = require('../database/db');
    getDatabase().setSettings({ isTouchpadGesturesEnabled: enabled });
    console.log(`[IPC] Touchpad Gestures updated: ${enabled}`);
    return true;
  });

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

  // ─── Extension List Popup (BrowserWindow olarak, webview’un üzerinde) ───
  let extListWindow: import('electron').BrowserWindow | null = null;
  let lastAnchorRect: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 30, height: 30 };

  ipcMain.handle('extension:open-list-popup', async (_event, anchorRect: { x: number; y: number; width: number; height: number }) => {
    const { BrowserWindow: BW, screen: scr } = require('electron');
    lastAnchorRect = anchorRect; // extension popup için sakla
    
    if (extListWindow && !extListWindow.isDestroyed()) {
      extListWindow.close();
      extListWindow = null;
      return;
    }

    const extensions = extensionManager.getLoadedExtensions();
    const mainWin = BW.getAllWindows().find((w: any) => !w.__extensionPopup && !w.__extList);
    const winBounds = mainWin?.getBounds() || { x: 0, y: 0 };

    const popupWidth = 310;
    const popupX = Math.round(winBounds.x + anchorRect.x + anchorRect.width - popupWidth);
    const popupY = Math.round(winBounds.y + anchorRect.y + anchorRect.height + 6);

    // Extension ikonu dosyalarını bul
    const extData = extensions.map((ext: any) => {
      const fs = require('fs');
      const path = require('path');
      let iconPath = '';
      try {
        const manifest = JSON.parse(fs.readFileSync(path.join(ext.path, 'manifest.json'), 'utf8'));
        const iconRelPath = manifest?.icons?.['48'] || manifest?.icons?.['32'] || manifest?.icons?.['16'] ||
          manifest?.action?.default_icon?.['48'] || manifest?.action?.default_icon?.['19'] || '';
        if (iconRelPath) {
          const full = path.join(ext.path, iconRelPath);
          if (fs.existsSync(full)) iconPath = `file://${full}`;
        }
      } catch {}
      return { id: ext.id, name: ext.name, version: ext.version, iconPath };
    });

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, 'Inter', sans-serif; background: #1c1b2e; color: #fff; border-radius: 14px; overflow: hidden; border: 1px solid rgba(139,92,246,0.25); }
.header { padding: 13px 16px 10px; border-bottom: 1px solid rgba(255,255,255,0.07); display:flex; justify-content:space-between; align-items:center; }
.header h3 { font-size: 13px; font-weight: 700; color:#fff; }
.close-btn { background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; font-size:15px; width:22px; height:22px; border-radius:6px; display:flex; align-items:center; justify-content:center; }
.close-btn:hover { background:rgba(255,255,255,0.1); color:#fff; }
.subtitle { padding: 10px 16px 4px; font-size:11px; font-weight:600; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.5px; }
.ext-list { overflow-y: auto; }
.ext-item { display:flex; align-items:center; gap:12px; padding:8px 16px; cursor:pointer; transition:background 0.1s; }
.ext-item:hover { background:rgba(255,255,255,0.05); }
.ext-icon { width:32px; height:32px; border-radius:8px; background:rgba(139,92,246,0.15); border:1px solid rgba(139,92,246,0.25); display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; overflow:hidden; }
.ext-icon img { width:100%; height:100%; object-fit:contain; }
.ext-info { flex:1; min-width:0; }
.ext-name { font-size:13px; font-weight:500; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ext-ver { font-size:10px; color:rgba(255,255,255,0.35); }
.actions { display:flex; gap:2px; flex-shrink:0; }
.action-btn { width:26px; height:26px; background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:13px; }
.action-btn:hover { background:rgba(248,113,113,0.12); color:#f87171; }
.footer { border-top: 1px solid rgba(255,255,255,0.07); padding:4px; }
.manage-btn { width:100%; display:flex; align-items:center; gap:10px; padding:10px 12px; background:none; border:none; border-radius:10px; color:rgba(255,255,255,0.6); cursor:pointer; font-size:13px; font-weight:500; }
.manage-btn:hover { background:rgba(255,255,255,0.05); color:#fff; }
.empty { padding:28px 16px; text-align:center; color:rgba(255,255,255,0.3); font-size:12px; }
</style>
</head>
<body>
<div class="header"><h3>Uzantılar</h3><button class="close-btn" onclick="window.close()">&#x2715;</button></div>
${extData.length > 0 ? '<div class="subtitle">Yüklü Uzantılar</div>' : ''}
<div class="ext-list">
${extData.length === 0 ? '<div class="empty">Henüz yüklü uzantı yok.</div>' : extData.map((e: any) => `
<div class="ext-item" onclick="openPopup('${e.id}')">
  <div class="ext-icon">${e.iconPath ? `<img src="${e.iconPath}" onerror="this.style.display='none';this.parentElement.textContent='🧩'">` : '🧩'}</div>
  <div class="ext-info"><div class="ext-name">${e.name}</div><div class="ext-ver">v${e.version}</div></div>
  <div class="actions"><button class="action-btn" onclick="event.stopPropagation();removeExt('${e.id}')" title="Kaldır">&#x2715;</button></div>
</div>`).join('')}
</div>
<div class="footer"><button class="manage-btn" onclick="openSettings()">⚙️ Uzantıları yönet</button></div>
<script>
  const { ipcRenderer } = require('electron');
  function openPopup(id) { ipcRenderer.invoke('extension:open-popup-from-list', id); window.close(); }
  function removeExt(id) { ipcRenderer.invoke('extension:remove', id); window.close(); }
  function openSettings() { ipcRenderer.invoke('system:navigate-main-router', '/settings?category=extensions'); window.close(); }
<\/script>
</body></html>`;

    const tmpFile = require('path').join(require('os').tmpdir(), 'morrow-ext-list.html');
    require('fs').writeFileSync(tmpFile, html);

    extListWindow = new BW({
      width: popupWidth,
      height: Math.min(80 + extData.length * 50 + 50, 480),
      x: popupX,
      y: popupY,
      frame: false,
      alwaysOnTop: true,
      transparent: false,
      resizable: false,
      skipTaskbar: true,
      show: false,
      roundedCorners: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
    const w = extListWindow!;
    (w as any).__extList = true;
    w.loadFile(tmpFile);
    w.once('ready-to-show', () => w.show());
    w.on('blur', () => { w.close(); extListWindow = null; });
    w.on('closed', () => { extListWindow = null; });
    return true;
  });

  // Extension'a popup listesinden tıklanınca aç
  ipcMain.handle('extension:open-popup-from-list', async (_event, extensionId: string) => {
    const { BrowserWindow: BW } = require('electron');
    const path = require('path');
    const fs = require('fs');

    const ext = extensionManager.getLoadedExtensions().find((e: any) => e.id === extensionId);
    if (!ext) return false;
    const manifest = JSON.parse(fs.readFileSync(path.join(ext.path, 'manifest.json'), 'utf8'));
    const popupRelPath = manifest?.action?.default_popup || manifest?.browser_action?.default_popup;
    if (!popupRelPath) return false;
    const popupFile = path.join(ext.path, popupRelPath);
    if (!fs.existsSync(popupFile)) return false;

    const existing = BW.getAllWindows().find((w: any) => w.__extensionPopup);
    if (existing) existing.close();

    const mainWin = BW.getAllWindows().find((w: any) => !w.__extensionPopup && !w.__extList);
    const winBounds = mainWin?.getBounds() || { x: 0, y: 0 };
    // Listeyle aynı pozisyona hizala (puzzle butonu altı)
    const popupWidth = 380;
    const popupX = Math.round(winBounds.x + lastAnchorRect.x + lastAnchorRect.width - popupWidth);
    const popupY = Math.round(winBounds.y + lastAnchorRect.y + lastAnchorRect.height + 6);

    const popupWin = new BW({
      width: popupWidth, height: 520,
      x: popupX, y: popupY,
      frame: false, transparent: false,
      alwaysOnTop: true, resizable: false,
      skipTaskbar: true, show: false,
      webPreferences: { 
        session: require('electron').session.defaultSession, 
        nodeIntegration: true, // Bridge için gerekli
        contextIsolation: false 
      },
    });
    (popupWin as any).__extensionPopup = true;
    popupWin.loadFile(popupFile);
    
    // Volume Booster Bridge: Eklenti slider'ını yakala ve Morrow'un native ses sistemine bağla
    popupWin.webContents.on('did-finish-load', () => {
      popupWin.webContents.executeJavaScript(`
        (function() {
          console.log("[ExtensionBridge] Volume Booster bridge initialized.");
          
          function setupHooks() {
            // Sadece type="range" değil, sesle ilgili her türlü slider'ı bulmaya çalış
            const sliders = document.querySelectorAll('input[type="range"], .slider, [role="slider"]');
            
            sliders.forEach(slider => {
              if (slider.__morrow_hooked) return;
              slider.__morrow_hooked = true;
              
              const onValueChange = () => {
                let val;
                if (slider.tagName === 'INPUT') {
                  val = parseFloat(slider.value);
                } else {
                  // Custom slider'lar için ARIA attribute'larına bak
                  val = parseFloat(slider.getAttribute('aria-valuenow'));
                }

                if (!isNaN(val)) {
                  // Volume Master 0-600 arası değer verir, biz 0.0 - 6.0 yapıyoruz
                  // Eğer başka bir eklentiyse ve 0-100 arasıysa onu da kurtaralım
                  const gain = val > 6 ? val / 100 : val / 100; 
                  console.log("[ExtensionBridge] Volume change detected:", val, "-> Gain:", gain);
                  require('electron').ipcRenderer.invoke('extension:set-volume', gain);
                }
              };

              slider.addEventListener('input', onValueChange);
              slider.addEventListener('change', onValueChange);
              
              // Bazı React eklentileri için MutationObserver ile değer değişimini izle
              const valObserver = new MutationObserver(onValueChange);
              valObserver.observe(slider, { attributes: true, attributeFilter: ['value', 'aria-valuenow'] });
            });
          }

          setInterval(setupHooks, 1000);
          setupHooks();
        })();
      `);
    });

    popupWin.once('ready-to-show', () => popupWin.show());
    popupWin.on('blur', () => popupWin.close());
    return true;
  });

  // Native Ses Kontrolü IPC
  ipcMain.handle('extension:set-volume', async (_event, gain: number) => {
    if (!windowManager) return false;
    const result = await windowManager.getTabManager()?.setVolume(gain);
    return result;
  });

  // navigate-main-router handler (list popup'tan)
  ipcMain.handle('system:navigate-main-router', (_event, route: string) => {
    const { BrowserWindow: BW } = require('electron');
    const mainWin = BW.getAllWindows().find((w: any) => !w.__extensionPopup && !w.__extList);
    mainWin?.webContents.send('system:on-navigate-router', route);
  });


  // Eklenti popup penceresini aç (Chrome'daki gibi)
  ipcMain.handle(IPC_CHANNELS.EXTENSION_OPEN_POPUP, async (_event, extensionId: string, anchorRect: { x: number; y: number; width: number; height: number }) => {
    const { BrowserWindow } = require('electron');
    const path = require('path');
    const fs = require('fs');
    
    const ext = extensionManager.getLoadedExtensions().find(e => e.id === extensionId);
    if (!ext) return false;
    
    const manifestPath = path.join(ext.path, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    const popupRelPath = manifest?.action?.default_popup || manifest?.browser_action?.default_popup;
    if (!popupRelPath) return false;
    
    const popupFile = path.join(ext.path, popupRelPath);
    if (!fs.existsSync(popupFile)) return false;
    
    // Mevcut popup penceresini kapat
    const existing = BrowserWindow.getAllWindows().find((w: any) => w.__extensionPopup);
    if (existing) existing.close();
    
    const mainWin = BrowserWindow.getAllWindows().find((w: any) => !w.__extensionPopup);
    const winBounds = mainWin?.getBounds() || { x: 0, y: 0 };
    
    const popupWidth = 380;
    const popupHeight = 500;
    // Sağ kenarını butonun sağ kenarına hizala, butonun hemen altında aç
    const popupX = Math.round(winBounds.x + anchorRect.x + anchorRect.width - popupWidth);
    const popupY = Math.round(winBounds.y + anchorRect.y + anchorRect.height + 6);
    
    const popupWin = new BrowserWindow({
      width: popupWidth,
      height: popupHeight,
      x: popupX,
      y: popupY,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        session: require('electron').session.defaultSession,
        nodeIntegration: false,
        contextIsolation: false,
      },
    });
    
    (popupWin as any).__extensionPopup = true;
    
    popupWin.loadFile(popupFile);
    popupWin.once('ready-to-show', () => popupWin.show());
    popupWin.on('blur', () => popupWin.close());
    
    return true;
  });


  // ─── Custom HTML ContextMenu Click Forwards ───
  ipcMain.on('context-menu:click', (_event, id: string) => {
    const tm = getTabManager();
    if (!tm) return;
    const callback = tm.contextMenuCallbacks.get(id);
    if (callback) callback();
  });

  // ─── Temizleyici (Cleaner) Handlers ───
  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_CACHE_SIZE, async () => {
    const { session } = require('electron');
    try {
      return await session.defaultSession.getCacheSize();
    } catch (e) {
      console.error('getCacheSize error:', e);
      return 0;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_CLEAR_CACHE, async () => {
    const { session } = require('electron');
    try {
      await session.defaultSession.clearCache();
      return true;
    } catch (e) {
      console.error('clearCache error:', e);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_COOKIES_COUNT, async () => {
    const { session } = require('electron');
    try {
      const cookies = await session.defaultSession.cookies.get({});
      return cookies.length;
    } catch (e) {
      console.error('getCookiesCount error:', e);
      return 0;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_CLEAR_COOKIES, async () => {
    const { session } = require('electron');
    try {
      await session.defaultSession.clearStorageData({ storages: ['cookies'] });
      return true;
    } catch (e) {
      console.error('clearCookies error:', e);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DOWNLOADS_CLEAR_HISTORY, () => {
    try {
      const { getDatabase } = require('../database/db');
      const db = getDatabase();
      if (db) {
        db.setDownloads([]);
        return true;
      }
      return false;
    } catch (e) {
      console.error('clearDownloads error:', e);
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.TAB_EXECUTE_JS, async (_event, script: string, tabId?: number) => {
    const tm = getTabManager();
    const id = tabId || tm.getActiveTabId();
    const view = tm.getTab(id);
    if (view) {
      return await view.webContents.executeJavaScript(script);
    }
    return null;
  });

  // ─── Translation Handlers ───
  let translateOverlayWin: Electron.BrowserWindow | null = null;

  ipcMain.handle(IPC_CHANNELS.TAB_TRANSLATE_TOGGLE, (_event, bounds: { x: number, y: number }) => {
    const x = Math.floor(bounds.x);
    const y = Math.floor(bounds.y);
    
    const win = translateOverlayWin;
    if (win && !win.isDestroyed()) {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.setPosition(x, y);
        win.show();
      }
      return;
    }

    const { BrowserWindow } = require('electron');
    const path = require('path');
    
    translateOverlayWin = new BrowserWindow({
      width: 320,
      height: 200,
      x: x,
      y: y,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        preload: path.join(__dirname, '..', 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    const url = process.env.NODE_ENV === 'development' || !app.isPackaged
      ? 'http://localhost:5173#/translate-prompt-overlay'
      : `file://${path.join(__dirname, '..', '..', 'renderer', 'index.html')}#/translate-prompt-overlay`;

    translateOverlayWin?.loadURL(url);

    translateOverlayWin?.on('blur', () => {
      translateOverlayWin?.hide();
    });
  });

  ipcMain.handle(IPC_CHANNELS.TAB_TRANSLATE_CLOSE, () => {
    if (translateOverlayWin && !translateOverlayWin.isDestroyed()) {
      translateOverlayWin.hide();
    }
  });

  ipcMain.handle(IPC_CHANNELS.TAB_TRANSLATE, () => {
    getTabManager()?.translateActiveTab();
  });

  // ─── Automated Language Detection Trigger ───

}
