/**
 * Omnibox — Birleşik adres çubuğu ve arama
 * URL girişi ve arama sorgularını tek input'ta birleştirir.
 */

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTabStore } from '../../store/useTabStore';
import { useSettingsStore, SEARCH_ENGINES } from '../../store/useSettingsStore';
import { Star } from 'lucide-react';

export default function Omnibox() {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { tabs, activeTabId } = useTabStore();

  // Aktif sekmenin URL'ini göster
  const activeTab = tabs.find((t) => t.id === activeTabId);

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
      const sugs = await window.electronAPI?.system?.getSuggestions(inputValue);
      if (sugs) setSuggestions(sugs);
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
          boxShadow: isFocused ? '0 0 0 3px var(--accent-glow)' : '0 0 0 0 transparent',
        }}
        transition={{ duration: 0.15 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '36px',
          borderRadius: '18px',
          border: '1px solid var(--border-subtle)',
          background: 'rgba(255,255,255,0.04)',
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
              ◐
            </motion.span>
          ) : isFocused ? '⌕' : '🔒'}
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
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ✕
          </motion.button>
        )}

        {/* Bar Butonları (Star & AI) */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Yer İmi (Yıldız) Butonu */}
          {activeTab?.url && activeTab.url !== 'about:blank' && activeTab.url !== 'morrow://newtab' && (
            <motion.button
              type="button"
              onClick={handleBookmarkToggle}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: 'none',
                border: 'none',
                color: isBookmarked ? 'var(--accent)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color var(--transition-fast)',
              }}
              title={isBookmarked ? 'Yer imini kaldır' : 'Yer imlerine ekle'}
            >
              <Star 
                size={16} 
                fill={isBookmarked ? 'var(--accent)' : 'none'} 
                color={isBookmarked ? 'var(--accent)' : 'var(--text-muted)'} 
              />
            </motion.button>
          )}

          {/* AI Modu Button - Bar içine yerleştirildi */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.95 }}
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '14px',
              padding: '3px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--accent)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>✨ AI</span>
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
              // Öneriyi parçala: "Asdasd - Şarkı" -> title: "Asdasd", label: "Şarkı"
              let primary = suggestion;
              let secondary = '';
              if (suggestion.includes(' - ')) {
                const parts = suggestion.split(' - ');
                primary = parts[0];
                secondary = parts[1];
              }

              // İkon Belirleme
              let IconComponent = "🔍"; // fallback generic Icon representation
              const secLower = secondary.toLowerCase();
              if (secLower.includes('şarkı') || secLower.includes('müzik') || secLower.includes('albüm') || secLower.includes('song')) {
                IconComponent = "🎵";
              } else if (secLower.includes('arama') || secLower.includes('search')) {
                IconComponent = "🔍";
              } else if (suggestion.startsWith('http') || suggestion.includes('.com')) {
                IconComponent = "🌐";
              }

              return (
                <motion.div
                  key={i}
                  onClick={() => {
                    setInputValue(suggestion);
                    handleGo(suggestion);
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '15px', display: 'flex' }}>
                      {IconComponent}
                    </span>
                    <span style={{ fontSize: '13.5px', fontWeight: 500 }}>{primary}</span>
                  </div>
                  {secondary && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {secondary}
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
