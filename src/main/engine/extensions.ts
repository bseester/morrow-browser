/**
 * ExtensionManager — Chrome eklentisi yükleme ve yönetim motoru
 *
 * electron-chrome-extensions ile MV3 + Sekme Entegrasyonu
 */

import { session, dialog, app } from 'electron';
import { ElectronChromeExtensions, setSessionPartitionResolver } from 'electron-chrome-extensions';
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

let extensionManagerInstance: ExtensionManager | null = null;

// crx:// protokolünü oturum bazlı yönet
export function setupCrxProtocol() {
  setSessionPartitionResolver((partition: string) => {
    return session.fromPartition(partition);
  });

  // CRX protokolünü persist oturumunda etkinleştir
  ElectronChromeExtensions.handleCRXProtocol(session.fromPartition('persist:bseester'));
}

export class ExtensionManager {
  public extensionsState: ElectronChromeExtensions;
  private extensionsPath: string;
  private loadedMap = new Map<string, LoadedExtension>();

  constructor(private profileSession: Electron.Session) {
    this.extensionsPath = path.join(app.getPath('userData'), 'extensions');
    fs.mkdirSync(path.join(this.extensionsPath, 'crx'), { recursive: true });
    fs.mkdirSync(path.join(this.extensionsPath, 'unpacked'), { recursive: true });

    this.extensionsState = new ElectronChromeExtensions({
      license: 'GPL-3.0',
      session: profileSession,
      createTab: async (details) => {
        const { shell } = await import('electron');
        if (details.url) shell.openExternal(details.url);
        return [null as any, null as any];
      },
      selectTab: (_tab, _window) => {},
      removeTab: (_tab, _window) => {},
      createWindow: async (_details) => null as any,
    });
  }

  addTab(webContents: Electron.WebContents, window: Electron.BrowserWindow) {
    this.extensionsState.addTab(webContents, window);
  }

  removeTab(webContents: Electron.WebContents) {
    this.extensionsState.removeTab(webContents);
  }

  selectTab(webContents: Electron.WebContents) {
    this.extensionsState.selectTab(webContents);
  }

  // --- UI Compatibility ---

  getLoadedExtensions(): LoadedExtension[] {
    return Array.from(this.loadedMap.values());
  }

  async loadFromDialog(): Promise<LoadedExtension | null> {
    const result = await dialog.showOpenDialog({
      title: 'Eklenti Klasörü Seç',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return this.loadUnpackedExtension(result.filePaths[0]);
  }

  async loadUnpackedExtension(extensionPath: string): Promise<LoadedExtension | null> {
    try {
      const manifestPath = path.join(extensionPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) return null;
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const ext = await this.profileSession.loadExtension(extensionPath, { allowFileAccess: true });

      const loaded: LoadedExtension = {
        id: ext.id,
        name: manifest.name || ext.name || 'Bilinmeyen Eklenti',
        version: ext.version || manifest.version || '0.0.0',
        path: extensionPath,
      };
      this.loadedMap.set(ext.id, loaded);
      this.saveExtensionMap();
      console.log(`[ExtensionManager] Eklenti yüklendi: ${loaded.name}`);
      return loaded;
    } catch (e) {
      console.error('[ExtensionManager] loadUnpacked error:', e);
      return null;
    }
  }

  async loadCrxExtension(extensionId: string): Promise<LoadedExtension | null> {
    try {
      const crxPath = path.join(this.extensionsPath, 'crx', extensionId);
      if (!fs.existsSync(crxPath)) throw new Error('Extension files not found: ' + crxPath);

      let extPath = crxPath;
      if (!fs.existsSync(path.join(crxPath, 'manifest.json'))) {
        const versions = fs.readdirSync(crxPath).filter(d =>
          fs.existsSync(path.join(crxPath, d, 'manifest.json'))
        );
        if (versions.length === 0) throw new Error('No valid version in ' + crxPath);
        extPath = path.join(crxPath, versions[versions.length - 1]);
      }

      const manifest = JSON.parse(fs.readFileSync(path.join(extPath, 'manifest.json'), 'utf8'));
      const ext = await this.profileSession.loadExtension(extPath, { allowFileAccess: true });

      const loaded: LoadedExtension = {
        id: ext.id,
        name: manifest.name || ext.name || 'Bilinmeyen Eklenti',
        version: ext.version || manifest.version || '0.0.0',
        path: extPath,
      };
      this.loadedMap.set(ext.id, loaded);
      this.saveExtensionMap();
      console.log(`[ExtensionManager] Eklenti yüklendi: ${loaded.name}`);
      return loaded;
    } catch (e) {
      console.error('[ExtensionManager] loadCrx error:', e);
      return null;
    }
  }

  async removeExtension(extensionId: string): Promise<boolean> {
    try {
      await this.profileSession.removeExtension(extensionId);
      this.loadedMap.delete(extensionId);
      this.saveExtensionMap();
      return true;
    } catch (e) {
      console.error('[ExtensionManager] remove error:', e);
      return false;
    }
  }

  async restoreExtensions(): Promise<void> {
    const saved = this.loadSavedPaths();
    for (const [id, extPath] of saved.entries()) {
      if (!fs.existsSync(extPath)) continue;
      try {
        const ext = await this.profileSession.loadExtension(extPath, { allowFileAccess: true });
        let name = ext.name || id, version = ext.version || '0.0.0';
        try {
          const mp = path.join(extPath, 'manifest.json');
          if (fs.existsSync(mp)) {
            const m = JSON.parse(fs.readFileSync(mp, 'utf8'));
            name = m.name || name;
            version = m.version || version;
          }
        } catch {}
        this.loadedMap.set(ext.id, { id: ext.id, name, version, path: extPath });
      } catch {}
    }
    console.log(`[ExtensionManager] ${this.loadedMap.size} eklenti geri yüklendi`);
  }

  async installCrx(extensionId: string): Promise<LoadedExtension | null> {
    return new Promise((resolve) => {
      const existing = this.loadedMap.get(extensionId);
      if (existing) { resolve(existing); return; }

      const targetDir = path.join(this.extensionsPath, 'crx', extensionId);

      if (fs.existsSync(targetDir)) {
        if (fs.existsSync(path.join(targetDir, 'manifest.json'))) {
          console.log('[ExtensionManager] Zaten kurulu:', extensionId);
          this.loadCrxExtension(extensionId).then(resolve);
          return;
        }
        fs.rmSync(targetDir, { recursive: true, force: true });
      }

      fs.mkdirSync(targetDir, { recursive: true });

      const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26updatable%3Dfalse%26uc`;

      const download = (url: string) => {
        https.get(url, { followRedirect: false } as any, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            download(res.headers.location!);
          } else {
            this.extractCrx(res, targetDir)
              .then(() => this.loadCrxExtension(extensionId))
              .then(resolve)
              .catch(e => { console.error('[ExtensionManager] CRX hata:', e); resolve(null); });
          }
        }).on('error', e => { console.error('[ExtensionManager] İndirme hatası:', e); resolve(null); });
      };

      download(crxUrl);
    });
  }

  private extractCrx(response: import('http').IncomingMessage, targetDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', async () => {
        let buf = Buffer.concat(chunks);
        const zipMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
        const zipOffset = buf.indexOf(zipMagic);
        if (zipOffset !== -1) buf = buf.slice(zipOffset);
        try {
          const directory = await unzipper.Open.buffer(buf);
          await directory.extract({ path: targetDir });
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      response.on('error', reject);
    });
  }

  private saveExtensionMap(): void {
    const data: Record<string, string> = {};
    for (const [id, ext] of this.loadedMap.entries()) data[id] = ext.path;
    try {
      fs.writeFileSync(
        path.join(this.extensionsPath, 'installed.json'),
        JSON.stringify(data, null, 2),
        'utf8'
      );
    } catch {}
  }

  private loadSavedPaths(): Map<string, string> {
    const map = new Map<string, string>();
    try {
      const fp = path.join(this.extensionsPath, 'installed.json');
      if (fs.existsSync(fp)) {
        const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
        for (const [id, p] of Object.entries(data)) map.set(id, p as string);
      }
    } catch {}
    return map;
  }
}

export function getExtensionManager(): ExtensionManager {
  if (!extensionManagerInstance) {
    extensionManagerInstance = new ExtensionManager(session.fromPartition('persist:bseester'));
  }
  return extensionManagerInstance;
}
