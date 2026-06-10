// src/components/MainDashboard.jsx | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10
// Unified top-level dashboard router for all roles

import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  LayoutDashboard, BarChart2, Shield, FolderKanban, Settings,
  LogOut, CreditCard, Menu, X, Bell, User, ChevronDown,
  Sun, Moon, Gamepad2, Loader2
} from 'lucide-react';

import LanguageSelector from './LanguageSelector.jsx';

const AnalyticsDashboard     = lazy(() => import('./AnalyticsDashboard.jsx'));
const SecurityDashboardV2    = lazy(() => import('./SecurityDashboardV2.jsx'));
const ProjectTrackingDashboard = lazy(() => import('./ProjectTrackingDashboard.jsx'));
const SubscriptionPanel      = lazy(() => import('./SubscriptionPanel.jsx'));
const AuthForms              = lazy(() => import('./AuthForms.jsx'));

const VIEWS = {
  home:      { label: 'Overview',   icon: LayoutDashboard,  roles: ['admin','dev','moderator','user'] },
  analytics: { label: 'Analytics',  icon: BarChart2,         roles: ['admin','dev','moderator','user'] },
  security:  { label: 'Security',   icon: Shield,            roles: ['admin','dev','moderator'] },
  projects:  { label: 'Projects',   icon: FolderKanban,      roles: ['admin','dev','user'] },
  games:     { label: 'Games & AR', icon: Gamepad2,          roles: ['admin','dev','user'] },
  billing:   { label: 'Billing',    icon: CreditCard,        roles: ['admin','user'] },
  settings:  { label: 'Settings',   icon: Settings,          roles: ['admin','dev','moderator','user'] }
};

function Spinner() {
  return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="animate-spin text-blue-400" size={32} />
    </div>
  );
}

function HomeOverview({ user, theme }) {
  const isDark = theme === 'dark';
  const cards = [
    { label: 'Role',        value: user?.role || 'user',    color: 'text-blue-400'   },
    { label: 'Plan',        value: user?.plan || 'Free',    color: 'text-green-400'  },
    { label: 'MFA',         value: user?.mfaEnabled ? 'Enabled' : 'Disabled', color: user?.mfaEnabled ? 'text-green-400' : 'text-red-400' },
    { label: 'API Calls',   value: user?.apiUsage || '0',   color: 'text-purple-400' }
  ];

  return (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Welcome back, {user?.displayName || user?.username || 'User'} 👋
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`rounded-xl p-4 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{c.label}</p>
            <p className={`text-lg font-bold capitalize ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MainDashboard() {
  const [user,      setUser]      = useState(null);
  const [view,      setView]      = useState('home');
  const [theme,     setTheme]     = useState(() => localStorage.getItem('nexus_theme') || 'dark');
  const [sidebarOpen, setSidebar] = useState(false);
  const [notifs,    setNotifs]    = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [userMenuOpen, setUserMenu] = useState(false);

  const isDark = theme === 'dark';
  const bg     = isDark ? 'bg-gray-950 text-white'  : 'bg-gray-100 text-gray-900';
  const sidebar = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const nav     = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';

  useEffect(() => {
    localStorage.setItem('nexus_theme', theme);
    document.documentElement.classList.toggle('dark', isDark);
  }, [theme, isDark]);

  useEffect(() => {
    // Attempt to load current user from session
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${sessionStorage.getItem('nexus_token') || ''}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  function handleLogin(userData, token) {
    sessionStorage.setItem('nexus_token', token);
    setUser(userData);
    setView('home');
  }

  function handleLogout() {
    sessionStorage.removeItem('nexus_token');
    setUser(null);
    setView('home');
  }

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-950' : 'bg-gray-100'}`}>
        <Suspense fallback={<Spinner />}>
          <AuthForms theme={theme} onLogin={handleLogin} onLanguageChange={() => {}} />
        </Suspense>
      </div>
    );
  }

  const allowedViews = Object.entries(VIEWS).filter(([, v]) => v.roles.includes(user.role));

  function renderView() {
    switch (view) {
    case 'analytics': return <AnalyticsDashboard theme={theme} />;
    case 'security':  return <SecurityDashboardV2 theme={theme} />;
    case 'projects':  return <ProjectTrackingDashboard theme={theme} projectFilter="coding" />;
    case 'games':     return <ProjectTrackingDashboard theme={theme} projectFilter="game-dev" />;
    case 'billing':   return <SubscriptionPanel theme={theme} userId={user.id} customerId={user.stripeCustomerId} />;
    case 'settings':  return <SettingsPanel user={user} theme={theme} onThemeChange={setTheme} />;
    default:          return <HomeOverview user={user} theme={theme} />;
    }
  }

  return (
    <div className={`min-h-screen flex ${bg}`}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebar(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-60 border-r z-30 flex flex-col transition-transform ${sidebar}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <span className="font-bold text-blue-400 text-lg">Nexus AI Pro</span>
          <button onClick={() => setSidebar(false)} className="lg:hidden text-gray-400"><X size={18} /></button>
        </div>

        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          {allowedViews.map(([key, v]) => {
            const Icon = v.icon;
            return (
              <button
                key={key}
                onClick={() => { setView(key); setSidebar(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors ${
                  view === key
                    ? 'bg-blue-700 text-white'
                    : isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                {v.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-sm text-red-400 hover:text-red-300 py-2 px-2 rounded-lg hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-60">
        {/* Top nav */}
        <header className={`sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b ${nav}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebar(true)} className="lg:hidden text-gray-400"><Menu size={20} /></button>
            <h1 className="font-semibold capitalize text-sm">
              {VIEWS[view]?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector theme={theme} />

            <button onClick={toggleTheme} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-yellow-400' : 'hover:bg-gray-200 text-gray-600'}`}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="relative">
              <button onClick={() => setShowNotifs(n => !n)} className={`p-2 rounded-lg relative ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}>
                <Bell size={16} />
                {notifs.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />}
              </button>
              {showNotifs && (
                <div className={`absolute right-0 mt-1 w-72 rounded-xl border shadow-2xl p-3 z-50 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <p className="text-xs font-semibold text-gray-400 mb-2">Notifications</p>
                  {notifs.length === 0 ? <p className="text-sm text-gray-500">No new notifications</p> : notifs.map((n, i) => <p key={i} className="text-sm py-1">{n}</p>)}
                </div>
              )}
            </div>

            <div className="relative">
              <button onClick={() => setUserMenu(m => !m)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}>
                <User size={14} />
                <span className="hidden sm:inline max-w-[120px] truncate">{user.displayName || user.username}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                  user.role === 'admin' ? 'bg-red-900 text-red-300' :
                    user.role === 'dev'   ? 'bg-purple-900 text-purple-300' :
                      user.role === 'moderator' ? 'bg-yellow-900 text-yellow-300' :
                        'bg-gray-700 text-gray-300'
                }`}>{user.role}</span>
                <ChevronDown size={12} />
              </button>
              {userMenuOpen && (
                <div className={`absolute right-0 mt-1 w-48 rounded-xl border shadow-2xl z-50 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <button onClick={() => { setView('settings'); setUserMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>Settings</button>
                  <button onClick={() => { setView('billing'); setUserMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>Billing</button>
                  <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20">Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Suspense fallback={<Spinner />}>
            {renderView()}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function SettingsPanel({ user, theme, onThemeChange }) {
  const isDark = theme === 'dark';
  const card   = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-xl font-bold">Settings</h2>
      <div className={`rounded-xl border p-4 space-y-4 ${card}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Theme</span>
          <button
            onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
            className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold"
          >
            {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Email</span>
          <span className="text-sm text-gray-400">{user.email}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Role</span>
          <span className="text-sm capitalize text-blue-400">{user.role}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">MFA Status</span>
          <span className={`text-sm ${user.mfaEnabled ? 'text-green-400' : 'text-red-400'}`}>
            {user.mfaEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
    </div>
  );
}
