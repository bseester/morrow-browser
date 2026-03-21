/**
 * TabStrip — Sekme çubuğu (sürüklenebilir bölgenin içinde)
 * Açık sekmeleri listeler + yeni sekme butonu
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTabStore } from '../../store/useTabStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import Tab from './Tab';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

export default function TabStrip() {
  const { tabs, activeTabId, reorderTabs, groupTabs } = useTabStore();
  const { tabGroupingEnabled } = useSettingsStore();

  const handleCreate = () => {
    window.electronAPI?.tabs.create('about:blank');
  };

  const handleCloseAll = () => {
    window.electronAPI?.tabs.closeAll();
  };

  const handleClose = (e: React.MouseEvent, tabId: number) => {
    e.stopPropagation();
    window.electronAPI?.tabs.close(tabId);
  };

  const handleSelect = (tabId: number) => {
    window.electronAPI?.tabs.switchTo(tabId);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );



  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as number;

    if (over && activeId !== (over.id as number)) {
      const overId = over.id as number;
      reorderTabs(activeId, overId);
      window.electronAPI?.tabs.reorder(activeId, overId);
    }
  };

  return (
    <div
      className="tab-strip-scroll"
      style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          flex: 1,
          minWidth: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          padding: '0 4px',
        }}
      >
      <style>{`
        .tab-strip-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
            {tabs.map((tab, index) => {
              const hasSeparator = index < tabs.length - 1 && tab.groupId !== tabs[index + 1]?.groupId;
              return (
                <Tab
                  key={tab.id}
                  tab={tab}
                  isActive={tab.id === activeTabId}
                  hasSeparator={hasSeparator}
                  onSelect={() => handleSelect(tab.id)}
                  onClose={(e) => handleClose(e, tab.id)}
                />
              );
            })}
        </SortableContext>
      </DndContext>

      {/* Yeni Sekme Butonu */}
      <motion.button
        onClick={handleCreate}
        whileHover={{ scale: 1.1, background: 'rgba(255,255,255,0.08)' }}
        whileTap={{ scale: 0.9 }}
        className="no-drag"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          background: 'transparent',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          flexShrink: 0,
          padding: 0,
          marginLeft: '4px',
        }}
      >
        +
      </motion.button>

      {/* Tüm Sekmeleri Kapat */}
      <motion.button
        onClick={handleCloseAll}
        whileHover={{ scale: 1.1, background: 'rgba(255,100,100,0.1)' }}
        whileTap={{ scale: 0.9 }}
        className="no-drag"
        title="Tüm Sekmeleri Kapat"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          background: 'transparent',
          color: '#ff4d4f',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          flexShrink: 0,
          padding: 0,
          marginLeft: '2px',
        }}
      >
        ✕
      </motion.button>
    </div>
  );
}
