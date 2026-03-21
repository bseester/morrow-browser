/**
 * Sidebar — Opera tarzı sol kenar çubuğu
 * Üstte: navigasyon kısayolları
 * Altta: hızlı uygulama widget'ları ve ayarlar
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SidebarItem from './SidebarItem';
import BookmarksPanel from './BookmarksPanel';
import HistoryPanel from './HistoryPanel';
import DownloadsPanel from './DownloadsPanel'; // Keep DownloadsPanel as it's used
import WorkspacesPanel from './WorkspacesPanel';
import PerformancePanel from './PerformancePanel';
import CleanerPanel from './CleanerPanel'; // Added CleanerPanel
import SettingsPanel from './SettingsPanel'; // Added SettingsPanel (assuming it's intended for future use or a typo for DownloadsPanel replacement)
import { useTabStore } from '../../store/useTabStore';
import { useSettingsStore } from '../../store/useSettingsStore';

type PanelType = 'none' | 'bookmarks' | 'history' | 'downloads' | 'workspaces' | 'performance' | 'cleaner'; // Added 'cleaner'

export default function Sidebar() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<PanelType>('none');
  const { sidebarPerformanceEnabled, sidebarCleanerEnabled } = useSettingsStore();

  useEffect(() => {
    // Panel açıksa WebContentsView'u 320px sağa kaydır, kapalıysa geri al
    const width = activePanel === 'none' ? 0 : 320;
    window.electronAPI?.sidebar?.setPanelWidth(width);
  }, [activePanel]);

  useEffect(() => {
    const unsub = window.electronAPI?.sidebar?.onTogglePanel((panel: any) => {
      setActivePanel((prev) => (prev === panel ? 'none' : panel));
    });
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const unsubNav = window.electronAPI?.system?.onNavigateMainRouter((path: string) => {
      navigate(path);
    });
    return () => unsubNav?.();
  }, [navigate]);

  const togglePanel = (panel: PanelType) => {
    setActivePanel((prev) => (prev === panel ? 'none' : panel));
  };

  return (
    <div
      className="no-select"
      style={{
        width: '52px',
        height: '100%',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 6px',
        gap: '4px',
        flexShrink: 0,
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* ─── Üst Bölüm: Navigasyon ─── */}
      <SidebarItem
        icon="🏠"
        label="Ana Sayfa"
        onClick={() => window.electronAPI?.nav.go('about:blank')}
      />

      <div style={{ width: '28px', height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

      <SidebarItem
        icon="⭐"
        label="Yer İmleri"
        isActive={activePanel === 'bookmarks'}
        onClick={() => togglePanel('bookmarks')}
      />
      <SidebarItem
        icon="🕐"
        label="Geçmiş"
        isActive={activePanel === 'history'}
        onClick={() => togglePanel('history')}
      />
      <SidebarItem
        icon="📥"
        label="İndirmeler"
        isActive={activePanel === 'downloads'}
        onClick={() => togglePanel('downloads')}
      />
      <SidebarItem
        icon="📂"
        label="Çalışma Alanları"
        isActive={activePanel === 'workspaces'}
        onClick={() => togglePanel('workspaces')}
      />
      {sidebarPerformanceEnabled && (
        <SidebarItem
          icon="⚡"
          label="Kontrol Paneli"
          isActive={activePanel === 'performance'}
          onClick={() => togglePanel('performance')}
        />
      )}
      {sidebarCleanerEnabled && (
        <SidebarItem
          icon="🧹"
          label="Temizleyici"
          isActive={activePanel === 'cleaner'}
          onClick={() => togglePanel('cleaner')}
        />
      )}

      {/* Panic Button */}
      <SidebarItem
        icon="🚨"
        label="Panic Button (Google)"
        onClick={() => {
          window.electronAPI?.tabs.panic();
        }}
      />

      {/* ─── Ayırıcı ─── */}
      <div style={{ flex: 1 }} />

      {/* ─── Alt Bölüm: Hızlı Uygulamalar ─── */}
      <div style={{ width: '28px', height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

      <SidebarItem icon="💬" label="Mesajlar" />
      <SidebarItem icon="🎵" label="Müzik" />

      <div style={{ width: '28px', height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

      <SidebarItem
        icon="⚙️"
        label="Ayarlar"
        onClick={() => navigate('/settings')}
      />

      {/* ─── Yan Panel (açılır) ─── */}
      {activePanel !== 'none' && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="glass-strong"
          style={{
            position: 'absolute',
            left: '52px',
            top: '0',
            bottom: 0,
            width: '320px',
            zIndex: -1, // Kenar çubuğunun altında çıksın
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px', paddingBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {activePanel === 'bookmarks' && '⭐ Yer İmleri'}
              {activePanel === 'history' && '🕐 Geçmiş'}
              {activePanel === 'downloads' && '📥 İndirmeler'}
              {activePanel === 'workspaces' && '📂 Çalışma Alanları'}
              {activePanel === 'cleaner' && '🧹 Araçlar'}
            </h3>
            <motion.button
              onClick={() => setActivePanel('none')}
              whileHover={{ background: 'rgba(255,255,255,0.1)' }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
              }}
            >
              ✕
            </motion.button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 40px)' }}>
            {activePanel === 'history' && <HistoryPanel />}
            {activePanel === 'bookmarks' && <BookmarksPanel />}
            {activePanel === 'downloads' && <DownloadsPanel />}
            {activePanel === 'workspaces' && <WorkspacesPanel />}
            {activePanel === 'performance' && <PerformancePanel />}
            {activePanel === 'cleaner' && <CleanerPanel />}
          </div>
        </motion.div>
      )}
    </div>
  );
}
