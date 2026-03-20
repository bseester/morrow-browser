/**
 * WebViewArea — Web içeriğinin gösterildiği ana alan
 *
 * Electron'da gerçek web içeriği WebContentsView ile main process
 * tarafından bu alanın üzerine yerleştirilir. Bu bileşen sadece
 * boş durum (yeni sekme) ekranını gösterir.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabStore } from '../../store/useTabStore';
import { useSettingsStore, SEARCH_ENGINES } from '../../store/useSettingsStore';

export default function WebViewArea() {
  const { tabs, activeTabId, activeWorkspaceId } = useTabStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const currentEngine = useSettingsStore((state) => state.searchEngine);
  const engineConfig = SEARCH_ENGINES.find(e => e.value === currentEngine) || SEARCH_ENGINES[0];

  const [searchValue, setSearchValue] = useState('');

  // Kısayollar listesi state'i
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');

  const workspaceId = activeWorkspaceId || 'default';
  const storageKey = `aura_shortcuts_${workspaceId}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setShortcuts(JSON.parse(saved));
    } else {
      const defaults = [
        { name: 'Google', url: 'https://www.google.com' },
        { name: 'YouTube', url: 'https://www.youtube.com' },
        { name: 'GitHub', url: 'https://github.com' },
        { name: 'Twitter', url: 'https://x.com' },
      ];
      setShortcuts(defaults);
      localStorage.setItem(storageKey, JSON.stringify(defaults));
    }
  }, [workspaceId]);

  const handleHomeSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const text = searchValue.trim();
    if (!text) return;

    const urlPattern = /^(https?:\/\/)?localhost(:\d+)?(\/.*)?$|^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;
    let target = text;
    
    if (target !== 'about:blank' && !target.startsWith('chrome://') && !target.startsWith('aura://') && !target.startsWith('file://')) {
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
    const updated = [...shortcuts, { name: newSiteName, url: formattedUrl }];
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

  return (
    <div
      id="webview-area"
      style={{
        flex: 1,
        background: isIncognito ? '#121214' : 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ width: '80px', height: '80px', margin: '0 auto 28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isIncognito ? (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} style={{ fontSize: '48px' }}>🕶️</motion.div>
          ) : (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'conic-gradient(from 0deg, var(--accent), #a855f7, #ec4899, var(--accent))',
                opacity: 0.4,
              }}
            />
          )}
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: isIncognito ? '#e4e6eb' : 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          {isIncognito ? 'Gizli Tarama' : 'Aura Browser'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
          {isIncognito ? 'Bu sekmede yaptığınız aramalar geçmişe kaydedilmez.' : 'Yukarıdaki adres çubuğuna bir URL yazın veya arama yapın'}
        </p>

        {/* Ana Ekran Arama Çubuğu */}
        {!isIncognito && (
          <form onSubmit={handleHomeSearch} style={{ maxWidth: '440px', margin: '0 auto 40px', position: 'relative' }}>
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              type="text"
              placeholder={`${engineConfig.name}'da arayın veya bir URL yazın`}
              style={{
                width: '100%',
                padding: '12px 16px 12px 42px',
                borderRadius: '24px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-subtle)',
                color: 'white',
                outline: 'none',
                fontSize: '13px',
                backdropFilter: 'blur(10px)',
                transition: 'border 0.2s, background 0.2s',
              }}
              className="home-search-input"
            />
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '14px' }}>🔍</span>
          </form>
        )}

        {/* Chrome stili Kısayollar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', maxWidth: '540px', margin: '0 auto' }}>
          <AnimatePresence>
            {shortcuts.map((site, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.05 }}
                style={{ position: 'relative', width: '82px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => window.electronAPI?.nav.go(site.url)}
              >
                {/* Silme Butonu */}
                <span
                  onClick={(e) => removeShortcut(index, e)}
                  style={{ position: 'absolute', top: '-4px', right: '12px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '10px', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}
                  title="Sil"
                >✕</span>
                
                {/* Daire İkon */}
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} className="shortcut-circle">
                  {getFaviconUrl(site.url) ? (
                    <img src={getFaviconUrl(site.url)} alt="" style={{ width: '24px', height: '24px', borderRadius: '4px' }} onError={(e: any) => e.target.style.display = 'none'} />
                  ) : (
                    <span style={{ fontSize: '18px' }}>🌐</span>
                  )}
                </div>
                
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70px' }}>
                  {site.name}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Kısayol Ekleme Butonu */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            style={{ width: '82px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            onClick={() => setIsModalOpen(true)}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: 'var(--text-secondary)' }}>
              +
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Kısayol ekle</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Kısayol Ekleme Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: 'var(--radius-md)', width: '300px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Kısayol ekle</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ad</label>
                <input value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} type="text" placeholder="Örn: YouTube" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '4px', color: 'white', outline: 'none', fontSize: '12px' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>URL</label>
                <input value={newSiteUrl} onChange={(e) => setNewSiteUrl(e.target.value)} type="text" placeholder="Örn: youtube.com" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', padding: '8px', borderRadius: '4px', color: 'white', outline: 'none', fontSize: '12px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', padding: '6px 12px' }}>İptal</button>
                <button onClick={addShortcut} style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', padding: '6px 16px' }}>Bitti</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
