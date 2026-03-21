import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function DownloadsPanel() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
  const [selectedDate, setSelectedDate] = useState('');

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
      if (unsubStart) unsubStart();
      if (unsubProgress) unsubProgress();
      if (unsubComplete) unsubComplete();
    };
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const filteredDownloads = downloads.filter(item => {
    const matchQuery = item.filename?.toLowerCase().includes(searchQuery.toLowerCase());
    const itemDate = new Date(item.startedAt);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    
    let matchDate = true;
    if (selectedDate) {
      matchDate = itemDate.toLocaleDateString('en-CA') === selectedDate;
    } else if (quickFilter === 'today') {
      matchDate = itemDate.toDateString() === today.toDateString();
    } else if (quickFilter === 'yesterday') {
      matchDate = itemDate.toDateString() === yesterday.toDateString();
    } else if (quickFilter === 'week') {
      const weekAgo = new Date(); weekAgo.setDate(today.getDate() - 7);
      matchDate = itemDate >= weekAgo;
    }
    return matchQuery && matchDate;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* ─── Sabit Üst Bölüm: Filtreler ─── */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 4px 8px' }}>
        <button 
          onClick={() => window.electronAPI?.downloads?.test?.()} 
          style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px', fontWeight: 500 }}
        >
          Test İndirmesi Başlat (README.md)
        </button>

        <input 
          type="text" 
          placeholder="İndirmelerde ara..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '12px', width: '100%', outline: 'none', boxSizing: 'border-box' }}
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              if (e.target.value) setQuickFilter('all');
            }}
            style={{ flex: 1, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '11px', outline: 'none', cursor: 'pointer' }}
          />
          {selectedDate && (
            <button onClick={() => setSelectedDate('')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>✕</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          {(['all', 'today', 'yesterday', 'week'] as const).map((filter) => (
            <button 
              key={filter} 
              onClick={() => setQuickFilter(filter)}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                borderRadius: '20px',
                border: '1px solid var(--border-subtle)',
                background: quickFilter === filter ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                color: quickFilter === filter ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {filter === 'all' && 'Tümü'}
              {filter === 'today' && 'Bugün'}
              {filter === 'yesterday' && 'Dün'}
              {filter === 'week' && 'Bu Hafta'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Kaydırılabilir Alt Bölüm: Listesi ─── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 4px 4px' }}>
      {filteredDownloads.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '20px', textAlign: 'center' }}>
          {downloads.length === 0 ? 'Henüz bir indirme yok.' : 'Eşleşen dosya bulunamadı.'}
        </p>
      ) : (
        filteredDownloads.map((item) => {
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
                      onClick={(e) => { e.stopPropagation(); window.electronAPI?.downloads?.action(item.id, 'pause'); }}
                      style={{ flex: 1, padding: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      ⏸ Duraklat
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); window.electronAPI?.downloads?.action(item.id, 'resume'); }}
                      style={{ flex: 1, padding: '4px', fontSize: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      ▶️ Devam Et
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); window.electronAPI?.downloads?.action(item.id, 'cancel'); }}
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
      </div>{/* scrollable list */}
    </div>
  );
}
