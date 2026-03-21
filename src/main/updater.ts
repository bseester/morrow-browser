/**
 * Auto Updater — Otomatik Güncelleme Yönetimi (Dal 5)
 *
 * Github Releases veya belirlenen bir sunucu üzerinden
 * tarayıcının yeni sürümlerini kontrol eder ve arka planda indirir.
 */

import { autoUpdater } from 'electron-updater';
import { dialog } from 'electron';

export function setupAutoUpdater(): void {
  if (process.env.NODE_ENV === 'development') {
    // DEV: sadece mock diyalog göster, gerçek updater'ı çalıştırma
    setTimeout(() => {
      dialog.showMessageBox({
        type: 'warning',
        title: 'Morrow Browser için yeni bir sürüm (1.3.4) mevcut.',
        message: 'Morrow Browser v1.3.4 Yayında! 🎉',
        detail: [
          'Sizin için harika yenilikler ekledik:',
          '',
          '🚀 RAM ve İnternet Sınırlayıcı yan bara (Sidebar) eklendi!',
          '📡 Canlı Hız Takibi ve Chrome DevTools Protocol tabanlı katı limit kontrolü.',
          '📅 Geçmiş ve İndirmeler için akıllı Takvim Tarih filtresi.',
          '💤 Sekme Uyutma (Tab Snoozing) özelliğiyle inaktif sekmeleri uyuya alma seçeneği.',
          '⚙️ Ayarlar sayfasında arındırılmış ve hızlandırılmış menü geçişleri.',
          '',
          'Keyifli sörfler dileriz! 🚀',
          'Güncellemek için lütfen güncel sürümü edinin.',
        ].join('\n'),
        buttons: ['Kapat', 'İndir'],
        defaultId: 1,
        cancelId: 0,
      }).then(({ response }) => {
        if (response === 1) {
          const { shell } = require('electron');
          shell.openExternal('https://github.com/bseester/morrow-browser/releases/latest');
        }
      }).catch(console.error);
    }, 2000); // 2 saniye sonra göster
    return;
  }

  // PROD: gerçek auto-updater
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
        type: 'warning',
        title: `Morrow Browser için yeni bir sürüm (${info.version}) mevcut.`,
        message: `Morrow Browser v${info.version} Yayında! 🎉`,
        detail: `Güncelleme indirildi. Uygulamayı yeniden başlatmak ister misiniz?`,
        buttons: ['Daha Sonra', 'Yeniden Başlat'],
        defaultId: 1,
        cancelId: 0,
      })
      .then((returnValue) => {
        if (returnValue.response === 1) {
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

export async function handleCheckUpdate(): Promise<{ success: boolean; message: string }> {
  const { shell } = require('electron');

  // Rich dialog — startup ile aynı görünüm
  dialog.showMessageBox({
    type: 'warning',
    title: 'Morrow Browser için yeni bir sürüm (1.3.4) mevcut.',
    message: 'Morrow Browser v1.3.4 Yayında! 🎉',
    detail: [
      'Sizin için harika yenilikler ekledik:',
      '',
      '🚀 RAM ve İnternet Sınırlayıcı yan bara (Sidebar) eklendi!',
      '📡 Canlı Hız Takibi ve Chrome DevTools Protocol tabanlı katı limit kontrolü.',
      '📅 Geçmiş ve İndirmeler için akıllı Takvim Tarih filtresi.',
      '💤 Sekme Uyutma (Tab Snoozing) özelliğiyle inaktif sekmeleri uyuya alma seçeneği.',
      '⚙️ Ayarlar sayfasında arındırılmış ve hızlandırılmış menü geçişleri.',
      '',
      'Keyifli sörfler dileriz! 🚀',
      'Güncellemek için lütfen güncel sürümü edinin.',
    ].join('\n'),
    buttons: ['Kapat', 'İndir'],
    defaultId: 1,
    cancelId: 0,
  }).then(({ response }) => {
    if (response === 1) {
      shell.openExternal('https://github.com/bseester/morrow-browser/releases/latest');
    }
  }).catch(console.error);

  return { success: true, message: '' }; // Renderer'da alert() gösterme
}
