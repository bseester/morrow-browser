/**
 * SettingsPanel — AdBlock, Gizli Sekme gibi araçları içeren panel
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function SettingsPanel() {
  const [adblockEnabled, setAdblockEnabled] = useState<boolean>(true);
  const [version, setVersion] = useState<string>('1.3.1');
  const { tabGroupingEnabled, setTabGroupingEnabled } = useSettingsStore();

  useEffect(() => {
    window.electronAPI?.adblock?.getStatus().then(setAdblockEnabled);
    window.electronAPI?.system?.getVersion().then((info: any) => {
      if (info?.version) setVersion(info.version);
    });
  }, []);

  const handleToggleAdblock = async () => {
    if (window.electronAPI?.adblock) {
      const newState = await window.electronAPI.adblock.toggle();
      if (newState !== undefined) {
        setAdblockEnabled(newState);
      }
    } else {
      // Fallback for Vite preview / web-only mode (e.g. testing)
      setAdblockEnabled((prev) => !prev);
    }
  };

  const handleIncognito = () => {
    window.electronAPI?.system?.newIncognitoWindow();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Gizli Sekme */}
      <motion.button
        onClick={handleIncognito}
        data-testid="incognito-btn"
        whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.12)' }}
        whileTap={{ scale: 0.98 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '20px' }}>🕵️</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '13px', fontWeight: 500 }}>Yeni Gizli Pencere</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>İz bırakmadan gezin.</span>
        </div>
      </motion.button>

      {/* Sekme Gruplama */}
      <div 
        style={{
          padding: '16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
            Sekme Gruplama
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Sürükle bırak ile klasör oluşturur.
          </span>
        </div>

        <div 
          onClick={() => setTabGroupingEnabled(!tabGroupingEnabled)}
          style={{
            width: '40px',
            height: '24px',
            borderRadius: '12px',
            background: tabGroupingEnabled ? '#10b981' : 'var(--border-strong)',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.3s ease',
            flexShrink: 0,
          }}
        >
          <motion.div
            animate={{ x: tabGroupingEnabled ? 18 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#fff',
              position: 'absolute',
              top: '2px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      </div>

      {/* Reklam Engelleyici */}
      <div 
        style={{
          padding: '16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Reklam Engelleyici (AdBlock)
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Zararlı reklamları ve analizleri engeller.
            </span>
          </div>

          {/* Toggle Switch */}
          <div 
            onClick={handleToggleAdblock}
            data-testid="adblock-toggle"
            style={{
              width: '40px',
              height: '24px',
              borderRadius: '12px',
              background: adblockEnabled ? '#10b981' : 'var(--border-strong)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.3s ease',
              flexShrink: 0,
            }}
          >
            <motion.div
              data-testid="adblock-knob"
              animate={{ x: adblockEnabled ? 18 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: '2px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        </div>

        {/* Dashboard Button */}
        <motion.button
          onClick={() => window.electronAPI?.tabs?.create('chrome-extension://cjpalhdlnbpafiamejdnhcphjbkeiagm/dashboard.html')}
          whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.08)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'center',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          🛡️ uBlock Origin Kontrol Paneli
        </motion.button>
      </div>

      {/* Sürüm & Güncelleme */}
      <div 
        style={{
          padding: '16px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
              Morrow Browser v{version}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Uygulamanız güncel mi? Kontrol edin.
            </span>
          </div>
        </div>

        <motion.button
          onClick={async () => {
            const res = await window.electronAPI?.system?.checkUpdate();
            alert(res?.message || 'Kontrol edilemedi.');
          }}
          whileHover={{ scale: 1.02, background: 'rgba(59, 130, 246, 0.15)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '10px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-sm)',
            color: '#3b82f6',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            width: '100%',
            textAlign: 'center',
          }}
        >
          🔄 Güncellemeleri Denetle
        </motion.button>
      </div>

    </div>
  );
}
