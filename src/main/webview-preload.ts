/// <reference lib="dom" />
import { contextBridge, ipcRenderer } from 'electron';

// --- Google / Chromium Deep Spoofing (V3) ---

// 1. window.chrome Polyfill (Gelişmiş)
if (!(window as any).chrome) {
  (window as any).chrome = {
    runtime: {
      sendMessage: () => {},
      getURL: (path: string) => `chrome-extension://preview/${path}`,
      connect: () => ({ onMessage: { addListener: () => {} }, onDisconnect: { addListener: () => {} }, postMessage: () => {}, disconnect: () => {} }),
      onMessage: { addListener: () => {}, removeListener: () => {} },
      onConnect: { addListener: () => {} }
    },
    loadTimes: () => ({
      requestTime: Date.now() / 1000 - 0.5,
      startLoadTime: Date.now() / 1000 - 0.5,
      commitLoadTime: Date.now() / 1000 - 0.4,
      finishDocumentLoadTime: Date.now() / 1000 - 0.3,
      finishLoadTime: Date.now() / 1000 - 0.2,
      firstPaintTime: Date.now() / 1000 - 0.35,
      firstPaintAfterLoadTime: 0,
      navigationType: 'Other',
      wasFetchedViaSpdy: true,
      wasNpnNegotiated: true,
      wasAlternateProtocolAvailable: false,
      connectionInfo: 'h2'
    }),
    csi: () => ({
      startE: Date.now(),
      onloadT: Date.now() + 200,
      pageT: 500,
      tran: 15
    }),
    app: {
      isInstalled: false,
      getIsInstalled: () => false,
      getDetails: () => null,
      installState: () => 'not_installed'
    }
  };
}

// 2. Navigator Fingerprint Maskeleme
const maskNavigator = () => {
  // Webdriver'ı tamamen gizle (Google bot tespiti için ilk buraya bakar)
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

  // Dilleri sabitle
  Object.defineProperty(navigator, 'languages', { get: () => ['tr-TR', 'tr', 'en-US', 'en'] });

  // Plugins Simülasyonu (Electron'da boştur, gerçek Chrome'da PDF eklentileri vardır)
  const mockPlugins = [
    { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
  ];

  Object.defineProperty(navigator, 'plugins', {
    get: () => {
      const items = [...mockPlugins];
      (items as any).refresh = () => {};
      (items as any).item = (i: number) => items[i];
      (items as any).namedItem = (name: string) => items.find((p: any) => p.name === name);
      return items;
    }
  });

  // Client Hints (Modern Chrome doğrulaması için kritik)
  if (!(navigator as any).userAgentData) {
    (navigator as any).userAgentData = {
      brands: [
        { brand: 'Not-A.Brand', version: '99' },
        { brand: 'Chromium', version: '124' },
        { brand: 'Google Chrome', version: '124' }
      ],
      mobile: false,
      platform: 'Windows'
    };
  }
};

try {
  maskNavigator();
} catch (e) {
  // Maskeleme sessizce başarısız olabilir (güvenlik policaları vb.)
}

// 1. Dış dünyaya sınırlı bir API sun
contextBridge.exposeInMainWorld('morrowInternals', {
  savePassword: (origin: string, user: string, pass: string) => ipcRenderer.send('password:save', origin, user, pass),
  getPasswords: (origin: string) => ipcRenderer.invoke('password:get', origin)
});

// 2. Sayfanın izole dünyasında (DOM) çalışacak olayları dinle
window.addEventListener('DOMContentLoaded', async () => {
    // A) Autofill mekanizması (Şifreleri ana süreçten çek ve alanlara yerleştir)
    try {
        const origin = window.location.origin;
        // Sadece HTTP/HTTPS sitelerinde çalış (about:blank vb. pas geç)
        if (!origin.startsWith('http')) return;

        const passwords = await ipcRenderer.invoke('password:get', origin);
        
        if (passwords && passwords.length > 0) {
            const credentials = passwords[0];
            
            // Password alanını bul
            const passwordInputs = document.querySelectorAll<HTMLInputElement>('input[type="password"]');

            passwordInputs.forEach(passField => {
                 let form = passField.closest('form');
                 if (form) {
                    const textInputs = form.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="email"]');
                    if (textInputs.length > 0) {
                         const userField = textInputs[0];
                         // Değer yoksa doldur
                         if (!userField.value) {
                             userField.value = credentials.username;
                             userField.dispatchEvent(new Event('input', { bubbles: true }));
                             userField.dispatchEvent(new Event('change', { bubbles: true }));
                         }
                    }
                 }
                 if (!passField.value) {
                     passField.value = credentials.password; // decrypted by main process
                     passField.dispatchEvent(new Event('input', { bubbles: true }));
                     passField.dispatchEvent(new Event('change', { bubbles: true }));
                 }
            });
        }
    } catch (e) {
        // İletişim hatalarını sessizce yut
    }

    // B) Heuristic SPA (Instagram/Facebook) Form Gönderimi Yakalama
    let lastUsername = '';
    let lastPassword = '';
    let hasPrompted = false; // Aynı sayfa yüklenmesinde peş peşe sormaması için

    const updateCredentialsFromDOM = () => {
        const passwordFields = document.querySelectorAll<HTMLInputElement>('input[type="password"]');
        if (passwordFields.length > 0) {
            // Şifre alanının doluluğunu kontrol et
            for (let p of Array.from(passwordFields)) {
                if (p.value) lastPassword = p.value;
            }

            // En yakın text / email field
            const textFields = document.querySelectorAll<HTMLInputElement>('input[type="text"], input[type="email"], input:not([type="hidden"]):not([type="password"]):not([type="submit"]):not([type="button"])');
            if (textFields.length > 0) {
                 for (let i = textFields.length - 1; i >= 0; i--) {
                     if (textFields[i].value.trim() !== '') {
                         lastUsername = textFields[i].value.trim();
                         break;
                     }
                 }
            }
        }
    };

    const trySave = () => {
        if (!hasPrompted && lastPassword && window.location.origin.startsWith('http')) {
            hasPrompted = true;
            ipcRenderer.send('password:save', window.location.origin, lastUsername, lastPassword);
            // Sıfırla ki peş peşe tetiklenmesin ama farklı bir giriş olursa tetiklenebilsin diye 5 saniye sonra flag'i kaldır
            setTimeout(() => { hasPrompted = false; }, 5000);
        }
    };

    // Her tuş basıldığında hafızayı tazele
    document.addEventListener('input', updateCredentialsFromDOM, true);
    document.addEventListener('change', updateCredentialsFromDOM, true);

    // Tıklamaları dinle (Giriş Butonu vb.)
    document.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('button, [type="submit"], [role="button"]');
        if (btn) {
            updateCredentialsFromDOM();
            if (lastPassword) {
                // Şifre girilmiş ve bir butona tıklanmışsa giriş yapılıyordur büyük muhtimal
                trySave();
            }
        }
    }, true);

    // Enter tuşunu dinle
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            updateCredentialsFromDOM();
            if (lastPassword) {
                trySave();
            }
        }
    }, true);

    // Zaten submit eden klasik siteler için (Google vb.)
    document.addEventListener('submit', (e: Event) => {
        updateCredentialsFromDOM();
        if (lastPassword) {
            trySave();
        }
    }, true);

    // C) Premium Mouse Gestures (Önceki sürümden temizlendi - Native Touchpad öncelikli)
});
