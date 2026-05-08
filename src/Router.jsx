// src/Router.jsx
// Nexus AI Pro - Top-level Application Router with Role-Based Access
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  Shield, BarChart3, Gamepad2, CreditCard, MessageSquare,
  Settings, LogOut, Menu, X, ChevronRight, Loader2, User,
  Globe, Code, Bell, Moon, Sun
} from 'lucide-react';

// Lazy-load heavy dashboard components
const AnalyticsDashboard = lazy(() => import('./dashboards/AnalyticsDashboard.jsx'));
const SecurityDashboard = lazy(() => import('./dashboards/SecurityDashboard.jsx'));
const ProjectTracker = lazy(() => import('./dashboards/ProjectTracker.jsx'));
const Checkout = lazy(() => import('./payments/Checkout.jsx'));
const RoleDashboard = lazy(() => import('./admin/AdminDashboard.jsx'));
const AuthPages = lazy(() => import('./auth/AuthPages.jsx'));

// Chat is the existing app — keep it
const Chat = lazy(() => import('../app.jsx'));

// Navigation items per role
const NAV_ITEMS = {
  all: [
    { id: 'chat', label: 'AI Chat', icon: MessageSquare, roles: ['admin', 'dev', 'moderator', 'user'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'dev', 'moderator', 'user'] },
    { id: 'security', label: 'Security', icon: Shield, roles: ['admin', 'dev', 'moderator', 'user'] },
    { id: 'projects', label: 'Projects', icon: Code, roles: ['admin', 'dev', 'moderator', 'user'] },
    { id: 'payments', label: 'Billing', icon: CreditCard, roles: ['admin', 'dev', 'moderator', 'user'] },
    { id: 'admin', label: 'Admin', icon: Settings, roles: ['admin', 'dev', 'moderator'] },
  ],
};

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-purple-500 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onClick(item.id)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium w-full transition-all ${
        active
          ? 'bg-purple-600 text-white shadow-sm'
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      <Icon size={16} />
      <span>{item.label}</span>
    </button>
  );
}

function TopBar({ user, onLogout, darkMode, onToggleDark, onMenuToggle, sidebarOpen }) {
  return (
    <header className="h-14 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors lg:hidden"
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm hidden sm:block">Nexus AI Pro</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleDark}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
          <Bell size={16} />
        </button>
        {user && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-800">
              <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                <User size={12} className="text-white" />
              </div>
              <span className="text-xs text-gray-300 hidden sm:block capitalize">{user.role}</span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function Sidebar({ user, activeView, onNavigate, sidebarOpen, onClose }) {
  const visibleNav = NAV_ITEMS.all.filter(item =>
    user && item.roles.includes(user.role)
  );
  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`fixed top-14 left-0 bottom-0 w-56 bg-gray-900 border-r border-gray-700 p-3 z-40 transform transition-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-1">
          {visibleNav.map(item => (
            <NavItem
              key={item.id}
              item={item}
              active={activeView === item.id}
              onClick={(id) => { onNavigate(id); onClose(); }}
            />
          ))}
        </div>
        {/* Role badge */}
        {user && (
          <div className="absolute bottom-4 left-3 right-3">
            <div className="p-3 rounded-xl bg-gray-800 border border-gray-700">
              <p className="text-xs text-gray-400">Signed in as</p>
              <p className="text-sm font-semibold text-white truncate mt-0.5">{user.username || user.userId}</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${
                user.role === 'admin' ? 'bg-red-900/50 text-red-300' :
                user.role === 'dev' ? 'bg-blue-900/50 text-blue-300' :
                user.role === 'moderator' ? 'bg-yellow-900/50 text-yellow-300' :
                'bg-gray-700 text-gray-300'
              }`}>{user.role}</span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function getStoredAuth() {
  const token = sessionStorage.getItem('nexus_access_token');
  const role = sessionStorage.getItem('nexus_role') || 'user';
  const userId = sessionStorage.getItem('nexus_user_id') || '';
  if (!token) return null;
  return { token, role, userId };
}

export default function AppRouter() {
  const [auth, setAuth] = useState(null);
  const [activeView, setActiveView] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) setAuth(stored);
    setInitialized(true);
  }, []);

  // Apply dark mode class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleAuthenticated = useCallback((data) => {
    setAuth({
      token: data.accessToken,
      role: data.role || 'user',
      userId: data.userId || '',
    });
    // Set default view based on role
    const defaultViews = { admin: 'admin', dev: 'projects', moderator: 'admin', user: 'chat' };
    setActiveView(defaultViews[data.role] || 'chat');
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('nexus_access_token');
    sessionStorage.removeItem('nexus_refresh_token');
    sessionStorage.removeItem('nexus_role');
    sessionStorage.removeItem('nexus_user_id');
    setAuth(null);
    setActiveView('chat');
  }, []);

  if (!initialized) return <LoadingSpinner />;

  if (!auth) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AuthPages onAuthenticated={handleAuthenticated} />
      </Suspense>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'analytics':
        return <AnalyticsDashboard userId={auth.userId} accessToken={auth.token} />;
      case 'security':
        return <SecurityDashboard accessToken={auth.token} />;
      case 'projects':
        return <ProjectTracker userId={auth.userId} accessToken={auth.token} />;
      case 'payments':
        return <Checkout currentPlan="free" userId={auth.userId} />;
      case 'admin':
        return <RoleDashboard role={auth.role} userId={auth.userId} accessToken={auth.token} />;
      case 'chat':
      default:
        return <Chat />;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <TopBar
        user={auth}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(v => !v)}
        onMenuToggle={() => setSidebarOpen(v => !v)}
        sidebarOpen={sidebarOpen}
      />
      <Sidebar
        user={auth}
        activeView={activeView}
        onNavigate={setActiveView}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {/* Main content — offset for fixed header and sidebar */}
      <main className="pt-14 lg:pl-56 min-h-screen">
        <Suspense fallback={<LoadingSpinner />}>
          {renderView()}
        </Suspense>
      </main>
    </div>
  );
}
