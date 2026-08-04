// AnalyticsDashboard.jsx
// Date: 2026-08-04
// Comprehensive social media analytics dashboard for Nexus AI Pro

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  TrendingUp,
  Users,
  Eye,
  Heart,
  Share2,
  BarChart3,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',    icon: '🎵', color: 'bg-black',       border: 'border-pink-500',   accent: 'text-pink-400'   },
  { id: 'instagram', label: 'Instagram', icon: '📸', color: 'bg-purple-900',  border: 'border-purple-400', accent: 'text-purple-300'  },
  { id: 'facebook',  label: 'Facebook',  icon: '👥', color: 'bg-blue-900',    border: 'border-blue-400',   accent: 'text-blue-300'    },
  { id: 'twitch',    label: 'Twitch',    icon: '🎮', color: 'bg-violet-900',  border: 'border-violet-400', accent: 'text-violet-300'  },
  { id: 'discord',   label: 'Discord',   icon: '💬', color: 'bg-indigo-900',  border: 'border-indigo-400', accent: 'text-indigo-300'  },
  { id: 'lemon8',    label: 'Lemon8',    icon: '🍋', color: 'bg-yellow-900',  border: 'border-yellow-400', accent: 'text-yellow-300'  },
  { id: 'reddit',    label: 'Reddit',    icon: '🤖', color: 'bg-orange-900',  border: 'border-orange-400', accent: 'text-orange-300'  },
  { id: 'redgifs',   label: 'RedGifs',   icon: '🔴', color: 'bg-red-900',     border: 'border-red-400',    accent: 'text-red-300'     },
];

const TABS = ['Overview', 'Platforms', 'Retention', 'Reach', 'Trends'];

const TIME_RANGES = ['7d', '30d', '90d'];

const DEFAULT_PLATFORM_DATA = {
  tiktok:    { views: 1_420_300, likes: 98_200, reach: 520_000, followers: 84_000, engagement: 6.9, retention: 72, connected: true  },
  instagram: { views: 980_100,  likes: 74_500, reach: 410_000, followers: 61_000, engagement: 7.6, retention: 68, connected: true  },
  facebook:  { views: 640_200,  likes: 31_100, reach: 280_000, followers: 42_000, engagement: 4.9, retention: 55, connected: false },
  twitch:    { views: 320_400,  likes: 22_800, reach: 195_000, followers: 28_000, engagement: 7.1, retention: 81, connected: true  },
  discord:   { views: 85_000,   likes: 4_200,  reach: 65_000,  followers: 12_000, engagement: 4.9, retention: 62, connected: false },
  lemon8:    { views: 210_000,  likes: 18_600, reach: 140_000, followers: 21_000, engagement: 8.9, retention: 74, connected: false },
  reddit:    { views: 530_000,  likes: 41_000, reach: 390_000, followers: 35_000, engagement: 7.7, retention: 58, connected: true  },
  redgifs:   { views: 740_000,  likes: 55_200, reach: 450_000, followers: 48_000, engagement: 7.5, retention: 64, connected: false },
};

const GEO_REACH = [
  { region: 'United States', pct: 34 },
  { region: 'Brazil',        pct: 12 },
  { region: 'United Kingdom',pct: 9  },
  { region: 'Germany',       pct: 7  },
  { region: 'Japan',         pct: 6  },
  { region: 'India',         pct: 8  },
  { region: 'Canada',        pct: 5  },
  { region: 'Australia',     pct: 4  },
  { region: 'Other',         pct: 15 },
];

const TRENDING_ITEMS = [
  { id: 1, platform: 'tiktok',    title: 'Morning Routine 2026',            views: 2_100_000, trend: '+42%' },
  { id: 2, platform: 'instagram', title: 'AI Art Series #7',                views: 1_480_000, trend: '+31%' },
  { id: 3, platform: 'reddit',    title: 'My open-source project hit 10k ⭐', views: 980_000, trend: '+28%' },
  { id: 4, platform: 'twitch',    title: '24-Hour Charity Stream Highlights', views: 760_000, trend: '+19%' },
  { id: 5, platform: 'lemon8',    title: 'Healthy Meal Prep Week 4',         views: 620_000, trend: '+15%' },
  { id: 6, platform: 'redgifs',   title: 'Sunset Time-Lapse Collection',     views: 540_000, trend: '+12%' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : String(n);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ icon: Icon, label, value, sub, accent = 'text-blue-400' }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1 border border-gray-700">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Icon size={14} className={accent} />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

function PlatformCard({ platform, data, onConnect, onDisconnect }) {
  const connected = data?.connected ?? false;
  return (
    <div
      className={`rounded-xl border ${platform.border} ${platform.color} p-4 flex flex-col gap-3 transition-all hover:scale-[1.01]`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{platform.icon}</span>
          <span className="font-semibold text-white">{platform.label}</span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            connected ? 'bg-green-800 text-green-300' : 'bg-gray-700 text-gray-400'
          }`}
        >
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {connected && data ? (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col">
            <span className="text-gray-400 text-xs">Views</span>
            <span className={`font-bold ${platform.accent}`}>{fmt(data.views)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-xs">Likes</span>
            <span className={`font-bold ${platform.accent}`}>{fmt(data.likes)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-xs">Followers</span>
            <span className={`font-bold ${platform.accent}`}>{fmt(data.followers)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-xs">Engagement</span>
            <span className={`font-bold ${platform.accent}`}>{data.engagement}%</span>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Connect to see metrics</p>
      )}

      <button
        onClick={() => (connected ? onDisconnect(platform.id) : onConnect(platform.id))}
        className={`text-xs py-1.5 rounded-lg font-medium transition-colors ${
          connected
            ? 'bg-red-900 hover:bg-red-800 text-red-300'
            : 'bg-green-900 hover:bg-green-800 text-green-300'
        }`}
      >
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}

function RetentionBar({ label, pct, accent }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-sm w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-4 overflow-hidden">
        <div
          className={`h-full rounded-full ${accent} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-white text-sm w-10 text-right">{pct}%</span>
    </div>
  );
}

function GeoBar({ region, pct }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-300 text-sm w-32 shrink-0">{region}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-gray-400 text-sm w-10 text-right">{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content
// ---------------------------------------------------------------------------

function OverviewTab({ data }) {
  const connected = PLATFORMS.filter((p) => data[p.id]?.connected);
  const totalViews = connected.reduce((s, p) => s + (data[p.id]?.views ?? 0), 0);
  const totalReach = connected.reduce((s, p) => s + (data[p.id]?.reach ?? 0), 0);
  const avgEng =
    connected.length
      ? (connected.reduce((s, p) => s + (data[p.id]?.engagement ?? 0), 0) / connected.length).toFixed(1)
      : '—';
  const topPlatform = connected.reduce(
    (best, p) => (!best || (data[p.id]?.views ?? 0) > (data[best.id]?.views ?? 0) ? p : best),
    null
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Eye}        label="Total Views"    value={fmt(totalViews)} sub="Across all platforms" accent="text-blue-400"   />
        <StatCard icon={Share2}     label="Total Reach"   value={fmt(totalReach)} sub="Unique accounts"      accent="text-purple-400" />
        <StatCard icon={TrendingUp} label="Top Platform"  value={topPlatform ? `${topPlatform.icon} ${topPlatform.label}` : '—'} sub="By view count" accent="text-green-400" />
        <StatCard icon={Activity}   label="Avg Engagement" value={`${avgEng}%`}  sub="Connected platforms"  accent="text-yellow-400" />
      </div>

      <div>
        <h3 className="text-gray-300 text-sm font-semibold mb-3 uppercase tracking-wide">Platform Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-500 border-b border-gray-700">
                <th className="pb-2 pr-4">Platform</th>
                <th className="pb-2 pr-4">Views</th>
                <th className="pb-2 pr-4">Likes</th>
                <th className="pb-2 pr-4">Reach</th>
                <th className="pb-2 pr-4">Followers</th>
                <th className="pb-2">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {PLATFORMS.map((p) => {
                const d = data[p.id];
                if (!d?.connected) return null;
                return (
                  <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/40">
                    <td className="py-2 pr-4 flex items-center gap-2">
                      <span>{p.icon}</span>
                      <span className="text-white">{p.label}</span>
                    </td>
                    <td className={`py-2 pr-4 ${p.accent}`}>{fmt(d.views)}</td>
                    <td className="py-2 pr-4 text-gray-300">{fmt(d.likes)}</td>
                    <td className="py-2 pr-4 text-gray-300">{fmt(d.reach)}</td>
                    <td className="py-2 pr-4 text-gray-300">{fmt(d.followers)}</td>
                    <td className="py-2 text-gray-300">{d.engagement}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PlatformsTab({ data, onConnect, onDisconnect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {PLATFORMS.map((p) => (
        <PlatformCard
          key={p.id}
          platform={p}
          data={data[p.id]}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
      ))}
    </div>
  );
}

function RetentionTab({ data }) {
  return (
    <div className="space-y-6">
      <p className="text-gray-400 text-sm">Average content retention per platform (% of viewers who watch to completion).</p>
      <div className="space-y-4">
        {PLATFORMS.map((p) => {
          const d = data[p.id];
          if (!d?.connected) return null;
          return (
            <div key={p.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <span>{p.icon}</span>
                <span className="text-white font-medium">{p.label}</span>
              </div>
              <RetentionBar label="Retention" pct={d.retention} accent={`bg-gradient-to-r from-blue-600 to-${p.accent.replace('text-', '')}`} />
            </div>
          );
        })}
      </div>

      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h3 className="text-white font-semibold mb-3">Retention Curve (TikTok sample)</h3>
        <div className="flex items-end gap-1 h-32">
          {[100, 92, 85, 78, 72, 68, 63, 58, 55, 52].map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-pink-500 transition-all"
                style={{ height: `${v}%` }}
              />
              <span className="text-gray-600 text-xs">{i * 10}s</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReachTab() {
  return (
    <div className="space-y-6">
      <p className="text-gray-400 text-sm">Geographic breakdown of your combined audience reach.</p>
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 space-y-3">
        {GEO_REACH.map((g) => (
          <GeoBar key={g.region} region={g.region} pct={g.pct} />
        ))}
      </div>
    </div>
  );
}

function TrendsTab({ data }) {
  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-sm">Your trending content across connected platforms in the selected period.</p>
      {TRENDING_ITEMS.map((item) => {
        const platform = PLATFORMS.find((p) => p.id === item.platform);
        const connected = data[item.platform]?.connected;
        return (
          <div
            key={item.id}
            className={`bg-gray-800 rounded-xl p-4 border border-gray-700 flex items-center justify-between ${
              !connected ? 'opacity-40' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{platform?.icon}</span>
              <div>
                <div className="text-white font-medium">{item.title}</div>
                <div className="text-gray-500 text-xs">{platform?.label}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-white font-semibold">{fmt(item.views)}</div>
              <div className="text-green-400 text-xs font-medium">{item.trend}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AnalyticsDashboard({
  platformData: externalData,
  onConnect,
  onDisconnect,
  isLoading = false,
}) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [realtimeOn, setRealtimeOn] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [data, setData] = useState(() => ({ ...DEFAULT_PLATFORM_DATA, ...(externalData ?? {}) }));
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [pulse, setPulse] = useState(false);

  // Merge external data changes
  useEffect(() => {
    if (externalData) {
      setData((prev) => ({ ...prev, ...externalData }));
    }
  }, [externalData]);

  // Simulate real-time metric drift
  useEffect(() => {
    if (!realtimeOn) return;
    const interval = setInterval(() => {
      setData((prev) => {
        const next = { ...prev };
        PLATFORMS.forEach((p) => {
          if (next[p.id]?.connected) {
            next[p.id] = {
              ...next[p.id],
              views: next[p.id].views + Math.floor(Math.random() * 120),
              likes: next[p.id].likes + Math.floor(Math.random() * 8),
            };
          }
        });
        return next;
      });
      setLastUpdated(new Date());
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 5000);
    return () => clearInterval(interval);
  }, [realtimeOn]);

  const handleConnect = useCallback(
    (platformId) => {
      setData((prev) => ({
        ...prev,
        [platformId]: { ...DEFAULT_PLATFORM_DATA[platformId], connected: true },
      }));
      onConnect?.(platformId);
    },
    [onConnect]
  );

  const handleDisconnect = useCallback(
    (platformId) => {
      setData((prev) => ({
        ...prev,
        [platformId]: { ...prev[platformId], connected: false },
      }));
      onDisconnect?.(platformId);
    },
    [onDisconnect]
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="text-blue-400" size={24} />
            Analytics Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Multi-platform social media analytics</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range */}
          <div className="flex bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  timeRange === r ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Real-time toggle */}
          <button
            onClick={() => setRealtimeOn((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              realtimeOn
                ? 'bg-green-900 border-green-700 text-green-300'
                : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                realtimeOn ? (pulse ? 'bg-green-200' : 'bg-green-400') : 'bg-gray-500'
              } transition-colors`}
            />
            {realtimeOn ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Last updated */}
      <p className="text-gray-600 text-xs mb-4">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </p>

      {/* Tab nav */}
      <div className="flex overflow-x-auto gap-1 mb-6 bg-gray-800 p-1 rounded-xl border border-gray-700 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Loading overlay */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div>
          {activeTab === 'Overview'   && <OverviewTab data={data} />}
          {activeTab === 'Platforms'  && <PlatformsTab data={data} onConnect={handleConnect} onDisconnect={handleDisconnect} />}
          {activeTab === 'Retention'  && <RetentionTab data={data} />}
          {activeTab === 'Reach'      && <ReachTab />}
          {activeTab === 'Trends'     && <TrendsTab data={data} />}
        </div>
      )}
    </div>
  );
}
