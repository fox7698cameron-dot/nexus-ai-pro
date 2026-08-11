/**
 * src/components/AppRouter.jsx
 * Nexus AI Pro — Top-level Application Router
 * Routes to: Auth screens, role-based dashboards, analytics, security, projects.
 * Supports: Web, Electron desktop, iOS/Android via Capacitor.
 * Date: 2026-08-11
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LoginForm, RegisterForm, AuthAPI, ROLES } from '../auth/AuthModule.jsx';
import { RoleRouter } from '../dashboards/RoleDashboards.jsx';
import AnalyticsDashboard from '../dashboards/AnalyticsDashboard.jsx';
import SecurityDashboard from '../dashboards/SecurityDashboard.jsx';
import ProjectTracker from '../dashboards/ProjectTracker.jsx';
import { SubscriptionManager } from '../payments/PaymentModule.jsx';
import { i18n } from '../i18n/index.js';

// ─── Route Definitions ────────────────────────────────────────────────────────
const ROUTES = {
  AUTH_LOGIN:    'auth/login',
  AUTH_REGISTER: 'auth/register',
  DASHBOARD:     'dashboard',
  ANALYTICS:     'analytics',
  SECURITY:      'security',
  PROJECTS:      'projects',
  BILLING:       'billing',
};

// ─── Route Guard ──────────────────────────────────────────────────────────────
function requireRole(user, requiredRoles) {
  if (!user) return false;
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.includes(user.role);
}

// ─── App Router ───────────────────────────────────────────────────────────────
export default function AppRouter() {
  const [user, setUser]       = useState(null);
  const [route, setRoute]     = useState(ROUTES.AUTH_LOGIN);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale]   = useState(i18n.locale);

  // ── Restore session on mount ────────────────────────────────────────────────
  useEffect(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nexus:token') : null;
    if (token) {
      AuthAPI.me()
        .then(u => { setUser(u); setRoute(ROUTES.DASHBOARD); })
        .catch(() => { localStorage.removeItem('nexus:token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ── i18n locale changes ─────────────────────────────────────────────────────
  useEffect(() => {
    return i18n.subscribe(loc => setLocale(loc));
  }, []);

  const handleLoginSuccess = useCallback((result) => {
    if (result.token && typeof localStorage !== 'undefined') {
      localStorage.setItem('nexus:token', result.token);
    }
    setUser(result.user);
    setRoute(ROUTES.DASHBOARD);
  }, []);

  const handleLogout = useCallback(async () => {
    await AuthAPI.logout().catch(() => {});
    if (typeof localStorage !== 'undefined') localStorage.removeItem('nexus:token');
    setUser(null);
    setRoute(ROUTES.AUTH_LOGIN);
  }, []);

  if (loading) {
    return (
      <div className="app-loading" aria-label="Loading Nexus AI Pro">
        <div className="loading-spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    );
  }

  // ── Auth screens ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="auth-screen">
        <div className="auth-brand">
          <span className="brand-logo">⚡</span>
          <h1 className="brand-name">Nexus AI Pro</h1>
          <p className="brand-tagline">Military-grade AI platform</p>
        </div>
        <div className="auth-card">
          {route === ROUTES.AUTH_LOGIN ? (
            <>
              <LoginForm onSuccess={handleLoginSuccess} />
              <p className="auth-switch">
                No account?{' '}
                <button className="auth-link-btn" onClick={() => setRoute(ROUTES.AUTH_REGISTER)}>
                  Create one
                </button>
              </p>
            </>
          ) : (
            <>
              <RegisterForm onSuccess={handleLoginSuccess} />
              <p className="auth-switch">
                Already have an account?{' '}
                <button className="auth-link-btn" onClick={() => setRoute(ROUTES.AUTH_LOGIN)}>
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Nav bar (shown when logged in) ─────────────────────────────────────────
  const navItems = [
    { route: ROUTES.DASHBOARD,  label: '🏠 Home',       roles: null },
    { route: ROUTES.ANALYTICS,  label: '📊 Analytics',  roles: null },
    { route: ROUTES.SECURITY,   label: '🛡️ Security',  roles: [ROLES.ADMIN, ROLES.DEV] },
    { route: ROUTES.PROJECTS,   label: '📂 Projects',   roles: null },
    { route: ROUTES.BILLING,    label: '💳 Billing',    roles: null },
  ].filter(n => requireRole(user, n.roles));

  return (
    <div className="app-container" lang={locale.split('-')[0]}
      dir={i18n.getLocaleInfo()?.dir ?? 'ltr'}>
      {/* ── Top Navigation ── */}
      <nav className="app-nav" role="navigation" aria-label="Main navigation">
        <div className="nav-brand">
          <span className="brand-logo">⚡</span>
          <span className="brand-name">Nexus AI Pro</span>
        </div>
        <ul className="nav-links" role="list">
          {navItems.map(item => (
            <li key={item.route}>
              <button
                className={`nav-link ${route === item.route ? 'active' : ''}`}
                onClick={() => setRoute(item.route)}
                aria-current={route === item.route ? 'page' : undefined}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="nav-user">
          <span className="nav-username">{user.displayName ?? user.username}</span>
          <button className="btn-secondary nav-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="app-main" id="main-content">
        {route === ROUTES.DASHBOARD  && <RoleRouter user={user} onLogout={handleLogout} />}
        {route === ROUTES.ANALYTICS  && <AnalyticsDashboard />}
        {route === ROUTES.SECURITY   && <SecurityDashboard />}
        {route === ROUTES.PROJECTS   && <ProjectTracker />}
        {route === ROUTES.BILLING    && <SubscriptionManager />}
      </main>
    </div>
  );
}
