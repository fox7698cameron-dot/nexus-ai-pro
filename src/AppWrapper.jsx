/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * 2026-07-29 - App wrapper: auth gate, role-based routing, dashboard navigation
 */

import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  Shield, Activity, Folder, CreditCard, Plug, Settings,
  LogOut, ChevronDown, Menu, X, Globe, MessageSquare,
  ShieldCheck, Loader2
} from 'lucide-react';

// Lazy-load heavy dashboards
const AuthScreen = lazy(() => import('./dashboards/AuthScreen.jsx'));
const AnalyticsDashboard = lazy(() => import('./dashboards/AnalyticsDashboard.jsx'));
const SecurityDashboardPro = lazy(() => import('./dashboards/SecurityDashboardPro.jsx'));
const ProjectDashboard = lazy(() => import('./dashboards/ProjectDashboard.jsx'));
const AdminDashboard = lazy(() => import('./dashboards/AdminDashboard.jsx'));

const AUTH_KEY = 'nexus:auth';

const ROLE_NAV = {
  admin:     ['chat', 'analytics', 'security', 'projects', 'connectors', 'admin', 'settings'],
  dev:       ['chat', 'analytics', 'security', 'projects', 'connectors', 'settings'],
  moderator: ['chat', 'analytics', 'projects', 'settings'],
  user:      ['chat', 'analytics', 'projects', 'settings']
};

const NAV_ITEMS = [
  { id: 'chat',       label: 'AI Chat',     icon: MessageSquare, color: 'text-blue-400' },
  { id: 'analytics',  label: 'Analytics',   icon: Activity,      color: 'text-green-400' },
  { id: 'security',   label: 'Security',    icon: Shield,        color: 'text-red-400' },
  { id: 'projects',   label: 'Projects',    icon: Folder,        color: 'text-purple-400' },
  { id: 'connectors', label: 'Connectors',  icon: Plug,          color: 'text-yellow-400' },
  { id: 'admin',      label: 'Admin',       icon: ShieldCheck,   color: 'text-rose-400' },
  { id: 'settings',   label: 'Settings',    icon: Settings,      color: 'text-gray-400' }
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <Loader2 className="animate-spin text-blue-400" size={32} />
    </div>
  );
}

function ConnectorsBrowser({ authToken }) {
  const [catalog, setCatalog] = useState([]);
  const [connections, setConnections] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${authToken}` };

  useEffect(() => {
    Promise.all([
      fetch('/api/connectors/catalog', { headers }).then(r => r.json()),
      fetch('/api/connectors', { headers }).then(r => r.json())
    ]).then(([cat, conn]) => {
      setCatalog(cat.connectors || []);
      setConnections(conn.connections || []);
    }).finally(() => setLoading(false));
  }, [authToken]);

  const connectedIds = new Set(connections.map(c => c.connectorId));
  const categories = ['all', ...new Set(catalog.map(c => c.category))];
  const filtered = filter === 'all' ? catalog : catalog.filter(c => c.category === filter);

  const toggle = async (connectorId) => {
    if (connectedIds.has(connectorId)) {
      await fetch(`/api/connectors/${connectorId}`, { method: 'DELETE', headers });
    } else {
      await fetch(`/api/connectors/${connectorId}`, {
        method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: {} })
      });
    }
    const res = await fetch('/api/connectors', { headers });
    setConnections((await res.json()).connections || []);
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
        <Plug className="text-yellow-400" size={24} /> Connectors &amp; Plugins
      </h1>
      <p className="text-gray-400 text-sm mb-5">Connect to game platforms, cloud services, dev tools &amp; social networks</p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${filter === c ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? <LoadingFallback /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(conn => {
            const isConnected = connectedIds.has(conn.id);
            return (
              <div
                key={conn.id}
                className={`bg-gray-800 rounded-xl p-4 border transition-all ${isConnected ? 'border-green-600 shadow-green-900/20 shadow-lg' : 'border-gray-700'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{conn.icon}</span>
                    <div>
                      <div className="font-semibold text-sm text-white leading-tight">{conn.name}</div>
                      <div className="text-xs text-gray-500 capitalize">{conn.category}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isConnected ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {isConnected ? '● Connected' : '○ Not connected'}
                  </span>
                  <button
                    onClick={() => toggle(conn.id)}
                    className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                      isConnected ? 'bg-red-900 hover:bg-red-800 text-red-300' : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    }`}
                  >
                    {isConnected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ currentUser, authToken, onLogout }) {
  const [mfaStep, setMfaStep] = useState('idle'); // idle | setup | confirm
  const [mfaData, setMfaData] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [status, setStatus] = useState('');

  const setupMFA = async () => {
    const res = await fetch('/api/auth/mfa/setup', { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
    const data = await res.json();
    setMfaData(data);
    setMfaStep('confirm');
  };

  const confirmMFA = async () => {
    const res = await fetch('/api/auth/mfa/confirm', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: mfaCode })
    });
    if (res.ok) { setStatus('MFA enabled!'); setMfaStep('idle'); }
    else setStatus('Invalid code');
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6 max-w-2xl">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
        <Settings className="text-gray-400" size={24} /> Settings
      </h1>

      {/* Profile */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mb-4">
        <h2 className="font-semibold text-gray-300 mb-3">Profile</h2>
        <div className="space-y-2 text-sm">
          {[
            ['Username', currentUser?.username],
            ['Email', currentUser?.email],
            ['Role', currentUser?.role],
            ['Locale', currentUser?.locale]
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-medium">{val || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MFA */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 mb-4">
        <h2 className="font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Shield size={14} /> Two-Factor Authentication
        </h2>
        {mfaStep === 'idle' && (
          <button onClick={setupMFA} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm transition-colors">
            Enable 2FA
          </button>
        )}
        {mfaStep === 'confirm' && mfaData && (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Scan this QR code with your authenticator app:</p>
            <img src={mfaData.qrDataUrl} alt="MFA QR Code" className="w-40 h-40 bg-white p-2 rounded-lg" />
            <input
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm w-full focus:outline-none focus:border-blue-500"
            />
            <button onClick={confirmMFA} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm transition-colors">
              Confirm &amp; Enable
            </button>
          </div>
        )}
        {status && <p className="text-green-400 text-sm mt-2">{status}</p>}
      </div>

      {/* Logout */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h2 className="font-semibold text-gray-300 mb-3">Session</h2>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-red-900 hover:bg-red-800 border border-red-800 text-red-300 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function AppWrapper({ NexusAIComponent }) {
  const [auth, setAuth] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.accessToken) setAuth(parsed);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const handleAuth = useCallback((data) => {
    setAuth(data);
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, []);

  const handleLogout = useCallback(async () => {
    if (auth?.refreshToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: auth.refreshToken })
      }).catch(() => {});
    }
    setAuth(null);
    try { localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
  }, [auth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-400" size={40} />
      </div>
    );
  }

  if (!auth) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AuthScreen onAuth={handleAuth} />
      </Suspense>
    );
  }

  const allowedTabs = ROLE_NAV[auth.role] || ROLE_NAV.user;
  const visibleNav = NAV_ITEMS.filter(n => allowedTabs.includes(n.id));
  const token = auth.accessToken;

  const renderContent = () => {
    switch (activeTab) {
      case 'chat': return <NexusAIComponent />;
      case 'analytics':  return <Suspense fallback={<LoadingFallback />}><AnalyticsDashboard authToken={token} /></Suspense>;
      case 'security':   return <Suspense fallback={<LoadingFallback />}><SecurityDashboardPro authToken={token} /></Suspense>;
      case 'projects':   return <Suspense fallback={<LoadingFallback />}><ProjectDashboard authToken={token} /></Suspense>;
      case 'connectors': return <ConnectorsBrowser authToken={token} />;
      case 'admin':      return <Suspense fallback={<LoadingFallback />}><AdminDashboard authToken={token} currentUser={auth} /></Suspense>;
      case 'settings':   return <SettingsPanel currentUser={auth} authToken={token} onLogout={handleLogout} />;
      default: return <NexusAIComponent />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar nav */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-56 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Shield size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">Nexus AI Pro</div>
              <div className="text-xs text-gray-400 truncate capitalize">{auth.role}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Icon size={16} className={activeTab === id ? color : 'text-current'} />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
            <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
              {auth.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-white truncate">{auth.username}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
          <button onClick={() => setSidebarOpen(v => !v)} className="text-gray-400 hover:text-white">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-semibold text-white">
            {visibleNav.find(n => n.id === activeTab)?.label || 'Nexus AI Pro'}
          </span>
        </header>

        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
