/**
 * src/router/AppRouter.jsx
 * Application Router - Role-based routing & protected routes
 * Updated: 2026-08-24
 *
 * Roles: admin → /admin, developer → /dev, moderator → /moderator, user → /dashboard
 * Public: /login, /register, /forgot-password
 * All auth via JWT; biometric via WebAuthn
 */
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import AuthService from '../auth/AuthService.js';
import LoginPage from '../components/auth/LoginPage.jsx';
import RegisterPage from '../components/auth/RegisterPage.jsx';
import AdminDashboard from '../components/dashboards/AdminDashboard.jsx';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard.jsx';
import SecurityDashboard from '../components/security/SecurityDashboard.jsx';
import GameDevDashboard from '../components/gamedev/GameDevDashboard.jsx';
import SubscriptionPage from '../components/subscriptions/SubscriptionPage.jsx';

// ── Auth Context ──────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AppRouter');
  return ctx;
};

// ── Loading screen ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0f1e', flexDirection: 'column', gap: 16,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    }}>
      <div style={{ fontSize: 48 }}>🔷</div>
      <div style={{ color: '#6366f1', fontSize: 16, fontWeight: 600 }}>Nexus AI Pro</div>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid rgba(99,102,241,0.2)',
        borderTopColor: '#6366f1',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Role-based nav sidebar ────────────────────────────────────────────────────
function RoleNav({ role, currentRoute, onNavigate, onLogout }) {
  const roleItems = {
    admin: [
      { route: '/admin', label: '📊 Admin Overview', roles: ['admin'] },
      { route: '/analytics', label: '📈 Analytics', roles: ['admin'] },
      { route: '/security', label: '🛡️ Security', roles: ['admin'] },
      { route: '/gamedev', label: '🎮 Game Dev', roles: ['admin'] },
      { route: '/subscriptions', label: '💳 Subscriptions', roles: ['admin'] },
    ],
    developer: [
      { route: '/dev', label: '💻 Dev Dashboard', roles: ['developer'] },
      { route: '/analytics', label: '📈 Analytics', roles: ['developer'] },
      { route: '/security', label: '🛡️ Security', roles: ['developer'] },
      { route: '/gamedev', label: '🎮 Game Dev', roles: ['developer'] },
    ],
    moderator: [
      { route: '/moderator', label: '🔍 Moderation', roles: ['moderator'] },
      { route: '/analytics', label: '📈 Analytics', roles: ['moderator'] },
    ],
    user: [
      { route: '/dashboard', label: '🏠 Home', roles: ['user'] },
      { route: '/analytics', label: '📈 Analytics', roles: ['user'] },
      { route: '/gamedev', label: '🎮 Game Dev', roles: ['user'] },
      { route: '/subscriptions', label: '💳 My Plan', roles: ['user'] },
    ],
  };

  const items = roleItems[role] || roleItems.user;

  return (
    <nav style={{
      width: 220, flexShrink: 0, background: 'rgba(15,23,42,0.95)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 24, marginBottom: 4 }}>🔷</div>
        <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>Nexus AI Pro</div>
        <div style={{
          fontSize: 10, fontWeight: 700, marginTop: 4,
          padding: '2px 8px', borderRadius: 20, display: 'inline-block',
          background: {
            admin: 'rgba(239,68,68,0.2)', developer: 'rgba(99,102,241,0.2)',
            moderator: 'rgba(250,204,21,0.2)', user: 'rgba(34,197,94,0.2)',
          }[role] || 'rgba(100,116,139,0.2)',
          color: {
            admin: '#fca5a5', developer: '#a5b4fc',
            moderator: '#fde047', user: '#86efac',
          }[role] || '#94a3b8',
        }}>
          {role?.toUpperCase()}
        </div>
      </div>

      <div style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {items.map(item => (
          <button
            key={item.route}
            onClick={() => onNavigate(item.route)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none',
              cursor: 'pointer', textAlign: 'left', fontSize: 13,
              background: currentRoute === item.route ? 'rgba(99,102,241,0.2)' : 'transparent',
              color: currentRoute === item.route ? '#a5b4fc' : '#64748b',
              marginBottom: 2, transition: 'all 0.15s', fontWeight: 500,
            }}
          >{item.label}</button>
        ))}
      </div>

      <div style={{ padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
            cursor: 'pointer', textAlign: 'left', fontSize: 13,
            background: 'transparent', color: '#ef4444', transition: 'all 0.15s',
          }}
        >🚪 Sign Out</button>
      </div>
    </nav>
  );
}

// ── Dev dashboard placeholder ─────────────────────────────────────────────────
function DevDashboard() {
  return (
    <div style={{ padding: 24, color: '#f1f5f9', fontFamily: 'system-ui', minHeight: '100vh', background: '#0a0f1e' }}>
      <h1>💻 Developer Dashboard</h1>
      <p style={{ color: '#475569' }}>API usage, model benchmarks, code execution, and development tools.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginTop: 24 }}>
        {[
          { label: 'API Calls Today', value: '28,402', icon: '🔌' },
          { label: 'Build Status', value: 'Passing ✓', icon: '🏗️', color: '#22c55e' },
          { label: 'Test Coverage', value: '84%', icon: '🧪', color: '#f59e0b' },
          { label: 'Deploy Freq', value: '4/day', icon: '🚀', color: '#6366f1' },
        ].map(({ label, value, icon, color = '#f1f5f9' }) => (
          <div key={label} style={{ background: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 18, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
            <div style={{ color, fontWeight: 700, fontSize: 22 }}>{value}</div>
            <div style={{ color: '#475569', fontSize: 12 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModeratorDashboard() {
  return (
    <div style={{ padding: 24, color: '#f1f5f9', fontFamily: 'system-ui', minHeight: '100vh', background: '#0a0f1e' }}>
      <h1>🔍 Moderator Dashboard</h1>
      <p style={{ color: '#475569' }}>Content moderation, user reports, and community management.</p>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {['3 pending content reports', '1 appeal to review', '5 new user reports'].map((item, i) => (
          <div key={i} style={{
            background: 'rgba(30,41,59,0.8)', borderRadius: 10, padding: '14px 18px',
            border: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#f1f5f9', fontSize: 14 }}>🔔 {item}</span>
            <button style={{
              padding: '4px 12px', borderRadius: 6, border: 'none',
              background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', cursor: 'pointer', fontSize: 12,
            }}>Review</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UserHomeDashboard() {
  return (
    <div style={{ padding: 24, color: '#f1f5f9', fontFamily: 'system-ui', minHeight: '100vh', background: '#0a0f1e' }}>
      <h1>🏠 Welcome to Nexus AI Pro</h1>
      <p style={{ color: '#475569' }}>Your AI-powered workspace. Start a new chat or explore your dashboards.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginTop: 24 }}>
        {[
          { label: 'Start AI Chat', icon: '💬', color: '#6366f1' },
          { label: 'Social Analytics', icon: '📊', color: '#22c55e' },
          { label: 'Game Dev', icon: '🎮', color: '#8b5cf6' },
          { label: 'Upgrade Plan', icon: '⭐', color: '#f59e0b' },
        ].map(({ label, icon, color }) => (
          <div key={label} style={{
            background: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 24,
            border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', cursor: 'pointer',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
            <div style={{ color, fontWeight: 600, fontSize: 14 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Route resolver ────────────────────────────────────────────────────────────
function resolveRoute(route) {
  switch (route) {
    case '/admin': return <AdminDashboard />;
    case '/dev': return <DevDashboard />;
    case '/moderator': return <ModeratorDashboard />;
    case '/dashboard': return <UserHomeDashboard />;
    case '/analytics': return <AnalyticsDashboard />;
    case '/security': return <SecurityDashboard />;
    case '/gamedev': return <GameDevDashboard />;
    case '/subscriptions': return <SubscriptionPage />;
    default: return <UserHomeDashboard />;
  }
}

// ── Main AppRouter ─────────────────────────────────────────────────────────────
export default function AppRouter() {
  const [authState, setAuthState] = useState({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    role: null,
  });
  const [currentRoute, setCurrentRoute] = useState('/dashboard');
  const [page, setPage] = useState('login'); // login | register | forgot-password | app

  const checkAuth = useCallback(() => {
    const isAuth = AuthService.isAuthenticated();
    const user = AuthService.getUser();
    const role = user?.role || null;

    setAuthState({ isLoading: false, isAuthenticated: isAuth, user, role });

    if (isAuth && role) {
      setPage('app');
      const defaultRoute = {
        admin: '/admin',
        developer: '/dev',
        moderator: '/moderator',
        user: '/dashboard',
      }[role] || '/dashboard';
      setCurrentRoute(defaultRoute);
    } else {
      setPage('login');
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const handleLoginSuccess = (data, route) => {
    const user = data.user || AuthService.getUser();
    const role = user?.role || 'user';
    setAuthState({ isLoading: false, isAuthenticated: true, user, role });
    setCurrentRoute(route || '/dashboard');
    setPage('app');
  };

  const handleLogout = () => {
    AuthService.logout();
    setAuthState({ isLoading: false, isAuthenticated: false, user: null, role: null });
    setPage('login');
  };

  if (authState.isLoading) return <LoadingScreen />;

  if (page === 'login') {
    return (
      <AuthContext.Provider value={authState}>
        <LoginPage onSuccess={handleLoginSuccess} onNavigate={setPage} />
      </AuthContext.Provider>
    );
  }

  if (page === 'register') {
    return (
      <AuthContext.Provider value={authState}>
        <RegisterPage onSuccess={() => setPage('login')} onNavigate={setPage} />
      </AuthContext.Provider>
    );
  }

  if (page === 'app' && authState.isAuthenticated) {
    return (
      <AuthContext.Provider value={authState}>
        <div style={{
          display: 'flex', minHeight: '100vh',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        }}>
          <RoleNav
            role={authState.role}
            currentRoute={currentRoute}
            onNavigate={setCurrentRoute}
            onLogout={handleLogout}
          />
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {resolveRoute(currentRoute)}
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return <LoadingScreen />;
}
