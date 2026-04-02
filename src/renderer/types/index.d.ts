/**
 * Global tip tanımları — Renderer process için
 */

import type { ElectronAPI as OriginalElectronAPI } from '@main/preload';

declare global {
  interface Window {
    electronAPI: OriginalElectronAPI & {
      tabs: OriginalElectronAPI['tabs'] & {
        reorder: (activeId: number, overId: number) => Promise<void>;
        showContextMenu: (tabId: number) => Promise<void>;
        closeAll: () => Promise<void>;
        panic: () => Promise<void>;
        onUpdate: (callback: (data: any) => void) => () => void;
        group: {
          create: (tabIds: number[], title?: string, color?: string) => Promise<void>;
          addTab: (tabId: number, groupId: string) => Promise<void>;
          removeTab: (tabId: number) => Promise<void>;
          toggleCollapse: (groupId: string) => Promise<void>;
        };
        translate: () => Promise<void>;
        toggleTranslatePrompt: (bounds: { x: number, y: number }) => Promise<void>;
        closeTranslatePrompt: () => Promise<void>;
      };
      system: OriginalElectronAPI['system'] & {
        killProcess: (pid: number) => Promise<boolean>;
        setRouteState: (route: string) => Promise<void>;
      };
      history: OriginalElectronAPI['history'] & {
        search: (query: string, limit?: number) => Promise<any[]>;
      };
    };
  }
}

export {};

declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string;
  export default value;
}
