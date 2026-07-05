/**
 * src/components/dashboards/DashboardRouter.jsx
 * Nexus AI Pro — Master Dashboard Router
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Role-aware dashboard routing:
 *   admin     → admin panel + all dashboards
 *   dev       → dev tools + all dashboards
 *   moderator → moderation + analytics
 *   user      → standard dashboard
 */

import React, { useState, lazy, Suspense } from 'react';
import {
  LayoutDashboard, BarChart3, Shield, Gamepad2,
  CreditCard, Settings, Globe, Code, Users,
  Loader2, ChevronRight, LogOut, Bell,
} from 'lucide-react';

const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard.jsx'));
const SecurityDashboard  = lazy(() => import('./SecurityDashboard.jsx'));
const GameDevDashboard   = lazy(() => import('./GameDevDashboard.jsx'));
const AuthDashboard      = lazy(() => import('./AuthDashboard.jsx'));

// ─── Role-based nav items ─────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'analytics', label: 'Analytics',  icon: BarChart3,       roles: ['admin', 'dev', 'moderator', 'user'] },
  { id: 'security',  label: 'Security',   icon: Shield,          roles: ['admin', 'dev']                       },
  { id: 'gamedev',   label: 'Game Dev',   icon: Gamepad2,        roles: ['admin', 'dev', 'user']               },
  { id: 'payments',  label: 'Payments',   icon: CreditCard,      roles: ['admin', 'dev', 'moderator', 'user'] },
  { id: 'admin',     label: 'Admin Panel', icon: Users,          roles: ['admin']                              },
  { id: 'settings',  label: 'Settings',   icon: Settings,        roles: ['admin', 'dev', 'moderator', 'user'] },
];

const ROLE_ACCENT = {
  admin:     'border-red-500/40 text-red-300',
  dev:       'border-purple-500/40 text-purple-300',
  moderator: 'border-yellow-500/40 text-yellow-300',
  user:      'border-blue-500/40 text-blue-300',
};

const ROLE_ICON = { admin: '👑', dev: '⚙️', moderator: '🛡️', user: '👤' };

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="text-blue-400 animate-spin" />
    </div>
  );
}

function PaymentsPanel() {
  return (
    <div className="space-y-6 text-white">
      <h2 className="text-xl font-bold flex items-center gap-2"><CreditCard size={20} /> Subscription & Billing</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { tier: 'Free',       price: '$0/mo',     color: 'border-gray-500/30', features: ['5 chats/day', 'Basic models', '1 MB uploads'] },
          { tier: 'Pro',        price: '$9.99/mo',  color: 'border-blue-500/40', features: ['Unlimited chats', 'All models', '100 MB uploads', 'Priority support'] },
          { tier: 'Enterprise', price: '$14.99/mo', color: 'border-purple-500/40', features: ['Everything in Pro', 'API access', 'Custom models', 'SLA guarantee'] },
        ].map(({ tier, price, color, features }) => (
          <div key={tier} className={`bg-white/5 border rounded-xl p-5 ${color}`}>
            <div className="font-bold text-lg">{tier}</div>
            <div className="text-2xl font-extrabold my-2">{price}</div>
            <ul className="text-sm text-gray-400 space-y-1 mb-4">
              {features.map(f => <li key={f} className="flex items-center gap-1.5">✓ {f}</li>)}
            </ul>
            <button className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium transition-colors">
              {tier === 'Free' ? 'Current plan' : `Upgrade to ${tier}`}
            </button>
          </div>
        ))}
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Payment Methods</h3>
        <div className="flex flex-wrap gap-3 text-sm text-gray-400">
          {['Visa', 'Mastercard', 'American Express', 'Discover', 'Debit'].map(m => (
            <span key={m} className="bg-white/5 border border-white/10 rounded px-2 py-1">{m}</span>
          ))}
          <span className="bg-white/5 border border-yellow-500/20 rounded px-2 py-1 text-yellow-400">ETH</span>
          <span className="bg-white/5 border border-orange-500/20 rounded px-2 py-1 text-orange-400">BTC</span>
          <span className="bg-white/5 border border-blue-500/20 rounded px-2 py-1 text-blue-400">USDC</span>
          <span className="bg-white/5 border border-purple-500/20 rounded px-2 py-1 text-purple-400">SOL</span>
          <span className="bg-white/5 border border-green-500/20 rounded px-2 py-1 text-green-400">Gift Card</span>
        </div>
      </div>
    </div>
  );
}

function AdminPanel() {
  return (
    <div className="space-y-4 text-white">
      <h2 className="text-xl font-bold flex items-center gap-2"><Users size={20} /> Admin Panel</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { label: 'User Management',   desc: 'Manage accounts, roles, and access',          icon: '👥' },
          { label: 'Audit Log',         desc: 'Full event log with timestamps',               icon: '📋' },
          { label: 'System Settings',   desc: 'Server config, feature flags, rate limits',   icon: '⚙️' },
          { label: 'Billing Overview',  desc: 'All subscriptions and revenue',                icon: '💰' },
          { label: 'Connector Status',  desc: 'Third-party integrations health',              icon: '🔌' },
          { label: 'Security Reports',  desc: 'CVE reports, scan history, patch status',     icon: '🛡️' },
        ].map(({ label, desc, icon }) => (
          <button key={label} className="text-left bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl p-4 transition-colors flex items-start gap-3">
            <span className="text-xl">{icon}</span>
            <div>
              <div className="font-medium text-white text-sm">{label}</div>
              <div className="text-gray-400 text-xs mt-0.5">{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ user }) {
  return (
    <div className="space-y-4 text-white">
      <h2 className="text-xl font-bold flex items-center gap-2"><Settings size={20} /> Settings</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { label: 'Profile',           desc: 'Username, avatar, bio',                icon: '👤' },
          { label: 'Security',          desc: 'Password, 2FA, biometrics',            icon: '🔐' },
          { label: 'Notifications',     desc: 'Email, push, Discord alerts',          icon: '🔔' },
          { label: 'Language & Region', desc: 'Language, timezone, currency',         icon: '🌍' },
          { label: 'API Keys',          desc: 'Manage personal API tokens',           icon: '🗝️'  },
          { label: 'Connected Apps',    desc: 'OAuth connections and permissions',    icon: '🔌' },
        ].map(({ label, desc, icon }) => (
          <button key={label} className="text-left bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl p-4 transition-colors flex items-start gap-3">
            <span className="text-xl">{icon}</span>
            <div>
              <div className="font-medium text-white text-sm">{label}</div>
              <div className="text-gray-400 text-xs mt-0.5">{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardRouter({ initialUser = null, className = '' }) {
  const [user, setUser]   = useState(initialUser);
  const [activeId, setActive] = useState('analytics');

  if (!user) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AuthDashboard onAuthSuccess={result => setUser(result.user)} className={className} />
      </Suspense>
    );
  }

  const role      = user.role || 'user';
  const navItems  = NAV_ITEMS.filter(n => n.roles.includes(role));
  const accentCls = ROLE_ACCENT[role] || ROLE_ACCENT.user;

  return (
    <div className={`flex h-full min-h-0 text-white ${className}`}>

      {/* Sidebar */}
      <nav className="w-52 flex-shrink-0 bg-black/30 border-r border-white/10 flex flex-col">
        {/* User info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-sm">
              {(user.username || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{user.username || user.email}</div>
              <div className={`text-xs border rounded px-1 py-0.5 w-fit ${accentCls}`}>
                {ROLE_ICON[role]} {role}
              </div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon    = item.icon;
            const active  = activeId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="p-2 border-t border-white/10">
          <button
            onClick={() => setUser(null)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6 min-w-0">
        <Suspense fallback={<LoadingSpinner />}>
          {activeId === 'analytics' && <AnalyticsDashboard />}
          {activeId === 'security'  && <SecurityDashboard />}
          {activeId === 'gamedev'   && <GameDevDashboard />}
          {activeId === 'payments'  && <PaymentsPanel />}
          {activeId === 'admin'     && <AdminPanel />}
          {activeId === 'settings'  && <SettingsPanel user={user} />}
        </Suspense>
      </main>

    </div>
  );
}
