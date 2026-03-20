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
        name: manifest.name || ext.name || 'Bilinmeyen Eklenti',
        version: manifest.version || '0.0.0',
        path: extensionPath,
      };

      // Daha önce yüklenmemişse listeye ekle
      if (!this.loadedExtensions.find((e) => e.id === loaded.id)) {
        this.loadedExtensions.push(loaded);
        this.saveExtensionPaths();
      }

      console.log('[ExtensionManager] Eklenti yüklendi:', loaded.name);
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
        console.log('[ExtensionManager] Zaten kurulu:', extensionId);
        this.loadExtensionFromPath(targetDir).then(resolve);
        return;
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
      // unzipper ZIP signatürünü otomatik bulup öndeki CRX header'ını atlayabilir
      response.pipe(unzipper.Extract({ path: targetDir }))
        .on('close', () => resolve())
        .on('error', (err) => reject(err));
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
