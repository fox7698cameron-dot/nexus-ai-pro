// src/components/DashboardRouter.jsx
// Date: 2026-10-03
// Role-based dashboard routing: admin, dev, moderator, user

import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  LayoutDashboard, BarChart3, Shield, Code, Settings,
  Users, Wrench, Eye, Crown, LogOut, ChevronDown, Globe
} from 'lucide-react';

const AnalyticsDashboard    = lazy(() => import('./AnalyticsDashboard.jsx'));
const SecurityDashboardEnhanced = lazy(() => import('./SecurityDashboardEnhanced.jsx'));
const ProjectTracker        = lazy(() => import('./ProjectTracker.jsx'));
const CheckoutSystem        = lazy(() => import('./CheckoutSystem.jsx'));
const AuthSystem            = lazy(() => import('./AuthSystem.jsx'));

const ROLE_TABS = {
  user: [
    { id: 'analytics', label: 'Analytics',  icon: BarChart3,       component: AnalyticsDashboard },
    { id: 'projects',  label: 'Projects',   icon: Code,            component: ProjectTracker },
    { id: 'security',  label: 'Security',   icon: Shield,          component: SecurityDashboardEnhanced }
  ],
  dev: [
    { id: 'projects',  label: 'Projects',   icon: Code,            component: ProjectTracker },
    { id: 'analytics', label: 'Analytics',  icon: BarChart3,       component: AnalyticsDashboard },
    { id: 'security',  label: 'Security',   icon: Shield,          component: SecurityDashboardEnhanced }
  ],
  moderator: [
    { id: 'security',  label: 'Security',   icon: Shield,          component: SecurityDashboardEnhanced },
    { id: 'analytics', label: 'Analytics',  icon: BarChart3,       component: AnalyticsDashboard },
    { id: 'projects',  label: 'Projects',   icon: Code,            component: ProjectTracker }
  ],
  admin: [
    { id: 'analytics', label: 'Analytics',  icon: BarChart3,       component: AnalyticsDashboard },
    { id: 'security',  label: 'Security',   icon: Shield,          component: SecurityDashboardEnhanced },
    { id: 'projects',  label: 'Projects',   icon: Code,            component: ProjectTracker }
  ]
};

const ROLE_BADGE = {
  user:      { label: 'User',      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',   icon: '👤' },
  dev:       { label: 'Developer', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: '💻' },
  moderator: { label: 'Moderator', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: '🛡️' },
  admin:     { label: 'Admin',     color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: '👑' }
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    </div>
  );
}

export default function DashboardRouter({ onSignOut }) {
  const [role, setRole] = useState(() => localStorage.getItem('nexus:role') || 'user');
  const [activeTab, setActiveTab] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [user, setUser] = useState(() => ({
    username: localStorage.getItem('nexus:username') || 'User',
    email: localStorage.getItem('nexus:email') || '',
    role: localStorage.getItem('nexus:role') || 'user'
  }));

  const tabs = ROLE_TABS[role] || ROLE_TABS.user;

  useEffect(() => {
    if (!activeTab || !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id);
    }
  }, [role, tabs, activeTab]);

  useEffect(() => {
    const storedRole = localStorage.getItem('nexus:role');
    if (storedRole && storedRole !== role) setRole(storedRole);
  }, []);

  const handleSignOut = () => {
    ['nexus:accessToken', 'nexus:refreshToken', 'nexus:userId', 'nexus:role', 'nexus:username', 'nexus:email']
      .forEach(k => localStorage.removeItem(k));
    onSignOut?.();
  };

  const badge = ROLE_BADGE[role] || ROLE_BADGE.user;
  const activeTabMeta = tabs.find(t => t.id === activeTab);
  const ActiveComponent = activeTabMeta?.component;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">N</div>
            <span className="font-bold text-gray-900 dark:text-white hidden sm:inline">Nexus AI Pro</span>
          </div>

          {/* Tab navigation */}
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <TabIcon size={15} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCheckout(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Crown size={13} />
              <span className="hidden sm:inline">Upgrade</span>
            </button>

            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                {badge.icon} {badge.label}
              </span>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto">
        <Suspense fallback={<LoadingFallback />}>
          {ActiveComponent && <ActiveComponent />}
        </Suspense>
      </main>

      {showCheckout && <CheckoutSystem onClose={() => setShowCheckout(false)} />}
    </div>
  );
}
