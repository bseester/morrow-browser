import { autoUpdater } from 'electron-updater';
import { dialog, app, shell, net } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

const REPO_OWNER = 'bseester';
const REPO_NAME = 'morrow-browser';

/**
 * En son GitHub Release varlıklarını (assets) çeker (Liste üzerinden en günceli seçer).
 */
async function getLatestReleaseAssets(): Promise<{ version: string, assets: any[] } | null> {
  return new Promise((resolve) => {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases`;
    const request = net.request({
      method: 'GET',
      url: url,
    });

    request.on('response', (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (Array.isArray(json) && json.length > 0) {
            const latest = json[0];
            resolve({ version: latest.tag_name, assets: latest.assets });
          } else {
            console.error('[Updater] API Response is not an array or empty:', json);
            resolve(null);
          }
        } catch (e) {
          console.error('[Updater] JSON Parse Error:', e);
          resolve(null);
        }
      });
    });

    request.on('error', (err) => {
      console.error('[Updater] API Request Error:', err);
      resolve(null);
    });

    request.setHeader('User-Agent', 'Morrow-Browser-Updater');
    request.end();
  });
}

/**
 * Dosyayı indirir ve ardından sessiz kurulumu başlatır.
 */
async function downloadAndInstallUpdate(version: string, assetUrl: string, assetName: string, parentWin?: any): Promise<void> {
  const tempPath = path.join(app.getPath('temp'), assetName);
  
  // Eğer pencere belirtilmemişse ana pencereyi bul
  const win = parentWin || require('electron').BrowserWindow.getAllWindows()[0];
  
  if (win && !win.isDestroyed()) {
    win.webContents.send('update:started', { version });
  }

  const file = fs.createWriteStream(tempPath);
  const request = net.request({
    method: 'GET',
    url: assetUrl,
    redirect: 'follow'
  });

  request.on('response', (response) => {
    const totalBytes = parseInt(response.headers['content-length'] as string, 10) || 0;
    let receivedBytes = 0;

    response.on('data', (chunk) => {
      receivedBytes += chunk.length;
      file.write(chunk);
      
      if (totalBytes > 0) {
        const progress = Math.round((receivedBytes / totalBytes) * 100);
        if (win && !win.isDestroyed()) {
          win.setProgressBar(receivedBytes / totalBytes);
          win.webContents.send('update:progress', { progress, version });
        }
      }
    });

    response.on('end', () => {
      // ÖNCE akışı bitir
      file.end();
    });
  });

  // BURASI KRİTİK: Dosya yazımı TAMAMLANINCA çalıştır (EBUSY hatasını önler)
  file.on('finish', () => {
    if (win && !win.isDestroyed()) win.setProgressBar(-1);

    if (process.platform === 'win32') {
      // Windows: Silent Install (/S)
      // spawn EBÜSY hatasını önlemek için 500ms bekle (Dosya sisteminin serbest bırakması için)
      setTimeout(() => {
        try {
          const installer = spawn(tempPath, ['/S'], {
            detached: true,
            stdio: 'ignore'
          });
          installer.unref();
          app.quit();
        } catch (err) {
          console.error('[Updater] Spawn Error:', err);
          shell.openPath(tempPath); // Hata durumunda manuel açmayı dene
        }
      }, 500);
    } else {
      shell.openPath(tempPath);
    }
  });

  request.on('error', (err) => {
    console.error('[Updater] Download Error:', err);
    if (parentWin && !parentWin.isDestroyed()) {
      parentWin.webContents.send('update:error', { message: 'İndirme sırasında hata oluştu.' });
    }
  });

  request.end();
}

/**
 * Özel sürüm kontrolü (version.json üzerinden)
 */
export function checkCustomVersion(manual: boolean = false, parentWin?: any): void {
  let localId = 1;
  try {
    const pkgPath = path.join(app.getAppPath(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    localId = pkg.version_id || 1;
  } catch (e) {
    console.warn('[Updater] Could not read local version_id, defaulting to 1');
  }

  const remoteUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/version.json?t=${Date.now()}`;

  const request = net.request({
    method: 'GET',
    url: remoteUrl,
    redirect: 'follow'
  });
  request.on('response', (res) => {
    if (res.statusCode !== 200) {
      if (manual) dialog.showMessageBox({ type: 'error', buttons: ['Tamam'], title: 'Hata', message: 'Sunucuya ulaşılamadı.' });
      return;
    }

    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', async () => {
      try {
        const remote = JSON.parse(data);
        if (remote.latest_id && localId < remote.latest_id) {
          const opts = {
            type: 'question' as const,
            buttons: ['Şimdi Güncelle (Hızlı)', 'Yenilikleri Gör', 'Daha Sonra'],
            defaultId: 0,
            cancelId: 2,
            title: 'Yeni Sürüm Mevcut',
            message: `Morrow Browser ${remote.version} hazır!`,
            detail: `Dosya indirilecek ve otomatik kurulacaktır.`
          };

          let response = 2;
          try {
            const result = await (parentWin && !parentWin.isDestroyed() ? dialog.showMessageBox(parentWin, opts) : dialog.showMessageBox(opts));
            response = result.response;
          } catch (e) {
            console.error('[Updater] Dialog Error:', e);
          }
          
          if (response === 0) {
            const releaseData = await getLatestReleaseAssets();
            
            if (releaseData && releaseData.assets) {
              const extension = process.platform === 'win32' ? '.exe' : '.dmg';
              const asset = releaseData.assets.find((a: any) => {
                const name = a.name.toLowerCase();
                return name.endsWith(extension.toLowerCase()) && 
                       (process.platform !== 'win32' || name.includes('setup') || name.includes('morrow'));
              });

              if (asset) {
                downloadAndInstallUpdate(releaseData.version, asset.browser_download_url, asset.name, parentWin).catch(err => {
                  console.error('[Updater] Download Task Error:', err);
                });
              } else {
                shell.openExternal(`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`);
              }
            } else {
              shell.openExternal(`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`);
            }
          } else if (response === 1) {
            shell.openExternal(`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`);
          }
        } else if (manual) {
          dialog.showMessageBox({ type: 'info', buttons: ['Tamam'], title: 'Sürüm Kontrolü', message: 'Tarayıcı güncel.' });
        }
      } catch (e) {
        if (manual) dialog.showMessageBox({ type: 'error', buttons: ['Tamam'], title: 'Hata', message: 'Sürüm verisi işlenemedi.' });
      }
    });
  });
  request.end();
}

export function setupAutoUpdater(): void {
  checkCustomVersion();

  if (process.env.NODE_ENV === 'development') return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info: any) => {
    dialog.showMessageBox({
      type: 'info',
      buttons: ['Yeniden Başlat', 'Daha Sonra'],
      title: 'Güncelleme Hazır',
      message: 'Kurulum hazır.',
      detail: `Yeni sürüm (${info.version}) yüklendi.`
    }).then((res) => {
      if (res.response === 0) autoUpdater.quitAndInstall();
    });
  });

  setTimeout(() => {
    try { autoUpdater.checkForUpdatesAndNotify(); } catch (e) {}
  }, 10000);
}

export async function handleCheckUpdate(): Promise<{ success: boolean; message: string }> {
  checkCustomVersion(true);
  return { success: true, message: '' };
}
