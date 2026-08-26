/**
 * NEXUS AI PRO - Dashboard Router
 * File: src/dashboards/DashboardRouter.jsx
 * Date: 2026-08-26
 *
 * Routes users to the appropriate dashboard based on role.
 * Admin → AdminDashboard + SecurityDashboard
 * Dev → AdminDashboard (dev view) + ProjectTracker
 * Moderator → AdminDashboard (mod view)
 * User → AnalyticsDashboard + ProjectTracker
 * All → responsive: desktop, mobile, tablet.
 */

import { useState, useEffect } from 'react';
import AuthModule from './AuthModule.jsx';
import AnalyticsDashboard from './AnalyticsDashboard.jsx';
import SecurityDashboard from './SecurityDashboard.jsx';
import ProjectTracker from './ProjectTracker.jsx';
import AdminDashboard from './AdminDashboard.jsx';

const VIEWS = {
  analytics: { icon: '📊', label: 'Analytics' },
  security: { icon: '🛡', label: 'Security', roles: ['admin', 'dev'] },
  projects: { icon: '🚀', label: 'Projects' },
  admin: { icon: '⚙️', label: 'Admin', roles: ['admin', 'dev', 'moderator'] },
};

function Sidebar({ role, activeView, onNavigate, collapsed, onToggle }) {
  const allowed = Object.entries(VIEWS).filter(([, v]) => !v.roles || v.roles.includes(role));

  return (
    <div style={{
      width: collapsed ? 56 : 220,
      minHeight: '100vh',
      background: 'var(--sidebar-bg, #0f172a)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0.75rem 0',
      transition: 'width 0.25s ease',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: 22 }}>🚀</span>
        {!collapsed && <span style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0', letterSpacing: '-0.01em' }}>Nexus AI Pro</span>}
      </div>

      {/* Navigation */}
      {allowed.map(([view, cfg]) => (
        <button
          key={view}
          onClick={() => onNavigate(view)}
          title={collapsed ? cfg.label : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '0.75rem' : '0.65rem 1rem',
            margin: '2px 0.5rem',
            border: 'none',
            borderRadius: 10,
            background: activeView === view ? '#6366f1' : 'transparent',
            color: activeView === view ? '#fff' : '#94a3b8',
            cursor: 'pointer',
            fontWeight: activeView === view ? 700 : 400,
            fontSize: 14,
            textAlign: 'left',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 18 }}>{cfg.icon}</span>
          {!collapsed && <span>{cfg.label}</span>}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 18 }}
      >
        {collapsed ? '→' : '←'}
      </button>
    </div>
  );
}

function TopBar({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div style={{ height: 56, display: 'flex', alignItems: 'center', padding: '0 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--card-bg)', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        <div
          onClick={() => setMenuOpen(m => !m)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}
        >
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12 }}>
            {user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.displayName || user?.username}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
        </div>
        {menuOpen && (
          <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', minWidth: 180, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 200, marginTop: 4 }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.displayName || user?.username}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>
            <button onClick={onLogout} style={{ width: '100%', textAlign: 'left', padding: '0.65rem 1rem', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              🚪 Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardRouter({ socket }) {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('analytics');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 768);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check for existing session
    try {
      const storedUser = JSON.parse(localStorage.getItem('nexus_user') || 'null');
      const token = localStorage.getItem('nexus_token');
      if (storedUser && token) {
        setUser(storedUser);
        // Default view based on role
        if (['admin', 'dev'].includes(storedUser.role)) setActiveView('security');
      }
    } catch { /* noop */ }
    setAuthChecked(true);

    const handleResize = () => setSidebarCollapsed(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAuthenticated = (data) => {
    setUser(data.user);
    if (['admin', 'dev'].includes(data.user?.role)) setActiveView('admin');
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('nexus_token');
      const refresh = localStorage.getItem('nexus_refresh');
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
    } catch { /* noop */ }
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_refresh');
    localStorage.removeItem('nexus_user');
    setUser(null);
  };

  if (!authChecked) return null;

  if (!user) {
    return <AuthModule onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'system-ui, sans-serif' }}>
      <Sidebar role={user.role} activeView={activeView} onNavigate={setActiveView} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar user={user} onLogout={handleLogout} />
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {activeView === 'analytics' && <AnalyticsDashboard socket={socket} />}
          {activeView === 'security' && <SecurityDashboard socket={socket} userRole={user.role} />}
          {activeView === 'projects' && <ProjectTracker socket={socket} />}
          {activeView === 'admin' && <AdminDashboard userRole={user.role} userId={user.id} />}
        </div>
      </div>
    </div>
  );
}
