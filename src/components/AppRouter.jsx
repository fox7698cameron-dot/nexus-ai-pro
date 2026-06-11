// src/components/AppRouter.jsx
// Main application router — role-based dashboard routing, Socket.IO connection
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { io } from 'socket.io-client';
import {
  Activity, Shield, Code2, LayoutDashboard, LogOut,
  ChevronLeft, ChevronRight, Bell, User, Settings,
} from 'lucide-react';

const AuthScreen = lazy(() => import('./auth/AuthScreen.jsx'));
const AnalyticsDashboard = lazy(() => import('./dashboards/AnalyticsDashboard.jsx'));
const SecurityDashboard = lazy(() => import('./dashboards/SecurityDashboard.jsx'));
const ProjectDashboard = lazy(() => import('./dashboards/ProjectDashboard.jsx'));
const AdminDashboard = lazy(() => import('./dashboards/AdminDashboard.jsx'));

// Chat/AI view — existing app.jsx functionality
const ChatView = lazy(() => import('../../app.jsx').catch(() => ({ default: () => <div style={{ padding: 32, color: '#64748B' }}>AI Chat — coming soon</div> })));

const NAV_ITEMS_BY_ROLE = {
  admin: [
    { key: 'admin', label: 'Admin', icon: Shield, color: '#EF4444' },
    { key: 'analytics', label: 'Analytics', icon: Activity, color: '#6366F1' },
    { key: 'security', label: 'Security', icon: Shield, color: '#F59E0B' },
    { key: 'projects', label: 'Projects', icon: Code2, color: '#10B981' },
    { key: 'chat', label: 'AI Chat', icon: LayoutDashboard, color: '#8B5CF6' },
  ],
  dev: [
    { key: 'analytics', label: 'Analytics', icon: Activity, color: '#6366F1' },
    { key: 'security', label: 'Security', icon: Shield, color: '#F59E0B' },
    { key: 'projects', label: 'Projects', icon: Code2, color: '#10B981' },
    { key: 'chat', label: 'AI Chat', icon: LayoutDashboard, color: '#8B5CF6' },
  ],
  moderator: [
    { key: 'analytics', label: 'Analytics', icon: Activity, color: '#6366F1' },
    { key: 'projects', label: 'Projects', icon: Code2, color: '#10B981' },
    { key: 'chat', label: 'AI Chat', icon: LayoutDashboard, color: '#8B5CF6' },
  ],
  user: [
    { key: 'analytics', label: 'Analytics', icon: Activity, color: '#6366F1' },
    { key: 'projects', label: 'Projects', icon: Code2, color: '#10B981' },
    { key: 'chat', label: 'AI Chat', icon: LayoutDashboard, color: '#8B5CF6' },
  ],
};

function Sidebar({ user, activeView, onNavigate, onLogout, collapsed, onToggle }) {
  const navItems = NAV_ITEMS_BY_ROLE[user?.role] ?? NAV_ITEMS_BY_ROLE.user;
  return (
    <aside style={{ ...styles.sidebar, width: collapsed ? 60 : 220 }}>
      <div style={styles.sidebarTop}>
        {!collapsed && (
          <div style={styles.brand}>
            <div style={styles.brandIcon}><Shield size={20} color="#6366F1" /></div>
            <span style={styles.brandName}>Nexus AI Pro</span>
          </div>
        )}
        <button style={styles.collapseBtn} onClick={onToggle}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav style={styles.nav}>
        {navItems.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            style={{ ...styles.navItem, ...(activeView === key ? { ...styles.navItemActive, borderLeft: `3px solid ${color}` } : {}) }}
            onClick={() => onNavigate(key)}
            title={collapsed ? label : undefined}
          >
            <Icon size={18} color={activeView === key ? color : '#64748B'} />
            {!collapsed && <span style={{ color: activeView === key ? '#E2E8F0' : '#64748B' }}>{label}</span>}
          </button>
        ))}
      </nav>

      <div style={styles.sidebarBottom}>
        {!collapsed && user && (
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>{(user.username ?? user.email ?? '?')[0].toUpperCase()}</div>
            <div style={styles.userDetails}>
              <p style={styles.userName}>{user.displayName ?? user.username}</p>
              <p style={styles.userRole}>{user.role}</p>
            </div>
          </div>
        )}
        <button style={styles.logoutBtn} onClick={onLogout} title="Sign out">
          <LogOut size={16} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

function LoadingSpinner() {
  return <div style={styles.loading}>Loading…</div>;
}

export default function AppRouter() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('chat');
  const [socket, setSocket] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(u => { if (u) setUser(u); })
        .catch(() => {})
        .finally(() => setAuthChecked(true));
    } else {
      setAuthChecked(true);
    }
  }, []);

  // Socket.IO connection — authenticated
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    const s = io({ auth: { token }, transports: ['websocket', 'polling'] });
    s.on('connect', () => console.info('Socket connected'));
    s.on('connect_error', err => console.warn('Socket error:', err.message));
    setSocket(s);
    return () => { s.disconnect(); setSocket(null); };
  }, [user]);

  const handleLogout = () => {
    const token = localStorage.getItem('accessToken');
    const refresh = localStorage.getItem('refreshToken');
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    }).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    if (socket) { socket.disconnect(); setSocket(null); }
  };

  if (!authChecked) return <LoadingSpinner />;
  if (!user) return (
    <Suspense fallback={<LoadingSpinner />}>
      <AuthScreen onAuthSuccess={(u) => { setUser(u); setView(u.role === 'admin' ? 'admin' : 'chat'); }} />
    </Suspense>
  );

  const renderView = () => {
    const props = { socket, user };
    switch (view) {
      case 'analytics': return <AnalyticsDashboard {...props} />;
      case 'security': return <SecurityDashboard {...props} />;
      case 'projects': return <ProjectDashboard {...props} />;
      case 'admin': return <AdminDashboard {...props} />;
      case 'chat': return <ChatView />;
      default: return <div style={{ padding: 32, color: '#64748B' }}>View not found</div>;
    }
  };

  return (
    <div style={styles.app}>
      <Sidebar
        user={user}
        activeView={view}
        onNavigate={setView}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />
      <main style={styles.main}>
        <Suspense fallback={<LoadingSpinner />}>
          {renderView()}
        </Suspense>
      </main>
    </div>
  );
}

const styles = {
  app: { display: 'flex', minHeight: '100vh', background: '#0F0F23' },
  sidebar: { display: 'flex', flexDirection: 'column', background: '#1E293B', borderRight: '1px solid #334155', transition: 'width 0.2s', flexShrink: 0, overflow: 'hidden' },
  sidebarTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 12px', borderBottom: '1px solid #334155' },
  brand: { display: 'flex', alignItems: 'center', gap: 8 },
  brandIcon: { width: 32, height: 32, background: '#6366F120', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 14, fontWeight: 700, color: '#E2E8F0', whiteSpace: 'nowrap' },
  collapseBtn: { background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 },
  nav: { flex: 1, padding: '8px 0', overflowY: 'auto' },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', width: '100%', background: 'none', border: 'none', borderLeft: '3px solid transparent', cursor: 'pointer', textAlign: 'left', fontSize: 14, transition: 'background 0.15s', whiteSpace: 'nowrap' },
  navItemActive: { background: '#0F172A' },
  sidebarBottom: { padding: 12, borderTop: '1px solid #334155' },
  userInfo: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  userAvatar: { width: 32, height: 32, background: '#6366F1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 },
  userDetails: { overflow: 'hidden' },
  userName: { fontSize: 13, fontWeight: 600, color: '#E2E8F0', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userRole: { fontSize: 11, color: '#64748B', margin: 0, textTransform: 'capitalize' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: '1px solid #334155', borderRadius: 8, color: '#64748B', cursor: 'pointer', fontSize: 13 },
  main: { flex: 1, overflowY: 'auto' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#64748B', background: '#0F0F23' },
};
