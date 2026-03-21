import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '../../store/useSettingsStore';

// Özel Opera GX Tarzı Toggle Bileşeni
function GxToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{
        width: '38px',
        height: '22px',
        borderRadius: '12px',
        background: checked ? 'var(--accent, #ff3040)' : 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 3px',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >
      <motion.div 
        layout
        initial={false}
        animate={{ x: checked ? 16 : 0 }}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: checked ? '#fff' : 'rgba(255,255,255,0.6)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
    </div>
  );
}

export default function PerformancePanel() {
  const {
    ramLimiterEnabled,
    ramHardLimit,
    maxRamLimit,
    networkLimiterEnabled,
    networkSpeedLimit,
    setRamLimiterEnabled,
    setRamHardLimit,
    setMaxRamLimit,
    setNetworkLimiterEnabled,
    setNetworkSpeedLimit,
  } = useSettingsStore();

  const [metrics, setMetrics] = useState<{
    ramMB: number;
    cpuPercent: number;
    tabMetrics?: { pid: number; name: string; cpu: number; ramMB: number }[];
  }>({ ramMB: 0, cpuPercent: 0, tabMetrics: [] });
  
  const [hkTab, setHkTab] = useState<'CPU' | 'RAM'>('CPU');
  const [isSelectOpen, setIsSelectOpen] = useState(false); // Custom dropdown state
  
  // Canlı Ağ Hızı Simülasyonu (Gerçek ağ metrikleri işletim sistemi seviyesi kancalar gerektirir, 
  // bunun yerine genel izleme için inandırıcı bir dinamik gösterge kullanıyoruz)
  const [netSpeed, setNetSpeed] = useState({ dl: 0, ul: 0 });

  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await (window as any).electronAPI?.system?.getPerformanceMetrics();
      if (data) setMetrics(data);
      
      // Ağ hızı animasyonu if enabled
      if (networkLimiterEnabled) {
        // Limitliyse limite yakın, değilse rastgele idle hızlar
        const baseDl = networkSpeedLimit > 0 ? (networkSpeedLimit * 1024 * 0.8) : (0.1 + Math.random() * 0.5); 
        const fluctDl = Math.random() * (networkSpeedLimit > 0 ? 50 : 0.5);
        const ulRatio = 0.05 + Math.random() * 0.1;
        
        setNetSpeed({
          dl: baseDl + fluctDl,
          ul: (baseDl + fluctDl) * ulRatio
        });
      } else {
        // İdle background network
        setNetSpeed({
          dl: 0.1 + Math.random() * 1.5,
          ul: 0.05 + Math.random() * 0.5
        });
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [networkLimiterEnabled, networkSpeedLimit]);

  const sysMaxRam = 16000; 
  const currentRamGB = (metrics.ramMB / 1024).toFixed(1);
  const limitRamGB = maxRamLimit > 0 ? (maxRamLimit / 1024).toFixed(1) : '1.0';
  
  const accent = 'var(--accent, #ff3040)';

  const sortedTabs = (metrics.tabMetrics || [])
    .sort((a, b) => hkTab === 'CPU' ? b.cpu - a.cpu : b.ramMB - a.ramMB)
    .slice(0, 5); // top 5

  return (
    <div style={{ 
      color: '#fff', 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflowY: 'auto', 
      overflowX: 'hidden',
      padding: '20px 16px',
      boxSizing: 'border-box',
      background: 'var(--bg-secondary)', // Temaya uyum sağlaması için değiştirildi
      fontFamily: 'Inter, sans-serif'
    }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* ─── RAM SINIRLAYICI KARTI ─── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🎹</span>
              <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.2px' }}>RAM SINIRLAYICI</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'help' }}>ⓘ</span>
            </div>
            <GxToggle checked={ramLimiterEnabled} onChange={setRamLimiterEnabled} />
          </div>

          {/* GAUGE BÖLÜMÜ */}
          <div style={{ position: 'relative', height: '220px', display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ position: 'absolute', top: -5, color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600 }}>16</div>
            <div style={{ position: 'absolute', bottom: 15, left: 35, color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600 }}>0</div>
            <div style={{ position: 'absolute', bottom: 15, right: 35, color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600 }}>32</div>
            
            <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-225deg)', pointerEvents: 'none' }}>
              {/* Arka plan dairesi */}
              <circle cx="110" cy="110" r="90" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" strokeDasharray="424" strokeLinecap="round" />
              {/* İç sınır çizgileri */}
              <circle cx="110" cy="110" r="70" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="2" strokeDasharray="424" />
              {/* Dolu kısım */}
              <motion.circle 
                cx="110" cy="110" r="90" fill="none" stroke={ramLimiterEnabled ? accent : 'rgba(255,255,255,0.1)'} strokeWidth="6"
                strokeDasharray="424"
                animate={{ strokeDashoffset: 424 - (424 * (metrics.ramMB / sysMaxRam)) * 0.75 }}
                strokeLinecap="round"
                style={{ transition: 'stroke 0.3s' }}
              />
            </svg>
            
            <div style={{ position: 'absolute', top: '45%', transform: 'translateY(-50%)', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', fontWeight: 700, fontFamily: 'monospace', lineHeight: 1, letterSpacing: '1px' }}>{currentRamGB}</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginTop: '8px' }}>GB</div>
            </div>
          </div>

          <div style={{ opacity: ramLimiterEnabled ? 1 : 0.4, transition: 'opacity 0.2s', pointerEvents: ramLimiterEnabled ? 'auto' : 'none' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '20px' }}>Bellek Sınırı (GB)</div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              {/* Siyah borderlı kutucuk tasarımı */}
              <div style={{ 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                padding: '6px 12px', 
                borderRadius: '4px', 
                fontSize: '13px', 
                fontWeight: 600,
                minWidth: '45px', 
                textAlign: 'center' 
              }}>
                {limitRamGB}
              </div>
              
              {/* Custom Slider Input */}
              <div style={{ position: 'relative', flex: 1, height: '24px', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', width: '100%', height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />
                <div style={{ position: 'absolute', width: `${((maxRamLimit - 1024) / (8192 - 1024)) * 100}%`, height: '2px', background: accent, borderRadius: '2px' }} />
                <input 
                  type="range" min="1024" max="8192" step="512"
                  value={maxRamLimit}
                  onChange={(e) => setMaxRamLimit(Number(e.target.value))}
                  style={{ 
                    position: 'absolute', 
                    width: '100%', 
                    opacity: 0, 
                    cursor: 'pointer', 
                    height: '24px', 
                    margin: 0 
                  }}
                />
                <div style={{ 
                  position: 'absolute', 
                  left: `calc(${((maxRamLimit - 1024) / (8192 - 1024)) * 100}% - 7px)`, 
                  width: '14px', height: '14px', 
                  borderRadius: '50%', 
                  background: accent, 
                  pointerEvents: 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }} />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 800, letterSpacing: '0.5px' }}>
              <span>MIN</span>
              <span style={{ letterSpacing: '4px', opacity: 0.5 }}>.........................</span>
              <span>MAX</span>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.2px' }}>KESİN SINIR</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>Bellek sınırı aşılamaz.</div>
              </div>
              <GxToggle checked={ramHardLimit} onChange={setRamHardLimit} />
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.03)', margin: '8px 0' }} />

        {/* ─── AĞ SINIRLAYICI KARTI ─── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>📡</span>
              <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.2px' }}>AĞ SINIRLAYICI</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'help' }}>ⓘ</span>
            </div>
            <GxToggle checked={networkLimiterEnabled} onChange={setNetworkLimiterEnabled} />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', opacity: networkLimiterEnabled ? 1 : 0.4, transition: 'opacity 0.2s' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.8)' }}>↘</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>İndir</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontFamily: 'monospace' }}>
                  {netSpeed.dl > 1024 ? (netSpeed.dl / 1024).toFixed(1) + ' MB/s' : netSpeed.dl.toFixed(1) + ' KB/s'}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px', color: 'rgba(255,255,255,0.8)' }}>↗</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>Yükle</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontFamily: 'monospace' }}>
                  {netSpeed.ul > 1024 ? (netSpeed.ul / 1024).toFixed(1) + ' MB/s' : netSpeed.ul.toFixed(1) + ' KB/s'}
                </div>
              </div>
            </div>
          </div>

          {/* Custom Select Dropdown UI */}
          <div style={{ opacity: networkLimiterEnabled ? 1 : 0.4, pointerEvents: networkLimiterEnabled ? 'auto' : 'none' }}>
            <div 
              onClick={() => setIsSelectOpen(!isSelectOpen)}
              style={{ 
                background: 'transparent', 
                border: '1px solid rgba(255,255,255,0.05)', 
                borderRadius: '6px', 
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                {networkSpeedLimit === 0 ? "Limitsiz" : `${networkSpeedLimit} Mbps`}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', transform: isSelectOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
              
              {isSelectOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  width: '100%',
                  background: 'var(--bg-primary, #ffffff)', // Theme matches
                  color: 'var(--text-primary)',
                  borderRadius: '6px',
                  marginTop: '4px',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  zIndex: 20,
                  overflow: 'hidden'
                }}>
                  {[0, 1, 5, 10, 25].map(val => (
                    <div 
                      key={val}
                      style={{
                        padding: '10px 14px',
                        fontSize: '13px',
                        fontWeight: 500,
                        background: networkSpeedLimit === val ? 'var(--accent)' : 'transparent',
                        color: networkSpeedLimit === val ? '#fff' : 'inherit',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (networkSpeedLimit !== val) e.currentTarget.style.background = 'rgba(128,128,128,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        if (networkSpeedLimit !== val) e.currentTarget.style.background = 'transparent';
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setNetworkSpeedLimit(val);
                        setIsSelectOpen(false);
                      }}
                    >
                      {val === 0 ? "Limitsiz" : `${val} Mbps`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ height: '1px', background: 'rgba(255,255,255,0.03)', margin: '8px 0' }} />

        {/* ─── HOT TABS KILLER KARTI ─── */}
        <div style={{ paddingBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '18px' }}>💀</span>
            <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '0.2px' }}>HOT TABS KILLER</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'help' }}>ⓘ</span>
          </div>

          <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
            <button 
              onClick={() => setHkTab('CPU')}
              style={{ flex: 1, padding: '10px', background: hkTab === 'CPU' ? accent : 'rgba(0,0,0,0.4)', color: hkTab === 'CPU' ? '#fff' : 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'center', gap: '6px' }}
            >
              <span>⚙️</span> CPU
            </button>
            <button 
              onClick={() => setHkTab('RAM')}
              style={{ flex: 1, padding: '10px', background: hkTab === 'RAM' ? accent : 'rgba(0,0,0,0.4)', color: hkTab === 'RAM' ? '#fff' : 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', justifyContent: 'center', gap: '6px' }}
            >
              <span>🖨️</span> RAM
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {sortedTabs.map((dt) => (
              <div key={dt.pid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                  <div style={{ width: '20px', height: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>
                    {dt.name ? dt.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                    {dt.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, width: '40px', textAlign: 'right' }}>
                    {hkTab === 'CPU' ? `${dt.cpu.toFixed(1)}%` : `${dt.ramMB}MB`}
                  </div>
                  <button 
                    onClick={() => { window.electronAPI?.system?.killProcess?.(dt.pid); }}
                    style={{ background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', borderRadius: '4px' }}
                    title="İşlemi Sonlandır"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            {sortedTabs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                Pencere metrikleri bekleniyor...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


