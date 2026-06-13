// ================================================
// NEXUS AI PRO - Developer Dashboard
// Updated: 2026-06-13
// Role: dev (analytics, security, projects, connectors)
// ================================================

import React, { useState, useEffect } from 'react';
import {
  Code, GitBranch, GitCommit, BarChart3, Shield,
  Plug, RefreshCw, CheckCircle, AlertTriangle,
  Cpu, Terminal, Activity, TrendingUp, Package
} from 'lucide-react';

async function apiFetch(path) {
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json().catch(() => ({}));
}

export default function DevDashboard({ user }) {
  const [secStatus, setSecStatus] = useState(null);
  const [connectors, setConnectors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/security/status'),
      apiFetch('/api/connectors'),
    ]).then(([sec, conn]) => {
      setSecStatus(sec);
      setConnectors(conn.integrations || []);
    }).finally(() => setLoading(false));
  }, []);

  const quickLinks = [
    { label: 'Projects',    href: '#projects',   icon: Code,      color: 'text-blue-400' },
    { label: 'Analytics',   href: '#analytics',  icon: BarChart3, color: 'text-purple-400' },
    { label: 'Security',    href: '#security',   icon: Shield,    color: 'text-emerald-400' },
    { label: 'Connectors',  href: '#connectors', icon: Plug,      color: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-700 rounded-xl p-5">
        <Terminal size={24} className="text-purple-400" />
        <div>
          <h1 className="text-white font-bold text-xl">Developer Dashboard</h1>
          <p className="text-gray-300 text-sm">{user?.email} · Build, track, deploy</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickLinks.map(l => (
          <a key={l.label} href={l.href}
            className="bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-xl p-4 flex items-center gap-3 transition-colors group">
            <l.icon size={18} className={l.color} />
            <span className="text-gray-300 group-hover:text-white text-sm font-medium transition-colors">{l.label}</span>
          </a>
        ))}
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Shield size={14} className="text-indigo-400" /> Security Status
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Status',       value: secStatus?.status || 'secure' },
              { label: 'Encryption',   value: secStatus?.algorithm || 'AES-256-GCM' },
              { label: 'Threats',      value: secStatus?.threatsBlocked || 0 },
              { label: 'Audit Events', value: secStatus?.auditLogSize || 0 },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-gray-400">{item.label}</span>
                <span className="text-emerald-400 font-medium capitalize">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Plug size={14} className="text-indigo-400" /> Active Connectors
          </h3>
          {connectors.length === 0 ? (
            <p className="text-gray-500 text-sm">No connectors configured. Visit Settings → Connectors.</p>
          ) : (
            <div className="space-y-2">
              {connectors.map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 capitalize">{c.provider}</span>
                  <span className={`text-xs font-semibold ${c.status === 'active' ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Activity size={14} className="text-indigo-400" /> Recent Activity
        </h3>
        <p className="text-gray-500 text-sm">
          Activity feed will show recent project commits, security events, and analytics updates.
        </p>
      </div>
    </div>
  );
}
