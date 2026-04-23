// src/MainApp.jsx
// Nexus AI Pro — Root Application Shell with Navigation & Role Routing
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// 2026-04-23

import { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import {
  Shield, Activity, Code2, Cloud, CreditCard, Settings,
  Menu, X, LogOut, Bell, Globe, ChevronDown, User
} from 'lucide-react';
import { useAuth } from './auth/AuthSystem.jsx';
import '../src/i18n/index.js';

// Lazy-load heavy dashboard components
const AnalyticsDashboard     = lazy(() => import('./dashboards/AnalyticsDashboard.jsx'));
const SecurityDashboardEnhanced = lazy(() => import('./dashboards/SecurityDashboardEnhanced.jsx'));
const ProjectTrackingDashboard  = lazy(() => import('./dashboards/ProjectTrackingDashboard.jsx'));
const CloudConnectors           = lazy(() => import('./connectors/CloudConnectors.jsx'));
const RoleDashboardRouter       = lazy(() => import('./dashboards/RoleDashboards.jsx'));
const CheckoutSystem            = lazy(() => import('./payments/CheckoutSystem.jsx'));

const NAV_ITEMS = [
  { id: 'home',      label: 'nav.dashboard', icon: User,       roles: ['*'] },
  { id: 'analytics', label: 'nav.analytics', icon: Activity,   roles: ['admin','developer','moderator','user'] },
  { id: 'security',  label: 'nav.security',  icon: Shield,     roles: ['admin','developer'] },
  { id: 'projects',  label: 'nav.projects',  icon: Code2,      roles: ['admin','developer','user'] },
  { id: 'connectors',label: 'Connectors',    icon: Cloud,      roles: ['admin','developer'] },
];

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function LanguagePicker({ currentLang, onChange }) {
  const [open, setOpen] = useState(false);
  const LANGS = [
    { code: 'en', flag: '🇺🇸', label: 'EN' },
    { code: 'es', flag: '🇪🇸', label: 'ES' },
    { code: 'fr', flag: '🇫🇷', label: 'FR' },
    { code: 'de', flag: '🇩🇪', label: 'DE' },
    { code: 'ja', flag: '🇯🇵', label: 'JA' },
    { code: 'zh', flag: '🇨🇳', label: 'ZH' },
    { code: 'ko', flag: '🇰🇷', label: 'KO' },
    { code: 'ar', flag: '🇸🇦', label: 'AR' },
  ];
  const cur = LANGS.find(l => l.code === currentLang) || LANGS[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 px-2.5 py-1.5 rounded-lg text-sm text-white transition-colors">
        <Globe size={13} /> {cur.flag} {cur.label} <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden min-w-[120px]">
          {LANGS.map(l => (
            <button key={l.code} onClick={() => { onChange(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 transition-colors ${l.code === currentLang ? 'text-indigo-400' : 'text-gray-300'}`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MainApp() {
  const { user, logout, hasPermission } = useAuth();
  const { t, i18n } = useTranslation();
  const [activeSection, setActiveSection] = useState('home');
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [showCheckout, setShowCheckout]   = useState(false);
  const [socket, setSocket]               = useState(null);
  const [notifications, setNotifications] = useState(0);

  useEffect(() => {
    const s = io('/', { transports: ['websocket'], reconnectionAttempts: 3, timeout: 10000 });
    s.on('connect', () => setSocket(s));
    s.on('security:threat', () => setNotifications(n => n + 1));
    return () => s.disconnect();
  }, []);

  const canAccess = (item) => {
    if (item.roles.includes('*')) return true;
    return item.roles.includes(user?.role);
  };

  const visibleNav = NAV_ITEMS.filter(canAccess);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-200 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:flex`}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-800">
          <Shield size={22} className="text-indigo-400 flex-shrink-0" />
          <span className="font-bold text-white text-sm">Nexus AI Pro</span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {(user?.displayName || user?.username || 'U')[0]}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.displayName || user?.username}</div>
              <div className="text-xs text-gray-500 capitalize">{user?.role || 'user'}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
          {visibleNav.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                activeSection === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon size={15} />
              {t(item.label, item.label)}
            </button>
          ))}
        </nav>

        {/* Upgrade Button */}
        {user?.plan !== 'enterprise' && (
          <div className="px-4 py-3 border-t border-gray-800">
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5"
            >
              <CreditCard size={12} /> Upgrade Plan
            </button>
          </div>
        )}

        {/* Logout */}
        <div className="px-4 pb-4">
          <button onClick={logout} className="w-full flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 transition-colors py-2">
            <LogOut size={14} /> {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-400 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <LanguagePicker currentLang={i18n.language} onChange={i18n.changeLanguage.bind(i18n)} />
          <div className="relative">
            <button className="text-gray-400 hover:text-white relative">
              <Bell size={18} />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<LoadingSpinner />}>
            {activeSection === 'home'       && <RoleDashboardRouter />}
            {activeSection === 'analytics'  && <AnalyticsDashboard socket={socket} />}
            {activeSection === 'security'   && <SecurityDashboardEnhanced socket={socket} />}
            {activeSection === 'projects'   && <ProjectTrackingDashboard socket={socket} />}
            {activeSection === 'connectors' && <CloudConnectors />}
          </Suspense>
        </main>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <Suspense fallback={null}>
          <CheckoutSystem onClose={() => setShowCheckout(false)} />
        </Suspense>
      )}
    </div>
  );
}
