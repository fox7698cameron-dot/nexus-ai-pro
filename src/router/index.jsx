/**
 * src/router/index.jsx
 * Client-side router with role-based access control.
 * Separate dashboards: admin, dev, moderator, user.
 * Created: 2026-10-14
 */
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import {
  Shield, BarChart3, Gamepad2, CreditCard, Settings, User, Users,
  Code, Crown, ChevronLeft, Menu, X, LogOut, Globe, Bell, Lock, MessageSquare
} from 'lucide-react';
import { AuthSystem } from '../auth/AuthSystem.jsx';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard.jsx';
import { SecurityDashboardFull } from '../components/SecurityDashboardFull.jsx';
import { GameDevTracker } from '../components/GameDevTracker.jsx';
import { PaymentSystem } from '../components/PaymentSystem.jsx';
import { SUPPORTED_LANGUAGES, setLanguage, getLanguage } from '../i18n/index.js';
// Lazy-load the main chat UI to keep bundle splittable
const NexusAI = React.lazy(() => import('../../app.jsx'));

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const TOKEN_KEY = 'nexus:auth_token';
const USER_KEY  = 'nexus:user';

const ROLE_ICON = { admin: Crown, dev: Code, moderator: Shield, user: User };
const ROLE_COLOR = { admin: '#f59e0b', dev: '#6366f1', moderator: '#22c55e', user: '#38bdf8' };

const ROLE_NAV = {
  admin: [
    { id: 'chat',       label: 'AI Chat',    icon: MessageSquare, minRole: 'user' },
    { id: 'analytics',  label: 'Analytics',  icon: BarChart3,  minRole: 'user' },
    { id: 'security',   label: 'Security',   icon: Shield,     minRole: 'user' },
    { id: 'projects',   label: 'Projects',   icon: Gamepad2,   minRole: 'user' },
    { id: 'payments',   label: 'Billing',    icon: CreditCard, minRole: 'user' },
    { id: 'admin',      label: 'Admin',      icon: Crown,      minRole: 'admin' },
    { id: 'settings',   label: 'Settings',   icon: Settings,   minRole: 'user' }
  ],
  dev: [
    { id: 'chat',       label: 'AI Chat',    icon: MessageSquare, minRole: 'user' },
    { id: 'analytics',  label: 'Analytics',  icon: BarChart3,  minRole: 'user' },
    { id: 'security',   label: 'Security',   icon: Shield,     minRole: 'dev' },
    { id: 'projects',   label: 'Projects',   icon: Gamepad2,   minRole: 'user' },
    { id: 'payments',   label: 'Billing',    icon: CreditCard, minRole: 'user' },
    { id: 'settings',   label: 'Settings',   icon: Settings,   minRole: 'user' }
  ],
  moderator: [
    { id: 'chat',       label: 'AI Chat',    icon: MessageSquare, minRole: 'user' },
    { id: 'analytics',  label: 'Analytics',  icon: BarChart3,  minRole: 'user' },
    { id: 'security',   label: 'Security',   icon: Shield,     minRole: 'moderator' },
    { id: 'projects',   label: 'Projects',   icon: Gamepad2,   minRole: 'user' },
    { id: 'payments',   label: 'Billing',    icon: CreditCard, minRole: 'user' },
    { id: 'settings',   label: 'Settings',   icon: Settings,   minRole: 'user' }
  ],
  user: [
    { id: 'chat',       label: 'AI Chat',    icon: MessageSquare, minRole: 'user' },
    { id: 'analytics',  label: 'Analytics',  icon: BarChart3,  minRole: 'user' },
    { id: 'projects',   label: 'Projects',   icon: Gamepad2,   minRole: 'user' },
    { id: 'payments',   label: 'Billing',    icon: CreditCard, minRole: 'user' },
    { id: 'settings',   label: 'Settings',   icon: Settings,   minRole: 'user' }
  ]
};

const AdminDashboard = ({ user }) => (
  <div className="p-6 max-w-7xl mx-auto space-y-6">
    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
      <Crown className="text-yellow-400" size={28} /> Admin Dashboard
    </h1>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { label: 'Total Users', value: '2,847', trend: '+12%', color: '#6366f1' },
        { label: 'Active Sessions', value: '341', trend: '+5%', color: '#22c55e' },
        { label: 'Revenue (MRR)', value: '$18,420', trend: '+8%', color: '#f59e0b' },
        { label: 'API Calls / Day', value: '142K', trend: '+22%', color: '#38bdf8' },
        { label: 'Security Alerts', value: '3', trend: '-2', color: '#ef4444' },
        { label: 'Storage Used', value: '48 GB', trend: '+1.2 GB', color: '#ec4899' }
      ].map(stat => (
        <div key={stat.label} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="text-slate-400 text-sm">{stat.label}</div>
          <div className="text-2xl font-bold text-white mt-1">{stat.value}</div>
          <div className="text-xs mt-1" style={{ color: stat.color }}>{stat.trend} vs last month</div>
        </div>
      ))}
    </div>
    <div className="bg-slate-900/80 rounded-2xl border border-slate-700/50 p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Recent User Activity</h2>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-500 border-b border-slate-800">
          <th className="pb-2">User</th><th className="pb-2">Role</th><th className="pb-2">Action</th><th className="pb-2">Time</th>
        </tr></thead>
        <tbody>
          {[
            { user: 'alice@example.com', role: 'user', action: 'Login', time: '2m ago' },
            { user: 'bob@company.io', role: 'dev', action: 'API call', time: '5m ago' },
            { user: 'carol@app.net', role: 'moderator', action: 'Content review', time: '12m ago' },
            { user: 'dave@studio.vr', role: 'user', action: 'Subscription upgrade', time: '18m ago' }
          ].map((row, i) => (
            <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
              <td className="py-2 text-slate-300">{row.user}</td>
              <td className="py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">{row.role}</span></td>
              <td className="py-2 text-slate-400">{row.action}</td>
              <td className="py-2 text-slate-500">{row.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const SettingsDashboard = ({ user, onLanguageChange }) => {
  const [lang, setLang] = useState(getLanguage());
  const handleLang = (code) => { setLanguage(code); setLang(code); onLanguageChange?.(code); };
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Settings className="text-indigo-400" size={28} /> Settings
      </h1>
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Globe size={18} className="text-indigo-400" /> Language & Region</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {SUPPORTED_LANGUAGES.map(l => (
            <button key={l.code} onClick={() => handleLang(l.code)}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition-colors ${
                lang === l.code ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
              }`}>
              <span>{l.flag}</span><span>{l.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Lock size={18} className="text-indigo-400" /> Security</h2>
        <div className="space-y-3">
          {[
            { label: 'Two-Factor Authentication', status: 'Enabled', color: '#22c55e' },
            { label: 'Biometric Login', status: 'Available', color: '#6366f1' },
            { label: 'Active Sessions', status: '1 session', color: '#38bdf8' },
            { label: 'Last Password Change', status: 'Today', color: '#f59e0b' }
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-sm text-slate-300">{item.label}</span>
              <span className="text-sm font-medium" style={{ color: item.color }}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ nav, active, onNavigate, user, onLogout, collapsed, onToggle }) => {
  const RoleIcon = ROLE_ICON[user?.role || 'user'];
  return (
    <aside className={`flex flex-col bg-slate-950 border-r border-slate-800 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} min-h-screen`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-indigo-400" />
            <span className="font-bold text-white text-sm">Nexus AI Pro</span>
          </div>
        )}
        <button onClick={onToggle} className="text-slate-500 hover:text-white transition-colors ml-auto">
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
      </div>
      {/* User info */}
      <div className={`flex items-center gap-3 p-4 border-b border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${ROLE_COLOR[user?.role || 'user']}20` }}>
          <RoleIcon size={16} style={{ color: ROLE_COLOR[user?.role || 'user'] }} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.username || user?.email}</div>
            <div className="text-xs capitalize" style={{ color: ROLE_COLOR[user?.role || 'user'] }}>{user?.role || 'user'}</div>
          </div>
        )}
      </div>
      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {nav.map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active === item.id ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}>
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
      {/* Logout */}
      <div className="p-2 border-t border-slate-800">
        <button onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Logout' : undefined}>
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (stored && token) setUser(JSON.parse(stored));
    } catch (_) {}
    setLoading(false);
  }, []);

  const login = useCallback((authData) => {
    try {
      localStorage.setItem(TOKEN_KEY, authData.token);
      localStorage.setItem(USER_KEY, JSON.stringify(authData.user));
    } catch (_) {}
    setUser(authData.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } });
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (_) {}
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>;
}

function AppShell() {
  const { user, login, logout, loading } = useAuth();
  const [active, setActive] = useState('analytics');
  const [collapsed, setCollapsed] = useState(false);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-indigo-400 animate-spin"><Shield size={32} /></div>
    </div>
  );

  if (!user) return <AuthSystem onAuthSuccess={login} />;

  const role = user.role || 'user';
  const nav = ROLE_NAV[role] || ROLE_NAV.user;

  const renderPage = () => {
    switch (active) {
      case 'chat':       return (
        <React.Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400">Loading chat...</div>}>
          <NexusAI />
        </React.Suspense>
      );
      case 'analytics':  return <AnalyticsDashboard userRole={role} />;
      case 'security':   return <SecurityDashboardFull userRole={role} />;
      case 'projects':   return <GameDevTracker userRole={role} />;
      case 'payments':   return <PaymentSystem currentPlan={user.plan || 'free'} userId={user.id} />;
      case 'admin':      return role === 'admin' ? <AdminDashboard user={user} /> : <div className="p-6 text-slate-400">Access denied</div>;
      case 'settings':   return <SettingsDashboard user={user} />;
      default:           return (
        <React.Suspense fallback={<div className="flex items-center justify-center h-64 text-slate-400">Loading chat...</div>}>
          <NexusAI />
        </React.Suspense>
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar nav={nav} active={active} onNavigate={setActive} user={user} onLogout={logout} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}

export function AppRouter() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default AppRouter;
