// AnalyticsDashboard.jsx — 2026-05-07

import React, {
  useState,
  useEffect,
  useReducer,
  useCallback,
  useRef,
  Component,
} from 'react';
import {
  TrendingUp,
  TrendingDown,
  Heart,
  Eye,
  Users,
  Play,
  BarChart2,
  FileText,
  Wifi,
  WifiOff,
  AlertCircle,
  ChevronDown,
  Calendar,
  RefreshCw,
  Zap,
  Clock,
  Monitor,
  Loader2,
} from 'lucide-react';

const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',     color: '#69C9D0' },
  { id: 'instagram', label: 'Instagram',  color: '#E1306C' },
  { id: 'facebook',  label: 'Facebook',   color: '#1877F2' },
  { id: 'twitch',    label: 'Twitch',     color: '#9146FF' },
  { id: 'discord',   label: 'Discord',    color: '#5865F2' },
  { id: 'lemon8',    label: 'Lemon8',     color: '#FFD700' },
  { id: 'reddit',    label: 'Reddit',     color: '#FF4500' },
  { id: 'redgifs',   label: 'RedGifs',    color: '#FF2D2D' },
];

const DATE_RANGES = [
  { id: '7d',     label: '7 Days' },
  { id: '30d',    label: '30 Days' },
  { id: '90d',    label: '90 Days' },
  { id: 'custom', label: 'Custom' },
];

const initialMetrics = () => ({
  likes: 0,
  reach: 0,
  views: 0,
  watchTime: 0,
  retentionRate: 0,
  followersDelta: 0,
  engagementRate: 0,
  postCount: 0,
  history: [],
});

const initialPlatformState = () =>
  PLATFORMS.reduce((acc, p) => {
    acc[p.id] = {
      metrics: initialMetrics(),
      status: 'disconnected',
      error: null,
      loading: true,
    };
    return acc;
  }, {});

function platformReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_METRICS': {
      const prev = state[action.platform];
      if (!prev) return state;
      const history = [
        ...(prev.metrics.history || []).slice(-29),
        action.metrics.engagementRate ?? 0,
      ];
      return {
        ...state,
        [action.platform]: {
          ...prev,
          metrics: { ...action.metrics, history },
          status: 'connected',
          error: null,
          loading: false,
        },
      };
    }
    case 'SET_ERROR':
      return {
        ...state,
        [action.platform]: {
          ...state[action.platform],
          status: 'error',
          error: action.message,
          loading: false,
        },
      };
    case 'SET_STATUS':
      return {
        ...state,
        [action.platform]: {
          ...state[action.platform],
          status: action.status,
        },
      };
    case 'SET_LOADING':
      return {
        ...state,
        [action.platform]: {
          ...state[action.platform],
          loading: action.loading,
        },
      };
    default:
      return state;
  }
}

function Sparkline({ data = [], color = '#60A5FA', height = 40, width = 120 }) {
  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} className="opacity-30">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth={1.5} />
      </svg>
    );
  }

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  const areaPoints = [
    `0,${height}`,
    ...points,
    `${width},${height}`,
  ].join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#grad-${color.replace('#', '')})`}
      />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={data.length > 0 ? (data.length - 1) * stepX : 0}
        cy={data.length > 0 ? height - ((data[data.length - 1] - min) / range) * (height - 4) - 2 : height / 2}
        r={3}
        fill={color}
      />
    </svg>
  );
}

function StatusBadge({ status }) {
  const configs = {
    connected:    { icon: Wifi,       text: 'Connected',    cls: 'text-green-400 bg-green-400/10' },
    disconnected: { icon: WifiOff,    text: 'Disconnected', cls: 'text-gray-400 bg-gray-400/10' },
    error:        { icon: AlertCircle, text: 'Error',       cls: 'text-red-400 bg-red-400/10' },
  };
  const cfg = configs[status] || configs.disconnected;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>
      <Icon size={10} />
      {cfg.text}
    </span>
  );
}

function SkeletonCard({ darkMode }) {
  const base = darkMode ? 'bg-gray-700' : 'bg-gray-200';
  const card = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  return (
    <div className={`rounded-xl border p-4 ${card} animate-pulse`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`h-4 w-24 rounded ${base}`} />
        <div className={`h-5 w-20 rounded-full ${base}`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className={`h-3 w-16 rounded ${base}`} />
            <div className={`h-5 w-20 rounded ${base}`} />
          </div>
        ))}
      </div>
      <div className={`mt-3 h-10 rounded ${base}`} />
    </div>
  );
}

function MetricItem({ icon: Icon, label, value, sub, color = '#60A5FA' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-xs text-gray-400">
        <Icon size={11} color={color} />
        <span>{label}</span>
      </div>
      <span className="text-sm font-semibold leading-tight">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function formatNum(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDelta(n) {
  if (n == null || isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${formatNum(n)}`;
}

function PlatformCard({ platform, state, darkMode }) {
  const { metrics, status, error, loading } = state;
  const card = darkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  if (loading) return <SkeletonCard darkMode={darkMode} />;

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${card}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: platform.color }}
          />
          <span className="font-semibold text-sm">{platform.label}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-400/10 rounded px-2 py-1 flex items-center gap-1">
          <AlertCircle size={11} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <MetricItem
          icon={Heart}
          label="Likes"
          value={formatNum(metrics.likes)}
          color="#F472B6"
        />
        <MetricItem
          icon={Eye}
          label="Reach"
          value={formatNum(metrics.reach)}
          color="#60A5FA"
        />
        <MetricItem
          icon={Play}
          label="Views"
          value={formatNum(metrics.views)}
          sub={metrics.watchTime ? `${formatNum(metrics.watchTime)}h watch` : null}
          color="#34D399"
        />
        <MetricItem
          icon={Clock}
          label="Retention"
          value={metrics.retentionRate != null ? `${metrics.retentionRate.toFixed(1)}%` : '—'}
          color="#FBBF24"
        />
        <MetricItem
          icon={Users}
          label="Followers Δ"
          value={formatDelta(metrics.followersDelta)}
          color={metrics.followersDelta >= 0 ? '#34D399' : '#F87171'}
        />
        <MetricItem
          icon={BarChart2}
          label="Engagement"
          value={metrics.engagementRate != null ? `${metrics.engagementRate.toFixed(2)}%` : '—'}
          color="#A78BFA"
        />
        <MetricItem
          icon={FileText}
          label="Posts"
          value={formatNum(metrics.postCount)}
          color={platform.color}
        />
      </div>

      <div className="flex items-end justify-between mt-1">
        <span className="text-xs text-gray-400">Engagement trend</span>
        <Sparkline
          data={metrics.history}
          color={platform.color}
          height={36}
          width={100}
        />
      </div>
    </div>
  );
}

function SummaryBar({ platformData, darkMode }) {
  const bar = darkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';

  const totals = PLATFORMS.reduce(
    (acc, p) => {
      const m = platformData[p.id]?.metrics;
      if (!m) return acc;
      acc.reach += m.reach || 0;
      acc.likes += m.likes || 0;
      acc.followers += m.followersDelta || 0;
      acc.retentionSum += m.retentionRate || 0;
      acc.retentionCount += m.retentionRate ? 1 : 0;
      return acc;
    },
    { reach: 0, likes: 0, followers: 0, retentionSum: 0, retentionCount: 0 }
  );

  const avgRetention =
    totals.retentionCount > 0
      ? (totals.retentionSum / totals.retentionCount).toFixed(1)
      : '—';

  const items = [
    { icon: Eye,       label: 'Total Reach',        value: formatNum(totals.reach),    color: '#60A5FA' },
    { icon: Heart,     label: 'Total Likes',         value: formatNum(totals.likes),    color: '#F472B6' },
    { icon: Clock,     label: 'Avg Retention',       value: avgRetention !== '—' ? `${avgRetention}%` : '—', color: '#FBBF24' },
    { icon: Users,     label: 'New Followers',       value: formatDelta(totals.followers), color: totals.followers >= 0 ? '#34D399' : '#F87171' },
  ];

  return (
    <div className={`rounded-xl border p-4 ${bar}`}>
      <div className="flex items-center gap-2 mb-3">
        <Zap size={14} className="text-yellow-400" />
        <span className="text-sm font-semibold">All Platforms Summary</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Icon size={11} color={item.color} />
                <span>{item.label}</span>
              </div>
              <span className="text-xl font-bold" style={{ color: item.color }}>
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopContentTable({ darkMode }) {
  const card = darkMode
    ? 'bg-gray-800 border-gray-700 text-white'
    : 'bg-white border-gray-200 text-gray-900';
  const row = darkMode ? 'border-gray-700' : 'border-gray-100';

  const MOCK_TOP = [
    { id: 1, title: 'Morning Routine 2026',    platform: 'TikTok',    likes: 48200, views: 312000, engagement: 15.4 },
    { id: 2, title: 'Studio Vlog #12',          platform: 'Instagram', likes: 31400, views: 198000, engagement: 15.9 },
    { id: 3, title: 'Q&A Live Stream',          platform: 'Twitch',    likes: 22100, views: 145000, engagement: 15.2 },
    { id: 4, title: 'New Track Preview',        platform: 'Reddit',    likes: 19800, views: 134000, engagement: 14.8 },
    { id: 5, title: 'Behind the Scenes Cut',    platform: 'Lemon8',    likes: 17500, views: 121000, engagement: 14.5 },
  ];

  return (
    <div className={`rounded-xl border ${card}`}>
      <div className="p-4 border-b flex items-center gap-2 ${row}">
        <TrendingUp size={14} className="text-green-400" />
        <span className="text-sm font-semibold">Top Content (by Engagement)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b text-gray-400 text-xs ${row}`}>
              <th className="text-left px-4 py-2 font-medium">Content</th>
              <th className="text-left px-4 py-2 font-medium">Platform</th>
              <th className="text-right px-4 py-2 font-medium">Likes</th>
              <th className="text-right px-4 py-2 font-medium">Views</th>
              <th className="text-right px-4 py-2 font-medium">Eng%</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TOP.map((item, idx) => {
              const plt = PLATFORMS.find((p) => p.label === item.platform);
              return (
                <tr key={item.id} className={idx < MOCK_TOP.length - 1 ? `border-b ${row}` : ''}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: plt?.color || '#6B7280' }}
                      >
                        {idx + 1}
                      </div>
                      <span className="font-medium truncate max-w-[140px]">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: `${plt?.color || '#6B7280'}20`,
                        color: plt?.color || '#6B7280',
                      }}
                    >
                      {item.platform}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatNum(item.likes)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{formatNum(item.views)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-green-400 font-semibold">{item.engagement}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DateRangeSelector({ value, onChange, darkMode }) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const btn = (active) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      active
        ? 'bg-blue-500 text-white'
        : darkMode
        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`;

  const input = darkMode
    ? 'bg-gray-700 border-gray-600 text-white'
    : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar size={14} className="text-gray-400 flex-shrink-0" />
      {DATE_RANGES.filter((r) => r.id !== 'custom').map((r) => (
        <button key={r.id} className={btn(value === r.id)} onClick={() => onChange(r.id)}>
          {r.label}
        </button>
      ))}
      <div className="relative">
        <button
          className={btn(value === 'custom')}
          onClick={() => {
            onChange('custom');
            setCustomOpen((o) => !o);
          }}
        >
          Custom <ChevronDown size={11} className="inline ml-0.5" />
        </button>
        {customOpen && (
          <div
            className={`absolute top-full mt-1 right-0 z-20 rounded-xl border p-3 flex flex-col gap-2 shadow-xl min-w-[200px] ${
              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <label className="text-xs text-gray-400">From</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className={`text-xs border rounded px-2 py-1 ${input}`}
            />
            <label className="text-xs text-gray-400">To</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className={`text-xs border rounded px-2 py-1 ${input}`}
            />
            <button
              className="text-xs bg-blue-500 text-white rounded px-3 py-1.5 mt-1 hover:bg-blue-600 transition-colors"
              onClick={() => setCustomOpen(false)}
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

class PlatformErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[AnalyticsDashboard] Platform render error:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      const card = this.props.darkMode
        ? 'bg-gray-800 border-gray-700 text-white'
        : 'bg-white border-gray-200 text-gray-900';
      return (
        <div className={`rounded-xl border p-4 flex flex-col gap-2 ${card}`}>
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={16} />
            <span className="font-semibold text-sm">{this.props.platformLabel}</span>
          </div>
          <p className="text-xs text-gray-400">
            Failed to render platform data.{' '}
            <button
              className="text-blue-400 underline hover:text-blue-300"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Retry
            </button>
          </p>
          {this.props.userRole === 'admin' || this.props.userRole === 'dev' ? (
            <pre className="text-xs text-red-400 mt-1 overflow-auto max-h-20">
              {this.state.error?.message}
            </pre>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AnalyticsDashboard({ socket = null, darkMode = false, userRole = 'user' }) {
  const [platformData, dispatch] = useReducer(platformReducer, null, initialPlatformState);
  const [activeTab, setActiveTab] = useState('tiktok');
  const [dateRange, setDateRange] = useState('30d');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      PLATFORMS.forEach((p) => {
        dispatch({ type: 'SET_LOADING', platform: p.id, loading: false });
      });
      setGlobalLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = useCallback(({ platform, metrics }) => {
    if (!mountedRef.current) return;
    if (!platform || !metrics) return;
    dispatch({ type: 'UPDATE_METRICS', platform, metrics });
    setLastUpdated(new Date());
  }, []);

  const handleError = useCallback(({ platform, message }) => {
    if (!mountedRef.current) return;
    dispatch({ type: 'SET_ERROR', platform, message });
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('analytics:update', handleUpdate);
    socket.on('analytics:error', handleError);

    PLATFORMS.forEach((p) => {
      const connected = socket.connected;
      dispatch({
        type: 'SET_STATUS',
        platform: p.id,
        status: connected ? 'connected' : 'disconnected',
      });
    });

    const onConnect = () => {
      PLATFORMS.forEach((p) => {
        dispatch({ type: 'SET_STATUS', platform: p.id, status: 'connected' });
      });
    };
    const onDisconnect = () => {
      PLATFORMS.forEach((p) => {
        dispatch({ type: 'SET_STATUS', platform: p.id, status: 'disconnected' });
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('analytics:update', handleUpdate);
      socket.off('analytics:error', handleError);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, handleUpdate, handleError]);

  const bg = darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const headerBg = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const tabBase = darkMode
    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100';
  const tabActive = 'text-blue-400 bg-blue-500/10 font-semibold';

  const activePlatform = PLATFORMS.find((p) => p.id === activeTab);
  const activePlatformData = platformData[activeTab];

  return (
    <div className={`min-h-screen ${bg} font-sans`}>
      <div className={`sticky top-0 z-10 border-b px-4 sm:px-6 py-3 ${headerBg}`}>
        <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Monitor size={18} className="text-blue-400 flex-shrink-0" />
            <h1 className="text-base font-bold truncate">Analytics Dashboard</h1>
            {globalLoading && (
              <Loader2 size={14} className="text-blue-400 animate-spin flex-shrink-0" />
            )}
            {!globalLoading && lastUpdated && (
              <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1">
                <RefreshCw size={10} />
                {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <DateRangeSelector value={dateRange} onChange={setDateRange} darkMode={darkMode} />
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        <SummaryBar platformData={platformData} darkMode={darkMode} />

        <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className={`flex overflow-x-auto scrollbar-hide border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {PLATFORMS.map((p) => {
              const status = platformData[p.id]?.status;
              const isActive = activeTab === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveTab(p.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs transition-colors border-b-2 ${
                    isActive
                      ? `border-current ${tabActive}`
                      : `border-transparent ${tabBase}`
                  }`}
                  style={isActive ? { color: p.color, borderColor: p.color } : {}}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor:
                        status === 'connected'
                          ? '#34D399'
                          : status === 'error'
                          ? '#F87171'
                          : '#6B7280',
                    }}
                  />
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className={`p-4 sm:p-5 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {activePlatform && activePlatformData && (
              <PlatformErrorBoundary
                platformLabel={activePlatform.label}
                darkMode={darkMode}
                userRole={userRole}
              >
                <div className="grid grid-cols-1 gap-4">
                  <PlatformCard
                    platform={activePlatform}
                    state={activePlatformData}
                    darkMode={darkMode}
                  />
                </div>
              </PlatformErrorBoundary>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-purple-400" />
            <span className="text-sm font-semibold">All Platforms</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORMS.map((p) => (
              <PlatformErrorBoundary
                key={p.id}
                platformLabel={p.label}
                darkMode={darkMode}
                userRole={userRole}
              >
                <PlatformCard
                  platform={p}
                  state={platformData[p.id]}
                  darkMode={darkMode}
                />
              </PlatformErrorBoundary>
            ))}
          </div>
        </div>

        <TopContentTable darkMode={darkMode} />

        {!socket && (
          <div className={`rounded-xl border px-4 py-3 flex items-center gap-2 text-sm ${
            darkMode ? 'bg-yellow-900/20 border-yellow-700/40 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700'
          }`}>
            <AlertCircle size={14} />
            <span>Real-time updates unavailable — no socket connection provided.</span>
          </div>
        )}
      </div>
    </div>
  );
}
