/**
 * Tab — Tek sekme bileşeni
 * Aktif/pasif durumu, yükleme animasyonu, kapatma butonu
 */

import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Tab as TabType } from '../../store/useTabStore';

interface TabProps {
  tab: TabType;
  isActive: boolean;
  hasSeparator?: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
}

export default function Tab({ tab, isActive, hasSeparator, onSelect, onClose }: TabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition: dndTransition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: dndTransition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.9 : 1,
  };

  const getFaviconUrl = (url: string) => {
    try {
      if (!url || url === 'about:blank') return null;
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const faviconUrl = getFaviconUrl(tab.url);

  return (
    <motion.div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      layout={!isDragging}
      initial={{ opacity: 0, scale: 0.85, width: 0 }}
      animate={{ opacity: isDragging ? 0.9 : 1, scale: isDragging ? 1.05 : 1, width: 'auto' }}
      exit={{ opacity: 0, scale: 0.85, width: 0 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      onPointerDown={(e) => {
        // Orta tuş ile kapatma desteği
        if (e.button === 1) onClose(e as any);
        else onSelect();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        window.electronAPI?.tabs.showContextMenu(tab.id, !!tab.isPinned);
      }}
      className="no-drag no-select"
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: '34px',
        padding: '0 12px',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        minWidth: tab.isPinned ? '36px' : tab.groupId ? '60px' : '100px',
        maxWidth: tab.isPinned ? '36px' : tab.groupId ? '90px' : '200px',
        flexShrink: 0,
        marginRight: hasSeparator ? '12px' : '0px',
        fontSize: '12px',
        fontWeight: isActive ? 500 : 400,
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: isActive ? '1px solid var(--border-active)' : '1px solid transparent',
        boxShadow: 'none',
        transition: 'background var(--transition-fast), border var(--transition-fast), box-shadow var(--transition-fast)',
        position: 'relative',
        overflow: 'hidden',
        WebkitAppRegion: 'no-drag',
      } as any}
      whileHover={{
        background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
      }}
    >
      {/* Yükleme çubuğu */}
      {tab.isLoading && (
        <motion.div
          initial={{ left: '-30%' }}
          animate={{ left: '100%' }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            top: 0,
            width: '30%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
            borderRadius: '1px',
          }}
        />
      )}

      {/* Favicon veya varsayılan ikon */}
      <div style={{
        width: '16px',
        height: '16px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {tab.isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            style={{ width: '10px', height: '10px', border: '1.5px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%' }}
          />
        ) : faviconUrl ? (
          <img 
            src={faviconUrl} 
            style={{ width: '16px', height: '16px', borderRadius: '2px' }} 
            alt=""
          />
        ) : (
          <span style={{ fontSize: '10px', opacity: 0.6 }}>●</span>
        )}
      </div>

      {/* Başlık */}
      {!tab.isPinned && (
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {tab.title || 'Yeni Sekme'}
        </span>
      )}

      {/* Kapat butonu */}
      {!tab.isPinned && (
        <motion.button
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()} // Drag'ı engelle
          whileHover={{ scale: 1.15, background: 'rgba(255,255,255,0.12)' }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            flexShrink: 0,
            padding: 0,
            transition: 'color var(--transition-fast)',
          }}
        >
          ✕
        </motion.button>
      )}
    </motion.div>
  );
}
