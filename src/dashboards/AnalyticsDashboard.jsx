/**
 * Nexus AI Pro — Analytics Dashboard
 * Social media metrics: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGifs
 * Real-time updates via WebSocket. Views, likes, reach, retention, follower growth.
 * date: 2026-06-08
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, Users, Eye, Heart, Share2, MessageCircle, Activity, Plus, RefreshCw, BarChart2, Globe, Zap } from 'lucide-react';

// ── Platform config ───────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    color: '#69C9D0', bg: 'from-[#010101] to-[#69C9D0]', icon: '🎵' },
  { id: 'instagram', label: 'Instagram', color: '#E1306C', bg: 'from-[#833AB4] to-[#E1306C]', icon: '📸' },
  { id: 'facebook',  label: 'Facebook',  color: '#1877F2', bg: 'from-[#1877F2] to-[#42A5F5]', icon: '👤' },
  { id: 'twitch',    label: 'Twitch',    color: '#9146FF', bg: 'from-[#6441A4] to-[#9146FF]', icon: '🎮' },
  { id: 'discord',   label: 'Discord',   color: '#5865F2', bg: 'from-[#404EED] to-[#5865F2]', icon: '💬' },
  { id: 'lemon8',    label: 'Lemon8',    color: '#FFE00A', bg: 'from-[#FF9900] to-[#FFE00A]', icon: '🍋' },
  { id: 'reddit',    label: 'Reddit',    color: '#FF4500', bg: 'from-[#CC3600] to-[#FF4500]', icon: '🤖' },
  { id: 'redgifs',   label: 'RedGifs',   color: '#FF4444', bg: 'from-[#CC0000] to-[#FF4444]', icon: '🎬' },
];

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, change, icon: Icon, color }) {
  const isPositive = change >= 0;
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50 font-medium">{label}</span>
        {Icon && <Icon size={14} style={{ color }} />}
      </div>
      <div className="text-xl font-bold text-white">{formatNum(value)}</div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          <span>{Math.abs(change)}% 7d</span>
        </div>
      )}
    </div>
  );
}

// ── Mini sparkline (pure CSS/SVG) ─────────────────────────────────────────────

function Sparkline({ data = [], color = '#6366f1', height = 40 }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120, h = height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

// ── Platform card ─────────────────────────────────────────────────────────────

function PlatformCard({ platform, metrics, isSelected, onSelect }) {
  const cfg = PLATFORMS.find(p => p.id === platform) || PLATFORMS[0];
  const trending = (metrics?.growthRate7d || 0) >= 0;
  return (
    <button
      onClick={() => onSelect(platform)}
      className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all border ${isSelected ? 'border-white/30 scale-[1.02]' : 'border-white/10 hover:border-white/20'}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${cfg.bg} opacity-20`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{cfg.icon}</span>
            <span className="text-sm font-semibold text-white">{cfg.label}</span>
          </div>
          <div className={`text-xs px-2 py-0.5 rounded-full ${trending ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {trending ? '▲' : '▼'} {Math.abs(metrics?.growthRate7d || 0)}%
          </div>
        </div>
        <div className="text-2xl font-bold text-white">{formatNum(metrics?.followers || 0)}</div>
        <div className="text-xs text-white/50 mt-0.5">followers</div>
        <div className="mt-3 flex gap-3 text-xs text-white/60">
          <span>👁 {formatNum(metrics?.totalViews || 0)}</span>
          <span>❤️ {formatNum(metrics?.totalLikes || 0)}</span>
          <span>📊 {metrics?.engagementRate || 0}%</span>
        </div>
      </div>
    </button>
  );
}

// ── Chart bar ─────────────────────────────────────────────────────────────────

function BarChart({ data = [], valueKey = 'value', labelKey = 'date', color = '#6366f1' }) {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.slice(-14).map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-sm min-h-[2px] transition-all"
            style={{ height: `${Math.max(4, (d[valueKey] / max) * 76)}px`, background: color }}
            title={`${d[labelKey]}: ${formatNum(d[valueKey])}`}
          />
        </div>
      ))}
    </div>
  );
}

// ── Connect modal ─────────────────────────────────────────────────────────────

function ConnectModal({ platform, onConnect, onClose }) {
  const [token, setToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const cfg = PLATFORMS.find(p => p.id === platform) || {};
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#111] border border-white/20 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-1">Connect {cfg.label} {cfg.icon}</h3>
        <p className="text-sm text-white/50 mb-4">Provide your OAuth access token to sync metrics.</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/60 mb-1">Access Token</label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="Paste OAuth access token..."
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Account / Page ID (optional)</label>
            <input
              type="text"
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="Account or page ID..."
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/20 text-sm text-white/70 hover:bg-white/5">Cancel</button>
          <button
            onClick={() => { onConnect(platform, { accessToken: token, accountId }); onClose(); }}
            disabled={!token}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-medium text-white transition-colors"
          >Connect</button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n || 0);
}

// ── Main Analytics Dashboard ──────────────────────────────────────────────────

export default function AnalyticsDashboard({ userId, socket }) {
  const [connected, setConnected] = useState([]);
  const [allMetrics, setAllMetrics] = useState({});
  const [overview, setOverview] = useState(null);
  const [selected, setSelected] = useState(null);
  const [timeSeries, setTimeSeries] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectModal, setConnectModal] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [connRes, overviewRes] = await Promise.all([
        fetch('/api/analytics/platforms', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }),
        fetch('/api/analytics/overview', { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }),
      ]);
      if (connRes.ok) setConnected(await connRes.json());
      if (overviewRes.ok) {
        const ov = await overviewRes.json();
        setOverview(ov);
        setAllMetrics(ov.metrics || {});
      }
      setLastUpdated(new Date());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!socket) return;
    socket.on('analytics:update', ({ platform, metrics }) => {
      setAllMetrics(prev => ({ ...prev, [platform]: metrics }));
      setLastUpdated(new Date());
    });
    return () => socket.off('analytics:update');
  }, [socket]);

  const loadTimeSeries = async (platform, metric = 'followers') => {
    try {
      const res = await fetch(`/api/analytics/timeseries/${platform}?metric=${metric}&days=30`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTimeSeries(prev => ({ ...prev, [platform]: data }));
      }
    } catch {}
  };

  const handleSelectPlatform = (platform) => {
    setSelected(platform === selected ? null : platform);
    if (platform !== selected) loadTimeSeries(platform);
  };

  const handleConnect = async (platform, credentials) => {
    try {
      await fetch('/api/analytics/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ platform, ...credentials }),
      });
      await loadData();
    } catch (e) { setError(e.message); }
  };

  const connectedPlatforms = connected.map(c => c.platform);
  const selectedMetrics = selected ? allMetrics[selected] : null;
  const selectedCfg = PLATFORMS.find(p => p.id === selected);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart2 className="text-indigo-400" size={24} /> Analytics Dashboard</h1>
          <p className="text-white/50 text-sm mt-0.5">
            Real-time metrics across all connected social platforms
            {lastUpdated && <span className="ml-2">· Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} disabled={loading} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin text-indigo-400' : 'text-white/60'} />
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

      {/* Overview stats */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Total Followers" value={overview.totalFollowers} icon={Users} color="#6366f1" />
          <MetricCard label="Total Views" value={overview.totalViews} icon={Eye} color="#22d3ee" />
          <MetricCard label="Total Likes" value={overview.totalLikes} icon={Heart} color="#f43f5e" />
          <MetricCard label="Total Reach" value={overview.totalReach} icon={Globe} color="#a3e635" />
        </div>
      )}

      {/* Platform grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Platforms</h2>
          <button
            onClick={() => setConnectModal(PLATFORMS.find(p => !connectedPlatforms.includes(p.id))?.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg text-xs text-indigo-300 transition-colors"
          >
            <Plus size={12} /> Connect Platform
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PLATFORMS.filter(p => connectedPlatforms.includes(p.id)).map(p => (
            <PlatformCard
              key={p.id}
              platform={p.id}
              metrics={allMetrics[p.id]}
              isSelected={selected === p.id}
              onSelect={handleSelectPlatform}
            />
          ))}
          {PLATFORMS.filter(p => !connectedPlatforms.includes(p.id)).map(p => (
            <button
              key={p.id}
              onClick={() => setConnectModal(p.id)}
              className="rounded-2xl p-4 border border-dashed border-white/10 hover:border-white/20 text-center transition-colors group"
            >
              <div className="text-2xl mb-1 opacity-40 group-hover:opacity-70">{p.icon}</div>
              <div className="text-xs text-white/30 group-hover:text-white/50">{p.label}</div>
              <div className="text-xs text-white/20 mt-1">+ Connect</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected platform detail */}
      {selected && selectedMetrics && selectedCfg && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl">{selectedCfg.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-white">{selectedCfg.label}</h2>
              <div className="text-xs text-white/40">Detailed metrics</div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <MetricCard label="Followers" value={selectedMetrics.followers} change={selectedMetrics.growthRate7d} icon={Users} color={selectedCfg.color} />
            <MetricCard label="Total Views" value={selectedMetrics.totalViews} icon={Eye} color={selectedCfg.color} />
            <MetricCard label="Engagement" value={`${selectedMetrics.engagementRate}%`} icon={Zap} color={selectedCfg.color} />
            <MetricCard label="Retention" value={`${selectedMetrics.retentionRate}%`} icon={Activity} color={selectedCfg.color} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <MetricCard label="Likes" value={selectedMetrics.totalLikes} icon={Heart} color="#f43f5e" />
            <MetricCard label="Comments" value={selectedMetrics.totalComments} icon={MessageCircle} color="#a78bfa" />
            <MetricCard label="Shares" value={selectedMetrics.totalShares} icon={Share2} color="#34d399" />
            <MetricCard label="Avg Watch Time" value={`${selectedMetrics.avgWatchTime}s`} icon={Activity} color="#fbbf24" />
          </div>

          {/* 30-day chart */}
          {timeSeries[selected] && (
            <div>
              <div className="text-xs text-white/40 mb-2">30-Day Follower Growth</div>
              <BarChart data={timeSeries[selected]} color={selectedCfg.color} />
            </div>
          )}

          {/* Top posts */}
          {selectedMetrics.topPosts?.length > 0 && (
            <div className="mt-5">
              <div className="text-xs text-white/40 mb-2 uppercase tracking-wider">Top Content</div>
              <div className="space-y-2">
                {selectedMetrics.topPosts.map((post, i) => (
                  <div key={post.id} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/30 w-4">{i + 1}</span>
                      <span className="text-sm text-white/80 truncate max-w-[200px]">{post.title}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-white/50">
                      <span>👁 {formatNum(post.views)}</span>
                      <span>❤️ {formatNum(post.likes)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connect modal */}
      {connectModal && (
        <ConnectModal
          platform={connectModal}
          onConnect={handleConnect}
          onClose={() => setConnectModal(null)}
        />
      )}
    </div>
  );
}
