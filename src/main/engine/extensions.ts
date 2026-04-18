/**
 * ExtensionManager — Chrome eklentisi yükleme ve yönetim motoru
 *
 * Electron'un session.loadExtension() API'si ile
 * unpacked Chrome eklentilerini yükler ve yönetir.
 */

import { session, dialog, app } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import unzipper from 'unzipper';

export interface LoadedExtension {
  id: string;
  name: string;
  version: string;
  path: string;
}

class ExtensionManager {
  private loadedExtensions: LoadedExtension[] = [];
  private extensionsDir: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.extensionsDir = path.join(userDataPath, 'extensions');

    if (!fs.existsSync(this.extensionsDir)) {
      fs.mkdirSync(this.extensionsDir, { recursive: true });
    }
  }

  /**
   * Klasörden unpacked eklenti yükler (dialog ile seçim)
   */
  async loadFromDialog(): Promise<LoadedExtension | null> {
    const result = await dialog.showOpenDialog({
      title: 'Eklenti Klasörü Seç',
      properties: ['openDirectory'],
      buttonLabel: 'Eklentiyi Yükle',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const extensionPath = result.filePaths[0];
    return this.loadExtensionFromPath(extensionPath);
  }

  /**
   * Chrome i18n mesaj anahtarını (_locales) çözümler
   * Örn: "__MSG_app_name__" -> "Volume Master"
   */
  private resolveI18nMessage(extensionPath: string, msgKey: string): string {
    if (!msgKey || !msgKey.startsWith('__MSG_')) return msgKey;
    
    const key = msgKey.replace(/__MSG_(.+)__/, '$1');
    const localePriority = ['en', 'en_US', 'tr', 'default'];
    
    for (const locale of localePriority) {
      const msgPath = path.join(extensionPath, '_locales', locale, 'messages.json');
      if (fs.existsSync(msgPath)) {
        try {
          const messages = JSON.parse(fs.readFileSync(msgPath, 'utf8'));
          if (messages[key]?.message) return messages[key].message;
        } catch {}
      }
    }
    
    // Fallback: _locales klasöründeki herhangi bir dile bak
    const localesDir = path.join(extensionPath, '_locales');
    if (fs.existsSync(localesDir)) {
      const dirs = fs.readdirSync(localesDir);
      for (const dir of dirs) {
        const msgPath = path.join(localesDir, dir, 'messages.json');
        if (fs.existsSync(msgPath)) {
          try {
            const messages = JSON.parse(fs.readFileSync(msgPath, 'utf8'));
            if (messages[key]?.message) return messages[key].message;
          } catch {}
        }
      }
    }
    
    return msgKey; // Çözümlenemezse orijinali döndür
  }

  /**
   * Belirtilen yoldan eklenti yükler
   */
  async loadExtensionFromPath(extensionPath: string): Promise<LoadedExtension | null> {
    try {
      // manifest.json kontrolü
      const manifestPath = path.join(extensionPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        console.error('[ExtensionManager] manifest.json bulunamadı:', extensionPath);
        return null;
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      // Electron session'a yükle
      const ext = await session.defaultSession.loadExtension(extensionPath, {
        allowFileAccess: true,
      });

      const loaded: LoadedExtension = {
        id: ext.id,
        name: this.resolveI18nMessage(extensionPath, manifest.name) || ext.name || 'Bilinmeyen Eklenti',
        version: manifest.version || '0.0.0',
        path: extensionPath,
      };

      // Daha önce yüklenmemişse listeye ekle
      if (!this.loadedExtensions.find((e) => e.id === loaded.id)) {
        this.loadedExtensions.push(loaded);
        this.saveExtensionPaths();
      }

      console.log('[ExtensionManager] Eklenti yüklendi:', loaded.name);
      
      try {
        const logPath = path.join(app.getPath('userData'), 'nav_log.txt');
        require('fs').appendFileSync(logPath, `\n[${new Date().toISOString()}] [ExtensionManager] Eklenti yüklendi: ${loaded.name} (${loaded.id})\n`);
      } catch {}

      return loaded;
    } catch (error) {
      console.error('[ExtensionManager] Eklenti yükleme hatası:', error);
      return null;
    }
  }

  /**
   * Eklentiyi kaldır
   */
  async removeExtension(extensionId: string): Promise<boolean> {
    try {
      await session.defaultSession.removeExtension(extensionId);
      this.loadedExtensions = this.loadedExtensions.filter((e) => e.id !== extensionId);
      this.saveExtensionPaths();
      console.log('[ExtensionManager] Eklenti kaldırıldı:', extensionId);
      return true;
    } catch (error) {
      console.error('[ExtensionManager] Eklenti kaldırma hatası:', error);
      return false;
    }
  }

  /**
   * Chrome Web Store'dan CRX indirip kurar
   */
  async installCrx(extensionId: string): Promise<LoadedExtension | null> {
    return new Promise((resolve) => {
      const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26updatable%3Dfalse%26uc`;
      const targetDir = path.join(this.extensionsDir, extensionId);
      
      const existing = this.loadedExtensions.find(e => e.id === extensionId);
      if (existing) {
        console.log('[ExtensionManager] Zaten yüklü (Hafızada):', extensionId);
        resolve(existing);
        return;
      }

      if (fs.existsSync(targetDir)) {
        if (fs.existsSync(path.join(targetDir, 'manifest.json'))) {
          console.log('[ExtensionManager] Zaten kurulu:', extensionId);
          this.loadExtensionFromPath(targetDir).then(resolve);
          return;
        } else {
          console.log('[ExtensionManager] Bozuk/eksik kurulum tespit edildi, yeniden indiriliyor:', extensionId);
          fs.rmSync(targetDir, { recursive: true, force: true });
        }
      }
      
      fs.mkdirSync(targetDir, { recursive: true });

      https.get(crxUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          https.get(res.headers.location!, (redirectRes) => {
            this.extractCrx(redirectRes, targetDir).then(() => {
              this.loadExtensionFromPath(targetDir).then(resolve);
            }).catch(e => {
              console.error('[ExtensionManager] Çıkartma hatası:', e);
              resolve(null);
            });
          });
        } else {
          this.extractCrx(res, targetDir).then(() => {
            this.loadExtensionFromPath(targetDir).then(resolve);
          }).catch(e => {
            console.error('[ExtensionManager] Çıkartma hatası:', e);
            resolve(null);
          });
        }
      }).on('error', (e) => {
        console.error('[ExtensionManager] İndirme hatası:', e);
        resolve(null);
      });
    });
  }

  private extractCrx(response: import('http').IncomingMessage, targetDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', async () => {
        let buf = Buffer.concat(chunks);
        
        // Find the classic ZIP header 'PK\x03\x04' and discard the custom CRX header
        const zipMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
        const zipOffset = buf.indexOf(zipMagic);
        
        if (zipOffset !== -1) {
          buf = buf.slice(zipOffset);
        }
        
        try {
          const directory = await unzipper.Open.buffer(buf);
          await directory.extract({ path: targetDir });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      response.on('error', (err) => reject(err));
    });
  }

  /**
   * Yüklü eklenti listesini döndür
   */
  getLoadedExtensions(): LoadedExtension[] {
    return this.loadedExtensions;
  }

  /**
   * Uygulama başlangıcında önceden yüklenmiş eklentileri tekrar yükle
   */
  async restoreExtensions(): Promise<void> {
    const savedPaths = this.loadSavedPaths();
    for (const extPath of savedPaths) {
      if (fs.existsSync(extPath)) {
        await this.loadExtensionFromPath(extPath);
      }
    }
    console.log(`[ExtensionManager] ${this.loadedExtensions.length} eklenti geri yüklendi`);
  }

  /**
   * Kaydedilen eklenti yollarını dosyaya yaz
   */
  private saveExtensionPaths(): void {
    const filePath = path.join(this.extensionsDir, 'installed.json');
    const paths = this.loadedExtensions.map((e) => e.path);
    try {
      fs.writeFileSync(filePath, JSON.stringify(paths, null, 2), 'utf8');
    } catch (e) {
      console.error('[ExtensionManager] Eklenti listesi kaydedilemedi:', e);
    }
  }

  /**
   * Kaydedilen eklenti yollarını dosyadan oku
   */
  private loadSavedPaths(): string[] {
    const filePath = path.join(this.extensionsDir, 'installed.json');
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (e) {
      console.error('[ExtensionManager] Eklenti listesi okunamadı:', e);
    }
    return [];
  }
}

// Global Singleton — app.whenReady() sonrası kullanılmalı
let extensionManagerInstance: ExtensionManager | null = null;

export function getExtensionManager(): ExtensionManager {
  if (!extensionManagerInstance) {
    extensionManagerInstance = new ExtensionManager();
  }
  return extensionManagerInstance;
}
