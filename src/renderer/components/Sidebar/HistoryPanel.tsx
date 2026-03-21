/**
 * HistoryPanel — Tarayıcı geçmişini listeleyen yan panel
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function HistoryPanel() {
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'today' | 'yesterday' | 'week'>('all');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    // IPC üzerinden geçmişi yükle
    window.electronAPI?.history?.get?.()
      ?.then((data: any[]) => {
        setHistory(data || []);
      })
      ?.catch((err: any) => {
        setHistory([{ id: -1, title: 'Yükleme Hatası', url: err.message || 'Bilinmeyen hata', last_visited_at: new Date().getTime() }]);
      });
  }, []);

  const handleOpen = (url: string) => {
    window.electronAPI?.nav.go(url);
  };

  const clearHistory = () => {
    window.electronAPI?.history?.clear?.();
    setHistory([]);
  };

  const filteredHistory = history.filter(item => {
    const matchQuery = 
      (item.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       item.url?.toLowerCase().includes(searchQuery.toLowerCase()));

    const itemDate = new Date(item.last_visited_at);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    
    let matchDate = true;
    if (selectedDate) {
      // Input date is YYYY-MM-DD
      const itemDateStr = itemDate.toLocaleDateString('en-CA'); 
      matchDate = itemDateStr === selectedDate;
    } else if (quickFilter === 'today') {
      matchDate = itemDate.toDateString() === today.toDateString();
    } else if (quickFilter === 'yesterday') {
      matchDate = itemDate.toDateString() === yesterday.toDateString();
    } else if (quickFilter === 'week') {
      const weekAgo = new Date(); 
      weekAgo.setDate(today.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      matchDate = itemDate >= weekAgo;
    }

    return matchQuery && matchDate;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ─── Sabit Üst Bölüm: Filtreler ─── */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 4px 8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={clearHistory}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--danger)',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '11px',
              whiteSpace: 'nowrap'
            }}
          >
            🧹 Geçmişi Temizle
          </button>
        </div>

        <input 
          type="text" 
          placeholder="Geçmişte ara..." 
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

      {/* ─── Kaydırılabilir Alt Bölüm: Geçmiş Listesi ─── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 4px 4px' }}>
        {filteredHistory.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            {history.length === 0 ? 'Geçmiş kaydı yok.' : 'Eşleşen sonuç bulunamadı.'}
          </div>
        ) : (
          filteredHistory.map((item) => (
            <motion.div
              key={item.id}
              onClick={() => handleOpen(item.url)}
              whileHover={{ background: 'rgba(255,255,255,0.08)', x: 4 }}
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                transition: 'all 0.2s'
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.title || item.url}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: 0.8 }}>
                {item.url}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--accent)', marginTop: '2px', opacity: 0.7 }}>
                {new Date(item.last_visited_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
              </span>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
