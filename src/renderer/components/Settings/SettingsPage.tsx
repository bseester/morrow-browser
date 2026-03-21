/**
 * SettingsPage — chrome://settings benzeri tam sayfa ayarlar
 *
 * Sol tarafta kategori menüsü, sağ tarafta ayar içerikleri.
 * Kategoriler: Görünüm, Arama Motoru, Başlangıç, Gizlilik, Hakkında
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  useSettingsStore,
  ACCENT_PRESETS,
  SEARCH_ENGINES,
  GX_THEMES,
} from '../../store/useSettingsStore';
import ExtensionsPanel from '../Sidebar/ExtensionsPanel';

type SettingsCategory = 'appearance' | 'search' | 'startup' | 'privacy' | 'extensions' | 'about';

const CATEGORIES: { id: SettingsCategory; icon: string; label: string }[] = [
  { id: 'appearance', icon: '🎨', label: 'Görünüm' },
  { id: 'search', icon: '🔍', label: 'Arama Motoru' },
  { id: 'startup', icon: '🏠', label: 'Başlangıç' },
  { id: 'privacy', icon: '🛡️', label: 'Gizlilik' },
  { id: 'extensions', icon: '🧩', label: 'Eklentiler' },
  { id: 'about', icon: 'ℹ️', label: 'Hakkında' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');
  const {
    theme, setTheme,
    accentColor, setAccentColor,
    gxTheme, setGxTheme,
    searchEngine, setSearchEngine,
    homepage, setHomepage,
    tabGroupingEnabled, setTabGroupingEnabled,
    sidebarPerformanceEnabled, setSidebarPerformanceEnabled,
    sidebarCleanerEnabled, setSidebarCleanerEnabled,
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
      {/* ─── Sol Menü ─── */}
      <div
        style={{
          width: '260px',
          height: '100%',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          flexShrink: 0,
        }}
      >
        {/* Geri Butonu + Başlık */}
        <div style={{ padding: '0 20px', marginBottom: '24px' }}>
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ x: -3 }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 0',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            ← Geri
          </motion.button>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginTop: '8px',
            }}
          >
            ⚙️ Ayarlar
          </h1>
        </div>

        {/* Kategori Listesi */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px' }}>
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              whileHover={{ background: 'rgba(255,255,255,0.06)' }}
              style={{
                padding: '10px 16px',
                background:
                  activeCategory === cat.id
                    ? 'var(--accent-glow)'
                    : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color:
                  activeCategory === cat.id
                    ? 'var(--accent)'
                    : 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: activeCategory === cat.id ? 600 : 400,
                textAlign: 'left',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 150ms ease',
                borderLeft:
                  activeCategory === cat.id
                    ? '3px solid var(--accent)'
                    : '3px solid transparent',
              }}
            >
              <span style={{ fontSize: '16px' }}>{cat.icon}</span>
              {cat.label}
            </motion.button>
          ))}
        </nav>
      </div>

      {/* ─── Sağ İçerik ─── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 48px',
        }}
      >
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ maxWidth: '640px' }}
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
          {activeCategory === 'extensions' && (
            <>
              <SectionTitle>🧩 Eklentiler</SectionTitle>
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: '24px',
      }}
    >
      {children}
    </h2>
  );
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '20px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '16px',
      }}
    >
      {children}
    </div>
  );
}

function SettingLabel({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
        {title}
      </span>
      {subtitle && (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{subtitle}</span>
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
  gxTheme: string;
  setGxTheme: (id: string) => void;
  tabGroupingEnabled: boolean;
  setTabGroupingEnabled: (b: boolean) => void;
  sidebarPerformanceEnabled: boolean;
  setSidebarPerformanceEnabled: (b: boolean) => void;
  sidebarCleanerEnabled: boolean;
  setSidebarCleanerEnabled: (b: boolean) => void;
}) {
  const applyGxTheme = (id: string) => {
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
      <SectionTitle>🎨 Görünüm</SectionTitle>

      {/* Renkli Temalar */}
      <SettingCard>
        <SettingLabel title="Renkli Temalar" subtitle="Özel renk animasyonlu tema paketleri" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: '10px',
            marginTop: '16px',
          }}
        >
          {/* Normal mod */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => { setGxTheme(''); }}
            style={{
              borderRadius: 'var(--radius-md)',
              border: gxTheme === '' ? '2px solid var(--accent)' : '2px solid var(--border-subtle)',
              background: 'linear-gradient(135deg, #0a0a0f 50%, #6366f1 100%)',
              cursor: 'pointer',
              padding: '0',
              overflow: 'hidden',
              height: '72px',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', bottom: 6, left: 8, textAlign: 'left' }}>
              <div style={{ fontSize: '16px' }}>🔵</div>
              <div style={{ fontSize: '10px', color: '#fff', fontWeight: 600, marginTop: '2px' }}>Varsayılan</div>
            </div>
          </motion.button>

          {GX_THEMES.map((t) => (
            <motion.button
              key={t.id}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => applyGxTheme(t.id)}
              style={{
                borderRadius: 'var(--radius-md)',
                border: gxTheme === t.id ? `2px solid ${t.accent}` : '2px solid var(--border-subtle)',
                background: t.preview,
                cursor: 'pointer',
                padding: '0',
                overflow: 'hidden',
                height: '72px',
                position: 'relative',
                boxShadow: gxTheme === t.id ? `0 0 12px ${t.accent}60` : 'none',
                transition: 'box-shadow 0.2s',
              }}
            >
              <div style={{ position: 'absolute', bottom: 6, left: 8, textAlign: 'left' }}>
                <div style={{ fontSize: '16px' }}>{t.emoji}</div>
                <div style={{ fontSize: '10px', color: '#fff', fontWeight: 600, marginTop: '2px', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{t.name}</div>
              </div>
              {gxTheme === t.id && (
                <div style={{ position: 'absolute', top: 6, right: 6, width: 14, height: 14, borderRadius: '50%', background: t.accent, boxShadow: `0 0 6px ${t.accent}` }} />
              )}
            </motion.button>
          ))}
        </div>
      </SettingCard>

      {/* Tema Seçimi (Aydınlık/Karanlık) */}
      <SettingCard>
        <SettingLabel title="Tema" subtitle="Arayüz temasını seçin" />
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          {(['dark', 'light'] as const).map((t) => (
            <motion.button
              key={t}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTheme(t)}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border:
                  theme === t
                    ? '2px solid var(--accent)'
                    : '2px solid var(--border-subtle)',
                background: t === 'dark' ? '#0a0a0f' : '#f5f5f7',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'border-color 200ms ease',
              }}
            >
              <span style={{ fontSize: '28px' }}>{t === 'dark' ? '🌙' : '☀️'}</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: t === 'dark' ? '#e8e8ed' : '#1a1a2e',
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
      <SectionTitle>🔍 Arama Motoru</SectionTitle>
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
  return (
    <>
      <SectionTitle>🏠 Başlangıç</SectionTitle>
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
      <SectionTitle>🛡️ Gizlilik ve Güvenlik</SectionTitle>

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

        {/* Dashboard Button */}
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          <motion.button
            whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.03)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.electronAPI?.tabs?.create('chrome-extension://cjpalhdlnbpafiamejdnhcphjbkeiagm/dashboard.html')}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            🛡️ uBlock Origin Kontrol Paneli’ni Aç
          </motion.button>
        </div>
      </SettingCard>

      {/* Verileri Temizle */}
      <SettingCard>
        <SettingLabel
          title="Tarama Verilerini Sil"
          subtitle="Geçmiş, çerezler ve önbellek temizlenir"
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClearData}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            background: 'var(--danger)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
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
      <SectionTitle>ℹ️ Hakkında</SectionTitle>
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
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              boxShadow: '0 4px 20px var(--accent-glow)',
            }}
          >
            🌐
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
