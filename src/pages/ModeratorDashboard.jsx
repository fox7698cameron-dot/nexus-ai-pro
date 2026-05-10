// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import React, { useState, useEffect, useCallback } from 'react';
import {
  Flag, Users, MessageSquare, CheckCircle, XCircle, AlertTriangle,
  ArrowUpCircle, RotateCcw, Eye, Clock, BarChart3, RefreshCw, Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

const API = async (path, opts = {}) => {
  const token = sessionStorage.getItem('nexus:token');
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const maskUser = (str = '') => {
  if (str.length <= 4) return '**' + str.slice(-1) + '*';
  return str.slice(0, 2) + '***' + str.slice(-2);
};

function Badge({ count, accent = 'amber' }) {
  if (!count) return null;
  const colors = { amber: 'bg-amber-500 text-black', red: 'bg-red-500 text-white', green: 'bg-green-500 text-white' };
  return <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${colors[accent]}`}>{count}</span>;
}

function Section({ title, icon: Icon, children, badge }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={20} className="text-amber-400" />
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

export default function ModeratorDashboard() {
  const { user: me } = useAuth();
  const [reports, setReports] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [content, setContent] = useState([]);
  const [chatFeed, setChatFeed] = useState([]);
  const [stats, setStats] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API('/api/mod/overview').catch(() => ({}));
      setReports(data.reports ?? []);
      setWarnings(data.warnings ?? []);
      setContent(data.flaggedContent ?? []);
      setChatFeed(data.recentMessages ?? []);
      setStats(data.stats ?? null);
      setOnlineCount(data.onlineCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reportAction = async (id, action) => {
    await API(`/api/mod/reports/${id}/${action}`, { method: 'POST' }).catch(() => {});
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const revokeWarning = async (id) => {
    await API(`/api/mod/warnings/${id}`, { method: 'DELETE' }).catch(() => {});
    setWarnings((prev) => prev.filter((w) => w.id !== id));
  };

  const reviewContent = async (id, action) => {
    await API(`/api/mod/content/${id}/${action}`, { method: 'POST' }).catch(() => {});
    setContent((prev) => prev.filter((c) => c.id !== id));
  };

  const flagMessage = async (id) => {
    await API(`/api/mod/messages/${id}/flag`, { method: 'POST' }).catch(() => {});
    setChatFeed((prev) => prev.map((m) => (m.id === id ? { ...m, flagged: true } : m)));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-yellow-400 bg-clip-text text-transparent">
            Moderator Panel
          </h1>
          <p className="text-gray-400 mt-1">Logged in as <span className="text-amber-400">{me?.username ?? me?.email}</span></p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center gap-1.5">
            <Flag size={14} /> {reports.length} in queue
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-1.5">
            <Users size={14} /> {onlineCount} online
          </span>
          <button onClick={load} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-sm flex items-center gap-1.5 hover:bg-white/10 transition">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </header>

      {/* Reports Queue */}
      <Section title="Reports Queue" icon={Flag} badge={<Badge count={reports.length} />}>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : reports.length === 0 ? (
          <div className="p-6 rounded-xl border border-white/10 text-center text-gray-500 flex flex-col items-center gap-2">
            <CheckCircle size={28} className="text-green-400" />
            <span>Queue is clear</span>
          </div>
        ) : reports.map((r) => (
          <div key={r.id} className="mb-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <div className="text-xs text-gray-400 space-x-3">
                <span>Reporter: <span className="text-amber-300 font-mono">{maskUser(r.reporter ?? 'anon')}</span></span>
                <span>Reported: <span className="text-red-300 font-mono">{maskUser(r.reported ?? 'unknown')}</span></span>
                <span>Reason: <span className="text-white">{r.reason}</span></span>
              </div>
              <span className="text-xs text-gray-500">{r.date ? new Date(r.date).toLocaleString() : '—'}</span>
            </div>
            <p className="text-sm text-gray-300 line-clamp-2 mb-3 bg-black/20 rounded-lg px-3 py-2">{r.content ?? '(no preview)'}</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => reportAction(r.id, 'dismiss')} className="px-3 py-1.5 text-xs rounded-lg bg-gray-500/10 border border-gray-500/20 text-gray-400 hover:bg-gray-500/20 transition flex items-center gap-1.5">
                <XCircle size={13} /> Dismiss
              </button>
              <button onClick={() => reportAction(r.id, 'warn')} className="px-3 py-1.5 text-xs rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition flex items-center gap-1.5">
                <AlertTriangle size={13} /> Warn User
              </button>
              <button onClick={() => reportAction(r.id, 'escalate')} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition flex items-center gap-1.5">
                <ArrowUpCircle size={13} /> Escalate to Admin
              </button>
            </div>
          </div>
        ))}
      </Section>

      {/* User Warnings */}
      <Section title="Active User Warnings" icon={AlertTriangle} badge={<Badge count={warnings.length} accent="red" />}>
        {warnings.length === 0 ? (
          <div className="p-6 rounded-xl border border-white/10 text-center text-gray-500">No active warnings</div>
        ) : (
          <div className="space-y-2">
            {warnings.map((w) => (
              <div key={w.id} className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    <span className="font-mono text-red-300">{maskUser(w.username ?? 'user')}</span>
                    <span className="text-gray-400"> · {w.reason}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">Issued by {maskUser(w.issuedBy ?? 'mod')} · {w.issuedAt ? new Date(w.issuedAt).toLocaleString() : '—'}</p>
                </div>
                <button onClick={() => revokeWarning(w.id)} className="shrink-0 px-3 py-1.5 text-xs rounded-lg bg-gray-500/10 border border-gray-500/20 text-gray-400 hover:bg-gray-500/20 transition flex items-center gap-1.5">
                  <RotateCcw size={13} /> Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Content Review */}
      <Section title="Content Review" icon={Eye} badge={<Badge count={content.length} />}>
        {content.length === 0 ? (
          <div className="p-6 rounded-xl border border-white/10 text-center text-gray-500">No flagged content</div>
        ) : content.map((c) => (
          <div key={c.id} className="mb-3 p-4 rounded-xl border border-white/10 bg-white/3">
            <div className="flex items-start gap-2 mb-2">
              {c.flaggedBy === 'ai' ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/20">AI Flagged</span>
              ) : (
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/20">User Report</span>
              )}
              <span className="text-xs text-gray-500">{c.type}</span>
            </div>
            <p className="text-sm text-gray-300 line-clamp-3 mb-3">{c.content}</p>
            <div className="flex gap-2">
              <button onClick={() => reviewContent(c.id, 'approve')} className="px-3 py-1.5 text-xs rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition flex items-center gap-1.5">
                <CheckCircle size={13} /> Approve
              </button>
              <button onClick={() => reviewContent(c.id, 'remove')} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition flex items-center gap-1.5">
                <XCircle size={13} /> Remove
              </button>
            </div>
          </div>
        ))}
      </Section>

      {/* Chat Monitor */}
      <Section title="Chat Monitor" icon={MessageSquare}>
        <div className="rounded-xl border border-white/10 overflow-hidden max-h-80 overflow-y-auto">
          {chatFeed.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No recent messages</div>
          ) : chatFeed.map((msg) => (
            <div key={msg.id} className={`flex items-start justify-between gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/3 transition ${msg.flagged ? 'bg-red-500/5' : ''}`}>
              <div className="min-w-0">
                <span className="text-xs font-mono text-amber-300">{maskUser(msg.username ?? 'user')}</span>
                <span className="text-xs text-gray-500 ml-2">{msg.ts ? new Date(msg.ts).toLocaleTimeString() : ''}</span>
                <p className="text-sm text-gray-300 mt-0.5 line-clamp-2">{msg.content}</p>
              </div>
              {!msg.flagged ? (
                <button onClick={() => flagMessage(msg.id)} className="shrink-0 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition">
                  <Flag size={13} />
                </button>
              ) : (
                <span className="shrink-0 px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/20">Flagged</span>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Statistics */}
      <Section title="Statistics" icon={BarChart3}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Resolved Today', value: stats?.resolvedToday ?? '—' },
            { label: 'Resolved This Week', value: stats?.resolvedWeek ?? '—' },
            { label: 'Avg Resolution', value: stats?.avgResolution ?? '—' },
            { label: 'Escalation Rate', value: stats?.escalationRate ?? '—' },
            { label: 'Open Reports', value: reports.length },
          ].map(({ label, value }) => (
            <div key={label} className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <p className="text-xs text-amber-400 mb-1">{label}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
