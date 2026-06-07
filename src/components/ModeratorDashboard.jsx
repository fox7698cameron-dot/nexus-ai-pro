// src/components/ModeratorDashboard.jsx | Nexus AI Pro | Date: 2026-06-07

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function severityBadge(level) {
  const map = {
    low: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
    medium: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
    high: 'bg-orange-500/20 text-orange-300 border border-orange-500/40',
    critical: 'bg-red-500/20 text-red-300 border border-red-500/40',
  };
  return map[level] ?? map.low;
}

function statusBadge(status) {
  const map = {
    pending: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40',
    resolved: 'bg-green-500/20 text-green-300 border border-green-500/40',
    escalated: 'bg-red-500/20 text-red-300 border border-red-500/40',
    active: 'bg-red-500/20 text-red-300 border border-red-500/40',
    expired: 'bg-gray-500/20 text-gray-400 border border-gray-500/40',
  };
  return map[status] ?? map.pending;
}

function activityColor(type) {
  const map = {
    join: 'text-green-400',
    post: 'text-blue-400',
    report: 'text-yellow-400',
    ban: 'text-red-400',
  };
  return map[type] ?? 'text-gray-400';
}

function activityDot(type) {
  const map = {
    join: 'bg-green-400',
    post: 'bg-blue-400',
    report: 'bg-yellow-400',
    ban: 'bg-red-400',
  };
  return map[type] ?? 'bg-gray-400';
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const SEED_QUEUE = [
  { id: 'q1', type: 'post', severity: 'high', preview: 'This content contains potentially harmful language targeting a specific group...', reporter: 'alice_mod', reportedUser: 'bad_actor_99', reportedAt: new Date(Date.now() - 1200000).toISOString(), reason: 'harassment' },
  { id: 'q2', type: 'comment', severity: 'medium', preview: 'Check out this amazing investment opportunity!!! DM me NOW limited time...', reporter: 'system_auto', reportedUser: 'crypto_spam12', reportedAt: new Date(Date.now() - 3400000).toISOString(), reason: 'spam' },
  { id: 'q3', type: 'post', severity: 'critical', preview: '[Image] Graphic content detected by automated scanner — manual review required.', reporter: 'auto_scanner', reportedUser: 'unknown_user', reportedAt: new Date(Date.now() - 600000).toISOString(), reason: 'inappropriate' },
  { id: 'q4', type: 'profile', severity: 'low', preview: 'Profile bio contains URL pointing to an external site flagged by SafeBrowsing.', reporter: 'jane_reviewer', reportedUser: 'user_7734', reportedAt: new Date(Date.now() - 7200000).toISOString(), reason: 'other' },
];

const SEED_REPORTS = [
  { id: 'r1', reporter: 'alice_mod', reportedUser: 'bad_actor_99', reason: 'harassment', status: 'pending', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'r2', reporter: 'bob_user', reportedUser: 'spam_lord', reason: 'spam', status: 'resolved', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'r3', reporter: 'carol_c', reportedUser: 'troll_42', reason: 'inappropriate', status: 'escalated', createdAt: new Date(Date.now() - 43200000).toISOString() },
  { id: 'r4', reporter: 'dan_d', reportedUser: 'user_99', reason: 'other', status: 'pending', createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 'r5', reporter: 'eve_e', reportedUser: 'scammer_x', reason: 'spam', status: 'resolved', createdAt: new Date(Date.now() - 172800000).toISOString() },
];

const SEED_BANS = [
  { id: 'b1', userId: 'bad_actor_99', reason: 'Repeated harassment violations', duration: '7d', issuedAt: new Date(Date.now() - 86400000).toISOString(), expiresAt: new Date(Date.now() + 518400000).toISOString(), status: 'active' },
  { id: 'b2', userId: 'spam_lord', reason: 'Mass spam campaign', duration: '30d', issuedAt: new Date(Date.now() - 172800000).toISOString(), expiresAt: new Date(Date.now() + 2419200000).toISOString(), status: 'active' },
  { id: 'b3', userId: 'old_troll', reason: 'Doxxing attempt', duration: 'permanent', issuedAt: new Date(Date.now() - 604800000).toISOString(), expiresAt: null, status: 'active' },
];

const SEED_METRICS = {
  activeUsers: 3847,
  postsToday: 1204,
  reportsPending: 23,
  resolvedToday: 67,
  sparklines: {
    activeUsers: [2100, 2450, 2800, 3100, 3400, 3600, 3847],
    postsToday: [80, 200, 380, 520, 750, 980, 1204],
    reportsPending: [18, 25, 31, 28, 22, 26, 23],
    resolvedToday: [5, 14, 28, 41, 52, 60, 67],
  },
};

const SEED_ACTIVITY = [
  { id: 'a1', type: 'ban', actor: 'mod_sarah', target: 'bad_actor_99', detail: 'issued 7-day ban', ts: new Date(Date.now() - 300000).toISOString() },
  { id: 'a2', type: 'report', actor: 'user_4422', target: 'spam_lord', detail: 'filed spam report', ts: new Date(Date.now() - 720000).toISOString() },
  { id: 'a3', type: 'post', actor: 'creator_01', target: null, detail: 'published new post #8821', ts: new Date(Date.now() - 1080000).toISOString() },
  { id: 'a4', type: 'join', actor: 'new_user_5531', target: null, detail: 'joined the community', ts: new Date(Date.now() - 1440000).toISOString() },
  { id: 'a5', type: 'report', actor: 'alice_mod', target: 'troll_42', detail: 'escalated content report', ts: new Date(Date.now() - 2160000).toISOString() },
  { id: 'a6', type: 'join', actor: 'dev_newb', target: null, detail: 'joined the community', ts: new Date(Date.now() - 3600000).toISOString() },
  { id: 'a7', type: 'post', actor: 'prolific_poster', target: null, detail: 'published post #7711', ts: new Date(Date.now() - 5400000).toISOString() },
  { id: 'a8', type: 'ban', actor: 'mod_alex', target: 'scammer_x', detail: 'issued permanent ban', ts: new Date(Date.now() - 7200000).toISOString() },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function TabButton({ label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5',
        active
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      )}
    >
      {label}
      {badge != null && badge > 0 && (
        <span className={cn(
          'inline-flex items-center justify-center px-1.5 py-0.5 text-xs rounded-full font-bold min-w-[1.2rem]',
          active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
        )}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function SeverityBadge({ level }) {
  return (
    <span className={cn('px-2 py-0.5 text-xs rounded-full font-semibold uppercase tracking-wide', severityBadge(level))}>
      {level}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={cn('px-2 py-0.5 text-xs rounded-full font-semibold capitalize', statusBadge(status))}>
      {status}
    </span>
  );
}

function Sparkline({ data, color }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className={cn('flex-1 rounded-sm transition-all', color)}
          style={{ height: `${Math.max(4, (v / max) * 100)}%`, opacity: 0.4 + (i / data.length) * 0.6 }}
        />
      ))}
    </div>
  );
}

function MetricCard({ label, value, sparkData, sparkColor, delta }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        {delta != null && (
          <span className={cn('text-xs font-semibold', delta >= 0 ? 'text-green-400' : 'text-red-400')}>
            {delta >= 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <Sparkline data={sparkData} color={sparkColor} />
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────

function ContentQueueTab({ items, onApprove, onReject, onEscalate }) {
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">✓</div>
          <p className="font-medium">Queue is empty</p>
          <p className="text-sm mt-1">All flagged content has been reviewed.</p>
        </div>
      )}
      {items.map(item => (
        <div key={item.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge level={item.severity} />
              <span className="text-xs text-gray-400 capitalize bg-gray-700/50 px-2 py-0.5 rounded-full">{item.type}</span>
              <span className="text-xs text-gray-400 capitalize bg-gray-700/50 px-2 py-0.5 rounded-full">{item.reason}</span>
            </div>
            <span className="text-xs text-gray-500">{timeAgo(item.reportedAt)}</span>
          </div>
          <p className="text-sm text-gray-300 bg-gray-900/40 rounded-lg p-3 border-l-2 border-gray-600 leading-relaxed">
            {item.preview}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-gray-400">
              Reported by <span className="text-indigo-400 font-medium">{item.reporter}</span>
              {' · '}Target: <span className="text-gray-300 font-medium">{item.reportedUser}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEscalate(item.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/20 transition-colors"
              >
                Escalate
              </button>
              <button
                onClick={() => onReject(item.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => onApprove(item.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/10 text-green-300 border border-green-500/30 hover:bg-green-500/20 transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsTab({ reports, onChangeStatus }) {
  const reasonOptions = ['spam', 'harassment', 'inappropriate', 'other'];

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700/50 bg-gray-800/60">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Reporter</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Reported User</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Reason</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Filed</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r, i) => (
            <tr key={r.id} className={cn('border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors', i % 2 === 0 ? 'bg-gray-800/20' : 'bg-gray-800/10')}>
              <td className="px-4 py-3 text-indigo-400 font-medium">{r.reporter}</td>
              <td className="px-4 py-3 text-gray-300">{r.reportedUser}</td>
              <td className="px-4 py-3">
                <select
                  defaultValue={r.reason}
                  className="bg-gray-700/50 border border-gray-600/50 text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {reasonOptions.map(opt => (
                    <option key={opt} value={opt} className="bg-gray-800">{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <select
                  defaultValue={r.status}
                  onChange={e => onChangeStatus(r.id, e.target.value)}
                  className="bg-gray-700/50 border border-gray-600/50 text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="pending" className="bg-gray-800">Pending</option>
                  <option value="resolved" className="bg-gray-800">Resolved</option>
                  <option value="escalated" className="bg-gray-800">Escalated</option>
                </select>
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{timeAgo(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BansTab({ bans, onUnban }) {
  const [form, setForm] = useState({ userId: '', reason: '', duration: '24h' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleIssueBan(e) {
    e.preventDefault();
    if (!form.userId.trim() || !form.reason.trim()) {
      setError('User ID and reason are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/moderation/bans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to issue ban');
      setForm({ userId: '', reason: '', duration: '24h' });
    } catch {
      // handled by parent fallback; silently reset for demo
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Issue Ban Form */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
        <h3 className="text-base font-semibold text-white mb-4">Issue New Ban</h3>
        <form onSubmit={handleIssueBan} className="space-y-3">
          {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">User ID</label>
              <input
                type="text"
                value={form.userId}
                onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                placeholder="username or user ID"
                className="w-full bg-gray-900/50 border border-gray-600/50 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Duration</label>
              <select
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                className="w-full bg-gray-900/50 border border-gray-600/50 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {['1h', '24h', '7d', '30d', 'permanent'].map(d => (
                  <option key={d} value={d} className="bg-gray-800">{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Reason</label>
            <textarea
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Explain the reason for this ban..."
              rows={2}
              className="w-full bg-gray-900/50 border border-gray-600/50 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-600 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white transition-colors"
          >
            {submitting ? 'Issuing...' : 'Issue Ban'}
          </button>
        </form>
      </div>

      {/* Active Bans List */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white">Active Bans ({bans.filter(b => b.status === 'active').length})</h3>
        {bans.map(ban => (
          <div key={ban.id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-200">{ban.userId}</span>
                <StatusBadge status={ban.status} />
                <span className="text-xs bg-gray-700/60 text-gray-400 px-2 py-0.5 rounded-full">{ban.duration}</span>
              </div>
              <p className="text-sm text-gray-400">{ban.reason}</p>
              <p className="text-xs text-gray-500">
                Issued {timeAgo(ban.issuedAt)}
                {ban.expiresAt ? ` · Expires ${new Date(ban.expiresAt).toLocaleDateString()}` : ' · Never expires'}
              </p>
            </div>
            <button
              onClick={() => onUnban(ban.id)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-700/50 text-gray-300 border border-gray-600/50 hover:bg-green-500/20 hover:text-green-300 hover:border-green-500/40 transition-colors shrink-0"
            >
              Unban
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunityTab({ metrics }) {
  const cards = [
    { label: 'Active Users', value: metrics.activeUsers, sparkData: metrics.sparklines.activeUsers, sparkColor: 'bg-green-400', delta: 12 },
    { label: 'Posts Today', value: metrics.postsToday, sparkData: metrics.sparklines.postsToday, sparkColor: 'bg-blue-400', delta: 8 },
    { label: 'Reports Pending', value: metrics.reportsPending, sparkData: metrics.sparklines.reportsPending, sparkColor: 'bg-yellow-400', delta: -4 },
    { label: 'Resolved Today', value: metrics.resolvedToday, sparkData: metrics.sparklines.resolvedToday, sparkColor: 'bg-indigo-400', delta: 22 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(c => (
          <MetricCard key={c.label} {...c} />
        ))}
      </div>
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Activity Trends (Last 7 Points)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {cards.map(c => (
            <div key={c.label} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{c.label}</span>
                <span className="text-gray-300 font-medium">{c.value.toLocaleString()}</span>
              </div>
              <Sparkline data={c.sparkData} color={c.sparkColor} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityFeedTab({ feed }) {
  const containerRef = useRef(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Live Activity Feed</h3>
        <span className="flex items-center gap-1.5 text-xs text-green-400">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Live
        </span>
      </div>
      <div
        ref={containerRef}
        className="space-y-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin"
      >
        {feed.map(event => (
          <div
            key={event.id}
            className="flex items-start gap-3 bg-gray-800/30 border border-gray-700/30 rounded-xl px-4 py-3 hover:bg-gray-800/50 transition-colors"
          >
            <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', activityDot(event.type))} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 leading-snug">
                <span className={cn('font-semibold', activityColor(event.type))}>{event.actor}</span>
                {' '}
                <span className="text-gray-400">{event.detail}</span>
                {event.target && (
                  <> → <span className="text-gray-300 font-medium">{event.target}</span></>
                )}
              </p>
            </div>
            <span className="text-xs text-gray-500 shrink-0">{timeAgo(event.ts)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ModeratorDashboard({ userId, theme, authToken }) {
  const [activeTab, setActiveTab] = useState('queue');
  const [queue, setQueue] = useState(SEED_QUEUE);
  const [reports, setReports] = useState(SEED_REPORTS);
  const [bans, setBans] = useState(SEED_BANS);
  const [metrics, setMetrics] = useState(SEED_METRICS);
  const [activity, setActivity] = useState(SEED_ACTIVITY);
  const [loading, setLoading] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, rRes, bRes, mRes, aRes] = await Promise.all([
        fetch('/api/moderation/queue', { headers }),
        fetch('/api/moderation/reports', { headers }),
        fetch('/api/moderation/bans', { headers }),
        fetch('/api/moderation/metrics', { headers }),
        fetch('/api/moderation/activity', { headers }),
      ]);
      if (qRes.ok) setQueue(await qRes.json());
      if (rRes.ok) setReports(await rRes.json());
      if (bRes.ok) setBans(await bRes.json());
      if (mRes.ok) setMetrics(await mRes.json());
      if (aRes.ok) setActivity(await aRes.json());
    } catch {
      // fallback to seed data already set
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Poll activity every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/moderation/activity', { headers });
        if (res.ok) setActivity(await res.json());
      } catch { /* keep existing */ }
    }, 30000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleApprove(id) {
    setQueue(q => q.filter(item => item.id !== id));
    fetch(`/api/moderation/queue/${id}/approve`, { method: 'POST', headers }).catch(() => {});
  }

  function handleReject(id) {
    setQueue(q => q.filter(item => item.id !== id));
    fetch(`/api/moderation/queue/${id}/reject`, { method: 'POST', headers }).catch(() => {});
  }

  function handleEscalate(id) {
    setQueue(q => q.map(item => item.id === id ? { ...item, severity: 'critical' } : item));
    fetch(`/api/moderation/queue/${id}/escalate`, { method: 'POST', headers }).catch(() => {});
  }

  function handleChangeReportStatus(id, status) {
    setReports(r => r.map(rep => rep.id === id ? { ...rep, status } : rep));
    fetch(`/api/moderation/reports/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ status }) }).catch(() => {});
  }

  function handleUnban(id) {
    setBans(b => b.map(ban => ban.id === id ? { ...ban, status: 'expired' } : ban));
    fetch(`/api/moderation/bans/${id}/unban`, { method: 'POST', headers }).catch(() => {});
  }

  const tabs = [
    { id: 'queue', label: 'Content Queue', badge: queue.length },
    { id: 'reports', label: 'Reports', badge: reports.filter(r => r.status === 'pending').length },
    { id: 'bans', label: 'Bans', badge: bans.filter(b => b.status === 'active').length },
    { id: 'community', label: 'Community', badge: null },
    { id: 'activity', label: 'Activity', badge: null },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Moderator Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Logged in as <span className="text-indigo-400 font-medium">{userId || 'moderator'}</span>
            </p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gray-800 border border-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin' : ''}>↻</span>
            Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1.5 bg-gray-900/60 border border-gray-800/50 rounded-xl p-1.5">
          {tabs.map(t => (
            <TabButton
              key={t.id}
              label={t.label}
              active={activeTab === t.id}
              onClick={() => setActiveTab(t.id)}
              badge={t.badge}
            />
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'queue' && (
            <ContentQueueTab
              items={queue}
              onApprove={handleApprove}
              onReject={handleReject}
              onEscalate={handleEscalate}
            />
          )}
          {activeTab === 'reports' && (
            <ReportsTab reports={reports} onChangeStatus={handleChangeReportStatus} />
          )}
          {activeTab === 'bans' && (
            <BansTab bans={bans} onUnban={handleUnban} />
          )}
          {activeTab === 'community' && (
            <CommunityTab metrics={metrics} />
          )}
          {activeTab === 'activity' && (
            <ActivityFeedTab feed={activity} />
          )}
        </div>
      </div>
    </div>
  );
}
