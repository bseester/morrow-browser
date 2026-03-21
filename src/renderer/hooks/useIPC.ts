/**
 * useIPC — Electron IPC olaylarını React lifecycle'a bağlayan hook
 *
 * Sekme güncellemeleri, URL değişiklikleri ve yükleme durumlarını
 * otomatik olarak Zustand store'a yansıtır.
 */

import { useEffect } from 'react';
import { useTabStore } from '../store/useTabStore';
import { useSettingsStore } from '../store/useSettingsStore';

export function useIPC() {
  const { setTabs, updateTabUrl, updateTabTitle, updateTabLoading } = useTabStore();

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    // Sekme listesi güncellemelerini dinle
    const unsubTabUpdate = api.tabs.onUpdate((data: any) => {
      setTabs(data.tabs, data.activeTabId, data.activeWorkspaceId);
    });

    // URL değişikliklerini dinle
    const unsubUrlUpdate = api.nav.onUrlUpdated((data) => {
      updateTabUrl(data.tabId, data.url);
    });

    // Yükleme durumunu dinle
    const unsubLoading = api.nav.onLoading((data) => {
      updateTabLoading(data.tabId, data.isLoading);
    });

    // Başlık değişikliklerini dinle
    const unsubTitle = api.nav.onTitleUpdated((data) => {
      updateTabTitle(data.tabId, data.title);
    });

    // İlk sekme listesini al
    api.tabs.getList().then((data: any) => {
      setTabs(data.tabs, data.activeTabId, data.activeWorkspaceId);
    });

    // ─── Ayarları Main Process ile Senkronize Et ───
    const settings = useSettingsStore.getState();
    
    // Ağ Sınırlayıcı
    if (settings.networkLimiterEnabled) {
      api.system.setNetworkLimit(settings.networkSpeedLimit);
    } else {
      api.system.setNetworkLimit(0);
    }

    // RAM Sınırlayıcı
    api.system.setRamLimiterEnabled(settings.ramLimiterEnabled);
    api.system.setMaxRamLimit(settings.maxRamLimit);
    api.system.setRamHardLimit(settings.ramHardLimit);
    api.system.setRamSnoozeTime(settings.ramSnoozeTime);

    return () => {
      unsubTabUpdate();
      unsubUrlUpdate();
      unsubLoading();
      unsubTitle();
    };
  }, [setTabs, updateTabUrl, updateTabTitle, updateTabLoading]);
}
