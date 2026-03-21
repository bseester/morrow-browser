/**
 * useTabStore — Sekme yönetimi için Zustand store
 *
 * Açık sekmeler, aktif sekme, yükleme durumları ve
 * navigasyon bilgilerini tutar.
 */

import { create } from 'zustand';

export interface Tab {
  id: number;
  title: string;
  url: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  favicon?: string;
  isIncognito?: boolean;
  workspaceId?: string;
  isPinned?: boolean;
  groupId?: string; // Hangi gruba ait olduğu
}

export interface TabGroup {
  id: string;      // group-123 vb.
  title: string;
  color: string;   // hex veya tema adı
  collapsed: boolean;
}

interface TabState {
  tabs: Tab[];
  groups: TabGroup[];  // Tüm açık gruplar
  activeTabId: number | null;
  activeWorkspaceId: string;
  setTabs: (tabs: Tab[], activeTabId: number | null, activeWorkspaceId?: string, groups?: TabGroup[]) => void;
  updateTabUrl: (tabId: number, url: string) => void;
  updateTabTitle: (tabId: number, title: string) => void;
  updateTabLoading: (tabId: number, isLoading: boolean) => void;
  reorderTabs: (activeId: number, overId: number) => void;
  // Yeni eklenen metodlar (arayüz için)
  groupTabs: (tabIds: number[], title?: string, color?: string) => void;
  addTabToGroup: (tabId: number, groupId: string) => void;
  removeFromGroup: (tabId: number) => void;
  toggleGroupCollapse: (groupId: string) => void;
}

export const useTabStore = create<TabState>((set) => ({
  tabs: [],
  groups: [],
  activeTabId: null,
  activeWorkspaceId: 'default',

  setTabs: (tabs, activeTabId, activeWorkspaceId, groups) =>
    set((state) => ({ 
      tabs, 
      activeTabId, 
      activeWorkspaceId: activeWorkspaceId || state.activeWorkspaceId,
      groups: groups || state.groups
    })),

  updateTabUrl: (tabId, url) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, url } : tab
      ),
    })),

  updateTabTitle: (tabId, title) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, title } : tab
      ),
    })),

  updateTabLoading: (tabId, isLoading) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, isLoading } : tab
      ),
    })),

  reorderTabs: (activeId, overId) =>
    set((state) => {
      const oldIndex = state.tabs.findIndex((t) => t.id === activeId);
      const newIndex = state.tabs.findIndex((t) => t.id === overId);
      if (oldIndex === -1 || newIndex === -1) return state;

      const newTabs = [...state.tabs];
      const [movedTab] = newTabs.splice(oldIndex, 1);
      newTabs.splice(newIndex, 0, movedTab);

      return { tabs: newTabs };
    }),

  groupTabs: (tabIds, title, color) => 
    set((state) => {
      window.electronAPI?.tabs?.group?.create(tabIds, title, color);
      return state;
    }),

  addTabToGroup: (tabId, groupId) =>
    set((state) => {
      window.electronAPI?.tabs?.group?.addTab(tabId, groupId);
      return state;
    }),

  removeFromGroup: (tabId) => 
    set((state) => {
       window.electronAPI?.tabs?.group?.removeTab(tabId);
       return state;
    }),

  toggleGroupCollapse: (groupId) => 
    set((state) => {
       window.electronAPI?.tabs?.group?.toggleCollapse(groupId);
       return state;
    }),
}));
