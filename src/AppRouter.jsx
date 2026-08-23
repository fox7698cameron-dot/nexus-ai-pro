/**
 * src/AppRouter.jsx
 * Top-level routing — separates Admin, Developer, Moderator, User, and Auth views.
 * Also wires up Analytics, Security, Game Dev Tracker, Connectors, and Payments.
 * Created: 2026-08-23
 */

import React, { useState, Suspense, lazy } from 'react';
import { AuthProvider, useAuth, SignInForm, SignUpForm, RoleGuard, ROLES } from './auth/AuthSystem.jsx';

// Lazy-load dashboards so each is code-split (no unnecessary bundle bloat)
const AnalyticsDashboard  = lazy(() => import('./dashboards/AnalyticsDashboard.jsx'));
const SecurityDashboardV2 = lazy(() => import('./dashboards/SecurityDashboard.jsx'));
const GameDevTracker      = lazy(() => import('./tracking/GameDevTracker.jsx'));
const AdminDashboard      = lazy(() => import('./dashboards/AdminDashboard.jsx'));
const ConnectorsDashboard = lazy(() => import('./dashboards/ConnectorsDashboard.jsx'));
const PaymentSystem       = lazy(() => import('./payments/PaymentSystem.jsx'));

// ── Nav items per role ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'home',        label: '🏠 Home',        roles: null },
  { id: 'analytics',   label: '📊 Analytics',   roles: null },
  { id: 'security',    label: '🛡️ Security',    roles: [ROLES.ADMIN, ROLES.DEV] },
  { id: 'gamedev',     label: '🎮 Game Dev',    roles: null },
  { id: 'connectors',  label: '🔗 Connectors',  roles: [ROLES.ADMIN, ROLES.DEV] },
  { id: 'billing',     label: '💳 Billing',     roles: null },
  { id: 'dashboard',   label: '📋 Dashboard',   roles: null },
];

// ── Loading spinner ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, border: '4px solid #334155', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#64748b', fontSize: 14 }}>Loading…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Auth gate ─────────────────────────────────────────────────────────────────
function AuthGate() {
  const [mode, setMode] = useState('signin');
  const { user }        = useAuth();

  if (user) return null;    // Handled by parent

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#f8fafc', margin: 0 }}>⚡ Nexus AI Pro</h1>
        <p style={{ color: '#64748b', marginTop: 8, fontSize: 15 }}>Enterprise-grade AI platform</p>
      </div>

      {mode === 'signin'
        ? <SignInForm onSuccess={() => {}} />
        : <SignUpForm onSuccess={() => {}} />
      }

      <button onClick={() => setMode(m => m === 'signin' ? 'signup' : 'signin')}
        style={{ marginTop: 16, background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: 14 }}>
        {mode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
      </button>
    </div>
  );
}

// ── Top navigation bar ────────────────────────────────────────────────────────
function TopNav({ active, onNav }) {
  const { user, signOut, hasRole } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return hasRole(...item.roles);
  });

  return (
    <nav style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 4, overflowX: 'auto' }}>
      <span style={{ fontWeight: 800, fontSize: 16, color: '#f8fafc', marginRight: 16, flexShrink: 0 }}>⚡ Nexus AI Pro</span>

      {visibleItems.map((item) => (
        <button key={item.id} onClick={() => onNav(item.id)}
          style={{
            background: active === item.id ? '#3b82f622' : 'none',
            color: active === item.id ? '#60a5fa' : '#94a3b8',
            border: active === item.id ? '1px solid #3b82f644' : '1px solid transparent',
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap',
          }}>
          {item.label}
        </button>
      ))}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: '#64748b' }}>{user?.username}</span>
        <span style={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{user?.role}</span>
        <button onClick={signOut}
          style={{ background: '#334155', color: '#94a3b8', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}

// ── Home / hero screen ────────────────────────────────────────────────────────
function HomeScreen({ onNav }) {
  const { user, hasRole } = useAuth();

  const cards = [
    { id: 'analytics',  icon: '📊', title: 'Analytics',       desc: 'Real-time social media metrics across TikTok, Instagram, Twitch & more' },
    { id: 'security',   icon: '🛡️', title: 'Security',        desc: 'Vulnerability scanning, network monitoring, on-device threat detection' },
    { id: 'gamedev',    icon: '🎮', title: 'Game Dev',         desc: 'Track game, AR/VR, and 3D projects with platform connectors' },
    { id: 'connectors', icon: '🔗', title: 'Connectors',       desc: 'Azure, AWS, GitHub, Slack, Zoom, Adobe, Unreal Engine & more' },
    { id: 'billing',    icon: '💳', title: 'Billing',          desc: 'Stripe, crypto, and gift card checkout support' },
    { id: 'dashboard',  icon: '📋', title: 'My Dashboard',     desc: 'Role-separated views for Admin, Developer, Moderator, and User' },
  ].filter((c) => {
    if (['security', 'connectors'].includes(c.id)) return hasRole(ROLES.ADMIN, ROLES.DEV);
    return true;
  });

  return (
    <div style={{ background: '#0f172a', minHeight: 'calc(100vh - 56px)', padding: 32 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#f8fafc', marginBottom: 8 }}>
          Welcome back, {user?.username || 'User'} 👋
        </h1>
        <p style={{ color: '#64748b', fontSize: 16, marginBottom: 40 }}>
          Enterprise AI platform · {new Date().toLocaleDateString()}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 16 }}>
          {cards.map((c) => (
            <div key={c.id} onClick={() => onNav(c.id)}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 22, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.transform = 'none'; }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
              <h3 style={{ color: '#f8fafc', fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>{c.title}</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main router ───────────────────────────────────────────────────────────────
function AppRoutes() {
  const { user, loading } = useAuth();
  const [page, setPage]   = useState('home');

  if (loading) return <Spinner />;
  if (!user)   return <AuthGate />;

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <TopNav active={page} onNav={setPage} />
      <Suspense fallback={<Spinner />}>
        {page === 'home'       && <HomeScreen onNav={setPage} />}
        {page === 'analytics'  && <AnalyticsDashboard />}
        {page === 'security'   && (
          <RoleGuard roles={[ROLES.ADMIN, ROLES.DEV]} fallback={<AccessDenied />}>
            <SecurityDashboardV2 />
          </RoleGuard>
        )}
        {page === 'gamedev'    && <GameDevTracker />}
        {page === 'connectors' && (
          <RoleGuard roles={[ROLES.ADMIN, ROLES.DEV]} fallback={<AccessDenied />}>
            <ConnectorsDashboard />
          </RoleGuard>
        )}
        {page === 'billing'    && <PaymentSystem />}
        {page === 'dashboard'  && <AdminDashboard />}
      </Suspense>
    </div>
  );
}

function AccessDenied() {
  return (
    <div style={{ background: '#0f172a', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <span style={{ fontSize: 64 }}>🚫</span>
      <h2 style={{ color: '#ef4444', fontSize: 24, margin: 0 }}>Access Denied</h2>
      <p style={{ color: '#64748b' }}>You don't have permission to view this page.</p>
    </div>
  );
}

// ── Exported root ─────────────────────────────────────────────────────────────
export default function AppRouter() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
