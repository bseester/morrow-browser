/**
 * WebViewArea — Web içeriğinin gösterildiği ana alan
 *
 * Electron'da gerçek web içeriği WebContentsView ile main process
 * tarafından bu alanın üzerine yerleştirilir. Bu bileşen sadece
 * boş durum (yeni sekme) ekranını gösterir.
 *
 * V1.3.6: Premium gradient New Tab tasarımı
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabStore } from '../../store/useTabStore';
import { useSettingsStore, SEARCH_ENGINES } from '../../store/useSettingsStore';

// Discover thumbnail'ları
import thumb1 from '../../assets/discover/thumb1.png';
import thumb2 from '../../assets/discover/thumb2.png';
import thumb3 from '../../assets/discover/thumb3.png';
import thumb4 from '../../assets/discover/thumb4.png';

const DISCOVER_ITEMS = [
  { img: thumb1, label: 'Aurora' },
  { img: thumb2, label: 'Horizon' },
  { img: thumb3, label: 'Flow' },
  { img: thumb4, label: 'Mystic' },
];

const DEFAULT_FAVORITES = [
  { name: 'YouTube', url: 'https://www.youtube.com', icon: '📺', color: '#ff0000' },
  { name: 'GitHub', url: 'https://github.com', icon: '🐙', color: '#8b5cf6' },
  { name: 'Twitter', url: 'https://x.com', icon: '🐦', color: '#1da1f2' },
  { name: 'Reddit', url: 'https://www.reddit.com', icon: '🤖', color: '#ff4500' },
  { name: 'Discord', url: 'https://discord.com', icon: '💬', color: '#5865f2' },
  { name: 'Spotify', url: 'https://open.spotify.com', icon: '🎵', color: '#1db954' },
  { name: 'ChatGPT', url: 'https://chat.openai.com', icon: '🧠', color: '#10a37f' },
  { name: 'Netflix', url: 'https://www.netflix.com', icon: '🎬', color: '#e50914' },
];

export default function WebViewArea() {
  const { tabs, activeTabId, activeWorkspaceId } = useTabStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const currentEngine = useSettingsStore((state) => state.searchEngine);
  const engineConfig = SEARCH_ENGINES.find(e => e.value === currentEngine) || SEARCH_ENGINES[0];

  const [searchValue, setSearchValue] = useState('');
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [greeting, setGreeting] = useState('');

  const workspaceId = activeWorkspaceId || 'default';
  const storageKey = `morrow_shortcuts_${workspaceId}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setShortcuts(JSON.parse(saved));
    } else {
      setShortcuts(DEFAULT_FAVORITES);
      localStorage.setItem(storageKey, JSON.stringify(DEFAULT_FAVORITES));
    }
  }, [workspaceId]);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 6) setGreeting('İyi Geceler');
    else if (h < 12) setGreeting('Günaydın');
    else if (h < 18) setGreeting('İyi Günler');
    else setGreeting('İyi Akşamlar');
  }, []);

  const handleHomeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const text = searchValue.trim();
    if (!text) return;

    const urlPattern = /^(https?:\/\/)?localhost(:\d+)?(\/.*)?$|^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/[\w-./?%&=]*)?$/i;
    let target = text;
    
    if (target !== 'about:blank' && !target.startsWith('chrome://') && !target.startsWith('morrow://') && !target.startsWith('file://')) {
      if (urlPattern.test(target) && !target.includes(' ')) {
        target = target.startsWith('http') ? target : `https://${target}`;
      } else {
        target = `${engineConfig.url}${encodeURIComponent(text)}`;
      }
    }
    
    window.electronAPI?.nav.go(target);
    setSearchValue('');
  };

  const addShortcut = () => {
    if (!newSiteName.trim() || !newSiteUrl.trim()) return;
    let formattedUrl = newSiteUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }
    const updated = [...shortcuts, { name: newSiteName, url: formattedUrl, icon: '🌐', color: '#6366f1' }];
    setShortcuts(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setIsModalOpen(false);
    setNewSiteName('');
    setNewSiteUrl('');
  };

  const removeShortcut = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = shortcuts.filter((_, i) => i !== index);
    setShortcuts(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
    } catch {
      return '';
    }
  };

  // Sekme varsa alan boş bırakılır (WebContentsView üste bindirilir)
  if (activeTab && activeTab.url !== 'about:blank' && activeTab.url !== '') {
    return (
      <div
        id="webview-area"
        style={{
          flex: 1,
          background: 'var(--bg-primary)',
          position: 'relative',
        }}
      />
    );
  }

  const isIncognito = activeTab?.isIncognito ?? false;

  if (isIncognito) {
    return (
      <div id="webview-area" style={{ flex: 1, background: '#121214', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🕶️</div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#e4e6eb', marginBottom: '8px' }}>Gizli Tarama</h1>
          <p style={{ color: '#888', fontSize: '13px' }}>Bu sekmede yaptığınız aramalar geçmişe kaydedilmez.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      id="webview-area"
      style={{
        flex: 1,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(120, 40, 200, 0.25) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(60, 100, 255, 0.2) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(200, 50, 150, 0.15) 0%, transparent 50%), #0a0a12',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        overflowY: 'auto',
      }}
    >
      {/* Gradient blur orbs arka plan efekti */}
      <div style={{
        position: 'absolute', top: '-100px', left: '-150px', width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', top: '100px', right: '-100px', width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', bottom: '-50px', left: '30%', width: '500px', height: '400px',
        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ─── İçerik ─── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '48px 48px 32px', maxWidth: '1100px', width: '100%', margin: '0 auto' }}>

        {/* ─── MORROW Logo & Branding ─── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}
        >
          {/* Logo Mark */}
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <h1 style={{
              fontSize: '32px', fontWeight: 800, letterSpacing: '4px',
              background: 'linear-gradient(135deg, #e0e0ff 0%, #c4b5fd 50%, #f9a8d4 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              textTransform: 'uppercase', fontFamily: "'Inter', sans-serif",
            }}>
              Morrow
            </h1>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', marginTop: '-2px' }}>
              {greeting}
            </p>
          </div>
        </motion.div>

        {/* ─── Ana Grid Layout ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', marginBottom: '28px' }}>

          {/* ─── 1. Discover (Sol taraf) ─── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '20px',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px' }}>✨</span>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0ff' }}>Discover</h3>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
                Auto-playing short video clips
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {DISCOVER_ITEMS.map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.05, y: -4 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  style={{
                    borderRadius: '10px',
                    overflow: 'hidden',
                    aspectRatio: '3/4',
                    position: 'relative',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <img
                    src={item.img}
                    alt={item.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Play overlay */}
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    padding: '8px',
                    display: 'flex', alignItems: 'center', gap: '4px',
                  }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '8px', marginLeft: '1px' }}>▶</span>
                    </div>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{item.label}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ─── Sağ sütun: Favorites + Project Morrow ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ─── 2. Favorites ─── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '20px',
                flex: 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px' }}>⭐</span>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0ff' }}>Favorites</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {shortcuts.slice(0, 8).map((site, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.08, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.electronAPI?.nav.go(site.url)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      cursor: 'pointer', position: 'relative', padding: '6px 0',
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: site.color ? `${site.color}20` : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${site.color ? `${site.color}40` : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}>
                      {getFaviconUrl(site.url) ? (
                        <img
                          src={getFaviconUrl(site.url)}
                          alt=""
                          style={{ width: '22px', height: '22px', borderRadius: '4px' }}
                          onError={(e: any) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: '18px' }}>{site.icon || '🌐'}</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '10px', color: 'rgba(255,255,255,0.6)',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', maxWidth: '60px', textAlign: 'center',
                    }}>
                      {site.name}
                    </span>
                    {/* Silme X */}
                    <span
                      onClick={(e) => removeShortcut(index, e)}
                      style={{
                        position: 'absolute', top: '0', right: '-2px',
                        background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.6)',
                        fontSize: '8px', width: '14px', height: '14px',
                        borderRadius: '50%', display: 'none', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer',
                      }}
                      className="shortcut-delete"
                    >✕</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* ─── 3. Project Morrow ─── */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.1) 100%)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              whileHover={{ scale: 1.02, borderColor: 'rgba(139, 92, 246, 0.4)' }}
              onClick={() => setIsModalOpen(true)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '16px' }}>📌</span>
                </div>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#e0e0ff' }}>Project Morrow</h4>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                    Kısayol ekle & düzenle
                  </p>
                </div>
                <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)' }}>
                  <span style={{ fontSize: '18px' }}>+</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ─── Alt Arama Çubuğu ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <form onSubmit={handleHomeSearch} style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              type="text"
              placeholder="Düşüncelerini Ara..."
              style={{
                width: '100%',
                padding: '14px 20px 14px 48px',
                borderRadius: '16px',
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                outline: 'none',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                transition: 'border 0.2s, background 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.target.style.boxShadow = '0 0 20px rgba(139, 92, 246, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <span style={{
              position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)',
              opacity: 0.4, fontSize: '16px',
            }}>🔍</span>

            {/* Sparkle icon sağ tarafta */}
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)',
                fontSize: '16px', opacity: 0.4,
              }}
            >
              ✨
            </motion.div>
          </form>
        </motion.div>
      </div>

      {/* ─── Kısayol Ekleme Modal ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
            }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(20, 20, 30, 0.95)',
                backdropFilter: 'blur(20px)',
                padding: '28px',
                borderRadius: '16px',
                width: '340px',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', flexDirection: 'column', gap: '14px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
            >
              <h3 style={{ fontSize: '16px', color: '#e0e0ff', fontWeight: 600 }}>✨ Kısayol Ekle</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Site Adı</label>
                <input
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  type="text"
                  placeholder="Örn: YouTube"
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    padding: '10px 14px', borderRadius: '10px', color: 'white', outline: 'none',
                    fontSize: '13px', fontFamily: "'Inter', sans-serif",
                    transition: 'border 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>URL</label>
                <input
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  type="text"
                  placeholder="Örn: youtube.com"
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    padding: '10px 14px', borderRadius: '10px', color: 'white', outline: 'none',
                    fontSize: '13px', fontFamily: "'Inter', sans-serif",
                    transition: 'border 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer',
                    padding: '8px 16px', borderRadius: '10px', fontFamily: "'Inter', sans-serif",
                  }}
                >İptal</button>
                <button
                  onClick={addShortcut}
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    fontSize: '13px', cursor: 'pointer', padding: '8px 20px',
                    fontWeight: 600, fontFamily: "'Inter', sans-serif",
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                  }}
                >Ekle</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
