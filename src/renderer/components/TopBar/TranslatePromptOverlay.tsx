import { useState } from 'react';
import { Languages, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TranslatePromptOverlay() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [alwaysTranslate, setAlwaysTranslate] = useState(false);

  const handleTranslate = async () => {
    setIsTranslating(true);
    // Call the translation without awaiting if it hangs
    window.electronAPI?.tabs?.translate?.();
    
    // Auto close after 1 second
    setTimeout(() => {
      window.electronAPI?.tabs?.closeTranslatePrompt?.();
    }, 1000);
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0',
        padding: '0',
        overflow: 'hidden',
      }}
    >
      <style>
        {`
          html, body, #root {
            background: transparent !important;
            background-color: transparent !important;
          }
        `}
      </style>
      
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -5 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            width: '320px',
            background: 'rgba(15, 13, 25, 0.97)',
            backdropFilter: 'blur(20px) saturate(160%)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(139, 92, 246, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Languages size={18} color="#8b5cf6" />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>Sayfayı Çevir</h3>
            </div>
            <motion.button
              whileHover={{ background: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.9 }}
              onClick={() => window.electronAPI?.tabs?.closeTranslatePrompt()}
              style={{ 
                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', 
                cursor: 'pointer', padding: '4px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' 
              }}
            >
              <X size={16} />
            </motion.button>
          </div>

          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
            Bu web sayfasını Morrow Çeviri altyapısını kullanarak Türkçe diline çevirmek ister misiniz?
          </div>

          {/* Settings Section */}
          <div 
            onClick={() => setAlwaysTranslate(!alwaysTranslate)}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '10px', 
              padding: '10px 12px', background: 'rgba(255,255,255,0.03)', 
              borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)',
              transition: 'background 0.2s'
            }}
          >
            <div style={{ 
              width: '18px', height: '18px', borderRadius: '4px', 
              border: `1.5px solid ${alwaysTranslate ? '#8b5cf6' : 'rgba(255,255,255,0.2)'}`,
              background: alwaysTranslate ? '#8b5cf6' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}>
              {alwaysTranslate && <Check size={12} color="white" />}
            </div>
            <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: 500 }}>Bu dili her zaman çevir</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <motion.button
              disabled={isTranslating}
              whileHover={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
              whileTap={{ scale: 0.97 }}
              onClick={handleTranslate}
              style={{ 
                flex: 1, padding: '10px 0', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', 
                border: 'none', borderRadius: '10px', color: '#ffffff', fontSize: '13px', 
                cursor: isTranslating ? 'default' : 'pointer', fontWeight: 600, 
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                opacity: isTranslating ? 0.8 : 1
              }}
            >
              {isTranslating ? 'Çevriliyor...' : 'Çevir'}
            </motion.button>
            <motion.button
              whileHover={{ background: 'rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.97 }}
              onClick={() => window.electronAPI?.tabs?.closeTranslatePrompt()}
              style={{ 
                flex: 0.6, padding: '10px 0', background: 'rgba(255,255,255,0.04)', 
                border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '10px', 
                color: '#ffffff', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              İptal
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
