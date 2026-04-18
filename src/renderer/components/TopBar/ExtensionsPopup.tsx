/**
 * ExtensionsPopup — Puzzle ikonuna tıklayınca eklenti listesini
 * BrowserWindow olarak açar (webview katmanının üzerinde çıkar).
 */

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Puzzle } from 'lucide-react';

export default function ExtensionsPopup() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = async () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    await window.electronAPI?.extensions?.openListPopup({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  return (
    <motion.button
      ref={buttonRef}
      onClick={handleToggle}
      whileHover={{ background: 'rgba(255,255,255,0.08)' }}
      whileTap={{ scale: 0.93 }}
      title="Eklentiler"
      style={{
        width: '30px',
        height: '30px',
        borderRadius: '8px',
        border: 'none',
        background: 'transparent',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Puzzle size={16} />
    </motion.button>
  );
}
