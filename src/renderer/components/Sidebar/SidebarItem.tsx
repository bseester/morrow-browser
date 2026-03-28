/**
 * SidebarItem — Kenar çubuğu tek öğe bileşeni (Premium Glassmorphism)
 */

import { motion } from 'framer-motion';

interface SidebarItemProps {
  icon: string;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  badge?: number;
}

export default function SidebarItem({ icon, label, isActive, onClick, badge }: SidebarItemProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ background: 'rgba(139, 92, 246, 0.1)' }}
      whileTap={{ scale: 0.9 }}
      title={label}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
        color: isActive ? '#a78bfa' : 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        padding: 0,
        position: 'relative',
        transition: 'all var(--transition-fast)',
        boxShadow: isActive ? '0 0 12px rgba(139, 92, 246, 0.15)' : 'none',
      }}
    >
      {/* Aktif çizgi göstergesi */}
      {isActive && (
        <motion.div
          layoutId="sidebar-indicator"
          style={{
            position: 'absolute',
            left: '-2px',
            width: '3px',
            height: '20px',
            borderRadius: '2px',
            background: 'linear-gradient(180deg, #8b5cf6, #ec4899)',
            boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      )}

      <span>{icon}</span>

      {/* Bildirim rozeti */}
      {badge !== undefined && badge > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444, #f97316)',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
          }}
        >
          {badge > 99 ? '99+' : badge}
        </div>
      )}
    </motion.button>
  );
}
