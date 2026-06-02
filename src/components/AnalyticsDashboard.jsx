// src/components/AnalyticsDashboard.jsx
// Date: 2026-06-02
// Real-time social analytics dashboard
// Platforms: TikTok, Instagram, Facebook, Twitch, Discord, Lemon8, Reddit, RedGIFs

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Users, Heart, Eye, Share2,
  RefreshCw, Activity, Zap, Play, Star, Link2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PLATFORM_META = {
  tiktok:    { label: 'TikTok',     color: '#010101', accent: '#fe2c55', emoji: '🎵' },
  instagram: { label: 'Instagram',  color: '#e1306c', accent: '#f77737', emoji: '📸' },
  facebook:  { label: 'Facebook',   color: '#1877f2', accent: '#42b72a', emoji: '👤' },
  twitch:    { label: 'Twitch',     color: '#9146ff', accent: '#772ce8', emoji: '🎮' },
  discord:   { label: 'Discord',    color: '#5865f2', accent: '#3ba55c', emoji: '💬' },
  lemon8:    { label: 'Lemon8',     color: '#ffd600', accent: '#ff9800', emoji: '🍋' },
  reddit:    { label: 'Reddit',     color: '#ff4500', accent: '#ff6534', emoji: '🤖' },
  redgifs:   { label: 'RedGIFs',    color: '#ff0000', accent: '#cc0000', emoji: '🎬' },
};

function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg" style={{ background: `${color}22` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <div className="text-xs text-gray-400">{label}</div>
        <div className="text-xl font-bold text-white">{value}</div>
      </div>
    </div>
  );
}

function MiniBar({ data, field, color }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d[field] || 0), 1);
  return (
    <div className="flex items-end gap-0.5 h-12">
      {data.slice(-14).map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-300"
          style={{ height: `${((d[field] || 0) / max) * 100}%`, background: color, opacity: 0.7 + 0.3 * (i / 14) }}
          title={`${d.date}: ${fmt(d[field] || 0)}`}
        />
      ))}
    </div>
  );
}

function PlatformCard({ platform, data, selected, onSelect }) {
  const meta = PLATFORM_META[platform];
  return (
    <button
      onClick={() => onSelect(platform)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${selected ? 'border-violet-500 bg-violet-900/20' : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta.emoji}</span>
          <span className="font-semibold text-white">{meta.label}</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">Live</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <div className="text-gray-400 text-xs">Followers</div>
          <div className="text-white font-medium">{fmt(data.followers)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Engagement</div>
          <div className="text-white font-medium">{data.engagementRate}%</div>
        </div>
      </div>
      <MiniBar data={data.dailySeries} field="views" color={meta.accent} />
    </button>
  );
}

function DetailPanel({ platform, data }) {
  const meta = PLATFORM_META[platform];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b border-gray-800">
        <span className="text-2xl">{meta.emoji}</span>
        <div>
          <h3 className="text-lg font-bold text-white">{meta.label}</h3>
          <span className="text-xs text-green-400 flex items-center gap-1">
            <Zap size={10} /> Real-time data
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Followers" value={fmt(data.followers)} icon={Users} color="#8b5cf6" />
        <StatCard label="Total Views" value={fmt(data.views)} icon={Eye} color="#06b6d4" />
        <StatCard label="Total Likes" value={fmt(data.likes)} icon={Heart} color="#ec4899" />
        <StatCard label="Reach" value={fmt(data.reach)} icon={Share2} color="#10b981" />
        <StatCard label="Impressions" value={fmt(data.impressions)} icon={BarChart3} color="#f59e0b" />
        <StatCard label="Retention" value={`${data.retention}%`} icon={Activity} color="#3b82f6" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-sm font-medium text-gray-300 mb-3">30-Day View Trend</div>
        <div className="flex items-end gap-0.5 h-24">
          {(data.dailySeries || []).map((d, i) => {
            const max = Math.max(...(data.dailySeries || []).map(x => x.views), 1);
            return (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{ height: `${(d.views / max) * 100}%`, background: meta.accent, opacity: 0.5 + 0.5 * (i / 30) }}
                title={`${d.date}: ${fmt(d.views)} views`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>30 days ago</span><span>Today</span>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Star size={14} className="text-yellow-400" /> Top Content
        </div>
        <div className="space-y-2">
          {(data.topContent || []).map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50">
              <span className="text-xs font-bold text-gray-500 w-4">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{c.title}</div>
                <div className="text-xs text-gray-400">{fmt(c.views)} views · {fmt(c.likes)} likes</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ token }) {
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [selected, setSelected] = useState('tiktok');
  const [selectedData, setSelectedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectModal, setConnectModal] = useState(false);
  const [connectPlatform, setConnectPlatform] = useState('');
  const [connectToken, setConnectToken] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOverview(data.overview);
        setLastUpdated(new Date());
      }
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPlatform = useCallback(async (p) => {
    try {
      const res = await fetch(`/api/analytics/${p}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedData(data.data);
      }
    } catch {
      // Non-fatal
    }
  }, [token]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { if (selected) fetchPlatform(selected); }, [selected, fetchPlatform]);

  useEffect(() => {
    const interval = setInterval(() => { fetchOverview(); if (selected) fetchPlatform(selected); }, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview, fetchPlatform, selected]);

  const handleConnect = async () => {
    if (!connectPlatform || !connectToken) return;
    await fetch('/api/analytics/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ platform: connectPlatform, accessToken: connectToken }),
    });
    setConnectModal(false);
    setConnectToken('');
    fetchOverview();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-violet-400" size={24} />
      </div>
    );
  }

  const platforms = overview?.platforms || [];

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('analytics.title')}</h2>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Updated {lastUpdated.toLocaleTimeString()} · Auto-refresh every 30s
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConnectModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm transition-colors"
          >
            <Link2 size={14} /> {t('analytics.connectPlatform')}
          </button>
          <button
            onClick={() => { fetchOverview(); if (selected) fetchPlatform(selected); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm transition-colors"
          >
            <RefreshCw size={14} /> {t('common.refresh')}
          </button>
        </div>
      </div>

      {/* Overview stats */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label={t('analytics.followers')} value={fmt(overview.totalFollowers)} icon={Users} color="#8b5cf6" />
          <StatCard label={t('analytics.views')} value={fmt(overview.totalViews)} icon={Eye} color="#06b6d4" />
          <StatCard label={t('analytics.likes')} value={fmt(overview.totalLikes)} icon={Heart} color="#ec4899" />
          <StatCard label={t('analytics.retention')} value={`${overview.avgRetention}%`} icon={TrendingUp} color="#10b981" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Platform list */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{t('analytics.platforms')}</h3>
          <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
            {platforms.map(p => (
              <PlatformCard
                key={p.platform}
                platform={p.platform}
                data={p}
                selected={selected === p.platform}
                onSelect={setSelected}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selectedData ? (
            <DetailPanel platform={selected} data={selectedData} />
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">
              Select a platform
            </div>
          )}
        </div>
      </div>

      {/* Connect modal */}
      {connectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Connect Platform</h3>
            <select
              value={connectPlatform}
              onChange={e => setConnectPlatform(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 mb-3"
            >
              <option value="">Select platform…</option>
              {Object.entries(PLATFORM_META).map(([k, v]) => (
                <option key={k} value={k}>{v.emoji} {v.label}</option>
              ))}
            </select>
            <input
              type="password"
              placeholder="Platform access token"
              value={connectToken}
              onChange={e => setConnectToken(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={handleConnect} className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm">Connect</button>
              <button onClick={() => setConnectModal(false)} className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
