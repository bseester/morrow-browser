/**
 * ExtensionsPanel — Yüklü eklentileri listeleyen ve yeni eklenti yükleme paneli
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExtensionInfo {
  id: string;
  name: string;
  version: string;
  path: string;
}

export default function ExtensionsPanel() {
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [crxInput, setCrxInput] = useState('');
  const [installingCrx, setInstallingCrx] = useState(false);
  const [crxError, setCrxError] = useState('');

  const loadExtensions = async () => {
    const list = await window.electronAPI?.extensions?.list();
    if (list) setExtensions(list);
  };

  useEffect(() => {
    loadExtensions();
  }, []);

  const handleLoad = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI?.extensions?.load();
      if (result) {
        await loadExtensions();
      }
    } catch (err) {
      console.error('Eklenti yükleme hatası:', err);
    }
    setLoading(false);
  };

  const handleRemove = async (id: string) => {
    await window.electronAPI?.extensions?.remove(id);
    await loadExtensions();
  };

  const handleInstallCrx = async () => {
    if (!crxInput.trim()) return;
    
    setInstallingCrx(true);
    setCrxError('');
    
    try {
      // Regex accepts full URLs or exact 32-char IDs
      const match = crxInput.match(/(?:detail\/[^\/]+\/|)([a-z]{32})/);
      if (!match || !match[1]) {
        throw new Error("Geçerli bir Eklenti ID'si veya Chrome Web Mağazası linki bulunamadı.");
      }
      
      const extensionId = match[1];
      const result = await window.electronAPI?.extensions?.installCrx(extensionId);
      
      if (result) {
        setCrxInput('');
        await loadExtensions();
      } else {
        setCrxError("İndirme veya yükleme başarısız oldu. Bağlantıyı kontrol edin.");
      }
    } catch (err: any) {
      setCrxError(err.message || 'Bilinmeyen bir hata oluştu');
    } finally {
      setInstallingCrx(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Eklenti Yükle Butonu */}
      <motion.button
        onClick={handleLoad}
        disabled={loading}
        whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.12)' }}
        whileTap={{ scale: 0.98 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px dashed var(--border-active)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--accent)',
          cursor: loading ? 'wait' : 'pointer',
          width: '100%',
          textAlign: 'left',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <span style={{ fontSize: '18px' }}>{loading ? '⏳' : '📂'}</span>
        {loading ? 'Yükleniyor...' : 'Klasörden Eklenti Yükle (Unpacked)'}
      </motion.button>

      {/* Chrome Mağaza Linkinden Ekleme Alanı */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={crxInput}
            onChange={(e) => setCrxInput(e.target.value)}
            placeholder="Chrome Eklenti Linki (örn: https://chromeweb...)"
            disabled={installingCrx}
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border-muted)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              minWidth: 0
            }}
          />
          <motion.button
            onClick={handleInstallCrx}
            disabled={installingCrx || !crxInput.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              padding: '0 16px',
              background: installingCrx ? 'var(--bg-elevated)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: installingCrx || !crxInput.trim() ? 'not-allowed' : 'pointer',
              opacity: installingCrx || !crxInput.trim() ? 0.6 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            {installingCrx ? 'İniyor...' : '🔥 Kur'}
          </motion.button>
        </div>
        {crxError && (
          <div style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px' }}>
            {crxError}
          </div>
        )}
      </div>

      {/* Yüklü Eklentiler */}
      {extensions.length === 0 ? (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '12px',
          }}
        >
          <p style={{ fontSize: '28px', marginBottom: '8px' }}>🧩</p>
          <p>Henüz yüklü eklenti yok.</p>
          <p style={{ marginTop: '4px', fontSize: '11px' }}>
            Chrome Web Mağazası'ndan indirdiğiniz unpacked eklenti klasörünü yükleyebilirsiniz.
          </p>
        </div>
      ) : (
        <AnimatePresence>
          {extensions.map((ext) => (
            <motion.div
              key={ext.id}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '20px' }}>🧩</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ext.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  v{ext.version}
                </div>
              </div>
              <motion.button
                onClick={() => handleRemove(ext.id)}
                whileHover={{ color: 'var(--danger)', scale: 1.1 }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '4px',
                  flexShrink: 0,
                }}
                title="Eklentiyi Kaldır"
              >
                ✕
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Bilgi */}
      <div
        style={{
          marginTop: '8px',
          padding: '10px',
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '11px', lineHeight: '1.5' }}>
          💡 <strong>İpucu:</strong> Geliştiriciler için "Klasörden Yükle" butonunu kullanabilir veya Chrome Mağazası'ndan girdiğiniz bir eklentinin linkini yukarıya yapıştırıp tek tıkla kurabilirsiniz!
        </p>
      </div>
    </div>
  );
}
