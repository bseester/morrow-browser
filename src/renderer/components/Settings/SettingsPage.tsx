/**
 * SettingsPage — chrome://settings benzeri tam sayfa ayarlar
 *
 * Sol tarafta kategori menüsü, sağ tarafta ayar içerikleri.
 * Kategoriler: Görünüm, Arama Motoru, Başlangıç, Gizlilik, Hakkında
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Palette, 
  Zap, 
  Search, 
  Home, 
  Shield, 
  Keyboard, 
  Puzzle, 
  Info,
  ChevronLeft,
  Key,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import {
  useSettingsStore,
  ACCENT_PRESETS,
  SEARCH_ENGINES,
  GX_THEMES,
  GXThemeId,
} from '../../store/useSettingsStore';
import ExtensionsPanel from '../Sidebar/ExtensionsPanel';

type SettingsCategory = 'appearance' | 'performance' | 'search' | 'startup' | 'privacy' | 'shortcuts' | 'passwords' | 'extensions' | 'about';

const CATEGORIES: { id: SettingsCategory; icon: any; label: string }[] = [
  { id: 'appearance', icon: Palette, label: 'Görünüm' },
  { id: 'performance', icon: Zap, label: 'Performans' },
  { id: 'search', icon: Search, label: 'Arama Motoru' },
  { id: 'startup', icon: Home, label: 'Başlangıç' },
  { id: 'privacy', icon: Shield, label: 'Gizlilik' },
  { id: 'passwords', icon: Key, label: 'Şifreler' },
  { id: 'shortcuts', icon: Keyboard, label: 'Kısayollar' },
  { id: 'extensions', icon: Puzzle, label: 'Eklentiler' },
  { id: 'about', icon: Info, label: 'Hakkında' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category') as SettingsCategory;
    if (cat && CATEGORIES.some(c => c.id === cat)) {
      setActiveCategory(cat);
    }
  }, [location.search]);

  const {
    theme, setTheme,
    accentColor, setAccentColor,
    gxTheme, setGxTheme,
    searchEngine, setSearchEngine,
    homepage, setHomepage,
    tabGroupingEnabled, setTabGroupingEnabled,
    sidebarPerformanceEnabled, setSidebarPerformanceEnabled,
    sidebarCleanerEnabled, setSidebarCleanerEnabled,
    panicShortcut, setPanicShortcut,
    panicUrl, setPanicUrl,
  } = useSettingsStore();



  const [homepageInput, setHomepageInput] = useState(homepage);
  const [adblockEnabled, setAdblockEnabled] = useState(true);

  useEffect(() => {
    window.electronAPI?.adblock?.getStatus().then(setAdblockEnabled);
  }, []);

  const handleToggleAdblock = async () => {
    if (window.electronAPI?.adblock) {
      const newState = await window.electronAPI.adblock.toggle();
      if (newState !== undefined) setAdblockEnabled(newState);
    } else {
      setAdblockEnabled((prev) => !prev);
    }
  };

  const handleClearData = async () => {
    await window.electronAPI?.history?.clear();
    alert('Tarama verileri temizlendi!');
  };

  const handleSaveHomepage = () => {
    setHomepage(homepageInput.trim() || 'about:blank');
  };

  return (
    <div
      className="no-select"
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      {/* ─── Sol Menü (Premium Glass Sidebar) ─── */}
      <div
        style={{
          width: '280px',
          height: '100%',
          background: 'rgba(12, 10, 24, 0.45)', // Cam arkası efekti
          backdropFilter: 'blur(30px) saturate(180%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 0',
          flexShrink: 0,
          boxShadow: '10px 0 30px rgba(0,0,0,0.15)',
          zIndex: 10,
        }}
      >
        {/* Geri Butonu + Başlık */}
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ x: -2, background: 'rgba(255,255,255,0.08)' }}
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              marginBottom: '16px',
              fontFamily: 'Inter, sans-serif',
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'all 0.2s',
            }}
          >
            <ChevronLeft size={14} /> Geri Dön
          </motion.button>
          
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px',
              margin: 0,
              background: 'linear-gradient(135deg, #fff 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Ayarlar
          </h1>
        </div>

        {/* Kategori Listesi */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 12px' }}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;

            return (
              <motion.button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                whileHover={{ background: 'rgba(255,255,255,0.06)', x: 4 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: '12px 16px',
                  background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  textAlign: 'left',
                  fontFamily: 'Inter, sans-serif',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  border: isActive ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent',
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ flex: 1 }}>{cat.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    style={{
                      position: 'absolute',
                      right: 12,
                      width: '4px',
                      height: '4px',
                      background: 'var(--accent)',
                      borderRadius: '50%',
                      boxShadow: '0 0 10px var(--accent)',
                    }}
                  />
                )}
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* ─── Sağ İçerik ─── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '40px 60px',
          background: 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.05), transparent 40%)',
        }}
      >
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          style={{ maxWidth: '800px' }}
        >
          {activeCategory === 'appearance' && (
            <AppearanceSection
              theme={theme}
              setTheme={setTheme}
              accentColor={accentColor}
              setAccentColor={setAccentColor}
              gxTheme={gxTheme}
              setGxTheme={setGxTheme}
              tabGroupingEnabled={tabGroupingEnabled}
              setTabGroupingEnabled={setTabGroupingEnabled}
              sidebarPerformanceEnabled={sidebarPerformanceEnabled}
              setSidebarPerformanceEnabled={setSidebarPerformanceEnabled}
              sidebarCleanerEnabled={sidebarCleanerEnabled}
              setSidebarCleanerEnabled={setSidebarCleanerEnabled}
            />
          )}
          {activeCategory === 'performance' && (
            <PerformanceSection />
          )}
          {activeCategory === 'search' && (
            <SearchSection
              searchEngine={searchEngine}
              setSearchEngine={setSearchEngine}
            />
          )}
          {activeCategory === 'startup' && (
            <StartupSection
              homepageInput={homepageInput}
              setHomepageInput={setHomepageInput}
              onSave={handleSaveHomepage}
            />
          )}
          {activeCategory === 'privacy' && (
            <PrivacySection
              adblockEnabled={adblockEnabled}
              onToggleAdblock={handleToggleAdblock}
              onClearData={handleClearData}
            />
          )}

          {activeCategory === 'shortcuts' && (
            <ShortcutsSection
              panicShortcut={panicShortcut}
              setPanicShortcut={setPanicShortcut}
              panicUrl={panicUrl}
              setPanicUrl={setPanicUrl}
            />
          )}

          {activeCategory === 'passwords' && <PasswordsSection />}


          {activeCategory === 'extensions' && (
            <>
              <SectionTitle icon={Puzzle}>Eklentiler</SectionTitle>
              <SettingCard><ExtensionsPanel /></SettingCard>
            </>
          )}
          {activeCategory === 'about' && <AboutSection />}
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/*                   BÖLÜMLER                      */
/* ═══════════════════════════════════════════════ */

function SectionTitle({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '12px', 
        background: 'rgba(139, 92, 246, 0.1)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--accent)',
        border: '1px solid rgba(139, 92, 246, 0.2)'
      }}>
        <Icon size={24} />
      </div>
      <h2
        style={{
          fontSize: '24px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px',
        }}
      >
        {children}
      </h2>
    </div>
  );
}

function SettingCard({ children, noPadding }: { children: React.ReactNode, noPadding?: boolean }) {
  return (
    <div
      style={{
        padding: noPadding ? '0' : '24px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '20px',
        marginBottom: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

function SettingLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
        {title}
      </span>
      {subtitle && (
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{subtitle}</span>
      )}
    </div>
  );
}

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        background: enabled ? 'var(--accent)' : 'var(--border-active)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.3s ease',
        flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 2 }}
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
  );
}

/* ─── Görünüm ─── */
function AppearanceSection({
  theme,
  setTheme,
  accentColor,
  setAccentColor,
  gxTheme,
  setGxTheme,
  tabGroupingEnabled,
  setTabGroupingEnabled,
  sidebarPerformanceEnabled,
  setSidebarPerformanceEnabled,
  sidebarCleanerEnabled,
  setSidebarCleanerEnabled,
}: {
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
  gxTheme: GXThemeId | '';
  setGxTheme: (id: GXThemeId | '') => void;
  tabGroupingEnabled: boolean;
  setTabGroupingEnabled: (b: boolean) => void;
  sidebarPerformanceEnabled: boolean;
  setSidebarPerformanceEnabled: (b: boolean) => void;
  sidebarCleanerEnabled: boolean;
  setSidebarCleanerEnabled: (b: boolean) => void;
}) {
  const applyGxTheme = (id: GXThemeId | '') => {
    const t = GX_THEMES.find(x => x.id === id);
    if (!t) { setGxTheme(''); return; }
    setGxTheme(id);
    setAccentColor(t.accent);
    // CSS custom props'u güncelle
    const root = document.documentElement;
    root.style.setProperty('--accent', t.accent);
    root.style.setProperty('--bg-primary', t.bg);
    root.style.setProperty('--bg-secondary', t.bgSecondary);
    root.style.setProperty('--bg-tertiary', t.bgSecondary);
  };

  return (
    <>
      <SectionTitle icon={Palette}>Görünüm</SectionTitle>

      {/* Renkli Temalar */}
      <SettingCard>
        <SettingLabel title="Renkli Temalar" subtitle="Özel renk animasyonlu tema paketleri" />
      <SettingCard>
        <SettingLabel title="Premium Temalar" subtitle="Canlı renk geçişleri ve özel atmosferik temalar" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '16px',
            marginTop: '20px',
          }}
        >
          {/* Varsayılan Tema */}
          <motion.button
            whileHover={{ y: -5, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setGxTheme(''); setAccentColor('#6366f1'); }}
            style={{
              borderRadius: '24px',
              border: gxTheme === '' ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)',
              background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
              cursor: 'pointer',
              padding: '0',
              overflow: 'hidden',
              height: '140px',
              position: 'relative',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: gxTheme === '' ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none',
            }}
          >
             <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: 'radial-gradient(circle at 70% 30%, #6366f1 0%, transparent 70%)' }} />
             <div style={{ position: 'absolute', bottom: 16, left: 16, textAlign: 'left' }}>
                <span style={{ fontSize: '24px' }}>🌑</span>
                <div style={{ fontSize: '14px', color: '#fff', fontWeight: 700, marginTop: '4px', letterSpacing: '-0.3px' }}>Varsayılan</div>
             </div>
          </motion.button>

          {GX_THEMES.map((t) => (
            <motion.button
              key={t.id}
              whileHover={{ y: -5, boxShadow: `0 10px 30px ${t.accent}40` }}
              whileTap={{ scale: 0.98 }}
              onClick={() => applyGxTheme(t.id)}
              style={{
                borderRadius: '24px',
                border: gxTheme === t.id ? `2px solid ${t.accent}` : '1px solid rgba(255,255,255,0.1)',
                background: t.preview,
                cursor: 'pointer',
                padding: '0',
                overflow: 'hidden',
                height: '140px',
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: gxTheme === t.id ? `0 0 20px ${t.accent}60` : 'none',
              }}
            >
              {/* İç Gölge ve Parıltı */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)' }} />
              
              <div style={{ position: 'absolute', bottom: 16, left: 16, textAlign: 'left' }}>
                <span style={{ fontSize: '24px' }}>{t.emoji}</span>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#fff', 
                  fontWeight: 700, 
                  marginTop: '4px', 
                  letterSpacing: '-0.3px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>
                  {t.name}
                </div>
              </div>
              
              {gxTheme === t.id && (
                <motion.div 
                  layoutId="selected-theme-glow"
                  style={{ 
                    position: 'absolute', 
                    top: 12, 
                    right: 12, 
                    width: 10, 
                    height: 10, 
                    borderRadius: '50%', 
                    background: '#fff', 
                    boxShadow: `0 0 15px 5px ${t.accent}` 
                  }} 
                />
              )}
            </motion.button>
          ))}
        </div>
      </SettingCard>
      </SettingCard>

      {/* Tema Seçimi (Aydınlık/Karanlık) */}
      <SettingCard>
        <SettingLabel title="Tema" subtitle="Arayüz temasını seçin" />
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          {(['dark', 'light'] as const).map((t) => (
            <motion.button
              key={t}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTheme(t)}
              style={{
                flex: 1,
                padding: '24px',
                borderRadius: '20px',
                background: t === 'dark' ? 'rgba(10, 10, 15, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(10px)',
                border: theme === t ? '2px solid var(--accent)' : '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%', 
                background: theme === t ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme === t ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.3s'
              }}>
                {t === 'dark' ? <Shield size={24} /> : <Home size={24} />}
              </div>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {t === 'dark' ? 'Karanlık' : 'Aydınlık'}
              </span>
            </motion.button>
          ))}
        </div>
      </SettingCard>

      {/* Accent Renk */}
      <SettingCard>
        <SettingLabel title="Vurgu Rengi" subtitle="Arayüzün ana vurgu rengini seçin" />
        <div
          style={{
            display: 'flex',
            gap: '10px',
            marginTop: '16px',
            flexWrap: 'wrap',
          }}
        >
          {ACCENT_PRESETS.map((preset) => (
            <motion.button
              key={preset.value}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setAccentColor(preset.value)}
              title={preset.name}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: preset.value,
                border:
                  accentColor === preset.value
                    ? '3px solid var(--text-primary)'
                    : '3px solid transparent',
                cursor: 'pointer',
                boxShadow:
                  accentColor === preset.value
                    ? `0 0 0 3px ${preset.value}40`
                    : 'none',
                transition: 'box-shadow 200ms ease, border-color 200ms ease',
              }}
            />
          ))}
        </div>
      </SettingCard>

      <SettingCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SettingLabel title="Sürükle & Bırak Sekme Gruplama" subtitle="Sekmeleri üst üste sürükleyerek klasör/grup oluşturmanızı sağlar" />
          <ToggleSwitch enabled={tabGroupingEnabled} onToggle={() => setTabGroupingEnabled(!tabGroupingEnabled)} />
        </div>
      </SettingCard>

      <SettingCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SettingLabel title="Sağ Sidebar: Kontrol Panelini Göster" subtitle="Performans ve RAM kontrol aracını sol barda listeler" />
          <ToggleSwitch enabled={sidebarPerformanceEnabled} onToggle={() => setSidebarPerformanceEnabled(!sidebarPerformanceEnabled)} />
        </div>
      </SettingCard>

      <SettingCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SettingLabel title="Sağ Sidebar: Temizleyiciyi Göster" subtitle="Tarama verilerini temizleme aracını sol barda listeler" />
          <ToggleSwitch enabled={sidebarCleanerEnabled} onToggle={() => setSidebarCleanerEnabled(!sidebarCleanerEnabled)} />
        </div>
      </SettingCard>
    </>
  );
}

/* ─── Performans ─── */
function PerformanceSection() {
  const {
    ramLimiterEnabled, setRamLimiterEnabled,
    maxRamLimit, setMaxRamLimit,
    ramHardLimit, setRamHardLimit,
    networkLimiterEnabled, setNetworkLimiterEnabled,
    networkSpeedLimit, setNetworkSpeedLimit,
    ramSnoozeTime, setRamSnoozeTime,
  } = useSettingsStore();

  return (
    <>
      <SectionTitle icon={Zap}>Performans ve Kaynak Yönetimi</SectionTitle>

      {/* RAM Limitleyici */}
      <SettingCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: ramLimiterEnabled ? '20px' : '0' }}>
          <SettingLabel 
            title="RAM Limitleyici" 
            subtitle="Tarayıcının kullanabileceği maksimum bellek miktarını sınırlar" 
          />
          <ToggleSwitch enabled={ramLimiterEnabled} onToggle={() => setRamLimiterEnabled(!ramLimiterEnabled)} />
        </div>

        {ramLimiterEnabled && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ overflow: 'hidden' }}>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Maksimum RAM</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{maxRamLimit === 0 ? 'Sınırsız' : `${(maxRamLimit / 1024).toFixed(1)} GB`}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="16384" 
                step="512" 
                value={maxRamLimit} 
                onChange={(e) => setMaxRamLimit(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer', marginBottom: '16px' }}
              />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                <SettingLabel 
                   title="Katı Sınır (Hard Limit)" 
                   subtitle="RAM sınırı aşıldığında sekmeleri agresif bir şekilde uyutur" 
                />
                <ToggleSwitch enabled={ramHardLimit} onToggle={() => setRamHardLimit(!ramHardLimit)} />
              </div>
            </div>
          </motion.div>
        )}
      </SettingCard>

      {/* Ağ Sınırlayıcı */}
      <SettingCard>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: networkLimiterEnabled ? '20px' : '0' }}>
          <SettingLabel 
            title="Ağ Sınırlayıcı" 
            subtitle="İndirme ve yükleme hızını belirlediğiniz değerde sabitler" 
          />
          <ToggleSwitch enabled={networkLimiterEnabled} onToggle={() => setNetworkLimiterEnabled(!networkLimiterEnabled)} />
        </div>

        {networkLimiterEnabled && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ overflow: 'hidden' }}>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Maksimum Hız</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>{networkSpeedLimit === 0 ? 'Sınırsız' : `${networkSpeedLimit} Mbps`}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1000" 
                step="10" 
                value={networkSpeedLimit} 
                onChange={(e) => setNetworkSpeedLimit(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
            </div>
          </motion.div>
        )}
      </SettingCard>

      {/* RAM Snooze / Tab Sleep */}
      <SettingCard>
        <SettingLabel 
          title="Otomatik Sekme Askıya Alma (RAM Snooze)" 
          subtitle="Boştaki sekmeleri belirli bir süre sonra uyku moduna alarak RAM tasarrufu sağlar" 
        />
        <div style={{ marginTop: '16px' }}>
          <select 
            value={ramSnoozeTime} 
            onChange={(e) => setRamSnoozeTime(Number(e.target.value))}
            style={{ 
              width: '100%', 
              padding: '10px', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: '8px', 
              color: '#fff', 
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value={0} style={{ background: '#1a1a2e' }}>Kapalı</option>
            <option value={5} style={{ background: '#1a1a2e' }}>5 Dakika Sonra</option>
            <option value={15} style={{ background: '#1a1a2e' }}>15 Dakika Sonra</option>
            <option value={30} style={{ background: '#1a1a2e' }}>30 Dakika Sonra</option>
            <option value={60} style={{ background: '#1a1a2e' }}>1 Saat Sonra</option>
          </select>
        </div>
      </SettingCard>
    </>
  );
}

/* ─── Arama Motoru ─── */
function SearchSection({
  searchEngine,
  setSearchEngine,
}: {
  searchEngine: string;
  setSearchEngine: (e: string) => void;
}) {
  return (
    <>
      <SectionTitle icon={Search}>Arama Motoru</SectionTitle>
      <SettingCard>
        <SettingLabel
          title="Varsayılan Arama Motoru"
          subtitle="Omnibox arama sorgularında kullanılacak motor"
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          {SEARCH_ENGINES.map((engine) => (
            <motion.label
              key={engine.value}
              whileHover={{ background: 'rgba(255,255,255,0.04)' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                border:
                  searchEngine === engine.value
                    ? '1px solid var(--accent)'
                    : '1px solid var(--border-subtle)',
                transition: 'border-color 200ms ease',
              }}
            >
              <input
                type="radio"
                name="searchEngine"
                value={engine.value}
                checked={searchEngine === engine.value}
                onChange={() => setSearchEngine(engine.value)}
                style={{ accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {engine.name}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {engine.url}...
                </span>
              </div>
            </motion.label>
          ))}
        </div>
      </SettingCard>
    </>
  );
}

/* ─── Başlangıç ─── */
function StartupSection({
  homepageInput,
  setHomepageInput,
  onSave,
}: {
  homepageInput: string;
  setHomepageInput: (v: string) => void;
  onSave: () => void;
}) {
  const handleSetDefault = async () => {
    await window.electronAPI?.system?.setAsDefaultBrowser();
  };

  return (
    <>
      <SectionTitle icon={Home}>Başlangıç</SectionTitle>
      
      {/* Varsayılan Tarayıcı Kartı */}
      <SettingCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <SettingLabel 
            title="Varsayılan Tarayıcı" 
            subtitle="Tüm linkleri ve web sayfalarını Morrow ile açın." 
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleSetDefault}
            style={{
              padding: '8px 16px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s',
            }}
          >
            Varsayılan Yap
          </motion.button>
        </div>
      </SettingCard>

      <SettingCard>
        <SettingLabel title="Ana Sayfa" subtitle="Tarayıcı açıldığında gösterilecek sayfa" />
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <input
            type="text"
            value={homepageInput}
            onChange={(e) => setHomepageInput(e.target.value)}
            placeholder="https://example.com"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-subtle)';
            }}
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onSave}
            style={{
              padding: '10px 20px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Kaydet
          </motion.button>
        </div>
      </SettingCard>
    </>
  );
}

/* ─── Gizlilik ─── */
function PrivacySection({
  adblockEnabled,
  onToggleAdblock,
  onClearData,
}: {
  adblockEnabled: boolean;
  onToggleAdblock: () => void;
  onClearData: () => void;
}) {
  return (
    <>
      <SectionTitle icon={Shield}>Gizlilik ve Güvenlik</SectionTitle>

      {/* AdBlock */}
      <SettingCard>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <SettingLabel
            title="Reklam Engelleyici (AdBlock)"
            subtitle="Zararlı reklamları ve analizleri engeller"
          />
          <ToggleSwitch enabled={adblockEnabled} onToggle={onToggleAdblock} />
        </div>
      </SettingCard>

      {/* Verileri Temizle */}
      <SettingCard>
        <SettingLabel
          title="Tarama Verilerini Sil"
          subtitle="Geçmiş, çerezler ve önbellek temizlenir"
        />
        <motion.button
          whileHover={{ scale: 1.02, background: 'rgba(239, 68, 68, 0.2)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onClearData}
          style={{
            marginTop: '16px',
            padding: '12px 24px',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s',
          }}
        >
          Tarama Verilerini Sil
        </motion.button>
      </SettingCard>

      {/* Gizli Pencere */}
      <SettingCard>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <SettingLabel
            title="Yeni Gizli Pencere"
            subtitle="İz bırakmadan gezinmenizi sağlar"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.electronAPI?.system?.newIncognitoWindow()}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            🕵️ Aç
          </motion.button>
        </div>
      </SettingCard>
    </>
  );
}

/* ─── Hakkında ─── */
/* ─── Kısayollar ─── */
function ShortcutsSection({
  panicShortcut,
  setPanicShortcut,
  panicUrl,
  setPanicUrl,
}: {
  panicShortcut: string;
  setPanicShortcut: (s: string) => void;
  panicUrl: string;
  setPanicUrl: (u: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [urlInput, setUrlInput] = useState(panicUrl);


  useEffect(() => {
    if (!isRecording) return;

    const handleKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const combo = [];
      if (e.ctrlKey || e.metaKey) combo.push('Control');
      if (e.shiftKey) combo.push('Shift');
      if (e.altKey) combo.push('Alt');
      
      const key = e.key.toUpperCase();
      if (!['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) {
        combo.push(key);
        setPanicShortcut(combo.join('+'));
        setIsRecording(false);
      }
    };

    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isRecording, setPanicShortcut]);

  return (
    <>
      <SectionTitle icon={Keyboard}>Kısayollar</SectionTitle>
      
      <SettingCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SettingLabel 
            title="Panic Butonu (Tümünü Kapat)" 
            subtitle="Belirlediğiniz tuşlara bastığınızda tüm sekmeler anında kapanır ve boş bir sayfa açılır." 
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              padding: '8px 14px', 
              background: 'rgba(255,255,255,0.05)', 
              borderRadius: '8px', 
              color: 'var(--accent)',
              fontSize: '13px',
              fontFamily: 'monospace',
              fontWeight: 600,
              minWidth: '100px',
              textAlign: 'center',
              border: '1px solid var(--border-subtle)'
            }}>
              {isRecording ? 'Tuşlara Basın...' : panicShortcut.replace('Control', 'Ctrl')}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsRecording(!isRecording)}
              style={{
                padding: '8px 16px',
                background: isRecording ? 'var(--danger)' : 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              {isRecording ? 'İptal' : 'Değiştir'}
            </motion.button>
          </div>
        </div>
      </SettingCard>
      
      <SettingCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <SettingLabel 
            title="Panic Yönlendirme URL'i" 
            subtitle="Panic butonu tetiklendiğinde açılacak sayfa." 
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://www.google.com"
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                fontFamily: 'Inter, sans-serif'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--border-subtle)';
                setPanicUrl(urlInput.trim() || 'https://www.google.com');
              }}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setPanicUrl(urlInput.trim() || 'https://www.google.com');
                alert('Panic URL kaydedildi!');
              }}
              style={{
                padding: '10px 20px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              Uygula
            </motion.button>
          </div>
        </div>
      </SettingCard>


      <div style={{ padding: '0 8px', marginTop: '12px' }}>
         <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
           * Kısayol kaydederken CTRL, SHIFT gibi yardımcı tuşları ve bir harf tuşunu birlikte kullanmanız önerilir.
         </p>
      </div>

      <div style={{ marginTop: '24px' }}>
        <SettingCard>
          <SettingLabel title="Tarayıcı Kısayolları" subtitle="Morrow'u daha hızlı kullanmanızı sağlayan klavye kısayolları" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginTop: '20px' }}>
            {[
              { label: 'Pencereyi Kapat', keys: ['Ctrl', 'Shift', 'W'] },
              { label: 'Sonraki Sekme', keys: ['Ctrl', 'Tab'] },
              { label: 'Önceki Sekme', keys: ['Ctrl', 'Shift', 'Tab'] },
              { label: 'Çıkış', keys: ['Alt', 'F4'] },
              { label: 'Geri', keys: ['Alt', 'Backspace'] },
              { label: 'İleri', keys: ['Shift', 'Backspace'] },
              { label: 'Yenile (Önbelleksiz)', keys: ['Ctrl', 'Shift', 'R'] },
              { label: 'Yüklemeyi Durdur', keys: ['Esc'] },
              { label: 'Otomatik www. / .com', keys: ['Ctrl', 'Enter'] },
              { label: 'Adresi Yeni Sekmede Aç', keys: ['Alt', 'Enter'] },
              { label: 'Yer İmleri Çubuğu Gizle/Göster', keys: ['Ctrl', 'Shift', 'B'] },
              { label: 'Sayfayı Yer İmlerine Ekle', keys: ['Ctrl', 'D'] },
              { label: 'Sayfa Kaynağını Görüntüle', keys: ['Ctrl', 'U'] },
              { label: 'Tam Ekran', keys: ['F11'] },
              { label: 'Geliştirici Araçları', keys: ['F12'] }
            ].map((sc, i) => (
               <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                 <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{sc.label}</span>
                 <div style={{ display: 'flex', gap: '6px' }}>
                   {sc.keys.map((k, j) => (
                     <span key={j} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)' }}>{k}</span>
                   ))}
                 </div>
               </div>
            ))}
          </div>
        </SettingCard>
      </div>
    </>
  );
}

function AboutSection() {
  const [version, setVersion] = useState<string>('...loading');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    window.electronAPI?.system?.getVersion().then((info: any) => {
      if (info?.version) setVersion(info.version);
    });
  }, []);

  const handleCheck = async () => {
    setChecking(true);
    const res = await window.electronAPI?.system?.checkUpdate();
    setChecking(false);
    // Main process kendi dialog'unu gösteriyor, message boşsa alert gösterme
    if (res?.message) alert(res.message);
  };

  return (
    <>
      <SectionTitle icon={Info}>Hakkında</SectionTitle>
      <SettingCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
          <SettingLabel 
            title="Varsayılan Tarayıcı" 
            subtitle="Morrow'u Windows'ta varsayılan tarayıcı olarak ayarlar" 
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              if (window.electronAPI?.system?.setAsDefaultBrowser) {
                await window.electronAPI.system.setAsDefaultBrowser();
              }
            }}
            style={{
              padding: '10px 20px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Varsayılan Yap
          </motion.button>
        </div>
      </SettingCard>

      <SettingCard>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            padding: '24px 0',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '40px',
              boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)',
              transform: 'rotate(-5deg)',
            }}
          >
            <Info size={44} strokeWidth={2.5} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Morrow Browser
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Sürüm {version}
            </p>
          </div>

          <motion.button
            onClick={handleCheck}
            disabled={checking}
            whileHover={{ scale: checking ? 1 : 1.02, background: 'rgba(59, 130, 246, 0.15)' }}
            whileTap={{ scale: checking ? 1 : 0.98 }}
            style={{
              padding: '10px 24px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#3b82f6',
              fontSize: '13px',
              fontWeight: 600,
              cursor: checking ? 'default' : 'pointer',
              opacity: checking ? 0.7 : 1,
              fontFamily: 'Inter, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {checking ? '🔄 Kontrol Ediliyor...' : '🔄 Güncellemeleri Denetle'}
          </motion.button>

          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              textAlign: 'center',
              maxWidth: '400px',
              lineHeight: 1.6,
            }}
          >
            Chromium tabanlı, modern ve hızlı masaüstü web tarayıcısı.
            Electron + React + Zustand ile geliştirildi.
          </p>
          <div
            style={{
              marginTop: '8px',
              padding: '8px 16px',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'monospace',
            }}
          >
            Electron v33 · React v19 · Zustand v5
          </div>
        </div>
      </SettingCard>
    </>
  );
}

function PasswordsSection() {
  const [passwords, setPasswords] = useState<any[]>([]);
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const loadPasswords = async () => {
    if (window.electronAPI?.system?.getSavedPasswords) {
      const data = await window.electronAPI.system.getSavedPasswords();
      setPasswords(data || []);
    }
  };

  useEffect(() => { loadPasswords(); }, []);

  const toggleVisible = (id: string) => {
    setVisible(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (id: string) => {
    if (window.electronAPI?.system?.deleteSavedPassword) {
      await window.electronAPI.system.deleteSavedPassword(id);
      loadPasswords();
    }
  };

  return (
    <>
      <SectionTitle icon={Key}>Şifre Yöneticisi</SectionTitle>
      <SettingCard>
        <SettingLabel title="Kayıtlı Şifreler" subtitle="Daha önce giriş yaptığınız ve kaydettiğiniz sitelere ait hesap bilgileri." />
        
        {passwords.length === 0 ? (
          <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Henüz tamamen güvenli olarak kaydedilmiş bir şifreniz bulunmuyor.
          </div>
        ) : (
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {passwords.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {p.origin ? new URL(p.origin).hostname : 'Bilinmeyen Kaynak'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {p.username || 'Kullanıcı adı kaydedilmedi'}
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    fontFamily: visible[p.id] ? 'monospace' : 'caption', 
                    fontSize: visible[p.id] ? '14px' : '20px', 
                    color: visible[p.id] ? 'var(--text-primary)' : 'var(--text-muted)', 
                    background: 'rgba(0,0,0,0.3)', 
                    padding: '8px 14px', 
                    borderRadius: '8px', 
                    minWidth: '130px', 
                    textAlign: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    letterSpacing: visible[p.id] ? '1px' : '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '38px'
                  }}>
                    {visible[p.id] ? p.password : '••••••••'}
                  </div>
                  
                  <motion.button 
                    whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }} 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleVisible(p.id)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '10px', borderRadius: '50%', display: 'flex' }}
                  >
                    {visible[p.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </motion.button>

                  <motion.button 
                    whileHover={{ scale: 1.05, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }} 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(p.id)}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', cursor: 'pointer', padding: '10px', borderRadius: '50%', display: 'flex', transition: 'all 0.2s' }}
                  >
                    <Trash2 size={16} />
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingCard>
    </>
  );
}
