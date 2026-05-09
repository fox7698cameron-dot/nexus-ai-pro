// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File: src/AppRouter.jsx | Last updated: 2026-05-09

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import AuthSystem from './auth/AuthSystem.jsx';

// Lazy-load heavy dashboard components to reduce initial bundle
const AnalyticsDashboard = lazy(() => import('./dashboards/AnalyticsDashboard.jsx'));
const ProjectTracker     = lazy(() => import('./dashboards/ProjectTracker.jsx'));
const GameDashboard      = lazy(() => import('./dashboards/GameDashboard.jsx'));
const SecurityDashboardV2 = lazy(() => import('./dashboards/SecurityDashboardV2.jsx'));
const AdminDashboard     = lazy(() => import('./dashboards/AdminDashboard.jsx'));
const Checkout           = lazy(() => import('./payment/Checkout.jsx'));

// Inline spinner for Suspense fallback
function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Guard: redirect to /login if not authenticated
function RequireAuth({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Guard: require specific roles
function RequireRole({ user, roles, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

const NAV_ITEMS = [
  { path: '/',          label: 'Chat',       icon: '💬', roles: null },
  { path: '/analytics', label: 'Analytics',  icon: '📊', roles: null },
  { path: '/projects',  label: 'Projects',   icon: '🗂️',  roles: null },
  { path: '/games',     label: 'Games',      icon: '🎮', roles: null },
  { path: '/security',  label: 'Security',   icon: '🛡️',  roles: null },
  { path: '/checkout',  label: 'Plans',      icon: '💳', roles: null },
  { path: '/admin',     label: 'Admin',      icon: '⚙️',  roles: ['admin', 'dev', 'moderator'] },
];

function NavBar({ user, onLogout }) {
  const location = useLocation();
  const visible = NAV_ITEMS.filter(item => !item.roles || item.roles.includes(user?.role));

  return (
    <nav className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center gap-2 flex-wrap">
      <span className="text-indigo-400 font-bold mr-4 whitespace-nowrap">⚡ Nexus AI Pro</span>
      <div className="flex gap-1 flex-wrap flex-1">
        {visible.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-3 py-1.5 rounded text-sm transition-colors ${
              location.pathname === item.path
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3 text-sm text-gray-400 ml-auto">
        <span className="hidden sm:block">{user?.username}</span>
        <span className="px-2 py-0.5 rounded bg-gray-700 text-xs uppercase">{user?.role}</span>
        <button
          onClick={onLogout}
          className="px-3 py-1.5 rounded bg-red-900/50 hover:bg-red-900 text-red-300 transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

// Language selector component
function LanguageSelector() {
  const LOCALES = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko', 'pt', 'ar', 'hi', 'ru', 'it'];
  const [current, setCurrent] = useState(localStorage.getItem('nexus_language') || 'en');

  function handleChange(e) {
    const lang = e.target.value;
    setCurrent(lang);
    localStorage.setItem('nexus_language', lang);
    // Trigger i18n language change if available
    if (window.i18nInstance) window.i18nInstance.changeLanguage(lang);
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      className="bg-gray-800 border border-gray-600 text-gray-300 text-xs rounded px-2 py-1"
      aria-label="Select language"
    >
      {LOCALES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
    </select>
  );
}

// Lazy-load main AI chat app so it doesn't block dashboard routes
const NexusAI = lazy(() => import('../app.jsx'));

export default function AppRouter() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    const stored = localStorage.getItem('nexus_user');
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore malformed */ }
    }
    setBooting(false);
  }, []);

  function handleAuthSuccess(userData) {
    setUser(userData);
  }

  function handleLogout() {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    localStorage.removeItem('nexus_role');
    setUser(null);
  }

  if (booting) return <Spinner />;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {user && <NavBar user={user} onLogout={handleLogout} />}
        {user && (
          <div className="absolute top-2 right-36 z-50">
            <LanguageSelector />
          </div>
        )}
        <div className="flex-1">
          <Suspense fallback={<Spinner />}>
            <Routes>
              <Route
                path="/login"
                element={user ? <Navigate to="/" replace /> : <AuthSystem onAuthSuccess={handleAuthSuccess} />}
              />
              <Route
                path="/"
                element={
                  <RequireAuth user={user}>
                    <NexusAI />
                  </RequireAuth>
                }
              />
              <Route
                path="/analytics"
                element={
                  <RequireAuth user={user}>
                    <AnalyticsDashboard user={user} />
                  </RequireAuth>
                }
              />
              <Route
                path="/projects"
                element={
                  <RequireAuth user={user}>
                    <ProjectTracker user={user} />
                  </RequireAuth>
                }
              />
              <Route
                path="/games"
                element={
                  <RequireAuth user={user}>
                    <GameDashboard user={user} />
                  </RequireAuth>
                }
              />
              <Route
                path="/security"
                element={
                  <RequireAuth user={user}>
                    <SecurityDashboardV2 user={user} />
                  </RequireAuth>
                }
              />
              <Route
                path="/checkout"
                element={
                  <RequireAuth user={user}>
                    <Checkout user={user} onSuccess={() => {}} />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireRole user={user} roles={['admin', 'dev', 'moderator']}>
                    <AdminDashboard user={user} />
                  </RequireRole>
                }
              />
              <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </BrowserRouter>
  );
}
