// src/dashboards/AnalyticsDashboard.jsx — 2026-07-26
// Social media analytics + project tracking dashboard with real-time metrics
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, Users, Eye, Heart, Share2, MessageSquare, Radio,
  BarChart3, Activity, Globe, Zap, RefreshCw, Plus, ChevronRight,
  Loader2, AlertTriangle, CheckCircle2, ExternalLink, Filter,
} from 'lucide-react';

const PLATFORM_META = {
  tiktok:    { name: 'TikTok',    color: '#010101', bg: 'bg-black', emoji: '🎵' },
  instagram: { name: 'Instagram', color: '#E1306C', bg: 'bg-pink-600', emoji: '📸' },
  facebook:  { name: 'Facebook',  color: '#1877F2', bg: 'bg-blue-600', emoji: '👥' },
  twitch:    { name: 'Twitch',    color: '#9146FF', bg: 'bg-purple-600', emoji: '🎮' },
  discord:   { name: 'Discord',   color: '#5865F2', bg: 'bg-indigo-600', emoji: '💬' },
  lemon8:    { name: 'Lemon8',    color: '#FFD700', bg: 'bg-yellow-500', emoji: '🍋' },
  reddit:    { name: 'Reddit',    color: '#FF4500', bg: 'bg-orange-600', emoji: '🤖' },
  redgifs:   { name: 'RedGIFs',   color: '#FF1818', bg: 'bg-red-600', emoji: '🎞️' },
};

const PROJECT_TYPES = ['coding', 'game_dev', 'ar_vr', '3d', 'mobile', 'web', 'other'];

function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StatCard({ label, value, sub, icon: Icon, color = 'blue', trend }) {
  const colors = { blue: 'text-blue-500', purple: 'text-purple-500', green: 'text-green-500', pink: 'text-pink-500', orange: 'text-orange-500' };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
        {Icon && <Icon size={16} className={colors[color]} />}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {(sub || trend !== undefined) && (
        <div className="flex items-center gap-2 text-xs">
          {trend !== undefined && (
            <span className={`font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span className="text-gray-500">{sub}</span>}
        </div>
      )}
    </div>
  );
}

function PlatformCard({ data, selected, onClick }) {
  const meta = PLATFORM_META[data.platform] || {};
  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-xl p-4 border-2 transition-all ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.emoji}</span>
          <span className="font-semibold text-gray-900 dark:text-white text-sm">{meta.name}</span>
        </div>
        <ChevronRight size={14} className="text-gray-400" />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-gray-500">Followers</span><div className="font-bold text-gray-900 dark:text-white">{fmt(data.followers)}</div></div>
        <div><span className="text-gray-500">Views</span><div className="font-bold text-gray-900 dark:text-white">{fmt(data.views)}</div></div>
        <div><span className="text-gray-500">Engagement</span><div className="font-bold text-gray-900 dark:text-white">{data.engagement}%</div></div>
        <div><span className="text-gray-500">Retention</span><div className="font-bold text-gray-900 dark:text-white">{data.retention}%</div></div>
      </div>
    </button>
  );
}

function RealtimeIndicator({ active }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium">
      <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      {active ? 'Live' : 'Paused'}
    </div>
  );
}

function ProjectCard({ project, onUpdate }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{project.name}</h4>
          <span className="text-xs text-gray-500 capitalize">{project.type?.replace('_', ' ')} • {project.status}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${project.buildStatus === 'passing' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'}`}>
          {project.buildStatus}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress</span><span>{project.progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div><div className="font-bold text-gray-900 dark:text-white">{project.commits || 0}</div><div className="text-gray-500">Commits</div></div>
        <div><div className="font-bold text-gray-900 dark:text-white">{project.openIssues || 0}</div><div className="text-gray-500">Open Issues</div></div>
        <div><div className="font-bold text-gray-900 dark:text-white">{project.linesOfCode || 0}</div><div className="text-gray-500">Lines</div></div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard({ token }) {
  const [activeTab, setActiveTab] = useState('social');
  const [socialData, setSocialData] = useState([]);
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [platformDetail, setPlatformDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [realtimeUpdates, setRealtimeUpdates] = useState([]);
  const [filterType, setFilterType] = useState('');
  const sseRef = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [socialRes, summaryRes, projRes] = await Promise.all([
        fetch('/api/analytics/social', { headers }),
        fetch('/api/analytics/summary', { headers }),
        fetch('/api/analytics/projects', { headers }),
      ]);
      setSocialData((await socialRes.json()).metrics || []);
      setSummary((await summaryRes.json()).summary);
      setProjects(await projRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const loadPlatformDetail = useCallback(async (platform) => {
    setSelectedPlatform(platform); setPlatformDetail(null);
    try {
      const res = await fetch(`/api/analytics/social/${platform}?days=30`, { headers });
      setPlatformDetail(await res.json());
    } catch (_e) { /* non-blocking platform detail fetch */ }
  }, [token]);

  const toggleRealtime = useCallback(() => {
    if (realtimeActive) {
      sseRef.current?.close();
      setRealtimeActive(false);
    } else {
      const sse = new EventSource(`/api/analytics/realtime?token=${token}`);
      sse.onmessage = (e) => {
        const d = JSON.parse(e.data);
        setRealtimeUpdates(prev => [d, ...prev].slice(0, 20));
        if (d.type === 'update') {
          setSocialData(prev => prev.map(m => m.platform === d.platform ? { ...m, ...d.metrics } : m));
        }
      };
      sseRef.current = sse;
      setRealtimeActive(true);
    }
  }, [realtimeActive, token]);

  useEffect(() => () => sseRef.current?.close(), []);

  const filteredProjects = filterType ? projects.filter(p => p.type === filterType) : projects;

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-2 text-gray-500">
      <Loader2 size={20} className="animate-spin" /> Loading analytics…
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={24} className="text-blue-500" /> Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500">Social media metrics & project tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <RealtimeIndicator active={realtimeActive} />
          <button onClick={toggleRealtime}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${realtimeActive ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'}`}>
            <Radio size={12} /> {realtimeActive ? 'Pause Live' : 'Go Live'}
          </button>
          <button onClick={load} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <RefreshCw size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {[['social', 'Social Media', Globe], ['projects', 'Projects', Activity]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition ${activeTab === id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'social' && (
        <div className="space-y-6">
          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Followers" value={fmt(summary.totalFollowers)} icon={Users} color="blue" />
              <StatCard label="Total Views"     value={fmt(summary.totalViews)}     icon={Eye}   color="purple" />
              <StatCard label="Total Likes"     value={fmt(summary.totalLikes)}     icon={Heart} color="pink" />
              <StatCard label="Avg Engagement"  value={`${summary.avgEngagement}%`} icon={TrendingUp} color="green" />
            </div>
          )}

          {/* Platform grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {socialData.map(d => (
              <PlatformCard key={d.platform} data={d} selected={selectedPlatform === d.platform}
                onClick={() => loadPlatformDetail(d.platform)} />
            ))}
          </div>

          {/* Platform detail panel */}
          {selectedPlatform && platformDetail && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="text-xl">{PLATFORM_META[selectedPlatform]?.emoji}</span>
                  {PLATFORM_META[selectedPlatform]?.name} — 30-day breakdown
                </h3>
                <button onClick={() => setSelectedPlatform(null)} className="text-gray-400 hover:text-gray-600 text-xs">Close</button>
              </div>
              {/* Trend bars */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(platformDetail.trends || {}).map(([k, v]) => (
                  <div key={k} className="text-center">
                    <div className={`text-lg font-bold ${v >= 0 ? 'text-green-500' : 'text-red-500'}`}>{v >= 0 ? '+' : ''}{v}%</div>
                    <div className="text-xs text-gray-500 capitalize">{k}</div>
                  </div>
                ))}
              </div>
              {/* Time series mini chart */}
              {platformDetail.timeSeries?.length > 0 && (
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-0.5 h-24 min-w-0">
                    {platformDetail.timeSeries.map((d, i) => {
                      const max = Math.max(...platformDetail.timeSeries.map(t => t.views));
                      const pct = max > 0 ? (d.views / max) * 100 : 0;
                      return (
                        <div key={i} className="flex-1 flex items-end group relative" title={`${d.date}: ${fmt(d.views)} views`}>
                          <div className="w-full bg-blue-200 dark:bg-blue-800 hover:bg-blue-400 dark:hover:bg-blue-600 rounded-sm transition-all" style={{ height: `${pct}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{platformDetail.timeSeries[0]?.date}</span>
                    <span>Views over 30 days</span>
                    <span>{platformDetail.timeSeries[platformDetail.timeSeries.length - 1]?.date}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Real-time feed */}
          {realtimeActive && realtimeUpdates.length > 0 && (
            <div className="bg-gray-900 rounded-xl p-4 space-y-2">
              <h3 className="text-xs text-green-400 font-mono flex items-center gap-1.5"><Radio size={10} /> LIVE FEED</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {realtimeUpdates.map((u, i) => (
                  <div key={i} className="text-xs text-gray-400 font-mono">
                    {new Date(u.ts).toLocaleTimeString()} — {u.platform} update: {fmt(u.metrics?.views || 0)} views
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All types</option>
              {PROJECT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition">
              <Plus size={14} /> New Project
            </button>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Activity size={40} className="mx-auto mb-3 opacity-30" />
              <p>No projects yet. Create one to start tracking!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
