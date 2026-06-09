// src/components/ModDashboard.jsx
// Nexus AI Pro — Moderator Dashboard (Content Review, User Flags, Reports)
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import React, { useState } from 'react';
import {
  Shield, Flag, CheckCircle, XCircle, AlertTriangle,
  MessageSquare, Users, Clock, Eye, Ban, RefreshCw
} from 'lucide-react';

const MOCK_REPORTS = [
  { id: 1, type: 'spam',       user: 'user_abc', content: 'Repeated promotional messages', severity: 'medium', createdAt: new Date(Date.now() - 3600000).toISOString(), status: 'pending' },
  { id: 2, type: 'harassment', user: 'user_xyz', content: 'Inappropriate language toward another user', severity: 'high', createdAt: new Date(Date.now() - 7200000).toISOString(), status: 'pending' },
  { id: 3, type: 'abuse',      user: 'user_def', content: 'Attempting to access restricted endpoints', severity: 'critical', createdAt: new Date(Date.now() - 1800000).toISOString(), status: 'reviewing' },
];

const SEVERITY_COLOR = {
  critical: 'text-red-400 border-red-700 bg-red-900/20',
  high:     'text-orange-400 border-orange-700 bg-orange-900/20',
  medium:   'text-yellow-400 border-yellow-700 bg-yellow-900/20',
  low:      'text-blue-400 border-blue-700 bg-blue-900/20',
};

export default function ModDashboard() {
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [tab,     setTab]     = useState('reports');

  const resolve = (id, action) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
  };

  const pending   = reports.filter(r => r.status === 'pending').length;
  const reviewing = reports.filter(r => r.status === 'reviewing').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield size={28} className="text-purple-400" />
            Moderator Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">{pending} pending · {reviewing} under review</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg w-fit mb-6">
        {['reports', 'users', 'activity'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${tab === t ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'reports' && (
        <div className="space-y-4">
          {reports.map(report => {
            const sc = SEVERITY_COLOR[report.severity] || SEVERITY_COLOR.low;
            return (
              <div key={report.id} className={`border rounded-xl p-4 ${sc}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Flag size={14} />
                      <span className="font-medium capitalize">{report.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${sc} capitalize`}>{report.severity}</span>
                      <span className="text-xs text-gray-500 capitalize">· {report.status}</span>
                    </div>
                    <p className="text-gray-300 text-sm mt-1">{report.content}</p>
                    <p className="text-gray-500 text-xs mt-1">User: {report.user} · {new Date(report.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                {report.status === 'pending' || report.status === 'reviewing' ? (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => resolve(report.id, 'resolved')} className="flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs hover:bg-green-600 transition-colors">
                      <CheckCircle size={12} /> Resolve
                    </button>
                    <button onClick={() => resolve(report.id, 'dismissed')} className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-gray-200 rounded-lg text-xs hover:bg-gray-600 transition-colors">
                      <XCircle size={12} /> Dismiss
                    </button>
                    <button onClick={() => resolve(report.id, 'escalated')} className="flex items-center gap-1 px-3 py-1.5 border border-red-700 text-red-400 rounded-lg text-xs hover:bg-red-900/20 transition-colors">
                      <AlertTriangle size={12} /> Escalate
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-2 capitalize">Action taken: {report.status}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'users' && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <p className="text-gray-400 text-sm">User moderation tools available via Admin Dashboard for accounts with elevated permissions.</p>
        </div>
      )}

      {tab === 'activity' && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <h2 className="text-white font-medium mb-3 flex items-center gap-2">
            <Clock size={16} className="text-purple-400" /> Moderation Log
          </h2>
          <p className="text-gray-500 text-sm">Activity log will populate as moderation actions are taken.</p>
        </div>
      )}
    </div>
  );
}
