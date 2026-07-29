/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * 2026-07-29 - Admin dashboard: user management, audit log, system health
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users, ShieldCheck, BarChart2, Activity, Clock, UserCheck,
  AlertTriangle, CheckCircle, ChevronDown, RefreshCw, Download
} from 'lucide-react';

const ROLE_BADGES = {
  admin:     'bg-red-900 text-red-300 border-red-800',
  dev:       'bg-purple-900 text-purple-300 border-purple-800',
  moderator: 'bg-yellow-900 text-yellow-300 border-yellow-800',
  user:      'bg-gray-800 text-gray-300 border-gray-700'
};

export default function AdminDashboard({ authToken, currentUser }) {
  const [users, setUsers] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [health, setHealth] = useState(null);
  const [tab, setTab] = useState('users');
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, aRes, hRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/audit', { headers }),
        fetch('/api/health', { headers })
      ]);
      if (uRes.ok) setUsers((await uRes.json()).users || []);
      if (aRes.ok) setAuditLog((await aRes.json()).events || []);
      if (hRes.ok) setHealth(await hRes.json());
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="bg-gray-900 min-h-screen text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="text-red-400" size={24} />
            Admin Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">Signed in as {currentUser?.username} ({currentUser?.role})</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'text-blue-400' },
          { label: 'Active Now', value: users.filter(u => u.active).length, icon: Activity, color: 'text-green-400' },
          { label: 'Audit Events', value: auditLog.length, icon: ShieldCheck, color: 'text-yellow-400' },
          { label: 'Uptime', value: health ? `${Math.floor(process?.uptime?.() || 0 / 60)}m` : '—', icon: Clock, color: 'text-purple-400' }
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={color} />
              <span className="text-gray-400 text-xs uppercase font-medium">{label}</span>
            </div>
            <div className={`text-3xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-800 rounded-lg p-1 mb-5 max-w-md">
        {[['users', 'Users'], ['audit', 'Audit Log'], ['health', 'System Health']].map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* User list */}
      {tab === 'users' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                {['Username', 'Email', 'Role', 'MFA', 'Status', 'Created'].map(h => (
                  <th key={h} className="text-left text-xs uppercase text-gray-400 font-semibold px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{u.username}</td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${ROLE_BADGES[u.role] || ROLE_BADGES.user}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.mfaEnabled
                      ? <CheckCircle size={14} className="text-green-400" />
                      : <span className="text-gray-600 text-xs">off</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${u.active ? 'text-green-400' : 'text-red-400'}`}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit log */}
      {tab === 'audit' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-y-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 sticky top-0">
                <tr>
                  {['Event', 'User ID', 'Timestamp', 'Details'].map(h => (
                    <th key={h} className="text-left text-xs uppercase text-gray-400 font-semibold px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {auditLog.slice().reverse().map(e => (
                  <tr key={e.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-blue-400 font-semibold">{e.event}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{e.userId?.slice(0, 8)}…</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">
                      {JSON.stringify(e.details || {})}
                    </td>
                  </tr>
                ))}
                {auditLog.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No audit events</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System health */}
      {tab === 'health' && health && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-semibold text-gray-300 mb-3">Server Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-green-400 font-semibold flex items-center gap-1">
                  <CheckCircle size={12} /> {health.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Timestamp</span>
                <span className="text-white">{new Date(health.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="font-semibold text-gray-300 mb-3">Security Module</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(health.security || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-white font-semibold">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
