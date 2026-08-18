// src/dashboards/index.jsx
// Nexus AI Pro — Role-Based Dashboard Router
// Selects the correct dashboard component based on authenticated user role.
// Date: 2026-08-18

import React, { lazy, Suspense } from 'react';
import { Loader2, Sparkles, Shield, LogIn } from 'lucide-react';

// Lazy-load each role dashboard for code-splitting
const AdminDashboard     = lazy(() => import('./AdminDashboard.jsx'));
const DevDashboard       = lazy(() => import('./DevDashboard.jsx'));
const ModeratorDashboard = lazy(() => import('./ModeratorDashboard.jsx'));
const UserDashboard      = lazy(() => import('./UserDashboard.jsx'));

// ─── Loading Fallback ─────────────────────────────────────────────────────────
function DashboardLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#09090b', color: '#fff', gap: 16
    }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
      <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>Loading dashboard…</p>
    </div>
  );
}

// ─── Guest / Not-Authenticated View ──────────────────────────────────────────
export function GuestDashboard({ onSignIn }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #09090b 0%, #0f0f14 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'Inter, system-ui, sans-serif', padding: 24, textAlign: 'center'
    }}>
      {/* Logo */}
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24
      }}>
        <Sparkles size={36} color="#fff" />
      </div>

      <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0 0 8px',
        background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Nexus AI Pro
      </h1>
      <p style={{ color: '#6b7280', fontSize: '1rem', margin: '0 0 40px', maxWidth: 420 }}>
        Military-grade encrypted AI workspace. 40+ models, real-time analytics, enterprise connectors.
      </p>

      {/* Feature badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 40 }}>
        {['AES-256-GCM', 'WebAuthn Biometrics', 'MFA/2FA', 'E2E Encrypted', '40+ AI Models', 'Real-time Analytics'].map(f => (
          <span key={f} style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 9999,
            background: '#6366f111', border: '1px solid #6366f140', color: '#a5b4fc' }}>
            {f}
          </span>
        ))}
      </div>

      {/* Sign in button */}
      <button onClick={onSignIn} style={{
        padding: '14px 32px', borderRadius: 12,
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        border: 'none', color: '#fff', fontSize: '1rem', fontWeight: 700,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 0 40px #6366f140', transition: 'opacity 0.15s'
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        <LogIn size={20} />
        Sign In / Register
      </button>

      {/* Security note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 24, color: '#6b7280', fontSize: '0.75rem' }}>
        <Shield size={12} color="#10b981" />
        <span>Zero-knowledge architecture · Your data never leaves your session unencrypted</span>
      </div>
    </div>
  );
}

// ─── Role Dashboard Router ────────────────────────────────────────────────────
/**
 * RoleDashboard — renders the appropriate dashboard for the authenticated role.
 *
 * Props:
 *   session    {object|null}  — decoded session from sessionStorage (has .role, .username, .plan)
 *   apiBase    {string}       — base URL for API calls (default: '')
 *   onSignIn   {function}     — called when guest clicks "Sign In"
 *   onToolSelect {function}   — called when user dashboard quick-action is clicked (navigates main app tool)
 */
export default function RoleDashboard({ session, apiBase = '', onSignIn, onToolSelect }) {
  if (!session) {
    return <GuestDashboard onSignIn={onSignIn} />;
  }

  const role = session.role || 'user';

  // Roles that see the admin dashboard
  if (role === 'superadmin' || role === 'admin') {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <AdminDashboard apiBase={apiBase} session={session} />
      </Suspense>
    );
  }

  if (role === 'dev') {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <DevDashboard apiBase={apiBase} session={session} />
      </Suspense>
    );
  }

  if (role === 'moderator') {
    return (
      <Suspense fallback={<DashboardLoader />}>
        <ModeratorDashboard apiBase={apiBase} session={session} />
      </Suspense>
    );
  }

  // Default: user / guest roles see the user dashboard
  return (
    <Suspense fallback={<DashboardLoader />}>
      <UserDashboard apiBase={apiBase} session={session} onToolSelect={onToolSelect} />
    </Suspense>
  );
}
