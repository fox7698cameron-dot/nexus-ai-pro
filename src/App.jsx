// nexus-ai-pro/src/App.jsx | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Main app shell with role-based routing and i18n

import { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/index.js';

// Lazy-loaded dashboards for code splitting
const AuthPage        = lazy(() => import('./components/Auth/AuthPage.jsx'));
const AnalyticsDash   = lazy(() => import('./dashboards/AnalyticsDashboard.jsx'));
const SecurityDash    = lazy(() => import('./dashboards/SecurityDashboard.jsx'));
const ProjectTracker  = lazy(() => import('./dashboards/ProjectTracker.jsx'));
const AdminDash       = lazy(() => import('./dashboards/AdminDashboard.jsx'));
const CheckoutPage    = lazy(() => import('./components/Checkout/CheckoutPage.jsx'));

// Existing main app (chat, memory, workflows)
const MainApp         = lazy(() => import('../app.jsx'));

const ROLE_RANK = { user: 0, moderator: 1, developer: 2, admin: 3, superadmin: 4 };

function hasRole(userRole, required) {
  return (ROLE_RANK[userRole] ?? -1) >= (ROLE_RANK[required] ?? 999);
}

function RequireAuth({ children, requiredRole }) {
  const user = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (requiredRole && !hasRole(user.role, requiredRole)) return <Navigate to="/dashboard" replace />;
  return children;
}

function useAuth() {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function RoleDefaultRedirect() {
  const user = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (hasRole(user.role, 'admin')) return <Navigate to="/admin" replace />;
  return <Navigate to="/chat" replace />;
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/auth"     element={<AuthPage onAuthenticated={() => window.location.href = '/dashboard'} />} />
            <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />

            {/* Default redirect */}
            <Route path="/"         element={<RoleDefaultRedirect />} />
            <Route path="/dashboard" element={<RoleDefaultRedirect />} />

            {/* User */}
            <Route path="/chat"      element={<RequireAuth><MainApp /></RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth><AnalyticsDash /></RequireAuth>} />
            <Route path="/projects"  element={<RequireAuth><ProjectTracker /></RequireAuth>} />
            <Route path="/security"  element={<RequireAuth requiredRole="developer"><SecurityDash /></RequireAuth>} />

            {/* Admin */}
            <Route path="/admin"     element={<RequireAuth requiredRole="admin"><AdminDash /></RequireAuth>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </I18nextProvider>
  );
}
