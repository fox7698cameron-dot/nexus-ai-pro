// src/DashboardRouter.jsx
// Nexus AI Pro — Unified Dashboard Router
// Routes users to role-appropriate dashboards
// Updated: 2026-05-03

import React, { Suspense, lazy, useState } from 'react';
import {
  BarChart3, Shield, Target, Gamepad2, CreditCard,
  Settings, LogOut, Menu, X, Bell, ChevronRight,
  Crown, Code, Wrench, User
} from 'lucide-react';
import { useAuth, RoleBadge } from './auth/AuthSystem.jsx';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from './i18n/i18n.js';

// Lazy-load dashboards to avoid large initial bundle
const AnalyticsDashboard = lazy(() => import('./dashboards/AnalyticsDashboard.jsx'));
const SecurityDashboard  = lazy(() => import('./dashboards/SecurityDashboard.jsx'));
const ProjectTracking    = lazy(() => import('./dashboards/ProjectTracking.jsx'));
const GameConnectors     = lazy(() => import('./integrations/GameConnectors.jsx'));

const ROLE_NAV = {
  admin:     ['analytics','security','projects','gaming','payments','settings'],
  dev:       ['analytics','security','projects','gaming','settings'],
  moderator: ['analytics','security','settings'],
  user:      ['analytics','projects','gaming','payments','settings'],
};

const NAV_ITEMS = [
  { key: 'analytics', label: 'Analytics',  icon: <BarChart3 size={18} />,  color: 'text-blue-600'   },
  { key: 'security',  label: 'Security',   icon: <Shield size={18} />,     color: 'text-red-600'    },
  { key: 'projects',  label: 'Projects',   icon: <Target size={18} />,     color: 'text-green-600'  },
  { key: 'gaming',    label: 'Gaming',     icon: <Gamepad2 size={18} />,   color: 'text-purple-600' },
  { key: 'payments',  label: 'Payments',   icon: <CreditCard size={18} />, color: 'text-orange-600' },
  { key: 'settings',  label: 'Settings',   icon: <Settings size={18} />,   color: 'text-gray-600'   },
];

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const CheckoutSystem = lazy(() => import('./payments/CheckoutSystem.jsx'));

function PaymentsPanel({ userRole }) {
  const [showCheckout, setShowCheckout] = useState(false);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">💳 Plans & Billing</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-2xl">
        {[
          { key: 'pro',        name: 'Pro',        price: '$9.99/mo',  features: ['Unlimited chats','All models','Analytics'],        gradient: 'from-blue-500 to-cyan-500' },
          { key: 'enterprise', name: 'Enterprise', price: '$14.99/mo', features: ['Everything in Pro','API access','Custom models'],  gradient: 'from-purple-500 to-pink-500' }
        ].map(plan => (
          <div key={plan.key} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className={`bg-gradient-to-br ${plan.gradient} p-5 text-white`}>
              <h3 className="font-bold text-xl">{plan.name}</h3>
              <p className="text-2xl font-bold mt-1">{plan.price}</p>
            </div>
            <div className="p-5">
              <ul className="space-y-2 mb-4">
                {plan.features.map(f => <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><span className="text-green-500">✓</span>{f}</li>)}
              </ul>
              <button
                onClick={() => setShowCheckout(plan.key)}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Subscribe
              </button>
            </div>
          </div>
        ))}
      </div>
      {showCheckout && (
        <Suspense fallback={<LoadingSpinner />}>
          <CheckoutSystem
            plan={showCheckout}
            billing="monthly"
            onClose={() => setShowCheckout(false)}
            onSuccess={() => setShowCheckout(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

function SettingsPanel({ userRole }) {
  const { i18n } = useTranslation();
  const [lang, setLang] = useState(i18n.language || 'en');

  const changeLang = (code) => {
    setLang(code);
    i18n.changeLanguage(code);
    document.documentElement.lang = code;
  };

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">⚙️ Settings</h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Language & Region</h3>
        <select
          value={lang}
          onChange={e => changeLang(e.target.value)}
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white"
        >
          {SUPPORTED_LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.flag} {l.label} ({l.region})</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function DashboardRouter() {
  const { user, logout } = useAuth();
  const { t } = useTranslation('dashboard');
  const [active, setActive] = useState('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const role = user?.role || 'user';
  const allowedItems = (ROLE_NAV[role] || ROLE_NAV.user)
    .map(key => NAV_ITEMS.find(n => n.key === key))
    .filter(Boolean);

  const renderDashboard = () => {
    switch (active) {
      case 'analytics':
        return <Suspense fallback={<LoadingSpinner />}><AnalyticsDashboard userRole={role} /></Suspense>;
      case 'security':
        return <Suspense fallback={<LoadingSpinner />}><SecurityDashboard userRole={role} /></Suspense>;
      case 'projects':
        return <Suspense fallback={<LoadingSpinner />}><ProjectTracking /></Suspense>;
      case 'gaming':
        return <Suspense fallback={<LoadingSpinner />}><GameConnectors /></Suspense>;
      case 'payments':
        return <PaymentsPanel userRole={role} />;
      case 'settings':
        return <SettingsPanel userRole={role} />;
      default:
        return <div className="p-6 text-gray-500">Select a section from the sidebar</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-200`}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">N</div>
          {sidebarOpen && <span className="font-bold text-gray-900 dark:text-white">Nexus AI Pro</span>}
          <button onClick={() => setSidebarOpen(s => !s)} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* User info */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{user?.username || user?.email}</div>
                <RoleBadge role={role} />
              </div>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {allowedItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActive(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                active === item.key
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className={active === item.key ? item.color : ''}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
              {sidebarOpen && active === item.key && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-t border-gray-100 dark:border-gray-800"
        >
          <LogOut size={18} />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {renderDashboard()}
      </main>
    </div>
  );
}
