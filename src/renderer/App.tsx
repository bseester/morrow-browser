/**
 * App — Ana uygulama bileşeni
 * TopBar + Sidebar + WebViewArea yerleşimini oluşturur
 * ve IPC olaylarını dinlemeye başlar.
 * Routes: "/" (tarayıcı) ve "/settings" (ayarlar sayfası)
 */

import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import TopBar from './components/TopBar/TopBar';
import Sidebar from './components/Sidebar/Sidebar';
import WebViewArea from './components/WebViewArea/WebViewArea';
import FindBar from './components/FindBar/FindBar';
import SettingsPage from './components/Settings/SettingsPage';
import HistoryPage from './components/Pages/HistoryPage';
import DownloadsPage from './components/Pages/DownloadsPage';
import PerformanceOverlay from './components/PerformanceOverlay';
import ChromeMenuOverlay from './components/TopBar/ChromeMenuOverlay';
import PasswordPromptOverlay from './components/TopBar/PasswordPromptOverlay';
import TranslatePromptOverlay from './components/TopBar/TranslatePromptOverlay';
import { useTabStore } from './store/useTabStore';
import { useIPC } from './hooks/useIPC';
import { useKeyboard } from './hooks/useKeyboard';
import { useTheme } from './hooks/useTheme';

function App() {
  const [findVisible, setFindVisible] = useState(false);
  const location = useLocation();
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const isFullscreen = activeTab?.isFullscreen ?? false;

  useEffect(() => {
    window.electronAPI?.system?.setRouteState(location.pathname);
  }, [location.pathname]);

  // Temayı DOM'a senkronize et
  useTheme();

  // IPC olaylarını dinle ve store'a yansıt
  useIPC();

  // Klavye kısayolları (Ctrl+F)
  useKeyboard({
    onFind: () => setFindVisible(true),
    onEscape: () => setFindVisible(false),
  });

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--app-bg, radial-gradient(ellipse at 20% 50%, rgba(120, 40, 200, 0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(60, 100, 255, 0.12) 0%, transparent 50%), radial-gradient(ellipse at 50% 90%, rgba(200, 50, 150, 0.1) 0%, transparent 50%), var(--bg-primary))',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <FindBar isVisible={findVisible} onClose={() => setFindVisible(false)} />

            {/* Üst çubuk: sekmeler + omnibox + navigasyon */}
            {!isFullscreen && <TopBar />}

            {/* Gövde: sidebar + web içerik */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
              {!isFullscreen && <Sidebar />}
              <WebViewArea />
            </div>
          </div>
        }
      />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/downloads" element={<DownloadsPage />} />
      <Route path="/chromemenu-overlay" element={<ChromeMenuOverlay />} />
      <Route path="/password-prompt-overlay" element={<PasswordPromptOverlay />} />
      <Route path="/translate-prompt-overlay" element={<TranslatePromptOverlay />} />
    </Routes>
  );
}

export default App;
