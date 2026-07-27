// src/components/dashboards/DashboardRouter.jsx
// 2026-07-27 | Nexus AI Pro — Role-based dashboard routing
// Separate views for: user | moderator | developer | admin
// Supports: desktop, mobile, tablet, Electron, PWA

import React, { useState, useEffect } from 'react';
import AnalyticsDashboard from './AnalyticsDashboard.jsx';
import SecurityDashboardFull from './SecurityDashboardFull.jsx';
import GameDevDashboard from './GameDevDashboard.jsx';
import SubscriptionManager from './SubscriptionManager.jsx';
import AuthDashboard from './AuthDashboard.jsx';

const ROLE_NAVS = {
  user:       ['chat', 'analytics', 'gaming', 'subscription'],
  moderator:  ['chat', 'analytics', 'moderation', 'subscription'],
  developer:  ['chat', 'analytics', 'gaming', 'connectors', 'security', 'subscription'],
  admin:      ['chat', 'analytics', 'gaming', 'connectors', 'security', 'moderation', 'users', 'subscription'],
};

const NAV_ICONS = {
  chat: '💬', analytics: '📊', gaming: '🎮', security: '🛡️',
  connectors: '🔌', subscription: '💳', moderation: '🛠️', users: '👥',
};
const NAV_LABELS = {
  chat: 'Chat', analytics: 'Analytics', gaming: 'Game Dev', security: 'Security',
  connectors: 'Connectors', subscription: 'Billing', moderation: 'Moderation', users: 'Users',
};

function Sidebar({ role, active, onNav, onLogout, user, collapsed }) {
  const navItems = ROLE_NAVS[role] || ROLE_NAVS.user;
  return (
    <div style={{
      width: collapsed ? 56 : 220, minHeight: '100vh', background: 'var(--sidebar-bg, #0f172a)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      transition: 'width 0.2s ease', flexShrink: 0,
    }}>
      <div style={{ padding: collapsed ? '16px 8px' : '20px 16px', borderBottom: '1px solid var(--border)' }}>
        {!collapsed && (
          <>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>Nexus AI Pro</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>v2.0 · {role}</div>
          </>
        )}
        {collapsed && <div style={{ textAlign: 'center', fontSize: 20 }}>⚡</div>}
      </div>

      <nav style={{ flex: 1, padding: collapsed ? '8px 4px' : '8px' }}>
        {navItems.map(item => (
          <button key={item} onClick={() => onNav(item)}
            style={{
              display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
              width: '100%', padding: collapsed ? '10px' : '10px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer', justifyContent: collapsed ? 'center' : 'flex-start',
              background: active === item ? '#1e40af' : 'transparent',
              color: active === item ? '#fff' : '#94a3b8',
              marginBottom: 2, fontSize: 14, transition: 'all 0.15s',
            }}>
            <span style={{ fontSize: collapsed ? 18 : 16 }}>{NAV_ICONS[item]}</span>
            {!collapsed && <span>{NAV_LABELS[item]}</span>}
          </button>
        ))}
      </nav>

      {user && !collapsed && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{user.username || user.email}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{user.role}</div>
          <button onClick={onLogout}
            style={{ fontSize: 12, color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            Sign out →
          </button>
        </div>
      )}
    </div>
  );
}

function ModerationPanel({ token }) {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 16px' }}>Moderation</h1>
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, color: 'var(--text-muted)' }}>
        Moderation tools — content review, user flags, and report management coming soon.
      </div>
    </div>
  );
}

function UserManagement({ token }) {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 16px' }}>User Management</h1>
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, color: 'var(--text-muted)' }}>
        Admin user management — role assignment, account status, audit logs. Connect to /api/auth/audit and /api/auth/role endpoints.
      </div>
    </div>
  );
}

function ConnectorsPanel({ token }) {
  const [connectors, setConnectors] = useState([]);
  useEffect(() => {
    fetch('/api/connectors', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setConnectors(d.connectors || [])).catch(() => {});
  }, [token]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 16px' }}>Enterprise Connectors</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {connectors.map(c => (
          <div key={c.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: c.configured ? '#22c55e' : '#ef4444', marginBottom: 6 }}>
              {c.configured ? 'Configured' : 'Not configured'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Auth: {c.authType} · Status: {c.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardRouter({ initialAuth }) {
  const [auth, setAuth] = useState(initialAuth || null);
  const [activeNav, setActiveNav] = useState('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mobile detection
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleLogin = (data) => {
    sessionStorage.setItem('nexus:token', data.accessToken);
    sessionStorage.setItem('nexus:user', JSON.stringify(data));
    setAuth(data);
    setActiveNav('chat');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('nexus:token');
    sessionStorage.removeItem('nexus:user');
    setAuth(null);
  };

  // Restore session
  useEffect(() => {
    if (!auth) {
      const stored = sessionStorage.getItem('nexus:user');
      if (stored) {
        try { setAuth(JSON.parse(stored)); } catch { /* ignore */ }
      }
    }
  }, []);

  if (!auth) return <AuthDashboard onLogin={handleLogin} onRegister={handleLogin} />;

  const token = auth.accessToken || sessionStorage.getItem('nexus:token');
  const role = auth.role || 'user';

  const renderContent = () => {
    switch (activeNav) {
      case 'analytics':    return <AnalyticsDashboard token={token} />;
      case 'security':     return <SecurityDashboardFull token={token} />;
      case 'gaming':       return <GameDevDashboard token={token} />;
      case 'subscription': return <SubscriptionManager token={token} />;
      case 'moderation':   return <ModerationPanel token={token} />;
      case 'users':        return <UserManagement token={token} />;
      case 'connectors':   return <ConnectorsPanel token={token} />;
      default:
        return (
          <div style={{ padding: 24, textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <h2>Welcome back, {auth.username || auth.email}</h2>
            <p style={{ color: 'var(--text-muted)' }}>Select a section from the sidebar to get started.</p>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {!isMobile && (
        <Sidebar role={role} active={activeNav} onNav={setActiveNav} onLogout={handleLogout} user={auth} collapsed={sidebarCollapsed} />
      )}

      <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ height: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
          <button onClick={() => setSidebarCollapsed(c => !c)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text)', padding: 4 }}>☰</button>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{NAV_LABELS[activeNav] || 'Dashboard'}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, background: '#3b82f622', border: '1px solid #3b82f644', borderRadius: 20, padding: '2px 10px', color: '#3b82f6' }}>{role}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{auth.username || auth.email}</span>
          </div>
        </div>

        {/* Mobile nav */}
        {isMobile && (
          <div style={{ display: 'flex', overflowX: 'auto', padding: '8px', borderBottom: '1px solid var(--border)', gap: 8 }}>
            {(ROLE_NAVS[role] || []).map(item => (
              <button key={item} onClick={() => setActiveNav(item)}
                style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, border: `1px solid ${activeNav === item ? '#3b82f6' : 'var(--border)'}`,
                  background: activeNav === item ? '#3b82f6' : 'transparent', color: activeNav === item ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: 12 }}>
                {NAV_ICONS[item]} {NAV_LABELS[item]}
              </button>
            ))}
          </div>
        )}

        <main>{renderContent()}</main>
      </div>
    </div>
  );
}
