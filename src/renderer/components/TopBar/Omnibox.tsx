/**
 * Omnibox — Birleşik adres çubuğu ve arama
 * URL girişi ve arama sorgularını tek input'ta birleştirir.
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTabStore } from '../../store/useTabStore';
import { useSettingsStore, SEARCH_ENGINES } from '../../store/useSettingsStore';
import { Star, MonitorPlay, Sparkles, Key, Languages } from 'lucide-react';

export default function Omnibox() {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  interface Suggestion { primary: string; secondary?: string; url?: string; icon?: string; }
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { tabs, activeTabId } = useTabStore();
  const [passwordPrompt, setPasswordPrompt] = useState<{ origin: string, username: string, password: string } | null>(null);
  const keyButtonRef = useRef<HTMLButtonElement>(null);
  const translateButtonRef = useRef<HTMLButtonElement>(null);

  // Aktif sekmenin URL'ini göster
  const activeTab = tabs.find((t) => t.id === activeTabId);

  useEffect(() => {
    // Yeni bir şifre yakalandığında Key ikonunu göster
    const cleanup = window.electronAPI?.system?.onPasswordPrompt?.((data) => {
      setPasswordPrompt(data);
    });
    return () => { cleanup?.(); };
  }, []);

  useEffect(() => {
    // Kullanıcı Kaydet/Hayır dediğinde Key ikonunu temizle
    const cleanup = window.electronAPI?.system?.onPasswordPromptResolved?.(() => {
      setPasswordPrompt(null);
    });
    return () => { cleanup?.(); };
  }, []);

  // Sekme değiştiğinde prompt'ı kapat
  useEffect(() => {
    setPasswordPrompt(null);
  }, [activeTab?.id]);

  useEffect(() => {
    if (!isFocused && activeTab) {
      setInputValue(activeTab.url === 'about:blank' ? '' : activeTab.url);
      setShowSuggestions(false);
    }
  }, [activeTab?.url, isFocused]);

  useEffect(() => {
    if (!isFocused || !inputValue.trim() || inputValue === activeTab?.url) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const [googleSugs, histSugs] = await Promise.all([
        window.electronAPI?.system?.getSuggestions(inputValue).catch(() => []),
        window.electronAPI?.history?.search(inputValue, 5).catch(() => [])
      ]);

      const newSugs: Suggestion[] = [];
      
      if (histSugs && histSugs.length > 0) {
        histSugs.forEach((h: any) => {
          newSugs.push({
            primary: h.title || h.url,
            secondary: h.url,
            url: h.url,
            icon: '🕒'
          });
        });
      }

      if (googleSugs) {
        googleSugs.forEach((s: string) => {
          let primary = s;
          let secondary = '';
          if (s.includes(' - ')) {
            const parts = s.split(' - ');
            primary = parts[0];
            secondary = parts[1];
          }
          let icon = '🔍';
          const secLower = secondary.toLowerCase();
          if (secLower.includes('şarkı') || secLower.includes('müzik') || secLower.includes('albüm') || secLower.includes('song')) {
            icon = '🎵';
          } else if (secLower.includes('arama') || secLower.includes('search')) {
            icon = '🔍';
          } else if (s.startsWith('http') || s.includes('.com')) {
            icon = '🌐';
          }
          if (!newSugs.find(n => n.primary === primary)) {
            newSugs.push({ primary, secondary, icon });
          }
        });
      }
      setSuggestions(newSugs);
    }, 200);
    return () => clearTimeout(timer);
  }, [inputValue, isFocused]);

  useEffect(() => {
    if (activeTab?.url && activeTab.url !== 'about:blank' && activeTab.url !== 'morrow://newtab') {
      window.electronAPI?.bookmarks?.get?.()?.then((data: any[]) => {
        const found = data?.find((b) => b.url === activeTab.url);
        if (found) {
          setIsBookmarked(true);
          setBookmarkId(found.id);
        } else {
          setIsBookmarked(false);
          setBookmarkId(null);
        }
      });
    } else {
      setIsBookmarked(false);
      setBookmarkId(null);
    }
  }, [activeTab?.url]);

  const handleGo = (text: string) => {
    if (!text.trim()) return;
    const urlPattern = /^(https?:\/\/)?localhost(:\d+)?(\/.*)?$|^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;
    let target = text.trim();
    if (target !== 'about:blank' && !target.startsWith('chrome://') && !target.startsWith('morrow://') && !target.startsWith('file://')) {
      if (urlPattern.test(target) && !target.includes(' ')) {
        target = target.startsWith('http') ? target : `https://${target}`;
      } else {
        const currentEngine = useSettingsStore.getState().searchEngine;
        const engineConfig = SEARCH_ENGINES.find(e => e.value === currentEngine) || SEARCH_ENGINES[0];
        target = `${engineConfig.url}${encodeURIComponent(target)}`;
      }
    }
    window.electronAPI?.nav.go(target);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGo(inputValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleGo(inputValue);
    }
  };

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!activeTab?.url || activeTab.url === 'about:blank') return;

    if (isBookmarked && bookmarkId !== null) {
      await window.electronAPI?.bookmarks?.remove?.(bookmarkId);
      setIsBookmarked(false);
      setBookmarkId(null);
    } else {
      await window.electronAPI?.bookmarks?.add?.(activeTab.url, activeTab.title || activeTab.url);
      const data = await window.electronAPI?.bookmarks?.get?.();
      const found = data?.find((b: any) => b.url === activeTab.url);
      if (found) {
        setIsBookmarked(true);
        setBookmarkId(found.id);
      }
    }
  };

  // Aktif sekme yükleniyor mu?
  const isLoading = activeTab?.isLoading ?? false;

  return (
    <form
      onSubmit={handleSubmit}
      className="no-drag"
      style={{
        flex: 1,
        position: 'relative',
      }}
    >
      <motion.div
        animate={{
          borderColor: isFocused ? 'var(--accent)' : 'var(--border-subtle)',
          boxShadow: isFocused ? '0 0 0 3px rgba(139, 92, 246, 0.2)' : '0 0 0 0 transparent',
        }}
        transition={{ duration: 0.15 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '36px',
          borderRadius: '18px',
          border: '1px solid var(--border-subtle)',
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(10px)',
          padding: '0 14px',
          transition: 'background var(--transition-fast)',
        }}
      >
        {/* Güvenlik/Arama ikonu */}
        <div style={{
          color: isFocused ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: '13px',
          flexShrink: 0,
          transition: 'color var(--transition-fast)',
        }}>
          {isLoading ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-block' }}
            >
              ⚪
            </motion.span>
          ) : isFocused ? '🔍' : '🕒'}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Ara veya URL gir..."
          spellCheck={false}
          autoComplete="off"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '-0.01em',
          }}
        />

        {/* Yükleme durumunu durdur butonu */}
        {isLoading && (
          <motion.button
            type="button"
            onClick={() => window.electronAPI?.nav.stop()}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ color: 'var(--danger)' }}
            whileTap={{ scale: 0.9 }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ✕
          </motion.button>
        )}

        {/* Şifre Kaydetme (Anahtar) Butonu */}
        {passwordPrompt && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <motion.button
              ref={keyButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!keyButtonRef.current) return;
                const rect = keyButtonRef.current.getBoundingClientRect();
                const x = window.screenX + rect.right - 320;
                const y = window.screenY + rect.bottom + 4;
                window.electronAPI?.system?.togglePasswordPrompt?.({
                  x,
                  y,
                  data: passwordPrompt
                });
              }}
              whileHover={{ scale: 1.15, color: 'var(--accent)' }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background var(--transition-fast)',
                marginRight: '4px',
              }}
              title="Şifreyi Kaydet"
            >
              <Key size={16} />
            </motion.button>
          </div>
        )}

        {/* Yer İmi (Yıldız) Butonu — Input'un içinde sağ tarafta */}
        {activeTab?.url && activeTab.url !== 'about:blank' && activeTab.url !== 'morrow://newtab' && (
          <motion.button
            type="button"
            onClick={handleBookmarkToggle}
            whileHover={{ scale: 1.2, color: isBookmarked ? 'var(--accent)' : '#fff' }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: 'transparent',
              border: 'none',
              color: isBookmarked ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              transition: 'color 0.2s ease',
              marginRight: '4px',
            }}
            title={isBookmarked ? 'Yer imini kaldır' : 'Yer imlerine ekle'}
          >
            <Star 
              size={17} 
              fill={isBookmarked ? 'var(--accent)' : 'none'} 
              strokeWidth={isBookmarked ? 2 : 2.5}
            />
          </motion.button>
        )}

        {/* Bar Butonları (AI, PiP ve diğerleri) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <motion.button
            type="button"
            ref={translateButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              if (!translateButtonRef.current) return;
              const rect = translateButtonRef.current.getBoundingClientRect();
              const x = window.screenX + rect.right - 320;
              const y = window.screenY + rect.bottom + 4;
              window.electronAPI?.tabs?.toggleTranslatePrompt?.({ x, y });
            }}
            whileHover={{ scale: 1.15, color: 'var(--accent)' }}
            whileTap={{ scale: 0.9 }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color var(--transition-fast)',
            }}
            title="Sayıfayı Çevir"
          >
            <Languages size={15} />
          </motion.button>

          {/* AI Sparkle Butonu */}
          <motion.button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              window.electronAPI?.sidebar?.togglePanel('ai');
            }}
            whileHover={{ scale: 1.15, color: 'var(--accent)' }}
            whileTap={{ scale: 0.9 }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color var(--transition-fast)',
            }}
            title="Morrow AI'yı Aç"
          >
            <Sparkles size={15} />
          </motion.button>

          {/* Picture-in-Picture (PiP) Butonu */}
          <motion.button
            type="button"
            onClick={() => window.electronAPI?.tabs.togglePip()}
            whileHover={{ scale: 1.15, color: 'var(--text-primary)' }}
            whileTap={{ scale: 0.9 }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color var(--transition-fast)',
            }}
            title="Resim İçinde Resim (PiP) Modu"
          >
            <MonitorPlay size={15} />
          </motion.button>
        </div>
      </motion.div>

      {/* ─── AutoComplete Arama Önerileri ─── */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="glass-strong"
          style={{
            position: 'absolute',
            top: '44px',
            left: 0,
            right: 0,
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 0 8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px var(--border-subtle)',
            zIndex: 9999,
          }}
        >
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {suggestions.map((suggestion, i) => {
              return (
                <motion.div
                  key={i}
                  onClick={() => {
                    const target = suggestion.url || suggestion.primary;
                    setInputValue(target);
                    handleGo(target);
                  }}
                  whileHover={{ background: 'rgba(255,255,255,0.04)' }}
                  style={{
                    padding: '10px 18px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    color: 'var(--text-primary)',
                    transition: 'background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '15px', display: 'flex' }}>
                      {suggestion.icon || "🔍"}
                    </span>
                    <span style={{ fontSize: '13.5px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{suggestion.primary}</span>
                  </div>
                  {suggestion.secondary && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                      {suggestion.secondary}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Sınır Çizgisi ve Altbilgi (Footer) */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '6px', paddingTop: '8px', paddingLeft: '16px' }}>
            <motion.div
              whileHover={{ color: 'var(--text-primary)' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '14px' }}>+</span>
              <span>Sekme ve daha fazlasını ekleyin</span>
            </motion.div>
          </div>
        </div>
      )}
    </form>
  );
}

// (PasswordSavePopup kaldırıldı - artık floating BrowserWindow kullanıyor)
