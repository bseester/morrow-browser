/**
 * Main Process — Uygulamanın giriş noktası
 *
 * Electron uygulamasını başlatır, donanım optimizasyonlarını yapar,
 * pencereyi oluşturur ve IPC handler'larını kaydeder.
 */

import { app, BrowserWindow, session, desktopCapturer, dialog } from 'electron';
import path from 'path';
import { WindowManager } from './window/WindowManager';
import { registerIPCHandlers } from './ipc/handlers';
import { AdBlocker } from './engine/adblocker';
import { setupCrxProtocol, getExtensionManager } from './engine/extensions';
import { installChromeWebStore } from 'electron-chrome-web-store';

export let adBlocker: AdBlocker | null = null;
let windowManager: WindowManager;

if (process.platform === 'win32') {
  app.setAppUserModelId('com.morrow.browser');
}

// Siyah ekran sorununu çözmek için donanım hızlandırmayı sadece sorunlu OS'lerde devre dışı bırak
if (process.platform !== 'darwin') {
  app.disableHardwareAcceleration();
}

// Google Sign-In (OAuth) Bloklamasını aşmak için (FedCM kapatılıyor)
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-features', 'FedCm');

// ─── Singleton kilidi (tek pencere) ───

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  // macOS: Protokol üzerinden URL açıldığında
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleArgv([url]);
  });

  app.on('second-instance', (event, argv) => {
    // Kullanıcı ikinci bir örnek açmaya çalışırsa (örneğin bir linke tıklayarak)
    // mevcut pencereyi öne getir ve URL'yi işle
    const win = windowManager?.getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      handleArgv(argv);
    }
  });

  // ─── Uygulama Hazır ───

  app.whenReady().then(async () => {
    setupCrxProtocol();

    adBlocker = new AdBlocker(session.defaultSession);
    
    // Extension manager kur ve global'e at
    const extManager = getExtensionManager();
    (global as any).extensionManager = extManager;

    // Chrome Web Store kurulumunu bağla — Otomatik indirme ve kurulum
    await installChromeWebStore({
      session: session.fromPartition('persist:bseester'),
      extensionsPath: path.join(app.getPath('userData'), 'extensions', 'crx'),
      loadExtensions: true,
    });

    // Eski eklentileri geri yükle
    await extManager.restoreExtensions();


    windowManager = new WindowManager();
    const mainWindow = windowManager.createMainWindow();

    // IPC handler'larını kaydet
    registerIPCHandlers(windowManager, adBlocker);

    // Pencere görünür olduktan sonra güncelleme kontrolü başlat
    const win = windowManager.getMainWindow();
    if (win) {
      win.once('ready-to-show', () => {
        import('./updater').then(({ setupAutoUpdater }) => setupAutoUpdater());
      });
    }

    // Oturum bazlı kalıcılık
    const persistentSession = session.fromPartition('persist:bseester');

    // ─── Google Sign-In Firefox UA Fix ───
    // Google, accounts.google.com'da Chromium/Electron tabanlı istekleri
    // "güvenli olmayan uygulama" olarak işaretler. Firefox UA gönderince bu
    // kontrol devreye girmiyor. Diğer sitelerde Chrome UA korunur.
    const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    const FIREFOX_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0';

    const GOOGLE_AUTH_DOMAINS = [
      'accounts.google.com',
      'myaccount.google.com',
    ];

    const applyFirefoxUAFix = (sess: Electron.Session) => {
      sess.setUserAgent(CHROME_UA);
      sess.webRequest.onBeforeSendHeaders((details, callback) => {
        const headers = details.requestHeaders;
        const isGoogleAuth = GOOGLE_AUTH_DOMAINS.some(d => details.url.includes(d));
        headers['User-Agent'] = isGoogleAuth ? FIREFOX_UA : CHROME_UA;
        callback({ requestHeaders: headers });
      });
    };

    applyFirefoxUAFix(session.defaultSession);
    applyFirefoxUAFix(persistentSession);


    // Uygulama kapanırken verileri diske yazmayı zorla (Giriş bilgilerinin korunması için kritik)
    app.on('before-quit', async () => {
      try {
        await Promise.all([
          persistentSession.flushStorageData(),
          session.defaultSession.flushStorageData()
        ]);
      } catch (e) {
        console.error('Session flush error:', e);
      }
    });

    // ─── Yerleşik Yazım Denetimi (Native Spellchecker) ───
    session.defaultSession.setSpellCheckerEnabled(true);
    // Dil tercihlerini işletim sisteminden kalıtımla alacak, genelde tr-TR vb.

    // ─── WebRTC & Ekran Paylaşımı (Screen Sharing) ───
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        // Native Dialog ile kullanıcıya hangi ekranı paylaşacağını sor
        const options = sources.map(s => s.name);
        const win = windowManager.getMainWindow();
        if (!win) {
          callback({ video: sources[0] });
          return;
        }

        dialog.showMessageBox(win, {
          type: 'question',
          buttons: [...options, 'İptal'],
          title: 'Ekran veya Pencere Paylaşımı',
          message: 'Hangi ekranı veya pencereyi paylaşmak istersiniz?',
          detail: 'Web sitesi ekranınızı paylaşabilmek için izin istiyor.'
        }).then(result => {
          const index = result.response;
          if (index < sources.length) {
            callback({ video: sources[index] });
          } else {
            callback({ video: undefined, audio: undefined }); // Kullanıcı iptal etti
          }
        }).catch(() => {
          callback({ video: undefined, audio: undefined });
        });
      });
    });



    // Varsayılan sekme oluştur
    const tabManager = windowManager.getTabManager();
    if (tabManager) {
      tabManager.loadPinnedTabs();
    }

    // macOS: dock ikonuna tıklanınca pencere yoksa yenisini oluştur
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createMainWindow();
      }
    });

    // Ana pencere yüklenince başlangıç argümanlarını işle (Örn: Link tıklanarak açıldıysa)
    const mw = windowManager.getMainWindow();
    if (mw) {
      if (mw.webContents.isLoading()) {
        mw.webContents.once('did-finish-load', () => {
          handleArgv(process.argv);
        });
      } else {
        handleArgv(process.argv);
      }
    }
  });

  // ─── Pencere Kapatma Davranışı ───

  app.on('window-all-closed', () => {
    // macOS'te dock'ta kalmaya devam et
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

/**
 * Komut satırı argümanlarını (argv) tarayarak URL'leri bulur ve yeni sekmede açar.
 * Windows'ta link tıklanınca veya bir dosyaya çift tıklanınca tetiklenir.
 */
function handleArgv(argv: string[]) {
  // Eğer windowManager henüz hazır değilse işlemi erteleyebiliriz
  if (!windowManager) return;
  
  const tabManager = windowManager.getTabManager();
  if (!tabManager) return;

  // 1. URL'leri bul (http:// veya https:// ile başlayan)
  let url = argv.find(arg => arg.startsWith('http://') || arg.startsWith('https://'));
  
  // 2. Eğer URL yoksa, yerel bir .html dosyası mı diye bak
  if (!url) {
    const filePath = argv.find(arg => 
      arg.toLowerCase().endsWith('.html') || 
      arg.toLowerCase().endsWith('.htm') || 
      arg.toLowerCase().endsWith('.shtml')
    );
    
    if (filePath) {
      // Dosya yolunu file:// protokolüne çevir
      url = filePath.startsWith('file://') ? filePath : `file:///${path.resolve(filePath).replace(/\\/g, '/')}`;
    }
  }

  if (url) {
    console.log(`[Main] Opening argument: ${url}`);
    
    // Eğer ana pencere zaten açıksa onu öne getir
    const win = windowManager.getMainWindow();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }

    // Yeni sekmede aç
    tabManager.createTab(url);
  }
}
