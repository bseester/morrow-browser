import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function CleanerPanel() {
  const [cleanLevel, setCleanLevel] = useState<'MIN' | 'MED' | 'MAX'>('MIN');
  const [stats, setStats] = useState({ cacheSize: 0, cookieCount: 0, downloadCount: 0 });
  const [toggles, setToggles] = useState({
    cache: true,
    cookies: false,
    tabs: false,
    history: false,
    downloads: false,
    sidebar: false,
  });

  const fetchStats = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;
    try {
      const cacheBytes = await api.system.getCacheSize();
      const cookies = await api.system.getCookiesCount();
      const downloads = await api.downloads.get();
      setStats({
        cacheSize: Math.floor((cacheBytes || 0) / (1024 * 1024)), // MB
        cookieCount: cookies || 0,
        downloadCount: downloads ? downloads.length : 0,
      });
    } catch (e) {
      console.error('fetchStats error:', e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const accent = 'var(--accent, #ff3040)';

  const toggleSetting = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const startCleaning = async () => {
    const api = (window as any).electronAPI;
    if (!api) return;
    
    try {
      if (toggles.cache) await api.system.clearCache();
      if (toggles.cookies) await api.system.clearCookies();
      if (toggles.history) await api.history.clear();
      if (toggles.downloads) await api.downloads.clearHistory();
      if (toggles.tabs) await api.tabs.closeAll();
      
      // Refresh
      await fetchStats();
    } catch (e) {
      console.error('Cleaning error:', e);
    }
  };

  return (
    <div style={{ 
      color: '#fff', 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflowY: 'auto', 
      overflowX: 'hidden',
      boxSizing: 'border-box',
      background: 'var(--bg-secondary)', 
      fontFamily: 'Inter, sans-serif'
    }}>
      
      {/* ─── Header: TARAYICI DOSYALARI Gauge ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '30px', paddingBottom: '20px' }}>
        <div style={{ 
          position: 'relative', 
          width: '220px', 
          height: '240px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center'
        }}>
          {/* Hexagon/Octagon SVG Background (yaklaşık bir çizim) */}
          <svg width="220" height="240" viewBox="0 0 220 240" style={{ position: 'absolute', top: 0, left: 0 }}>
            {/* Ortadaki koyu arkaplan */}
            <path d="M40,20 L180,20 L210,60 L210,180 L180,220 L40,220 L10,180 L10,60 Z" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            
            {/* Dış Taraf Parlak Vurgular (Köşeler) */}
            <path d="M30,30 L190,30 L200,60 L200,180 L190,210 L30,210 L20,180 L20,60 Z" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
            {/* Vurgu Çizgileri - Üst */}
            <path d="M70,30 L150,30" stroke={accent} strokeWidth="3" />
            {/* Vurgu Çizgileri - Alt */}
            <path d="M70,210 L150,210" stroke={accent} strokeWidth="3" />
            {/* Vurgu Çizgileri - Sol / Sağ */}
            <path d="M20,90 L20,150" stroke={accent} strokeWidth="3" />
            <path d="M200,90 L200,150" stroke={accent} strokeWidth="3" />
          </svg>

          <div style={{ zIndex: 1, textAlign: 'center', marginTop: '-10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px', marginBottom: '8px' }}>
              TARAYICI DOSYALARI
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
              <span style={{ fontSize: '42px', fontWeight: 700, lineHeight: 1 }}>{stats.cacheSize}</span>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>MB</span>
            </div>
            <div style={{ marginTop: '16px', color: accent, fontSize: '14px' }}>
              {stats.cacheSize > 50 ? '⚠️' : '✅'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Stats: İndirilenler / Çerezler ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '0 20px', marginBottom: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{stats.downloadCount}</div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px' }}>İNDİRİLENLER</div>
        </div>
        <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#6ab0ff' }}>{stats.cookieCount}</div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px' }}>ÇEREZLER</div>
        </div>
      </div>

      {/* ─── Level Buttons (MIN / MED / MAX) ─── */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
        {(['MIN', 'MED', 'MAX'] as const).map(lvl => {
          const isActive = cleanLevel === lvl;
          return (
            <button
              key={lvl}
              onClick={() => setCleanLevel(lvl)}
              style={{
                width: '74px',
                height: '74px',
                background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                fontWeight: 700,
                fontSize: '14px',
                clipPath: 'polygon(15px 0%, calc(100% - 15px) 0%, 100% 15px, 100% calc(100% - 15px), calc(100% - 15px) 100%, 15px 100%, 0% calc(100% - 15px), 0% 15px)'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                border: isActive ? `2px solid ${accent}` : '2px solid rgba(255,255,255,0.1)',
                clipPath: 'polygon(15px 0%, calc(100% - 15px) 0%, 100% 15px, 100% calc(100% - 15px), calc(100% - 15px) 100%, 15px 100%, 0% calc(100% - 15px), 0% 15px)'
              }} />
              {lvl}
            </button>
          );
        })}
      </div>

      {/* ─── Clean Button ─── */}
      <button 
        onClick={startCleaning}
        style={{
          background: accent,
          color: '#fff',
          border: 'none',
          padding: '16px 20px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'left',
          marginBottom: '20px'
        }}
      >
        Temizlemeye başla
      </button>

      {/* ─── Advanced Setup ─── */}
      <div style={{ padding: '0 20px', paddingBottom: '40px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#fff', marginBottom: '20px', letterSpacing: '0.5px' }}>
          GELİŞMİŞ KURULUM
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { id: 'cache', label: 'Önbellek' },
            { id: 'cookies', label: 'Çerezler' },
            { id: 'tabs', label: 'Sekmeler' },
            { id: 'history', label: 'Tarama geçmişi' },
            { id: 'downloads', label: 'İndirilenler' },
            { id: 'sidebar', label: 'Kenar çubuğu simgeleri' }
          ].map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                  onClick={() => toggleSetting(item.id as keyof typeof toggles)}
                  style={{
                    width: '42px',
                    height: '24px',
                    borderRadius: '12px',
                    background: toggles[item.id as keyof typeof toggles] ? accent : 'rgba(255,255,255,0.1)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    border: `1px solid ${toggles[item.id as keyof typeof toggles] ? accent : 'rgba(255,255,255,0.2)'}`
                  }}
                >
                  <motion.div 
                    initial={false}
                    animate={{ x: toggles[item.id as keyof typeof toggles] ? 18 : 2 }}
                    style={{
                      width: '20px',
                      height: '20px',
                      background: '#fff',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '1px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                </div>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{item.label}</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', cursor: 'pointer' }}>▼</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
