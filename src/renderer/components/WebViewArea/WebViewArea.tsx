/**
 * WebViewArea — Web içeriğinin gösterildiği ana alan
 * V1.4.2: Centered & responsive new tab page layout
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabStore } from '../../store/useTabStore';
import { useSettingsStore, SEARCH_ENGINES } from '../../store/useSettingsStore';

// Discover thumbnails
import thumb1 from '../../assets/discover/thumb1.png';
import thumb2 from '../../assets/discover/thumb2.png';
import thumb3 from '../../assets/discover/thumb3.png';
import thumb4 from '../../assets/discover/thumb4.png';

const DISCOVER_ITEMS = [
  { img: thumb1, label: 'Aurora', url: 'https://www.nasa.gov/multimedia/imagegallery/index.html' },
  { img: thumb2, label: 'Horizon', url: 'https://www.nationalgeographic.com/photography' },
  { img: thumb3, label: 'Flow', url: 'https://www.behance.net/galleries/interaction' },
  { img: thumb4, label: 'Mystic', url: 'https://www.artstation.com/channels/fantasy' },
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

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, inputId?: string, targetIndex?: number, type: 'input' | 'favorite' } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, inputId: 'name' | 'url') => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, inputId, type: 'input' });
  };

  const handleFavoriteContextMenu = (e: React.MouseEvent, targetIndex: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, targetIndex, type: 'favorite' });
  };

  const handleCopy = () => {
    if (contextMenu?.inputId === 'name') {
      navigator.clipboard.writeText(newSiteName);
    } else if (contextMenu?.inputId === 'url') {
      navigator.clipboard.writeText(newSiteUrl);
    }
    setContextMenu(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (contextMenu?.inputId === 'name') {
          setNewSiteName((prev) => prev + text);
        } else if (contextMenu?.inputId === 'url') {
          setNewSiteUrl((prev) => prev + text);
        }
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
    setContextMenu(null);
  };

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

  // Active web tab → show blank placeholder (WebContentsView overlaid by main process)
  if (activeTab && activeTab.url !== 'about:blank' && activeTab.url !== '') {
    return (
      <div
        id="webview-area"
        style={{ flex: 1, background: 'var(--bg-primary)', position: 'relative' }}
      />
    );
  }

  // Incognito tab
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

  // New Tab Page
  return (
    <div
      id="webview-area"
      style={{
        flex: 1,
        background: 'radial-gradient(ellipse at 20% 50%, rgba(120,40,200,0.25) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(60,100,255,0.2) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(200,50,150,0.15) 0%, transparent 50%), #0a0a12',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        overflowY: 'auto',
        minHeight: 0,
      }}
    >
      {/* Background orbs */}
      <div style={{ position: 'absolute', top: '-100px', left: '-150px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '100px', right: '-100px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-50px', left: '30%', width: '500px', height: '400px', background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Centered scroll container */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        width: '100%', padding: '40px 24px 32px', boxSizing: 'border-box', minHeight: 0,
      }}>
        <div style={{ width: '100%', maxWidth: '980px' }}>

          {/* Branding */}
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0, background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f97316 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '4px', background: 'linear-gradient(135deg, #e0e0ff 0%, #c4b5fd 50%, #f9a8d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", margin: 0 }}>Morrow</h1>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', marginTop: '2px', marginBottom: 0 }}>{greeting}</p>
            </div>
          </motion.div>

          {/* Main grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: '18px', marginBottom: '24px', width: '100%' }}>

            {/* Discover */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '18px', overflow: 'hidden', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px' }}>✨</span>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0ff', margin: 0 }}>Discover</h3>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>Auto-playing short video clips</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '8px' }}>
                {DISCOVER_ITEMS.map((item, i) => (
                  <motion.div key={i} whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95, opacity: 0.8 }}
                    onClick={() => { if (item.url) window.electronAPI?.nav.go(item.url); }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    style={{ borderRadius: '10px', overflow: 'hidden', aspectRatio: '3/4', position: 'relative', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                    <img src={item.img} alt={item.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '8px', marginLeft: '1px' }}>▶</span>
                      </div>
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>

              {/* Favorites */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
                style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '18px', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '14px' }}>⭐</span>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#e0e0ff', margin: 0 }}>Favorites</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '10px' }}>
                  {shortcuts.slice(0, 8).map((site: any, index: number) => (
                    <motion.div key={index} whileHover={{ scale: 1.08, y: -3 }} whileTap={{ scale: 0.95 }}
                      onClick={() => window.electronAPI?.nav.go(site.url)}
                      onContextMenu={(e) => handleFavoriteContextMenu(e, index)}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', position: 'relative', padding: '6px 2px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: site.color ? `${site.color}20` : 'rgba(255,255,255,0.06)', border: `1px solid ${site.color ? `${site.color}40` : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {getFaviconUrl(site.url) ? (
                          <img src={getFaviconUrl(site.url)} alt="" style={{ width: '22px', height: '22px', borderRadius: '4px' }} onError={(e: any) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <span style={{ fontSize: '18px' }}>{site.icon || '🌐'}</span>
                        )}
                      </div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', textAlign: 'center' }}>{site.name}</span>
                      <span onClick={(e) => removeShortcut(index, e)} style={{ position: 'absolute', top: '0', right: '0', background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.6)', fontSize: '8px', width: '14px', height: '14px', borderRadius: '50%', display: 'none', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} className="shortcut-delete">✕</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Project Morrow / Add shortcut */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(236,72,153,0.1) 100%)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(139,92,246,0.2)', padding: '18px', cursor: 'pointer', minWidth: 0 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => setIsModalOpen(true)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '16px' }}>📌</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#e0e0ff', margin: 0 }}>Project Morrow</h4>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', marginBottom: 0 }}>Kısayol ekle & düzenle</p>
                  </div>
                  <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.3)', fontSize: '20px', flexShrink: 0 }}>+</div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Search bar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <form onSubmit={handleHomeSearch} style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
              <input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                type="text"
                placeholder="Düşüncelerini Ara..."
                style={{ width: '100%', padding: '14px 20px 14px 48px', borderRadius: '16px', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none', fontSize: '14px', fontFamily: "'Inter', sans-serif", transition: 'border 0.2s, box-shadow 0.2s', boxSizing: 'border-box' }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.boxShadow = '0 0 20px rgba(139,92,246,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
              <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: '16px' }}>🔍</span>
              <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', opacity: 0.4 }}>✨</motion.div>
            </form>
          </motion.div>

        </div>
      </div>

      {/* Shortcut modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
            onClick={() => { setIsModalOpen(false); setContextMenu(null); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => { e.stopPropagation(); setContextMenu(null); }}
              style={{ background: 'rgba(20,20,30,0.95)', backdropFilter: 'blur(20px)', padding: '28px', borderRadius: '16px', width: '340px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
              <h3 style={{ fontSize: '16px', color: '#e0e0ff', fontWeight: 600, margin: 0 }}>✨ Kısayol Ekle</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Site Adı</label>
                <input value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} type="text" placeholder="Örn: YouTube"
                  onContextMenu={(e) => handleContextMenu(e, 'name')}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: '10px', color: 'white', outline: 'none', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(139,92,246,0.5)'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>URL</label>
                <input value={newSiteUrl} onChange={(e) => setNewSiteUrl(e.target.value)} type="text" placeholder="Örn: youtube.com"
                  onContextMenu={(e) => handleContextMenu(e, 'url')}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: '10px', color: 'white', outline: 'none', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}
                  onFocus={(e) => e.target.style.borderColor = 'rgba(139,92,246,0.5)'} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer', padding: '8px 16px', borderRadius: '10px', fontFamily: "'Inter', sans-serif" }}>İptal</button>
                <button onClick={addShortcut} style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', padding: '8px 20px', fontWeight: 600, fontFamily: "'Inter', sans-serif", boxShadow: '0 4px 12px rgba(139,92,246,0.3)' }}>Ekle</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div 
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 199 }} 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu(null); }} 
              onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'fixed',
                top: contextMenu.y,
                left: contextMenu.x,
                background: 'rgba(20,20,30,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                zIndex: 200,
                minWidth: '160px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {contextMenu.type === 'input' && (
                <>
                  <button onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'transparent', border: 'none', color: '#e0e0ff', cursor: 'pointer', borderRadius: '6px', textAlign: 'left', fontSize: '13px', fontFamily: "'Inter', sans-serif" }} onMouseEnter={(e) => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background='transparent'}>Kopyala</button>
                  <button onClick={handlePaste} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'transparent', border: 'none', color: '#e0e0ff', cursor: 'pointer', borderRadius: '6px', textAlign: 'left', fontSize: '13px', fontFamily: "'Inter', sans-serif" }} onMouseEnter={(e) => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background='transparent'}>Yapıştır</button>
                </>
              )}
              {contextMenu.type === 'favorite' && (
                <button 
                  onClick={(e) => {
                    if (contextMenu.targetIndex !== undefined) {
                      removeShortcut(contextMenu.targetIndex, e as any);
                    }
                    setContextMenu(null);
                  }} 
                  style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '6px', textAlign: 'left', fontSize: '13px', fontFamily: "'Inter', sans-serif" }} 
                  onMouseEnter={(e) => e.currentTarget.style.background='rgba(239,68,68,0.1)'} 
                  onMouseLeave={(e) => e.currentTarget.style.background='transparent'}
                >
                  Kaldır (Sil)
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
