/* src/components/MainApp.jsx
   Main application entry - routes between all dashboards
   Multi-platform: Linux, Windows, macOS, iOS, Electron, desktop, mobile, tablet
   Created: 2026-10-29
*/
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { detectBrowserLocale, createI18n } from '../i18n/index.js';

const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard.jsx'));
const SecurityDashboardV2 = lazy(() => import('./SecurityDashboardV2.jsx'));
const GameDevDashboard = lazy(() => import('./GameDevDashboard.jsx'));
const AuthSystem = lazy(() => import('./AuthSystem.jsx'));
const PaymentSystem = lazy(() => import('./PaymentSystem.jsx'));
const RoleDashboards = lazy(() => import('./RoleDashboards.jsx'));

const ROUTES = {
  auth: { label: 'Sign In', icon: '🔐', public: true },
  dashboard: { label: 'Dashboard', icon: '🏠', minRole: 'user' },
  analytics: { label: 'Analytics', icon: '📊', minRole: 'user' },
  security: { label: 'Security', icon: '🛡️', minRole: 'dev' },
  gamedev: { label: 'Game Dev', icon: '🎮', minRole: 'dev' },
  payment: { label: 'Billing', icon: '💳', minRole: 'user' }
};

const ROLE_RANK = { user: 0, moderator: 1, dev: 2, admin: 3 };

function canAccess(user, minRole) {
  if (!minRole) return true;
  if (!user) return false;
  return (ROLE_RANK[user.role] || 0) >= (ROLE_RANK[minRole] || 0);
}

// Detect platform for responsive layout
function detectPlatform() {
  const ua = navigator.userAgent;
  if (/Electron/i.test(ua)) return 'electron';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Mobi/i.test(ua)) return 'mobile';
  return 'web';
}

function detectOS() {
  const p = navigator.platform || '';
  if (/Win/i.test(p)) return 'windows';
  if (/Mac/i.test(p)) return 'macos';
  if (/Linux/i.test(p)) return 'linux';
  return 'unknown';
}

const LoadingSpinner = () => (
  <div style={{
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }}>
    <div style={{ textAlign: 'center', color: '#a78bfa' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🌌</div>
      <div style={{ fontSize: 14 }}>Loading...</div>
    </div>
  </div>
);

const MainApp = () => {
  const [user, setUser] = useState(null);
  const [currentRoute, setCurrentRoute] = useState('auth');
  const [locale, setLocale] = useState(detectBrowserLocale());
  const [i18n] = useState(() => createI18n(locale));
  const [platform] = useState(detectPlatform());
  const [os] = useState(detectOS());
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    // Restore session
    try {
      const saved = sessionStorage.getItem('nexus:user');
      if (saved) {
        const u = JSON.parse(saved);
        setUser(u);
        setCurrentRoute('dashboard');
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth > 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAuthSuccess = (u) => {
    setUser(u);
    try { sessionStorage.setItem('nexus:user', JSON.stringify(u)); } catch { /* ignore */ }
    setCurrentRoute('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    try { sessionStorage.removeItem('nexus:user'); } catch { /* ignore */ }
    setCurrentRoute('auth');
  };

  const navTo = (route) => {
    if (!ROUTES[route].public && !canAccess(user, ROUTES[route].minRole)) return;
    setCurrentRoute(route);
  };

  const isMobile = platform === 'ios' || platform === 'android' || platform === 'mobile' || window.innerWidth < 768;

  if (currentRoute === 'auth' || !user) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AuthSystem onAuthSuccess={handleAuthSuccess} />
      </Suspense>
    );
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      direction: i18n.dir
    }}>
      {/* Sidebar navigation */}
      {(sidebarOpen || !isMobile) && (
        <div style={{
          width: isMobile ? '100vw' : 220,
          background: 'rgba(0,0,0,0.4)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          position: isMobile ? 'fixed' : 'relative',
          zIndex: isMobile ? 100 : 'auto',
          height: '100vh',
          overflowY: 'auto',
          flexShrink: 0
        }}>
          <div style={{ padding: '4px 8px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>🌌 Nexus AI Pro</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                {platform} · {os} · v2.0
              </div>
            </div>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            )}
          </div>

          {/* User info */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{ fontSize: 24 }}>{user.username?.match(/\p{Emoji}/u)?.[0] || '👤'}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.username}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'capitalize' }}>
                {user.role || 'user'}
              </div>
            </div>
          </div>

          {/* Nav items */}
          {Object.entries(ROUTES).filter(([key]) => key !== 'auth').map(([key, r]) => {
            const accessible = canAccess(user, r.minRole);
            const active = currentRoute === key;
            return (
              <button key={key} onClick={() => { navTo(key); if (isMobile) setSidebarOpen(false); }} disabled={!accessible} style={{
                background: active ? 'rgba(167,139,250,0.15)' : 'none',
                border: `1px solid ${active ? 'rgba(167,139,250,0.3)' : 'transparent'}`,
                borderRadius: 8,
                padding: '9px 12px',
                color: active ? '#a78bfa' : accessible ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                cursor: accessible ? 'pointer' : 'not-allowed',
                fontSize: 13,
                fontWeight: active ? 700 : 400,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>{r.icon}</span>
                <span>{r.label}</span>
                {!accessible && <span style={{ fontSize: 9, marginLeft: 'auto', color: 'rgba(255,255,255,0.2)' }}>🔒</span>}
              </button>
            );
          })}

          {/* Locale selector */}
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <select
              value={locale}
              onChange={e => setLocale(e.target.value)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8, padding: '6px 10px',
                color: 'rgba(255,255,255,0.5)', fontSize: 11
              }}
            >
              {Object.entries({ 'en-US': '🇺🇸 English', 'es-ES': '🇪🇸 Español', 'fr-FR': '🇫🇷 Français', 'de-DE': '🇩🇪 Deutsch', 'ja-JP': '🇯🇵 日本語', 'zh-CN': '🇨🇳 中文' }).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <button onClick={handleLogout} style={{
            marginTop: 8,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8,
            padding: '8px 12px',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            🚪 Sign Out
          </button>
        </div>
      )}

      {/* Mobile menu toggle */}
      {isMobile && !sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)} style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 50,
          background: 'rgba(167,139,250,0.2)',
          border: '1px solid rgba(167,139,250,0.3)',
          borderRadius: 10,
          width: 44,
          height: 44,
          color: '#a78bfa',
          cursor: 'pointer',
          fontSize: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>☰</button>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Suspense fallback={<LoadingSpinner />}>
          {currentRoute === 'dashboard' && <RoleDashboards user={user} />}
          {currentRoute === 'analytics' && <AnalyticsDashboard />}
          {currentRoute === 'security' && <SecurityDashboardV2 />}
          {currentRoute === 'gamedev' && <GameDevDashboard />}
          {currentRoute === 'payment' && <PaymentSystem onSuccess={(order) => console.log('Order:', order)} />}
        </Suspense>
      </div>
    </div>
  );
};

export default MainApp;
