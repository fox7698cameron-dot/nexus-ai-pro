// ================================================
// NEXUS AI PRO - Moderator Dashboard
// Updated: 2026-06-13
// Role: moderator (users:read, content:moderate, analytics:read)
// ================================================

import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Eye, AlertTriangle, CheckCircle,
  MessageSquare, Flag, Ban, Clock, Activity
} from 'lucide-react';

async function apiFetch(path) {
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.json().catch(() => ({}));
}

export default function ModeratorDashboard({ user }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/security/alerts')
      .then(d => setAlerts(d.alerts || []))
      .finally(() => setLoading(false));
  }, []);

  const modQueue = [
    { id: 1, type: 'Reported Content', user: 'user123', time: '2 min ago', severity: 'medium' },
    { id: 2, type: 'Spam Detection',   user: 'spammer@x.com', time: '8 min ago', severity: 'high' },
    { id: 3, type: 'Account Flag',     user: 'unknown@y.com', time: '1 hr ago',  severity: 'low' },
  ];

  const severityColor = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-blue-400' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-yellow-900 to-orange-900 border border-yellow-700 rounded-xl p-5">
        <Shield size={24} className="text-yellow-400" />
        <div>
          <h1 className="text-white font-bold text-xl">Moderator Dashboard</h1>
          <p className="text-gray-300 text-sm">{user?.email} · Content moderation &amp; safety</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <Flag size={20} className="text-red-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{modQueue.length}</div>
          <div className="text-gray-400 text-xs">In Queue</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <CheckCircle size={20} className="text-emerald-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">24</div>
          <div className="text-gray-400 text-xs">Resolved Today</div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 text-center">
          <Ban size={20} className="text-orange-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">3</div>
          <div className="text-gray-400 text-xs">Actions Taken</div>
        </div>
      </div>

      {/* Mod queue */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Flag size={14} className="text-orange-400" /> Moderation Queue
          </h2>
        </div>
        <div className="divide-y divide-gray-700">
          {modQueue.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4">
              <div className="flex-1">
                <div className="text-white text-sm font-medium">{item.type}</div>
                <div className="text-gray-500 text-xs">User: {item.user} · {item.time}</div>
              </div>
              <span className={`text-xs font-semibold ${severityColor[item.severity]}`}>
                {item.severity.toUpperCase()}
              </span>
              <div className="flex gap-2">
                <button className="text-xs px-2 py-1 bg-emerald-800 text-emerald-300 rounded hover:bg-emerald-700">
                  Approve
                </button>
                <button className="text-xs px-2 py-1 bg-red-800 text-red-300 rounded hover:bg-red-700">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security alerts (read-only) */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-yellow-400" /> Security Alerts
        </h2>
        {alerts.length === 0 ? (
          <p className="text-gray-500 text-sm">No active security alerts.</p>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 5).map((a, i) => (
              <div key={i} className="text-sm text-gray-300">
                <span className="text-gray-500 mr-2">{new Date(a.timestamp).toLocaleTimeString()}</span>
                {a.event}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
