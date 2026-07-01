// ================================================
// NEXUS AI PRO - Analytics Dashboard
// File: src/components/AnalyticsDashboard.jsx
// Updated: 2026-07-01
// Platforms: TikTok · Instagram · Facebook · Twitch
//            Discord · Lemon8 · Reddit · RedGifs
// Real-time metrics via Socket.IO
// ================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, Users, Eye, Heart, Share2, MessageSquare,
  RefreshCw, Plus, Wifi, WifiOff, BarChart3, Activity,
  Zap, Globe, ChevronDown, AlertTriangle,
} from 'lucide-react';

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',     color: '#69C9D0', bg: '#010101' },
  { id: 'instagram', label: 'Instagram',  color: '#E1306C', bg: '#FAFAFA' },
  { id: 'facebook',  label: 'Facebook',   color: '#1877F2', bg: '#E9EBEE' },
  { id: 'twitch',    label: 'Twitch',     color: '#9146FF', bg: '#0E0E10' },
  { id: 'discord',   label: 'Discord',    color: '#5865F2', bg: '#36393F' },
  { id: 'lemon8',    label: 'Lemon8',     color: '#FFCA28', bg: '#FFFDE7' },
  { id: 'reddit',    label: 'Reddit',     color: '#FF4500', bg: '#DAE0E6' },
  { id: 'redgifs',   label: 'RedGifs',    color: '#E53935', bg: '#1A1A1A' },
];

const METRICS = [
  { key: 'views',      label: 'Views',       icon: Eye },
  { key: 'likes',      label: 'Likes',       icon: Heart },
  { key: 'followers',  label: 'Followers',   icon: Users },
  { key: 'reach',      label: 'Reach',       icon: Globe },
  { key: 'comments',   label: 'Comments',    icon: MessageSquare },
  { key: 'shares',     label: 'Shares',      icon: Share2 },
  { key: 'retention',  label: 'Retention %', icon: Activity },
  { key: 'engagement', label: 'Engagement',  icon: TrendingUp },
];

function fmtNum(n) {
  if (n == null) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function MiniBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
      <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, delta }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</span>
        <Icon size={14} className="text-gray-400" />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{fmtNum(value)}</div>
      {delta != null && (
        <div className={`text-xs mt-1 ${delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function PlatformRow({ platform, data, isActive, onClick }) {
  const p = PLATFORMS.find(x => x.id === platform) || { label: platform, color: '#888' };
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: p.color }}>
        {p.label[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white">{p.label}</div>
        {data?.error
          ? <div className="text-xs text-red-500">{data.error}</div>
          : <div className="text-xs text-gray-500">{fmtNum(data?.followers)} followers · {fmtNum(data?.views)} views</div>
        }
      </div>
      {data && !data.error && <div className="text-xs text-green-500">Live</div>}
    </button>
  );
}

export default function AnalyticsDashboard({ socket }) {
  const [overview, setOverview] = useState(null);
  const [selected, setSelected] = useState('tiktok');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [showConnect, setShowConnect] = useState(false);
  const [connectToken, setConnectToken] = useState('');
  const [connectPlatform, setConnectPlatform] = useState('tiktok');
  const intervalRef = useRef(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('nexus_access_token');
      const res = await fetch('/api/analytics/overview', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOverview(data);
      setLastRefresh(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConnected = useCallback(async () => {
    const token = localStorage.getItem('nexus_access_token');
    const res = await fetch('/api/analytics/platforms', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const d = await res.json(); setConnectedPlatforms(d.connected || []); }
  }, []);

  useEffect(() => {
    fetchOverview();
    fetchConnected();
    intervalRef.current = setInterval(fetchOverview, 60000); // auto-refresh every 60s
    return () => clearInterval(intervalRef.current);
  }, [fetchOverview, fetchConnected]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handler = data => { setOverview(prev => prev ? { ...prev, ...data } : data); setLastRefresh(Date.now()); };
    socket.on('analytics:update', handler);
    return () => socket.off('analytics:update', handler);
  }, [socket]);

  const connectPlatformFn = async () => {
    const token = localStorage.getItem('nexus_access_token');
    await fetch('/api/analytics/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ platform: connectPlatform, accessToken: connectToken }),
    });
    setShowConnect(false);
    setConnectToken('');
    fetchConnected();
    fetchOverview();
  };

  const totals = overview?.totals || {};
  const platforms = overview?.platforms || [];
  const selectedData = platforms.find(p => p.platform === selected);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-500" /> Analytics Dashboard
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time social media metrics{lastRefresh ? ` · Updated ${new Date(lastRefresh).toLocaleTimeString()}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowConnect(true)} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Connect
          </button>
          <button onClick={fetchOverview} disabled={loading} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — platform list */}
        <div className="w-56 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-2 mb-2">Platforms</div>
          <div className="space-y-1">
            {PLATFORMS.map(p => (
              <PlatformRow
                key={p.id}
                platform={p.id}
                data={platforms.find(x => x.platform === p.id)}
                isActive={selected === p.id}
                onClick={() => setSelected(p.id)}
              />
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Totals across all platforms */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Total Views"     value={totals.totalViews}     icon={Eye}      />
            <MetricCard label="Total Likes"     value={totals.totalLikes}     icon={Heart}    />
            <MetricCard label="Total Followers" value={totals.totalFollowers} icon={Users}    />
            <MetricCard label="Total Reach"     value={totals.totalReach}     icon={Globe}    />
          </div>

          {/* Selected platform detail */}
          {selectedData && !selectedData.error ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: PLATFORMS.find(p => p.id === selected)?.color || '#888' }}>
                  {PLATFORMS.find(p => p.id === selected)?.label[0]}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {PLATFORMS.find(p => p.id === selected)?.label}
                  </h2>
                  <div className="text-xs text-green-500 flex items-center gap-1"><Wifi size={10} /> Live data</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {METRICS.map(({ key, label, icon: Icon }) => (
                  <MetricCard key={key} label={label} value={selectedData[key]} icon={Icon} />
                ))}
              </div>

              {/* Retention bar */}
              {selectedData.retention > 0 && (
                <div className="mt-5 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-300 font-medium">Avg Retention</span>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedData.retention.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                    <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700"
                      style={{ width: `${Math.min(100, selectedData.retention)}%` }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
              <WifiOff size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {selectedData?.error || 'No data — connect this platform to start tracking.'}
              </p>
              <button onClick={() => setShowConnect(true)} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                Connect {PLATFORMS.find(p => p.id === selected)?.label}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Connect modal */}
      {showConnect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Connect Platform</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Platform</label>
                <select value={connectPlatform} onChange={e => setConnectPlatform(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Access Token</label>
                <input type="password" value={connectToken} onChange={e => setConnectToken(e.target.value)} placeholder="Paste your API access token"
                  className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowConnect(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">Cancel</button>
                <button onClick={connectPlatformFn} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">Connect</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
