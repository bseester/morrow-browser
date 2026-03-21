import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function DownloadsPanel() {
  const [downloads, setDownloads] = useState<any[]>([]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    // Önceki indirmeleri yükle
    api.downloads?.get?.()?.then((data: any[]) => {
      setDownloads(data || []);
    });

    // Anlık olayları dinle
    const unsubStart = api.downloads.onStart?.((data: any) => {
      setDownloads((prev) => [data, ...prev]);
    });

    const unsubProgress = api.downloads.onProgress?.((data: any) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === data.id ? { ...d, ...data } : d))
      );
    });

    const unsubComplete = api.downloads.onComplete?.((data: any) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === data.id ? { ...d, ...data } : d))
      );
    });

    return () => {
      unsubStart?.();
      unsubProgress?.();
      unsubComplete?.();
    };
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', overflowY: 'auto', padding: '0 4px' }}>
      <button 
        onClick={() => window.electronAPI?.downloads?.test?.()} 
        style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', marginBottom: '8px', fontSize: '11px', fontWeight: 500 }}
      >
        Test İndirmesi Başlat (README.md)
      </button>

      {downloads.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '20px', textAlign: 'center' }}>
          Henüz bir indirme yok. Dosyalarınızı indirdiğinizde burada görünecek.
        </p>
      ) : (
        downloads.map((item) => {
          const progress = item.totalBytes > 0 ? (item.receivedBytes / item.totalBytes) * 100 : 0;
          const isFinished = item.state === 'completed' || item.state === 'cancelled';

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                if (item.state === 'completed' && item.savePath) {
                  window.electronAPI?.downloads?.open(item.savePath);
                }
              }}
              whileHover={item.state === 'completed' ? { background: 'rgba(255,255,255,0.07)', scale: 1.01 } : {}}
              style={{
                padding: '10px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                cursor: item.state === 'completed' ? 'pointer' : 'default',
                transition: 'background 0.2s, transform 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={item.filename}>
                  {item.filename || 'Dosya'}
                </span>
                <span style={{ fontSize: '11px', color: item.state === 'completed' ? 'var(--success)' : 'var(--text-secondary)' }}>
                  {item.state === 'progressing' ? `${Math.round(progress)}%` : item.state}
                </span>
              </div>

              {item.state === 'progressing' && (
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s ease' }} />
                </div>
              )}

              {/* Kontrol Butonları */}
              {!isFinished && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  {item.state === 'progressing' ? (
                    <button
                      onClick={() => window.electronAPI?.downloads?.action(item.id, 'pause')}
                      style={{ flex: 1, padding: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      ⏸ Duraklat
                    </button>
                  ) : (
                    <button
                      onClick={() => window.electronAPI?.downloads?.action(item.id, 'resume')}
                      style={{ flex: 1, padding: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      ▶️ Devam Et
                    </button>
                  )}
                  <button
                    onClick={() => window.electronAPI?.downloads?.action(item.id, 'cancel')}
                    style={{ flex: 1, padding: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--danger)', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    ✕ İptal
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>{item.state === 'progressing' ? `${formatBytes(item.receivedBytes)} / ${formatBytes(item.totalBytes)}` : formatBytes(item.totalBytes)}</span>
                <span>{new Date(item.startedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
