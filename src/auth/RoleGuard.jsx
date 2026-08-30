/**
 * @file RoleGuard.jsx
 * @description React component for role-based route and component protection.
 *   Reads authentication state from AuthContext (with localStorage fallback),
 *   renders an "access denied" UI for insufficient permissions, and handles
 *   role-specific dashboard redirects.
 * @author Cameron Fox <contact@nexusai.pro>
 * @date 2026-08-30
 * @license Apache-2.0
 * @copyright Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @module auth/RoleGuard
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

// ─── Role hierarchy & dashboard routing ───────────────────────────────────

/** Ordered from least to most privileged. */
const ROLE_HIERARCHY = ['user', 'moderator', 'dev', 'admin'];

/**
 * Maps each role to its home dashboard route.
 * @type {Record<string, string>}
 */
const ROLE_DASHBOARD = {
  admin: '/admin',
  dev: '/dev',
  moderator: '/moderator',
  user: '/dashboard',
};

// ─── Auth context ──────────────────────────────────────────────────────────

/**
 * @typedef {Object} AuthState
 * @property {string|null} userId
 * @property {string|null} role
 * @property {string|null} username
 * @property {string|null} accessToken
 * @property {boolean}     isAuthenticated
 * @property {boolean}     isLoading
 */

/** @type {React.Context<{ auth: AuthState, setAuth: Function, logout: Function }>} */
const AuthContext = createContext(null);

/**
 * Storage key used for persisting auth state in localStorage.
 * @type {string}
 */
const STORAGE_KEY = 'nexus_auth';

/**
 * Reads and parses auth state from localStorage.
 * Returns null on any error (missing, corrupted, expired token).
 * @returns {AuthState|null}
 */
function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken || !parsed?.role) return null;
    // Basic JWT expiry check (no signature verification — that's the server's job)
    const [, payloadB64] = parsed.accessToken.split('.');
    if (payloadB64) {
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persists auth state to localStorage. Silently skips on storage errors
 * (e.g. private-browsing quota, storage blocked by policy).
 * @param {AuthState|null} state
 */
function persistAuth(state) {
  try {
    if (state?.accessToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable — session stays in memory only
  }
}

// ─── AuthProvider ──────────────────────────────────────────────────────────

/**
 * Provides authentication state to the component tree.
 * Initialises from localStorage on mount.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const [auth, setAuthState] = useState(
    /** @returns {AuthState} */
    () => {
      const stored = readStoredAuth();
      return stored ?? {
        userId: null,
        role: null,
        username: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      };
    }
  );

  /** Updates auth state and keeps localStorage in sync. */
  const setAuth = useCallback((/** @type {AuthState|null} */ next) => {
    const resolved = next ?? {
      userId: null,
      role: null,
      username: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    };
    persistAuth(resolved);
    setAuthState(resolved);
  }, []);

  /** Clears all auth state and removes the stored token. */
  const logout = useCallback(() => {
    persistAuth(null);
    setAuthState({
      userId: null,
      role: null,
      username: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Convenience hook to consume the auth context.
 * Must be used inside an <AuthProvider>.
 * @returns {{ auth: AuthState, setAuth: Function, logout: Function }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>.');
  return ctx;
}

// ─── Role utilities ────────────────────────────────────────────────────────

/**
 * Returns true when the user's role satisfies at least one of the required roles.
 * Roles higher in the hierarchy implicitly satisfy lower-role requirements.
 *
 * Example: a user with role 'admin' satisfies ['moderator', 'dev', 'user'].
 *
 * @param {string} userRole
 * @param {string[]} requiredRoles
 * @returns {boolean}
 */
function hasRequiredRole(userRole, requiredRoles) {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  const userIdx = ROLE_HIERARCHY.indexOf(userRole);
  if (userIdx === -1) return false;
  return requiredRoles.some((r) => {
    const reqIdx = ROLE_HIERARCHY.indexOf(r);
    return reqIdx !== -1 && userIdx >= reqIdx;
  });
}

/**
 * Returns the dashboard path for a given role.
 * Falls back to '/dashboard' for unknown roles.
 * @param {string|null} role
 * @returns {string}
 */
export function getDashboardForRole(role) {
  return ROLE_DASHBOARD[role] ?? '/dashboard';
}

// ─── Access Denied UI ──────────────────────────────────────────────────────

/** @param {{ role: string|null, requiredRoles: string[] }} props */
function AccessDenied({ role, requiredRoles }) {
  const dashboard = getDashboardForRole(role);
  const requiredDisplay = requiredRoles.length > 0
    ? requiredRoles.join(', ')
    : 'a higher-privilege role';

  return (
    <div style={styles.wrapper} role="main" aria-labelledby="access-denied-title">
      <div style={styles.card}>
        {/* Icon */}
        <div style={styles.iconCircle} aria-hidden="true">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: '#ef4444' }}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>

        <h1 id="access-denied-title" style={styles.heading}>
          Access Denied
        </h1>

        <p style={styles.body}>
          This area requires{' '}
          <strong style={styles.highlight}>{requiredDisplay}</strong>{' '}
          access.
          {role ? (
            <>
              {' '}Your current role is{' '}
              <strong style={styles.highlight}>{role}</strong>.
            </>
          ) : (
            ' You are not signed in.'
          )}
        </p>

        <div style={styles.actions}>
          {role ? (
            <a href={dashboard} style={styles.primaryBtn}>
              Go to My Dashboard
            </a>
          ) : (
            <a href="/login" style={styles.primaryBtn}>
              Sign In
            </a>
          )}
          <button
            type="button"
            onClick={() => window.history.back()}
            style={styles.secondaryBtn}
          >
            Go Back
          </button>
        </div>

        {role && (
          <p style={styles.hint}>
            Need elevated access?{' '}
            <a href="/support" style={styles.link}>
              Contact your administrator
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Loading UI ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div style={styles.wrapper} role="status" aria-live="polite" aria-label="Checking permissions…">
      <div style={styles.spinner} aria-hidden="true" />
    </div>
  );
}

// ─── Redirect helper ───────────────────────────────────────────────────────

/**
 * Thin client-side redirect component (no router dependency).
 * Replace with <Navigate> from react-router-dom if using React Router.
 * @param {{ to: string }} props
 */
function Redirect({ to }) {
  useEffect(() => {
    window.location.href = to;
  }, [to]);
  return null;
}

// ─── RoleGuard ─────────────────────────────────────────────────────────────

/**
 * Wraps children with role-based access control.
 *
 * Props:
 * - `roles`           — array of role strings that may access the content.
 *                       Any role higher in the hierarchy than those listed also gains access.
 *                       Omit or pass [] to allow any authenticated user.
 * - `requireAuth`     — when true (default), unauthenticated users are redirected to /login.
 * - `redirectAuth`    — when true, authenticated users are redirected to their dashboard
 *                       (useful for login/register pages).
 * - `fallback`        — custom React node to render instead of the default AccessDenied UI.
 * - `loadingFallback` — custom React node to render while auth state is resolving.
 *
 * @param {{
 *   roles?: string[],
 *   requireAuth?: boolean,
 *   redirectAuth?: boolean,
 *   fallback?: React.ReactNode,
 *   loadingFallback?: React.ReactNode,
 *   children: React.ReactNode,
 * }} props
 */
export function RoleGuard({
  roles = [],
  requireAuth: requireAuthProp = true,
  redirectAuth = false,
  fallback,
  loadingFallback,
  children,
}) {
  const { auth } = useAuth();

  // While loading, show a spinner
  if (auth.isLoading) {
    return loadingFallback ?? <LoadingScreen />;
  }

  // Redirect authenticated users away from public-only pages (e.g. /login)
  if (redirectAuth && auth.isAuthenticated) {
    return <Redirect to={getDashboardForRole(auth.role)} />;
  }

  // Unauthenticated users
  if (!auth.isAuthenticated) {
    if (requireAuthProp) return <Redirect to="/login" />;
    // No auth required, but check roles anyway (unauthenticated → no role)
    if (roles.length > 0) {
      return fallback ?? <AccessDenied role={null} requiredRoles={roles} />;
    }
    return children;
  }

  // Authenticated — check role
  if (roles.length > 0 && !hasRequiredRole(auth.role, roles)) {
    return fallback ?? <AccessDenied role={auth.role} requiredRoles={roles} />;
  }

  return children;
}

// ─── DashboardRedirect ─────────────────────────────────────────────────────

/**
 * Redirects the authenticated user to their role-specific dashboard.
 * Redirects unauthenticated users to /login.
 *
 * Usage: place on the root / route to funnel users automatically.
 */
export function DashboardRedirect() {
  const { auth } = useAuth();

  if (auth.isLoading) return <LoadingScreen />;

  if (!auth.isAuthenticated) return <Redirect to="/login" />;

  return <Redirect to={getDashboardForRole(auth.role)} />;
}

// ─── withRoleGuard HOC ─────────────────────────────────────────────────────

/**
 * Higher-order component that wraps a component with RoleGuard.
 *
 * @template P
 * @param {React.ComponentType<P>} Component
 * @param {{ roles?: string[], requireAuth?: boolean }} [guardOptions={}]
 * @returns {React.ComponentType<P>}
 */
export function withRoleGuard(Component, guardOptions = {}) {
  const displayName = Component.displayName || Component.name || 'Component';

  function GuardedComponent(props) {
    return (
      <RoleGuard {...guardOptions}>
        <Component {...props} />
      </RoleGuard>
    );
  }

  GuardedComponent.displayName = `withRoleGuard(${displayName})`;
  return GuardedComponent;
}

// ─── Inline styles ─────────────────────────────────────────────────────────
// Using inline styles for zero-dependency portability.
// Replace with Tailwind classes or a CSS module if preferred.

/** @type {Record<string, React.CSSProperties>} */
const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '1rem',
    background: 'var(--bg, #0f1117)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    background: 'var(--card-bg, #1a1d27)',
    border: '1px solid var(--border, rgba(255,255,255,0.08))',
    borderRadius: '1rem',
    padding: '2.5rem 2rem',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
  },
  iconCircle: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.12)',
    marginBottom: '1.25rem',
  },
  heading: {
    margin: '0 0 0.75rem',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text, #f1f3f9)',
    letterSpacing: '-0.02em',
  },
  body: {
    margin: '0 0 1.75rem',
    fontSize: '0.9375rem',
    lineHeight: 1.6,
    color: 'var(--text-muted, #8b92a5)',
  },
  highlight: {
    color: 'var(--text, #f1f3f9)',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
    marginBottom: '1.25rem',
  },
  primaryBtn: {
    display: 'block',
    padding: '0.75rem 1.25rem',
    background: 'var(--primary, #6366f1)',
    color: '#fff',
    borderRadius: '0.5rem',
    fontWeight: 600,
    fontSize: '0.9375rem',
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.15s',
  },
  secondaryBtn: {
    display: 'block',
    padding: '0.75rem 1.25rem',
    background: 'transparent',
    color: 'var(--text-muted, #8b92a5)',
    borderRadius: '0.5rem',
    fontWeight: 500,
    fontSize: '0.9375rem',
    cursor: 'pointer',
    border: '1px solid var(--border, rgba(255,255,255,0.08))',
    width: '100%',
    transition: 'background 0.15s',
  },
  hint: {
    margin: 0,
    fontSize: '0.8125rem',
    color: 'var(--text-muted, #8b92a5)',
  },
  link: {
    color: 'var(--primary, #6366f1)',
    textDecoration: 'underline',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(99,102,241,0.2)',
    borderTop: '3px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

// Inject keyframe for spinner (once, idempotent)
if (typeof document !== 'undefined' && !document.getElementById('_rg_spin')) {
  const s = document.createElement('style');
  s.id = '_rg_spin';
  s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
}

// ─── Default export ────────────────────────────────────────────────────────

export default RoleGuard;
