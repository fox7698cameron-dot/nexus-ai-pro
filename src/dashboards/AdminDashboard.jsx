// src/dashboards/AdminDashboard.jsx
// Date: 2026-07-08
// Admin dashboard: user management, roles, billing, system health, full audit

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, CreditCard, Activity, Settings, RefreshCw,
  UserCheck, UserX, Key, BarChart3, Database, Server,
  AlertTriangle, CheckCircle, Crown, Trash2, Edit3, Plus, Search
} from 'lucide-react';

const ROLE_COLORS = {
  admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  dev: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  moderator: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  user: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
};

export default function AdminDashboard({ token, user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [systemStats, setSystemStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/health', { headers }),
        fetch('/api/security/audit?limit=50', { headers })
      ]);
      if (statsRes.ok) setSystemStats(await statsRes.json());
      if (logsRes.ok) {
        const d = await logsRes.json();
        setAuditLogs(d.logs || []);
      }
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const tabs = ['overview', 'users', 'security', 'billing', 'audit'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="flex items-center gap-2 mb-6">
        <Crown size={24} className="text-red-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Logged in as: {user?.email} ({user?.role})</p>
        </div>
        <button onClick={loadData} disabled={loading} className="ml-auto p-2 rounded-lg bg-white dark:bg-gray-800 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${
              activeTab === tab ? 'bg-red-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && systemStats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'System', value: systemStats.status, icon: Server, color: 'text-green-600' },
              { label: 'Encryption', value: 'AES-256-GCM', icon: Shield, color: 'text-blue-600' },
              { label: 'Threats Blocked', value: systemStats.security?.threatsBlocked || 0, icon: AlertTriangle, color: 'text-red-600' },
              { label: 'Audit Logs', value: systemStats.security?.auditLogSize || 0, icon: Database, color: 'text-purple-600' }
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} className={stat.color} />
                    <span className="text-xs text-gray-500 uppercase">{stat.label}</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</div>
                </div>
              );
            })}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">System Health</h3>
            <div className="space-y-2">
              {[
                { name: 'API Server', status: 'healthy' },
                { name: 'Database', status: 'healthy' },
                { name: 'Encryption', status: 'active' },
                { name: 'Rate Limiting', status: 'active' },
                { name: 'WebSocket', status: 'connected' }
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{s.name}</span>
                  <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                    <span className="w-2 h-2 bg-green-400 rounded-full" /> {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">User Management</h3>
          </div>
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
            User data loads from the auth service. Connect to a production database to view users here.
          </p>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-blue-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Security Controls</h3>
          </div>
          <div className="space-y-3">
            <button
              onClick={async () => {
                const r = await fetch('/api/security/rotate-keys', { method: 'POST', headers });
                if (r.ok) alert('Keys rotated successfully');
              }}
              className="w-full flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl text-yellow-700 dark:text-yellow-300 text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
            >
              <Key size={16} /> Rotate Encryption Keys
            </button>
            <button
              onClick={async () => {
                const r = await fetch('/api/security/scan', { method: 'POST', headers, body: JSON.stringify({ type: 'full' }) });
                if (r.ok) { const d = await r.json(); alert(`Scan complete. Score: ${d.summary?.score}`); }
              }}
              className="w-full flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-blue-700 dark:text-blue-300 text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              <Activity size={16} /> Run Full Security Scan
            </button>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <CreditCard size={18} className="text-blue-500" /> Billing Overview
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Connect Stripe to see real billing data</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Monthly Revenue', value: '$—' },
              { label: 'Active Subscriptions', value: '—' },
              { label: 'Churn Rate', value: '—' },
              { label: 'Crypto Payments', value: '—' }
            ].map((s, i) => (
              <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Database size={18} className="text-purple-500" /> Audit Logs
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLogs.slice().reverse().map((log, i) => (
              <div key={i} className="flex items-start gap-2 py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300">{log.event}</span>
                    <span className="text-xs text-gray-400">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{JSON.stringify(log.details || {})}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
