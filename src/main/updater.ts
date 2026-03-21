/**
 * Auto Updater — Otomatik Güncelleme Yönetimi (Dal 5)
 *
 * Github Releases veya belirlenen bir sunucu üzerinden
 * tarayıcının yeni sürümlerini kontrol eder ve arka planda indirir.
 */

import { autoUpdater } from 'electron-updater';
import { dialog, app } from 'electron';

export function checkCustomVersion(manual: boolean = false, parentWin?: any): void {
  const https = require('https');
  const path = require('path');
  const fs = require('fs');

  let localId = 1;
  try {
    const pkgPath = path.join(app.getAppPath(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version_id) localId = pkg.version_id;
  } catch (e) {
    console.error('Local package.json read failed for version_id:', e);
  }

  // Önbelleği bypass etmek için timestamp ekliyoruz
  const remoteUrl = `https://raw.githubusercontent.com/bseester/morrow-browser/main/version.json?t=${Date.now()}`;

  https.get(remoteUrl, (res: any) => {
    if (res.statusCode !== 200) {
      if (manual) {
        const opts = { type: 'error' as const, buttons: ['Tamam'], title: 'Hata', message: 'Sürüm bilgisi alınamadı.', detail: `HTTP Durumu: ${res.statusCode}` };
        if (parentWin) dialog.showMessageBox(parentWin, opts);
        else dialog.showMessageBox(opts);
      }
      return;
    }

    let data = '';
    res.on('data', (chunk: any) => { data += chunk; });
    res.on('end', () => {
      try {
        const remote = JSON.parse(data);
        if (remote.latest_id && localId < remote.latest_id) {
          const opts = {
            type: 'warning' as const,
            buttons: ['İndir', 'Kapat'],
            defaultId: 0,
            cancelId: 1,
            title: 'Yeni Sürüm Mevcut',
            message: `Morrow Browser için yeni bir sürüm (${remote.version}) mevcut.`,
            detail: remote.notes ? remote.notes + '\n\nGüncellemek için lütfen güncel sürümü edinin.' : 'Güncellemek için lütfen GitHub sayfasını ziyaret edin.'
          };

          const showPromise = parentWin ? dialog.showMessageBox(parentWin, opts) : dialog.showMessageBox(opts);
          
          showPromise.then((result) => {
            if (result.response === 0) {
              const { shell } = require('electron');
              shell.openExternal('https://github.com/bseester/morrow-browser/releases');
            }
          });
        } else if (manual) {
          const opts = {
            type: 'info' as const,
            buttons: ['Tamam'],
            title: 'Sürüm Kontrolü',
            message: 'Morrow Browser güncel.',
            detail: `Mevcut Sürüm ID: ${localId}\n\nHerhangi bir yeni güncelleme bulunamadı.`
          };
          if (parentWin) dialog.showMessageBox(parentWin, opts);
          else dialog.showMessageBox(opts);
        }
      } catch (e) {
        if (manual) {
          const opts = { type: 'error' as const, buttons: ['Tamam'], title: 'Hata', message: 'Sürüm verisi işlenemedi.', detail: 'JSON ayrıştırma hatası.' };
          if (parentWin) dialog.showMessageBox(parentWin, opts);
          else dialog.showMessageBox(opts);
        }
      }
    });
  }).on('error', (err: any) => {
    if (manual) {
      const opts = { type: 'error' as const, buttons: ['Tamam'], title: 'Hata', message: 'Sunucuya bağlanılamadı.', detail: err.message || '' };
      if (parentWin) dialog.showMessageBox(parentWin, opts);
      else dialog.showMessageBox(opts);
    }
  });
}

export function setupAutoUpdater(): void {
  // Özel Sürüm ID Kontrolü (Dev modda da çalışması için)
  checkCustomVersion();

  // Geliştirme aşamasında otomatik güncellemeleri kapat (hata vermemesi için)
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  // Güncellemeleri arka planda indir
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('Güncellemeler kontrol ediliyor...');
  });

  autoUpdater.on('update-available', (info: any) => {
    console.log('Güncelleme mevcut:', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('Güncelleme bulunamadı. Sürümünüz güncel.');
  });

  autoUpdater.on('error', (err: any) => {
    console.error('Otomatik güncelleme hatası: ', err);
  });

  autoUpdater.on('update-downloaded', (info: any) => {
    dialog
      .showMessageBox({
        type: 'info',
        buttons: ['Yeniden Başlat', 'Daha Sonra'],
        title: 'Güncelleme Hazır',
        message: 'Morrow Browser için yeni bir güncelleme indirildi.',
        detail: `Sürüm ${info.version} kuruluma hazır. Uygulamayı yeniden başlatmak ister misiniz?`,
      })
      .then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  // Kontrolü başlat (Uygulama açıldıktan 5 saniye sonra)
  setTimeout(() => {
    try {
      autoUpdater.checkForUpdatesAndNotify();
    } catch (e) {
      console.error('Updater başlatılamadı:', e);
    }
  }, 5000);
}
