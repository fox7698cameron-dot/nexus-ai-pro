// src/auth/RoleRouter.jsx
// Created: 2026-07-30
// Role-based routing: admin/dev/moderator/user see separate dashboards
// Handles auth state, route protection, and dashboard selection

import React, { useState, useEffect, useCallback } from 'react';
import AuthPage from './AuthPage.jsx';
import AdminDashboard from '../dashboards/AdminDashboard.jsx';
import AnalyticsDashboard from '../dashboards/AnalyticsDashboard.jsx';
import SecurityDashboardV2 from '../dashboards/SecurityDashboardV2.jsx';
import ProjectTracker from '../dashboards/ProjectTracker.jsx';

const STORAGE_KEY = 'nexus:auth';

function parseJwt(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp;
}

function NavBar({ user, currentView, onNavigate, onLogout }) {
  const roleColor = {
    superadmin: '#ef4444',
    admin: '#f97316',
    dev: '#6366f1',
    moderator: '#22c55e',
    user: '#888'
  }[user?.role] || '#888';

  const navItems = getNavItems(user?.role);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(15,15,26,0.95)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', height: 56, gap: 4
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24, flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>🛡️</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>Nexus AI Pro</span>
        <span style={{
          fontSize: 10, padding: '2px 7px', borderRadius: 10,
          background: `${roleColor}22`, color: roleColor, fontWeight: 700
        }}>
          {(user?.role || 'user').toUpperCase()}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {navItems.map(item => (
          <button key={item.view} onClick={() => onNavigate(item.view)} style={{
            padding: '6px 14px', background: currentView === item.view ? 'rgba(99,102,241,0.15)' : 'none',
            border: 'none', borderRadius: 8,
            color: currentView === item.view ? '#6366f1' : 'var(--text-muted,#9ca3af)',
            cursor: 'pointer', fontSize: 13, fontWeight: currentView === item.view ? 600 : 400,
            transition: 'all 0.2s', whiteSpace: 'nowrap'
          }}>
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.username}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted,#9ca3af)' }}>{user?.email}</div>
        </div>
        <button onClick={onLogout} style={{
          padding: '6px 14px', background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8,
          color: '#ef4444', cursor: 'pointer', fontSize: 12
        }}>Sign Out</button>
      </div>
    </nav>
  );
}

function getNavItems(role) {
  const base = [
    { view: 'analytics', icon: '📊', label: 'Analytics' },
    { view: 'security', icon: '🛡️', label: 'Security' },
    { view: 'projects', icon: '📁', label: 'Projects' }
  ];

  if (role === 'admin' || role === 'superadmin') {
    return [
      { view: 'admin', icon: '⚙️', label: 'Admin' },
      ...base
    ];
  }

  if (role === 'dev') {
    return [
      ...base,
      { view: 'dev', icon: '💻', label: 'Dev Tools' }
    ];
  }

  if (role === 'moderator') {
    return [
      { view: 'moderation', icon: '🔧', label: 'Moderation' },
      ...base
    ];
  }

  return base;
}

function DevDashboard({ token }) {
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>💻 Dev Dashboard</h1>
      <p style={{ color: 'var(--text-muted,#888)', margin: '0 0 24px' }}>Developer tools, API access, and technical metrics</p>
      <ProjectTracker token={token} />
    </div>
  );
}

function ModerationDashboard({ token }) {
  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>🔧 Moderation Dashboard</h1>
      <p style={{ color: 'var(--text-muted,#888)', margin: '0 0 24px' }}>Content moderation and community management tools</p>
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 14, padding: 32, textAlign: 'center', color: 'var(--text-muted,#888)'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
        <div style={{ fontSize: 16 }}>Moderation tools coming soon.</div>
        <div style={{ fontSize: 14, marginTop: 8 }}>Connect your content moderation APIs in .env</div>
      </div>
    </div>
  );
}

export default function RoleRouter({ defaultView }) {
  const [authData, setAuthData] = useState(null);
  const [currentView, setCurrentView] = useState(defaultView || 'analytics');
  const [loading, setLoading] = useState(true);

  // Restore session from storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && !isTokenExpired(parsed.token)) {
          setAuthData(parsed);
          // Set initial view based on role
          const role = parsed.user?.role;
          if (role === 'admin' || role === 'superadmin') setCurrentView('admin');
          else setCurrentView('analytics');
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAuth = useCallback((data) => {
    setAuthData(data);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    // Route to role-appropriate default view
    const role = data.user?.role;
    if (role === 'admin' || role === 'superadmin') setCurrentView('admin');
    else if (role === 'dev') setCurrentView('projects');
    else setCurrentView('analytics');
  }, []);

  const handleLogout = useCallback(() => {
    setAuthData(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setCurrentView('analytics');
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg,#0f0f1a)', color: 'var(--text,#f1f5f9)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛡️</div>
          <div>Loading Nexus AI Pro...</div>
        </div>
      </div>
    );
  }

  if (!authData) {
    return <AuthPage onAuth={handleAuth} />;
  }

  const { token, user } = authData;
  const role = user?.role || 'user';

  const renderView = () => {
    switch (currentView) {
      case 'admin':
        if (!['admin', 'superadmin'].includes(role)) {
          return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>⛔ Access denied. Admin role required.</div>;
        }
        return <AdminDashboard token={token} currentUser={user} />;

      case 'analytics':
        return <AnalyticsDashboard token={token} />;

      case 'security':
        return <SecurityDashboardV2 token={token} />;

      case 'projects':
        return <ProjectTracker token={token} />;

      case 'dev':
        if (!['dev', 'admin', 'superadmin'].includes(role)) {
          return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>⛔ Access denied. Dev role required.</div>;
        }
        return <DevDashboard token={token} />;

      case 'moderation':
        if (!['moderator', 'admin', 'superadmin'].includes(role)) {
          return <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>⛔ Access denied. Moderator role required.</div>;
        }
        return <ModerationDashboard token={token} />;

      default:
        return <AnalyticsDashboard token={token} />;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg,#0f0f1a)',
      color: 'var(--text,#f1f5f9)',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <NavBar
        user={user}
        currentView={currentView}
        onNavigate={setCurrentView}
        onLogout={handleLogout}
      />
      <main style={{ minHeight: 'calc(100vh - 56px)' }}>
        {renderView()}
      </main>
    </div>
  );
}
