// ================================================
// NEXUS AI PRO - Admin Dashboard
// Updated: 2026-06-13
// Role: admin (full access to all systems)
// ================================================

import React, { useState, useEffect } from 'react';
import {
  Users, Shield, BarChart3, Settings, Activity,
  AlertTriangle, CheckCircle, TrendingUp, Database,
  Server, Globe, Lock, RefreshCw, Eye, Trash2, Edit3,
  UserCheck, UserX, Crown, Key
} from 'lucide-react';

async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return res.json().catch(() => ({}));
}

function StatWidget({ label, value, icon: Icon, color = 'text-indigo-400', trend }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</span>
        <Icon size={14} className={color} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {trend !== undefined && (
        <div className={`text-xs mt-1 ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? '+' : ''}{trend}% this week
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    admin:     'bg-red-900 text-red-300 border-red-700',
    dev:       'bg-purple-900 text-purple-300 border-purple-700',
    moderator: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    user:      'bg-gray-700 text-gray-300 border-gray-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${styles[role] || styles.user}`}>
      {role}
    </span>
  );
}

export default function AdminDashboard({ user }) {
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers]     = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const load = async () => {
      const [sec, audit] = await Promise.all([
        apiFetch('/api/security/status'),
        apiFetch('/api/security/audit?limit=20'),
      ]);
      setMetrics({ security: sec });
      setAuditLog(audit.logs || []);

      // Mock user list (replace with real /api/admin/users endpoint)
      setUsers([
        { id: '1', email: 'admin@nexusai.pro', role: 'admin',     sub: 'enterprise', lastLogin: new Date().toISOString() },
        { id: '2', email: 'dev@example.com',   role: 'dev',       sub: 'pro',        lastLogin: new Date(Date.now()-86400000).toISOString() },
        { id: '3', email: 'mod@example.com',   role: 'moderator', sub: 'pro',        lastLogin: new Date(Date.now()-3600000).toISOString() },
        { id: '4', email: 'user@example.com',  role: 'user',      sub: 'free',       lastLogin: new Date(Date.now()-7200000).toISOString() },
      ]);

      setLoading(false);
    };
    load();
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview',  icon: Activity },
    { id: 'users',    label: 'Users',     icon: Users },
    { id: 'security', label: 'Security',  icon: Shield },
    { id: 'audit',    label: 'Audit Log', icon: Eye },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-red-900 to-purple-900 border border-red-700 rounded-xl p-5">
        <Crown size={24} className="text-yellow-400" />
        <div>
          <h1 className="text-white font-bold text-xl">Admin Dashboard</h1>
          <p className="text-gray-300 text-sm">Full system access · {user?.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatWidget label="Total Users"     value={users.length}  icon={Users}     color="text-blue-400"    trend={12} />
            <StatWidget label="Security Score"  value="94/100"        icon={Shield}    color="text-emerald-400" />
            <StatWidget label="Threats Blocked" value={metrics?.security?.threatsBlocked || 0} icon={AlertTriangle} color="text-red-400" />
            <StatWidget label="Audit Events"    value={auditLog.length} icon={Eye}     color="text-purple-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Database size={14} className="text-indigo-400" /> System Status
              </h3>
              {[
                { label: 'API Server',      status: 'Operational' },
                { label: 'Database',        status: 'Operational' },
                { label: 'Security Module', status: metrics?.security?.status || 'secure' },
                { label: 'Encryption',      status: metrics?.security?.algorithm || 'AES-256-GCM' },
                { label: 'Redis Cache',     status: 'Operational' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0 text-sm">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="text-emerald-400 font-semibold capitalize">{item.status}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Users size={14} className="text-indigo-400" /> Users by Role
              </h3>
              {['admin','dev','moderator','user'].map(role => {
                const count = users.filter(u => u.role === role).length;
                return (
                  <div key={role} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0 text-sm">
                    <RoleBadge role={role} />
                    <span className="text-gray-300">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-white font-semibold">User Management</h2>
            <span className="text-gray-500 text-xs">{users.length} users</span>
          </div>
          <div className="divide-y divide-gray-700">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{u.email}</div>
                  <div className="text-gray-500 text-xs">
                    Last login: {new Date(u.lastLogin).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={u.role} />
                  <span className={`text-xs px-2 py-0.5 rounded ${u.sub === 'enterprise' ? 'text-purple-300' : u.sub === 'pro' ? 'text-blue-300' : 'text-gray-400'}`}>
                    {u.sub}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button className="text-gray-500 hover:text-indigo-400 p-1 transition-colors"><Edit3 size={14} /></button>
                  <button className="text-gray-500 hover:text-red-400 p-1 transition-colors"><UserX size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Security Configuration</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Encryption', value: metrics?.security?.algorithm || 'AES-256-GCM' },
                { label: 'Last Scan',  value: metrics?.security?.lastScan ? new Date(metrics.security.lastScan).toLocaleString() : 'Never' },
                { label: 'Audit Log',  value: `${metrics?.security?.auditLogSize || 0} entries` },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="text-emerald-400">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h2 className="text-white font-semibold mb-3">Audit Log</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {auditLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-700 last:border-0 text-xs">
                <span className="text-gray-500 whitespace-nowrap">
                  {new Date(entry.timestamp || entry.created_at).toLocaleTimeString()}
                </span>
                <span className="text-gray-300 font-medium">{entry.event}</span>
              </div>
            ))}
            {auditLog.length === 0 && (
              <p className="text-gray-500 text-center py-8">No audit events</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
