// File: AnalyticsDashboard.jsx | Date: 2026-06-16 | Nexus AI Pro

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Download, TrendingUp, Users, Eye, Heart, Share2, Zap, Activity, Globe, Plus, X, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useSocket } from '../contexts/SocketContext.jsx'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_METRICS = {
  totalFollowers: 284750,
  totalReach: 1240000,
  engagementRate: 4.7,
  totalViews: 8920000,
  platforms: {
    tiktok:    { followers: 142000, views: 4200000, likes: 380000, shares: 45000, comments: 28000, completionRate: 67, fypReach: 3100000 },
    instagram: { followers: 68000, impressions: 890000, storyViews: 42000, reelPlays: 290000, saves: 18000 },
    facebook:  { followers: 32000, reach: 420000, pageLikes: 32000, postEngagement: 8900 },
    twitch:    { followers: 18000, peakViewers: 1240, avgViewers: 380, followersGained: 450, clips: 89 },
    discord:   { members: 12500, messages: 48000, activeUsers: 3200 },
    reddit:    { karma: 84000, postUpvotes: 62000, commentKarma: 22000 },
    lemon8:    { followers: 8200, saves: 14000, discoveryReach: 95000 },
    redgifs:   { views: 980000, shares: 12000 },
  },
  topPosts: [
    { id: 1, platform: 'tiktok',    title: 'Morning routine vlog',        views: 420000, likes: 38000, shares: 4200, retention: 78 },
    { id: 2, platform: 'instagram', title: 'Beach aesthetic reel',         views: 180000, likes: 22000, shares: 1800, retention: 61 },
    { id: 3, platform: 'youtube',   title: 'Full day cooking tutorial',    views: 95000,  likes: 8400,  shares: 920,  retention: 52 },
    { id: 4, platform: 'tiktok',    title: 'AI coding timelapse',          views: 88000,  likes: 7200,  shares: 1100, retention: 83 },
    { id: 5, platform: 'reddit',    title: 'I built an entire SaaS in 24h',views: 74000,  likes: 12400, shares: 3200, retention: null },
  ],
  audienceInsights: {
    ageGroups: [
      { group: '13-17', pct: 8 },
      { group: '18-24', pct: 34 },
      { group: '25-34', pct: 31 },
      { group: '35-44', pct: 17 },
      { group: '45-54', pct: 7 },
      { group: '55+',   pct: 3 },
    ],
    topCountries: [
      { country: 'United States',  pct: 42 },
      { country: 'United Kingdom', pct: 12 },
      { country: 'Canada',         pct: 9 },
      { country: 'Australia',      pct: 7 },
      { country: 'Germany',        pct: 5 },
    ],
    activeHours: [8, 12, 14, 18, 21, 22, 23, 0],
  },
  followerGrowth: [
    { date: 'Jun 10', followers: 271000 },
    { date: 'Jun 11', followers: 273500 },
    { date: 'Jun 12', followers: 275200 },
    { date: 'Jun 13', followers: 278000 },
    { date: 'Jun 14', followers: 280500 },
    { date: 'Jun 15', followers: 282800 },
    { date: 'Jun 16', followers: 284750 },
  ],
  likesPerPlatform: [
    { name: 'TikTok',    likes: 380000 },
    { name: 'Instagram', likes: 89000 },
    { name: 'Facebook',  likes: 32000 },
    { name: 'Reddit',    likes: 62000 },
  ],
  platformTraffic: [
    { name: 'TikTok',    value: 47 },
    { name: 'Instagram', value: 22 },
    { name: 'Facebook',  value: 11 },
    { name: 'Twitch',    value: 8 },
    { name: 'Reddit',    value: 7 },
    { name: 'Others',    value: 5 },
  ],
  recentActivity: [
    { id: 1, type: 'new_follower', platform: 'tiktok',    message: '+847 new followers on TikTok',   time: '2 min ago' },
    { id: 2, type: 'viral',        platform: 'instagram', message: 'Reel trending in #aesthetic',    time: '8 min ago' },
    { id: 3, type: 'milestone',    platform: 'tiktok',    message: 'Crossed 4M views this week!',    time: '1 hr ago' },
    { id: 4, type: 'new_follower', platform: 'discord',   message: '+120 Discord members today',     time: '2 hr ago' },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

const PLATFORM_TABS = [
  { key: 'all',       label: 'All',       emoji: '🌐' },
  { key: 'tiktok',    label: 'TikTok',    emoji: '🎵' },
  { key: 'instagram', label: 'Instagram', emoji: '📸' },
  { key: 'facebook',  label: 'Facebook',  emoji: '📘' },
  { key: 'twitch',    label: 'Twitch',    emoji: '💜' },
  { key: 'discord',   label: 'Discord',   emoji: '🎮' },
  { key: 'lemon8',    label: 'Lemon8',    emoji: '🍋' },
  { key: 'reddit',    label: 'Reddit',    emoji: '🟠' },
  { key: 'redgifs',   label: 'RedGifs',   emoji: '🔴' },
]

const TIME_RANGES = ['24h', '7d', '30d', '90d']

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

// ─── ChartsWrapper ────────────────────────────────────────────────────────────

function ChartsWrapper({ followerGrowth, likesPerPlatform, platformTraffic }) {
  const [charts, setCharts] = useState(null)

  useEffect(() => {
    import('recharts')
      .then(rc => setCharts(rc))
      .catch(() => setCharts(null))
  }, [])

  if (charts) {
    const {
      LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
      XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    } = charts

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Follower Growth */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Follower Growth</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={followerGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [fmt(v), 'Followers']} />
              <Line type="monotone" dataKey="followers" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Platform Traffic Pie */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Traffic Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={platformTraffic} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                {platformTraffic.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={v => [`${v}%`, 'Traffic']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Likes Per Platform Bar */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Likes per Platform</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={likesPerPlatform}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [fmt(v), 'Likes']} />
              <Bar dataKey="likes" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  // ── Fallback CSS charts ────────────────────────────────────────────────────
  const maxFollowers = Math.max(...followerGrowth.map(d => d.followers))
  const maxLikes     = Math.max(...likesPerPlatform.map(d => d.likes))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Follower Growth Fallback */}
      <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Follower Growth</h3>
        <div className="flex items-end gap-2 h-44">
          {followerGrowth.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-indigo-500 rounded-t"
                style={{ height: `${(d.followers / maxFollowers) * 100}%` }}
                title={`${d.date}: ${fmt(d.followers)}`}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-center">{d.date.replace('Jun ', '')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Traffic Pie Fallback */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Traffic Breakdown</h3>
        <div className="space-y-2 mt-2">
          {platformTraffic.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-24 text-xs text-gray-600 dark:text-gray-400 truncate">{d.name}</div>
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="h-3 rounded-full"
                  style={{ width: `${d.value}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
              </div>
              <div className="w-8 text-xs text-right text-gray-500 dark:text-gray-400">{d.value}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Likes Fallback */}
      <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Likes per Platform</h3>
        <div className="space-y-3">
          {likesPerPlatform.map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-20 text-xs text-gray-600 dark:text-gray-400">{d.name}</div>
              <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4">
                <div
                  className="h-4 rounded-full bg-indigo-500"
                  style={{ width: `${(d.likes / maxLikes) * 100}%` }}
                />
              </div>
              <div className="w-16 text-xs text-right font-medium text-gray-700 dark:text-gray-300">{fmt(d.likes)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Platform Detail Card ─────────────────────────────────────────────────────

function PlatformCard({ platformKey, data }) {
  const tab = PLATFORM_TABS.find(t => t.key === platformKey) || {}
  const rows = Object.entries(data).map(([k, v]) => ({
    label: k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
    value: typeof v === 'number' ? fmt(v) : String(v),
  }))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{tab.emoji}</span>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 capitalize">{platformKey}</h3>
        </div>
        <button className="flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
          <Plus size={12} /> Connect
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        {rows.map((r, i) => (
          <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
            <dt className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.label}</dt>
            <dd className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-0.5">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ─── Activity Item ────────────────────────────────────────────────────────────

const ACTIVITY_ICONS = {
  new_follower: <Users size={14} className="text-emerald-500" />,
  viral:        <Zap size={14} className="text-yellow-500" />,
  milestone:    <TrendingUp size={14} className="text-indigo-500" />,
}

function ActivityItem({ item }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="mt-0.5">{ACTIVITY_ICONS[item.type] || <Activity size={14} className="text-gray-400" />}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{item.message}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.time}</p>
      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = 'indigo' }) {
  const colorMap = {
    indigo:  'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    violet:  'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    sky:     'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400',
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorMap[color]}`}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-emerald-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const { user }   = useAuth()   || {}
  const { socket } = useSocket() || {}

  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [timeRange, setTimeRange]               = useState('7d')
  const [metrics, setMetrics]                   = useState(MOCK_METRICS)
  const [realtimeViewers, setRealtimeViewers]   = useState(4821)
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState(null)

  const intervalRef = useRef(null)

  // ── Live viewer ticker ─────────────────────────────────────────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRealtimeViewers(prev => {
        const delta = Math.floor(Math.random() * 200) - 100
        return Math.max(1000, prev + delta)
      })
    }, 5000)
    return () => clearInterval(intervalRef.current)
  }, [])

  // ── Load metrics from API ──────────────────────────────────────────────────
  const loadMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analytics?platform=${selectedPlatform}&range=${timeRange}`)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setMetrics(data)
    } catch {
      setMetrics(MOCK_METRICS)
      setError('Using demo data — API unavailable')
    } finally {
      setLoading(false)
    }
  }, [selectedPlatform, timeRange])

  useEffect(() => { loadMetrics() }, [loadMetrics])

  // ── Socket events ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return
    const handler = data => {
      setMetrics(prev => ({
        ...prev,
        recentActivity: [data, ...(prev.recentActivity || [])].slice(0, 20),
      }))
    }
    socket.on('analytics:update', handler)
    return () => socket.off('analytics:update', handler)
  }, [socket])

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(metrics, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `nexus-analytics-${timeRange}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const platformsToShow = selectedPlatform === 'all'
    ? Object.entries(metrics.platforms)
    : Object.entries(metrics.platforms).filter(([k]) => k === selectedPlatform)

  const { audienceInsights, topPosts, recentActivity, followerGrowth, likesPerPlatform, platformTraffic } = metrics

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Activity className="text-indigo-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Nexus AI Pro · Social Intelligence</p>
            </div>
            {/* Real-time indicator */}
            <div className="flex items-center gap-1.5 ml-2 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Live</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadMetrics}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              <Download size={15} />
              Export
            </button>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg px-4 py-2.5 text-sm">
            <Zap size={14} />
            {error}
          </div>
        )}

        {/* ── Platform Tabs ── */}
        <div className="flex gap-2 flex-wrap">
          {PLATFORM_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedPlatform(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedPlatform === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span>{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Time Range Pills ── */}
        <div className="flex gap-2">
          {TIME_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                timeRange === r
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* ── Overview Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Users size={20} />}     label="Total Followers"    value={fmt(metrics.totalFollowers)}   sub="↑ 2.1% this week" color="indigo" />
          <StatCard icon={<Globe size={20} />}     label="Total Reach"        value={fmt(metrics.totalReach)}       sub="↑ 5.4% vs last period" color="emerald" />
          <StatCard icon={<Heart size={20} />}     label="Engagement Rate"    value={`${metrics.engagementRate}%`}  sub="↑ 0.3% vs last period" color="violet" />
          <StatCard icon={<Eye size={20} />}       label="Total Views"        value={fmt(metrics.totalViews)}       sub="↑ 12.8% this week" color="sky" />
        </div>

        {/* ── Live Viewer Ticker ── */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">👁</span>
          <div>
            <p className="text-white/80 text-xs font-medium">Live viewers right now</p>
            <p className="text-white text-3xl font-bold tabular-nums tracking-tight">
              {realtimeViewers.toLocaleString()}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            <span className="text-white/80 text-xs">Updates every 5s</span>
          </div>
        </div>

        {/* ── Charts + Activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <ChartsWrapper
              followerGrowth={followerGrowth}
              likesPerPlatform={likesPerPlatform}
              platformTraffic={platformTraffic}
            />
          </div>

          {/* Activity Feed */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Activity</h3>
              <span className="text-xs text-indigo-500 font-medium">Live</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentActivity.map(item => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Top Content Table ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Top Performing Content</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left px-5 py-3">#</th>
                  <th className="text-left px-5 py-3">Platform</th>
                  <th className="text-left px-5 py-3">Title</th>
                  <th className="text-right px-5 py-3">Views</th>
                  <th className="text-right px-5 py-3">Likes</th>
                  <th className="text-right px-5 py-3">Shares</th>
                  <th className="text-right px-5 py-3">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {topPosts.map((post, i) => (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3 text-gray-400 dark:text-gray-500">{i + 1}</td>
                    <td className="px-5 py-3">
                      <span className="capitalize text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        {post.platform}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200 max-w-xs truncate">{post.title}</td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-400">{fmt(post.views)}</td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-400">{fmt(post.likes)}</td>
                    <td className="px-5 py-3 text-right text-gray-600 dark:text-gray-400">{fmt(post.shares)}</td>
                    <td className="px-5 py-3 text-right">
                      {post.retention != null ? (
                        <span className={`font-semibold ${post.retention >= 70 ? 'text-emerald-500' : post.retention >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {post.retention}%
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Audience Insights ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Age Groups */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Age Distribution</h3>
            <div className="space-y-2.5">
              {audienceInsights.ageGroups.map(ag => (
                <div key={ag.group} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-gray-500 dark:text-gray-400">{ag.group}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-indigo-500"
                      style={{ width: `${ag.pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs text-right text-gray-600 dark:text-gray-400">{ag.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Countries */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Countries</h3>
            <div className="space-y-2.5">
              {audienceInsights.topCountries.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{['🇺🇸','🇬🇧','🇨🇦','🇦🇺','🇩🇪'][i]}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{c.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${c.pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{c.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Hours */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Peak Active Hours</h3>
            <div className="flex items-end justify-around h-24 gap-1">
              {Array.from({ length: 24 }, (_, h) => {
                const isActive = audienceInsights.activeHours.includes(h)
                return (
                  <div key={h} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className={`w-full rounded-t transition-all ${isActive ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                      style={{ height: isActive ? '100%' : '20%' }}
                      title={`${h}:00`}
                    />
                    {h % 6 === 0 && (
                      <span className="text-xs text-gray-400">{h === 0 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h-12}p` : `${h}a`}</span>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-center">Indigo bars = peak engagement windows</p>
          </div>
        </div>

        {/* ── Platform Detail Cards ── */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">
            {selectedPlatform === 'all' ? 'All Platforms' : PLATFORM_TABS.find(t => t.key === selectedPlatform)?.label} · Platform Metrics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {platformsToShow.map(([key, data]) => (
              <PlatformCard key={key} platformKey={key} data={data} />
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
