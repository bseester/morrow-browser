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
} from '../../store/useSettingsStore';

type SettingsCategory = 'appearance' | 'search' | 'startup' | 'privacy' | 'about';

const CATEGORIES: { id: SettingsCategory; icon: string; label: string }[] = [
  { id: 'appearance', icon: '🎨', label: 'Görünüm' },
  { id: 'search', icon: '🔍', label: 'Arama Motoru' },
  { id: 'startup', icon: '🏠', label: 'Başlangıç' },
  { id: 'privacy', icon: '🛡️', label: 'Gizlilik' },
  { id: 'about', icon: 'ℹ️', label: 'Hakkında' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');
  const {
    theme, setTheme,
    accentColor, setAccentColor,
    searchEngine, setSearchEngine,
    homepage, setHomepage,
    adblockEnabled, setAdblockEnabled,
  } = useSettingsStore();

  const [homepageInput, setHomepageInput] = useState(homepage);

  const handleToggleAdblock = async () => {
    if (window.electronAPI?.adblock) {
      const newState = await window.electronAPI.adblock.toggle();
      if (newState !== undefined) setAdblockEnabled(newState);
    } else {
      setAdblockEnabled(!adblockEnabled);
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
}: {
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
}) {
  return (
    <>
      <SectionTitle>🎨 Görünüm</SectionTitle>

      {/* Tema Seçimi */}
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
              Sürüm 1.3.1
            </p>
            <button
              onClick={() => window.electronAPI?.system?.checkUpdate()}
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              🔄 Güncellemeleri Denetle
            </button>
          </div>
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
