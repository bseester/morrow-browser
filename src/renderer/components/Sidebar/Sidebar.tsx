/**
 * Sidebar — Reference-matched premium design
 * 3 ana buton: Focus Mode, AI Bot, Tab Browser
 * Alt: Morrow Bot performans widget'ı + ayarlar
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import BookmarksPanel from './BookmarksPanel';
import HistoryPanel from './HistoryPanel';
import DownloadsPanel from './DownloadsPanel';
import WorkspacesPanel from './WorkspacesPanel';
import PerformancePanel from './PerformancePanel';
import CleanerPanel from './CleanerPanel';
import SettingsPanel from './SettingsPanel';
import NotesPanel from './NotesPanel';
import AIPanel from './AIPanel';
import { useTabStore } from '../../store/useTabStore';
import { useSettingsStore } from '../../store/useSettingsStore';

type PanelType = 'none' | 'bookmarks' | 'history' | 'downloads' | 'workspaces' | 'performance' | 'cleaner' | 'notes' | 'ai';

function SidebarBtn({ icon, label, isActive, onClick }: {
  icon: React.ReactNode; label: string; isActive?: boolean; onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ background: 'rgba(139, 92, 246, 0.12)' }}
      whileTap={{ scale: 0.92 }}
      title={label}
      style={{
        width: '100%',
        padding: '10px 8px',
        borderRadius: '12px',
        border: 'none',
        background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        position: 'relative',
        transition: 'all 150ms ease',
      }}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-indicator"
          style={{
            position: 'absolute', left: '-2px', width: '3px', height: '24px',
            borderRadius: '2px',
            background: 'linear-gradient(180deg, #8b5cf6, #ec4899)',
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.6)',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}
      <div style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</div>
      <span style={{
        fontSize: '8px', fontWeight: 600, letterSpacing: '0.3px',
        color: isActive ? '#c4b5fd' : 'rgba(255,255,255,0.35)',
        textAlign: 'center', lineHeight: 1.1, whiteSpace: 'nowrap',
      }}>{label}</span>
    </motion.button>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<PanelType>('none');
  const { sidebarPerformanceEnabled, sidebarCleanerEnabled } = useSettingsStore();
  const [perfStats, setPerfStats] = useState({ ramMB: 0, cpuPercent: 0 });

  useEffect(() => {
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

  // Performance stats
  useEffect(() => {
    const fetchPerf = async () => {
      try {
        const metrics = await window.electronAPI?.system?.getPerformanceMetrics();
        if (metrics) setPerfStats({ ramMB: metrics.ramMB || 0, cpuPercent: metrics.cpuPercent || 0 });
      } catch {}
    };
    fetchPerf();
    const interval = setInterval(fetchPerf, 3000);
    return () => clearInterval(interval);
  }, []);

  const togglePanel = (panel: PanelType) => {
    setActivePanel((prev) => (prev === panel ? 'none' : panel));
  };

  return (
    <div
      className="no-select"
      style={{
        width: '72px',
        height: '100%',
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(30px) saturate(200%)',
        WebkitBackdropFilter: 'blur(30px) saturate(200%)',
        borderRight: '1px solid rgba(139, 92, 246, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '10px 6px',
        gap: '2px',
        flexShrink: 0,
        position: 'relative',
        zIndex: 50,
      }}
    >
      {/* ─── Ana Butonlar (Reference-matched) ─── */}
      <SidebarBtn
        icon="🦋"
        label="Focus Mode"
        onClick={() => window.electronAPI?.nav.go('about:blank')}
      />

      <div style={{ width: '36px', height: '1px', background: 'rgba(139, 92, 246, 0.12)', margin: '4px 0' }} />

      <SidebarBtn
        icon="🤖"
        label="AI Bot"
        isActive={activePanel === 'ai'}
        onClick={() => togglePanel('ai')}
      />

      <SidebarBtn
        icon="📑"
        label="Tab Browser"
        isActive={activePanel === 'bookmarks'}
        onClick={() => togglePanel('bookmarks')}
      />

      <div style={{ width: '36px', height: '1px', background: 'rgba(139, 92, 246, 0.12)', margin: '4px 0' }} />

      {/* İkincil butonlar */}
      <SidebarBtn icon="🕐" label="Geçmiş" isActive={activePanel === 'history'} onClick={() => togglePanel('history')} />
      <SidebarBtn icon="📥" label="İndirme" isActive={activePanel === 'downloads'} onClick={() => togglePanel('downloads')} />
      <SidebarBtn icon="📂" label="Alanlar" isActive={activePanel === 'workspaces'} onClick={() => togglePanel('workspaces')} />
      <SidebarBtn icon="📝" label="Notlar" isActive={activePanel === 'notes'} onClick={() => togglePanel('notes')} />

      {sidebarPerformanceEnabled && (
        <SidebarBtn icon="⚡" label="Panel" isActive={activePanel === 'performance'} onClick={() => togglePanel('performance')} />
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ─── Morrow Bot Performance Widget (Reference-matched) ─── */}
      <div style={{
        width: '100%', padding: '8px 4px', borderRadius: '12px',
        background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.12) 0%, rgba(236, 72, 153, 0.08) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
        marginBottom: '6px',
      }}>
        <span style={{
          fontSize: '7px', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase', letterSpacing: '1px',
        }}>Morrow Bot</span>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{
            fontSize: '13px', fontWeight: 800,
            background: 'linear-gradient(135deg, #a78bfa, #ec4899)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {perfStats.ramMB > 1000 ? `${(perfStats.ramMB / 1000).toFixed(1)}k` : perfStats.ramMB}
          </span>
          <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>RAM MB</span>
        </div>

        <div style={{ width: '28px', height: '1px', background: 'rgba(139, 92, 246, 0.15)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{
            fontSize: '13px', fontWeight: 800,
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {perfStats.cpuPercent}
          </span>
          <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>CPU %</span>
        </div>
      </div>

      <div style={{ width: '36px', height: '1px', background: 'rgba(139, 92, 246, 0.12)', margin: '2px 0' }} />

      <SidebarBtn icon="⚙️" label="Ayarlar" onClick={() => navigate('/settings')} />

      {/* ─── Sparkle icon at bottom (Reference-matched) ─── */}
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        style={{
          marginTop: '6px', marginBottom: '4px',
          width: '20px', height: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{
          fontSize: '14px',
          background: 'linear-gradient(135deg, #8b5cf6, #ec4899, #f97316)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>✦</span>
      </motion.div>

      {/* ─── Yan Panel (açılır) ─── */}
      {activePanel !== 'none' && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'absolute',
            left: '72px',
            top: '0',
            bottom: 0,
            width: '320px',
            zIndex: -1,
            background: 'var(--sidebar-bg)',
            backdropFilter: 'blur(30px) saturate(200%)',
            WebkitBackdropFilter: 'blur(30px) saturate(200%)',
            borderRight: '1px solid rgba(139, 92, 246, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px', paddingBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {activePanel === 'bookmarks' && '📑 Tab Browser'}
              {activePanel === 'history' && '🕐 Geçmiş'}
              {activePanel === 'downloads' && '📥 İndirmeler'}
              {activePanel === 'workspaces' && '📂 Çalışma Alanları'}
              {activePanel === 'notes' && '📝 Not Defteri'}
              {activePanel === 'ai' && '🤖 Morrow AI'}
              {activePanel === 'cleaner' && '🧹 Araçlar'}
            </h3>
            <motion.button
              onClick={() => setActivePanel('none')}
              whileHover={{ background: 'rgba(255,255,255,0.1)' }}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', fontSize: '12px',
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
            {activePanel === 'notes' && <NotesPanel />}
            {activePanel === 'ai' && <AIPanel />}
            {activePanel === 'performance' && <PerformancePanel />}
            {activePanel === 'cleaner' && <CleanerPanel />}
          </div>
        </motion.div>
      )}
    </div>
  );
}
