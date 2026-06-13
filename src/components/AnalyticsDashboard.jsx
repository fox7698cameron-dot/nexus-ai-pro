// ================================================
// NEXUS AI PRO - Analytics Dashboard
// Updated: 2026-06-13
// ------------------------------------------------
// Real-time social metrics: TikTok, Instagram,
// Facebook, Twitch, Discord, Lemon8, Reddit,
// RedGifs, YouTube, Twitter/X
// View / Likes / Reach / Retention tracking
// ================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Eye, Heart, Share2,
  Users, Activity, BarChart3, PieChart, RefreshCw,
  Plus, Trash2, AlertCircle, Wifi, WifiOff, Clock,
  ArrowUp, ArrowDown, Minus, Globe, MessageSquare
} from 'lucide-react';

// Platform icons (text-based since we can't import SVGs directly)
const PLATFORM_ICONS = {
  tiktok:    '🎵',
  instagram: '📸',
  facebook:  '👥',
  twitch:    '🎮',
  discord:   '💬',
  lemon8:    '🍋',
  reddit:    '🤖',
  redgifs:   '🎞️',
  youtube:   '▶️',
  twitter:   '🐦',
};

const PLATFORM_COLORS = {
  tiktok:    '#69C9D0',
  instagram: '#E1306C',
  facebook:  '#1877F2',
  twitch:    '#9146FF',
  discord:   '#5865F2',
  lemon8:    '#FFC300',
  reddit:    '#FF4500',
  redgifs:   '#FF6B6B',
  youtube:   '#FF0000',
  twitter:   '#1DA1F2',
};

// ── API helpers ───────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  const res = await fetch(`/api/analytics${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ── Stat card ─────────────────────────────────────
function StatCard({ label, value, prev, icon: Icon, color, suffix = '' }) {
  const change = prev ? ((value - prev) / prev) * 100 : 0;
  const isPos  = change > 0;
  const isNeg  = change < 0;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={14} className="text-gray-500" />}
      </div>
      <div className="text-2xl font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </div>
      {prev !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${isPos ? 'text-emerald-400' : isNeg ? 'text-red-400' : 'text-gray-500'}`}>
          {isPos ? <ArrowUp size={10} /> : isNeg ? <ArrowDown size={10} /> : <Minus size={10} />}
          {Math.abs(change).toFixed(1)}% vs prev
        </div>
      )}
    </div>
  );
}

// ── Retention chart ───────────────────────────────
function RetentionChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.viewersPercent || d.retention || 100));

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Retention Curve</h3>
      <div className="flex items-end gap-1 h-24">
        {data.map((d, i) => {
          const height = ((d.viewersPercent || d.retention || 0) / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 bg-indigo-500 rounded-sm opacity-80 hover:opacity-100 transition-opacity"
              style={{ height: `${height}%` }}
              title={`Hour ${d.hour}: ${(d.viewersPercent || d.retention || 0).toFixed(1)}%`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-gray-500 text-xs mt-1">
        <span>0h</span>
        <span>12h</span>
        <span>24h</span>
      </div>
    </div>
  );
}

// ── Platform row ──────────────────────────────────
function PlatformCard({ data, onRemove }) {
  const color = PLATFORM_COLORS[data.platform] || '#6366F1';
  const icon  = PLATFORM_ICONS[data.platform] || '🌐';
  const metrics = data.metrics || {};

  const primaryMetrics = Object.entries(metrics).slice(0, 4);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{icon}</div>
          <div>
            <div className="text-white font-semibold capitalize">{data.platform}</div>
            <div className="text-gray-400 text-xs">@{data.handle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-xs">Live</span>
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-gray-500 hover:text-red-400 transition-colors ml-2"
              aria-label="Remove platform"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {primaryMetrics.map(([key, metric]) => (
          <div key={key} className="text-center">
            <div className="text-xs text-gray-400 capitalize mb-1">
              {key.replace(/_/g, ' ')}
            </div>
            <div className="text-lg font-bold" style={{ color }}>
              {(metric.current || 0).toLocaleString()}
            </div>
            {metric.changePercent !== undefined && (
              <div className={`text-xs ${metric.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {metric.change >= 0 ? '+' : ''}{metric.changePercent}%
              </div>
            )}
          </div>
        ))}
      </div>

      {data.retentionCurve && data.retentionCurve.length > 0 && (
        <div className="mt-4">
          <RetentionChart data={data.retentionCurve} />
        </div>
      )}
    </div>
  );
}

// ── Add account modal ─────────────────────────────
function AddAccountModal({ onAdd, onClose }) {
  const [platform, setPlatform] = useState('tiktok');
  const [accountId, setAccountId] = useState('');
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!accountId.trim()) return setError('Account ID is required');

    setLoading(true);
    setError('');
    try {
      const result = await apiFetch('/accounts', {
        method: 'POST',
        body: JSON.stringify({ platform, accountId: accountId.trim(), handle: handle.trim() || accountId.trim() }),
      });
      onAdd(result.account);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-white font-bold text-lg mb-4">Connect Social Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Platform</label>
            <select
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
            >
              {Object.keys(PLATFORM_ICONS).map(p => (
                <option key={p} value={p}>
                  {PLATFORM_ICONS[p]} {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Account ID</label>
            <input
              type="text"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              placeholder="Your platform user ID"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Handle / Username</label>
            <input
              type="text"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              placeholder="@yourhandle"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
            >
              {loading ? 'Connecting...' : 'Connect'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────
export default function AnalyticsDashboard({ socket }) {
  const [dashboard, setDashboard] = useState(null);
  const [retention, setRetention] = useState({});
  const [trending, setTrending]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLive, setIsLive]       = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [dash, trend] = await Promise.all([
        apiFetch('/dashboard'),
        apiFetch('/trending').catch(() => ({ trending: [] })),
      ]);
      setDashboard(dash);
      setTrending(trend.trending || []);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Real-time: Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handler = (metric) => {
      setDashboard(prev => {
        if (!prev) return prev;
        return { ...prev, _lastMetric: metric, _ts: Date.now() };
      });
      setLastUpdated(new Date());
    };
    socket.on('analytics:metric', handler);
    return () => socket.off('analytics:metric', handler);
  }, [socket]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(loadDashboard, 30000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isLive, loadDashboard]);

  const handleAddAccount = useCallback((account) => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRemoveAccount = useCallback(async (accountId) => {
    try {
      await apiFetch(`/accounts/${accountId}`, { method: 'DELETE' });
      loadDashboard();
    } catch (err) {
      setError(err.message);
    }
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <RefreshCw className="animate-spin mr-2" size={16} />
        Loading analytics...
      </div>
    );
  }

  const totals = dashboard?.totals || {};
  const overview = dashboard?.overview || [];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time social media metrics across all platforms
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {lastUpdated && (
            <div className="flex items-center gap-1 text-gray-500 text-xs">
              <Clock size={11} />
              {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={() => setIsLive(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              isLive ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {isLive ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isLive ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={loadDashboard}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus size={12} />
            Add Account
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Cross-platform totals */}
      {totals.platformCount > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Views"     value={totals.totalViews}     icon={Eye}        />
          <StatCard label="Total Followers" value={totals.totalFollowers} icon={Users}      />
          <StatCard label="Total Likes"     value={totals.totalLikes}     icon={Heart}      />
          <StatCard label="Total Reach"     value={totals.totalReach}     icon={Globe}      />
        </div>
      )}

      {/* Per-platform cards */}
      {overview.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 bg-opacity-40 rounded-2xl border border-gray-700 border-dashed">
          <BarChart3 size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg font-medium">No social accounts connected</p>
          <p className="text-gray-500 text-sm mt-2 mb-6">
            Connect TikTok, Instagram, Facebook, Twitch, and more to see real-time analytics
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Plus size={16} />
            Connect First Account
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {overview.map(data => (
            <PlatformCard
              key={data.accountId}
              data={data}
              onRemove={() => handleRemoveAccount(data.accountId)}
            />
          ))}
        </div>
      )}

      {/* Trending content */}
      {trending.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-400" />
            Trending Content
          </h2>
          <div className="space-y-3">
            {trending.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{PLATFORM_ICONS[item.platform] || '🌐'}</span>
                  <div>
                    <div className="text-gray-300 text-sm capitalize">{item.type} · @{item.handle}</div>
                    <div className="text-gray-500 text-xs">{new Date(item.publishedAt).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm font-medium">{item.views.toLocaleString()} views</div>
                  <div className="text-gray-500 text-xs">{item.engagementRate}% eng.</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddAccountModal
          onAdd={handleAddAccount}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
