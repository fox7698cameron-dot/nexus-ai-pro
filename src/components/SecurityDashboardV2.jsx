// src/components/SecurityDashboardV2.jsx | Nexus AI Pro | © 2025-2026 Cameron Fox | 2026-06-10

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo
} from 'react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area
} from 'recharts';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Key,
  KeyRound,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity,
  Cpu,
  HardDrive,
  Globe,
  Network,
  Scan,
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  User,
  Users,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Zap,
  BarChart2,
  Bell,
  BellOff,
  Gauge,
  Info,
  Terminal,
  Link,
  Unlink
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const SEVERITY_META = {
  critical: { label: 'Critical', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40', dot: 'bg-red-500', ring: '#ef4444' },
  high:     { label: 'High',     bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40', dot: 'bg-orange-500', ring: '#f97316' },
  medium:   { label: 'Medium',   bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/40', dot: 'bg-yellow-500', ring: '#f59e0b' },
  low:      { label: 'Low',      bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40', dot: 'bg-blue-500', ring: '#3b82f6' },
  info:     { label: 'Info',     bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/40', dot: 'bg-slate-400', ring: '#94a3b8' }
};

const scoreColor = (s) => {
  if (s >= 80) return '#10b981';
  if (s >= 60) return '#f59e0b';
  if (s >= 40) return '#f97316';
  return '#ef4444';
};

const scoreLabel = (s) => {
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Fair';
  if (s >= 40) return 'Poor';
  return 'Critical';
};

const maskKey = (key = '') => {
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••••••••••' + key.slice(-4);
};

const daysUntil = (iso) => {
  if (!iso) return null;
  const diff = new Date(iso) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
};

const apiFetch = async (path, opts = {}) => {
  const res = await fetch(`/api/security${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SeverityBadge = ({ severity }) => {
  const m = SEVERITY_META[severity] ?? SEVERITY_META.info;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${m.bg} ${m.text} ${m.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};

const Card = ({ className = '', children }) => (
  <div className={`rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-sm p-4 ${className}`}>
    {children}
  </div>
);

const SectionTitle = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-4">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-indigo-400" />
      <div>
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

const StatusDot = ({ ok }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'} shadow-sm`} />
);

const LoadingSpinner = ({ size = 'sm' }) => {
  const sz = size === 'sm' ? 'w-4 h-4' : 'w-8 h-8';
  return <RefreshCw className={`${sz} animate-spin text-indigo-400`} />;
};

const ErrorBanner = ({ msg, onDismiss }) => (
  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-4">
    <span className="flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" />{msg}</span>
    {onDismiss && <button onClick={onDismiss} className="ml-2 hover:text-red-300"><XCircle className="w-3.5 h-3.5" /></button>}
  </div>
);

// ---------------------------------------------------------------------------
// Security Score Gauge
// ---------------------------------------------------------------------------

const ScoreGauge = ({ score, prevScore, live }) => {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let raf;
    const target = score ?? 0;
    const step = () => {
      setDisplayed((prev) => {
        const diff = target - prev;
        if (Math.abs(diff) < 0.5) return target;
        raf = requestAnimationFrame(step);
        return prev + diff * 0.08;
      });
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const fill = scoreColor(displayed);
  const pct = Math.round(displayed);
  const change = score != null && prevScore != null ? score - prevScore : null;

  const gaugeData = [
    { name: 'score', value: pct, fill },
    { name: 'bg', value: 100 - pct, fill: 'rgba(255,255,255,0.04)' }
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="72%"
            outerRadius="100%"
            startAngle={225}
            endAngle={-45}
            data={gaugeData}
            barSize={14}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={7}
              background={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-4xl font-black tabular-nums" style={{ color: fill }}>
            {pct}
          </span>
          <span className="text-xs font-semibold text-slate-400 mt-0.5">/ 100</span>
          <span className="text-xs font-semibold mt-1" style={{ color: fill }}>
            {scoreLabel(pct)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2">
        {live && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <Activity className="w-3 h-3 animate-pulse" /> Live
          </span>
        )}
        {change != null && (
          <span className={`text-xs font-semibold ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change)} pts
          </span>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Network Issues Panel
// ---------------------------------------------------------------------------

const NetworkPanel = ({ data, loading }) => {
  const [expanded, setExpanded] = useState(true);

  if (loading) return <Card><div className="flex items-center gap-2"><LoadingSpinner /> <span className="text-xs text-slate-400">Loading network data…</span></div></Card>;

  const openPorts = data?.openPorts ?? [];
  const suspicious = data?.suspiciousConnections ?? [];
  const traffic = data?.unusualTraffic ?? [];

  return (
    <Card>
      <SectionTitle
        icon={Network}
        title="Network Issues"
        subtitle={`${openPorts.length + suspicious.length + traffic.length} items detected`}
        action={
          <button onClick={() => setExpanded(e => !e)} className="text-slate-400 hover:text-slate-200">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        }
      />
      {expanded && (
        <div className="space-y-4">
          <SubSection title="Open Ports" icon={Globe} items={openPorts} renderItem={port => (
            <div key={port.port} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
              <span className="text-xs font-mono text-slate-300">:{port.port} <span className="text-slate-500 ml-1">{port.service}</span></span>
              <SeverityBadge severity={port.severity ?? 'low'} />
            </div>
          )} emptyMsg="No exposed ports detected" />
          <SubSection title="Suspicious Connections" icon={Unlink} items={suspicious} renderItem={conn => (
            <div key={conn.id ?? conn.remote} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
              <div>
                <span className="text-xs font-mono text-slate-300">{conn.remote}</span>
                <p className="text-xs text-slate-500">{conn.reason}</p>
              </div>
              <SeverityBadge severity={conn.severity ?? 'medium'} />
            </div>
          )} emptyMsg="No suspicious connections" />
          <SubSection title="Unusual Traffic" icon={BarChart2} items={traffic} renderItem={t => (
            <div key={t.id ?? t.description} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
              <div>
                <span className="text-xs text-slate-300">{t.description}</span>
                <p className="text-xs text-slate-500">{fmt(t.detectedAt)}</p>
              </div>
              <SeverityBadge severity={t.severity ?? 'medium'} />
            </div>
          )} emptyMsg="No unusual traffic patterns" />
        </div>
      )}
    </Card>
  );
};

const SubSection = ({ title, icon: Icon, items, renderItem, emptyMsg }) => (
  <div>
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="w-3.5 h-3.5 text-slate-400" />
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{title}</span>
      <span className="ml-auto text-xs text-slate-500">{items.length}</span>
    </div>
    {items.length === 0
      ? <p className="text-xs text-slate-600 italic">{emptyMsg}</p>
      : items.map(renderItem)}
  </div>
);

// ---------------------------------------------------------------------------
// On-Device Issues Panel
// ---------------------------------------------------------------------------

const DevicePanel = ({ data, loading }) => {
  if (loading) return <Card><div className="flex items-center gap-2"><LoadingSpinner /> <span className="text-xs text-slate-400">Checking device…</span></div></Card>;

  const diskEncrypted = data?.diskEncryption?.enabled ?? false;
  const outdatedDeps = data?.outdatedDependencies ?? [];
  const weakConfigs = data?.weakConfigurations ?? [];

  return (
    <Card>
      <SectionTitle icon={HardDrive} title="On-Device Issues" subtitle="Local security posture" />
      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-slate-700/40">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs font-semibold text-slate-300">Disk Encryption</p>
              <p className="text-xs text-slate-500">{data?.diskEncryption?.algorithm ?? 'AES-256'}</p>
            </div>
          </div>
          <StatusDot ok={diskEncrypted} />
        </div>

        <div className="border-b border-slate-700/40 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400">Outdated Dependencies</span>
            <span className="ml-auto text-xs text-slate-500">{outdatedDeps.length}</span>
          </div>
          {outdatedDeps.length === 0
            ? <p className="text-xs text-slate-600 italic">All dependencies up to date</p>
            : outdatedDeps.slice(0, 5).map(dep => (
              <div key={dep.name} className="flex items-center justify-between py-1 text-xs">
                <span className="font-mono text-slate-300">{dep.name}</span>
                <span className="text-slate-500">{dep.current} → <span className="text-indigo-400">{dep.latest}</span></span>
              </div>
            ))
          }
          {outdatedDeps.length > 5 && <p className="text-xs text-slate-500 mt-1">+{outdatedDeps.length - 5} more…</p>}
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400">Weak Configurations</span>
            <span className="ml-auto text-xs text-slate-500">{weakConfigs.length}</span>
          </div>
          {weakConfigs.length === 0
            ? <p className="text-xs text-slate-600 italic">No configuration issues found</p>
            : weakConfigs.map(cfg => (
              <div key={cfg.id ?? cfg.name} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
                <div>
                  <p className="text-xs text-slate-300">{cfg.name}</p>
                  <p className="text-xs text-slate-500">{cfg.recommendation}</p>
                </div>
                <SeverityBadge severity={cfg.severity ?? 'medium'} />
              </div>
            ))
          }
        </div>
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Vulnerability Scanner
// ---------------------------------------------------------------------------

const VulnerabilityScanner = ({ onScanComplete }) => {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    setProgress(0);

    const tick = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 12, 90));
    }, 400);

    try {
      const data = await apiFetch('/scan', { method: 'POST', body: JSON.stringify({ deep: true }) });
      clearInterval(tick);
      setProgress(100);
      setResults(data);
      onScanComplete?.(data);
    } catch (err) {
      clearInterval(tick);
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const counts = useMemo(() => {
    if (!results?.vulnerabilities) return null;
    return results.vulnerabilities.reduce((acc, v) => {
      acc[v.severity] = (acc[v.severity] ?? 0) + 1;
      return acc;
    }, {});
  }, [results]);

  return (
    <Card>
      <SectionTitle icon={Scan} title="Vulnerability Scanner" subtitle="POST /api/security/scan" />
      {error && <ErrorBanner msg={error} onDismiss={() => setError(null)} />}

      <button
        onClick={runScan}
        disabled={scanning}
        className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
      >
        {scanning ? <><LoadingSpinner /> Scanning…</> : <><Scan className="w-4 h-4" /> Run Full Scan</>}
      </button>

      {scanning && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Scanning…</span><span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {results && !scanning && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            Completed {fmt(results.scannedAt ?? new Date().toISOString())}
          </div>
          {counts && (
            <div className="grid grid-cols-5 gap-2">
              {['critical','high','medium','low','info'].map(s => (
                <div key={s} className={`rounded-lg p-2 text-center border ${SEVERITY_META[s].bg} ${SEVERITY_META[s].border}`}>
                  <p className={`text-lg font-bold ${SEVERITY_META[s].text}`}>{counts[s] ?? 0}</p>
                  <p className="text-xs text-slate-500 capitalize">{s}</p>
                </div>
              ))}
            </div>
          )}
          {results.vulnerabilities?.slice(0, 8).map(v => (
            <div key={v.id} className="flex items-start gap-2 py-2 border-b border-slate-700/40 last:border-0">
              <SeverityBadge severity={v.severity} />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-300 truncate">{v.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{v.description}</p>
              </div>
            </div>
          ))}
          {results.vulnerabilities?.length > 8 && (
            <p className="text-xs text-slate-500">+{results.vulnerabilities.length - 8} more vulnerabilities in report</p>
          )}
        </div>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Threat Feed
// ---------------------------------------------------------------------------

const ThreatFeed = ({ threats, loading }) => {
  const [filter, setFilter] = useState('all');

  const visible = useMemo(() => {
    if (!threats) return [];
    if (filter === 'all') return threats;
    return threats.filter(t => t.severity === filter);
  }, [threats, filter]);

  return (
    <Card>
      <SectionTitle icon={ShieldAlert} title="Active Threat Feed" subtitle="Real-time threat intelligence" />
      <div className="flex gap-1 mb-3 flex-wrap">
        {['all','critical','high','medium','low','info'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors capitalize ${
              filter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <div className="flex items-center gap-2"><LoadingSpinner /><span className="text-xs text-slate-400">Loading threats…</span></div>}

      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {visible.length === 0 && !loading && (
          <p className="text-xs text-slate-600 italic text-center py-4">No threats match the current filter</p>
        )}
        {visible.map((t, i) => (
          <div key={t.id ?? i} className={`rounded-lg p-2.5 border ${SEVERITY_META[t.severity ?? 'info'].bg} ${SEVERITY_META[t.severity ?? 'info'].border}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{t.type ?? t.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t.description ?? t.message}</p>
              </div>
              <SeverityBadge severity={t.severity ?? 'info'} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-slate-500">{fmt(t.timestamp)}</span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                t.status === 'blocked' ? 'bg-emerald-500/20 text-emerald-400' :
                  t.status === 'prevented' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
              }`}>{(t.status ?? 'active').toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Encryption Health
// ---------------------------------------------------------------------------

const EncryptionHealth = ({ data, loading, onRotate }) => {
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState(null);

  const handleRotate = async () => {
    setRotating(true);
    setRotateError(null);
    try {
      await apiFetch('/rotate-keys', { method: 'POST', body: JSON.stringify({}) });
      onRotate?.();
    } catch (err) {
      setRotateError(err.message);
    } finally {
      setRotating(false);
    }
  };

  const keyAgeDays = data?.lastKeyRotation ? daysUntil(data.lastKeyRotation) * -1 : null;
  const rotationDue = data?.rotationDueDate ? daysUntil(data.rotationDueDate) : null;
  const keyOk = keyAgeDays != null && keyAgeDays < 90;

  return (
    <Card>
      <SectionTitle icon={KeyRound} title="Encryption Health" subtitle="AES-256-GCM key lifecycle" />
      {rotateError && <ErrorBanner msg={rotateError} onDismiss={() => setRotateError(null)} />}

      {loading ? (
        <div className="flex items-center gap-2"><LoadingSpinner /><span className="text-xs text-slate-400">Loading…</span></div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-700/40 p-3">
              <p className="text-xs text-slate-500 mb-1">Algorithm</p>
              <p className="text-sm font-mono font-semibold text-indigo-300">{data?.algorithm ?? 'AES-256-GCM'}</p>
            </div>
            <div className="rounded-lg bg-slate-700/40 p-3">
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <div className="flex items-center gap-1.5">
                <StatusDot ok={data?.status === 'healthy'} />
                <span className="text-sm font-semibold text-slate-200 capitalize">{data?.status ?? '—'}</span>
              </div>
            </div>
            <div className="rounded-lg bg-slate-700/40 p-3">
              <p className="text-xs text-slate-500 mb-1">Key Age</p>
              <p className={`text-sm font-semibold ${keyOk ? 'text-emerald-400' : 'text-red-400'}`}>
                {keyAgeDays != null ? `${keyAgeDays}d` : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-700/40 p-3">
              <p className="text-xs text-slate-500 mb-1">Rotation Due</p>
              <p className={`text-sm font-semibold ${rotationDue != null && rotationDue <= 7 ? 'text-red-400' : rotationDue != null && rotationDue <= 30 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {rotationDue != null ? `${rotationDue}d` : '—'}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Last rotated: {fmt(data?.lastKeyRotation)}</p>
          <button
            onClick={handleRotate}
            disabled={rotating}
            className="w-full py-2 rounded-lg text-xs font-semibold border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {rotating ? <><LoadingSpinner /> Rotating…</> : <><RefreshCw className="w-3.5 h-3.5" /> Rotate Keys Now</>}
          </button>
        </div>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Audit Log Viewer
// ---------------------------------------------------------------------------

const AuditLogViewer = ({ logs, loading }) => {
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter(l => {
      const matchQ = !query || JSON.stringify(l).toLowerCase().includes(query.toLowerCase());
      const matchL = levelFilter === 'all' || l.level === levelFilter || l.action === levelFilter;
      return matchQ && matchL;
    });
  }, [logs, query, levelFilter]);

  const visible = expanded ? filtered : filtered.slice(0, 10);

  return (
    <Card>
      <SectionTitle icon={FileText} title="Audit Log" subtitle={`${filtered.length} entries`} />
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search logs…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600/50 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600/50 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60"
        >
          <option value="all">All levels</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
      </div>

      {loading && <div className="flex items-center gap-2 mb-2"><LoadingSpinner /><span className="text-xs text-slate-400">Loading logs…</span></div>}

      <div className="space-y-1 max-h-72 overflow-y-auto font-mono text-xs">
        {visible.length === 0 && !loading && (
          <p className="text-slate-600 italic text-center py-4">No log entries match filter</p>
        )}
        {visible.map((log, i) => (
          <div key={log.id ?? i} className="flex items-start gap-2 px-2 py-1.5 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-colors">
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-bold uppercase ${
              log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                log.level === 'warn'  ? 'bg-yellow-500/20 text-yellow-400' :
                  log.level === 'info'  ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-600/40 text-slate-400'
            }`}>{log.level ?? 'info'}</span>
            <span className="text-slate-500 shrink-0">{fmtDate(log.timestamp)}</span>
            <span className="text-slate-300 break-all">{log.message ?? log.action ?? JSON.stringify(log)}</span>
            {log.user && <span className="ml-auto shrink-0 text-slate-500">@{log.user}</span>}
          </div>
        ))}
      </div>

      {filtered.length > 10 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 w-full text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1"
        >
          {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show {filtered.length - 10} more</>}
        </button>
      )}
    </Card>
  );
};

// ---------------------------------------------------------------------------
// MFA Status
// ---------------------------------------------------------------------------

const MFAStatus = ({ users, loading }) => (
  <Card>
    <SectionTitle icon={Users} title="MFA Status" subtitle="Per-user authentication factors" />
    {loading && <div className="flex items-center gap-2"><LoadingSpinner /><span className="text-xs text-slate-400">Loading users…</span></div>}
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {(!users || users.length === 0) && !loading && (
        <p className="text-xs text-slate-600 italic text-center py-4">No user data available</p>
      )}
      {(users ?? []).map((u, i) => (
        <div key={u.id ?? i} className="flex items-center justify-between py-1.5 border-b border-slate-700/40 last:border-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <User className="w-3 h-3 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300">{u.name ?? u.email}</p>
              {u.email && u.name && <p className="text-xs text-slate-500">{u.email}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {u.mfaMethod && (
              <span className="text-xs bg-slate-700/60 px-1.5 py-0.5 rounded text-slate-400 uppercase font-mono">
                {u.mfaMethod}
              </span>
            )}
            <StatusDot ok={u.mfaEnabled} />
            <span className={`text-xs font-semibold ${u.mfaEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
              {u.mfaEnabled ? 'On' : 'Off'}
            </span>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

// ---------------------------------------------------------------------------
// API Key Health
// ---------------------------------------------------------------------------

const APIKeyHealth = ({ keys, loading }) => {
  const [revealed, setRevealed] = useState({});

  const toggle = (id) => setRevealed(r => ({ ...r, [id]: !r[id] }));

  return (
    <Card>
      <SectionTitle icon={Key} title="API Key Health" subtitle="Masked keys with rotation schedule" />
      {loading && <div className="flex items-center gap-2"><LoadingSpinner /><span className="text-xs text-slate-400">Loading keys…</span></div>}
      <div className="space-y-2">
        {(!keys || keys.length === 0) && !loading && (
          <p className="text-xs text-slate-600 italic text-center py-4">No API keys registered</p>
        )}
        {(keys ?? []).map((k, i) => {
          const due = daysUntil(k.rotationDue);
          const urgent = due != null && due <= 7;
          const soon   = due != null && due <= 30;
          return (
            <div key={k.id ?? i} className="rounded-lg border border-slate-700/50 p-3 bg-slate-700/20">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="text-xs font-semibold text-slate-300">{k.name ?? k.service}</p>
                  <p className="text-xs text-slate-500">{k.description}</p>
                </div>
                <StatusDot ok={k.active !== false} />
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-slate-400 mb-2">
                <span>{revealed[k.id ?? i] ? (k.prefix ?? '??') + '…' : maskKey(k.prefix ?? '')}</span>
                <button onClick={() => toggle(k.id ?? i)} className="text-slate-500 hover:text-slate-300">
                  {revealed[k.id ?? i] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Rotation due:</span>
                <span className={`font-semibold ${urgent ? 'text-red-400' : soon ? 'text-yellow-400' : 'text-emerald-400'}`}>
                  {due != null ? (due <= 0 ? 'OVERDUE' : `${due}d`) : fmtDate(k.rotationDue)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Certificate Expiry
// ---------------------------------------------------------------------------

const CertExpiry = ({ certs, loading }) => (
  <Card>
    <SectionTitle icon={Link} title="Certificate Expiry" subtitle="TLS/SSL certificate monitoring" />
    {loading && <div className="flex items-center gap-2"><LoadingSpinner /><span className="text-xs text-slate-400">Checking certs…</span></div>}
    <div className="space-y-2">
      {(!certs || certs.length === 0) && !loading && (
        <p className="text-xs text-slate-600 italic text-center py-4">No certificates registered</p>
      )}
      {(certs ?? []).map((cert, i) => {
        const days = daysUntil(cert.expiresAt);
        const urgent = days != null && days <= 14;
        const soon   = days != null && days <= 60;
        return (
          <div key={cert.id ?? i} className="rounded-lg border border-slate-700/50 p-3 bg-slate-700/20">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-300 truncate">{cert.domain}</p>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${urgent ? 'bg-red-500/20 text-red-400' : soon ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {days != null ? (days <= 0 ? 'EXPIRED' : `${days}d`) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{cert.issuer ?? 'Unknown CA'}</span>
              <span>Expires {fmtDate(cert.expiresAt)}</span>
            </div>
            {urgent && (
              <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Renewal required immediately
              </p>
            )}
          </div>
        );
      })}
    </div>
  </Card>
);

// ---------------------------------------------------------------------------
// Rate Limit Alerts
// ---------------------------------------------------------------------------

const RateLimitAlerts = ({ alerts, loading }) => (
  <Card>
    <SectionTitle icon={Zap} title="Rate Limit Alerts" subtitle="Breach and near-breach events" />
    {loading && <div className="flex items-center gap-2"><LoadingSpinner /><span className="text-xs text-slate-400">Loading…</span></div>}
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {(!alerts || alerts.length === 0) && !loading && (
        <p className="text-xs text-slate-600 italic text-center py-4">No rate limit breaches detected</p>
      )}
      {(alerts ?? []).map((a, i) => (
        <div key={a.id ?? i} className={`rounded-lg p-2.5 border ${SEVERITY_META[a.severity ?? 'high'].bg} ${SEVERITY_META[a.severity ?? 'high'].border}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-200">{a.endpoint ?? a.route}</p>
              <p className="text-xs text-slate-400">{a.client ?? a.ip} — {a.count} req / {a.window}</p>
            </div>
            <SeverityBadge severity={a.severity ?? 'high'} />
          </div>
          <p className="text-xs text-slate-500 mt-1">{fmt(a.timestamp)}</p>
        </div>
      ))}
    </div>
  </Card>
);

// ---------------------------------------------------------------------------
// Score Trend Sparkline
// ---------------------------------------------------------------------------

const ScoreTrend = ({ history }) => {
  if (!history?.length) return null;
  return (
    <div className="h-16">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} fill="url(#scoreGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Export Report Button
// ---------------------------------------------------------------------------

const ExportReport = ({ dashboardData }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const [dashboard, alerts, logs, encryption] = await Promise.all([
        apiFetch('/dashboard').catch(() => dashboardData ?? {}),
        apiFetch('/alerts').catch(() => ({ alerts: [] })),
        apiFetch('/audit?limit=200').catch(() => ({ logs: [] })),
        apiFetch('/encryption-health').catch(() => ({}))
      ]);

      const report = {
        meta: {
          generatedAt: new Date().toISOString(),
          reportVersion: '2.0',
          product: 'Nexus AI Pro',
          copyright: '© 2025-2026 Cameron Fox'
        },
        summary: {
          overallScore: dashboard?.overallScore ?? dashboardData?.overallScore,
          totalThreats: (dashboard?.threats ?? dashboardData?.threats ?? []).length,
          criticalAlerts: (alerts?.alerts ?? []).filter(a => a.severity === 'critical').length
        },
        dashboard,
        alerts,
        auditLogs: logs,
        encryptionHealth: encryption
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-600/60 text-xs font-semibold text-slate-300 hover:bg-slate-700/50 hover:text-white transition-colors disabled:opacity-50"
    >
      {exporting ? <LoadingSpinner /> : <Download className="w-3.5 h-3.5" />}
      {exporting ? 'Exporting…' : 'Export Report'}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

const SecurityDashboardV2 = ({ theme = 'dark' }) => {
  const isDark = theme !== 'light';

  const [dashboard, setDashboard] = useState(null);
  const [network, setNetwork] = useState(null);
  const [device, setDevice] = useState(null);
  const [threats, setThreats] = useState(null);
  const [encryption, setEncryption] = useState(null);
  const [auditLogs, setAuditLogs] = useState(null);
  const [mfaUsers, setMfaUsers] = useState(null);
  const [apiKeys, setApiKeys] = useState(null);
  const [certs, setCerts] = useState(null);
  const [rateLimits, setRateLimits] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [globalError, setGlobalError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loadingMap, setLoadingMap] = useState({
    dashboard: true, network: true, device: true, threats: true,
    encryption: true, auditLogs: true, mfaUsers: true, apiKeys: true,
    certs: true, rateLimits: true
  });

  const prevScore = useRef(null);

  const setLoading = useCallback((key, val) => {
    setLoadingMap(m => ({ ...m, [key]: val }));
  }, []);

  const loadSection = useCallback(async (key, path, setter, transform) => {
    try {
      const data = await apiFetch(path);
      setter(transform ? transform(data) : data);
    } catch {
      // Silently fail individual sections — global error shown only for dashboard
    } finally {
      setLoading(key, false);
    }
  }, [setLoading]);

  const loadDashboard = useCallback(async () => {
    setLoading('dashboard', true);
    try {
      const data = await apiFetch('/dashboard');
      prevScore.current = dashboard?.overallScore ?? null;
      setDashboard(data);
      setScoreHistory(h => {
        const entry = { time: new Date().toLocaleTimeString(), score: data.overallScore };
        return [...h.slice(-29), entry];
      });
      setGlobalError(null);
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading('dashboard', false);
    }
  }, [dashboard, setLoading]);

  // Initial load of all sections
  useEffect(() => {
    loadDashboard();
    loadSection('network',    '/network',           setNetwork);
    loadSection('device',     '/device',            setDevice);
    loadSection('threats',    '/threats',           d => setThreats(d.threats ?? d));
    loadSection('encryption', '/encryption-health', setEncryption);
    loadSection('auditLogs',  '/audit?limit=100',   d => setAuditLogs(d.logs ?? d));
    loadSection('mfaUsers',   '/mfa-users',         d => setMfaUsers(d.users ?? d));
    loadSection('apiKeys',    '/api-keys',          d => setApiKeys(d.keys ?? d));
    loadSection('certs',      '/certificates',      d => setCerts(d.certificates ?? d));
    loadSection('rateLimits', '/rate-limit-alerts', d => setRateLimits(d.alerts ?? d));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.IO real-time updates
  useEffect(() => {
    const socket = typeof window !== 'undefined' ? window.__SOCKET__ : null;
    if (!socket) return;

    setSocketConnected(socket.connected);

    const onConnect    = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const onScore = (data) => {
      prevScore.current = dashboard?.overallScore ?? null;
      setDashboard(prev => prev ? { ...prev, overallScore: data.score } : prev);
      setScoreHistory(h => [...h.slice(-29), { time: new Date().toLocaleTimeString(), score: data.score }]);
    };

    const onThreat = (t) => {
      setThreats(prev => [t, ...(prev ?? [])].slice(0, 100));
    };

    const onAuditLog = (log) => {
      setAuditLogs(prev => [log, ...(prev ?? [])].slice(0, 200));
    };

    const onRateLimit = (alert) => {
      setRateLimits(prev => [alert, ...(prev ?? [])].slice(0, 50));
    };

    const onScanResult = (data) => {
      prevScore.current = dashboard?.overallScore ?? null;
      setDashboard(prev => prev ? { ...prev, overallScore: data.overallScore ?? prev.overallScore } : prev);
    };

    socket.on('connect',            onConnect);
    socket.on('disconnect',         onDisconnect);
    socket.on('security:score',     onScore);
    socket.on('security:threat',    onThreat);
    socket.on('security:audit',     onAuditLog);
    socket.on('security:ratelimit', onRateLimit);
    socket.on('security:scan',      onScanResult);

    return () => {
      socket.off('connect',            onConnect);
      socket.off('disconnect',         onDisconnect);
      socket.off('security:score',     onScore);
      socket.off('security:threat',    onThreat);
      socket.off('security:audit',     onAuditLog);
      socket.off('security:ratelimit', onRateLimit);
      socket.off('security:scan',      onScanResult);
    };
  }, [dashboard?.overallScore]);

  // Poll dashboard every 60s if no socket
  useEffect(() => {
    if (socketConnected) return;
    const id = setInterval(loadDashboard, 60_000);
    return () => clearInterval(id);
  }, [socketConnected, loadDashboard]);

  const criticalCount = useMemo(() => {
    return (threats ?? []).filter(t => t.severity === 'critical').length;
  }, [threats]);

  const themeClasses = isDark
    ? 'bg-slate-900 text-slate-100'
    : 'bg-slate-100 text-slate-900';

  return (
    <div className={`min-h-screen ${themeClasses} p-4 md:p-6`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
            <Shield className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 leading-tight">Security Dashboard</h1>
            <p className="text-xs text-slate-500">Nexus AI Pro — Real-time security posture</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${socketConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-700/40 border-slate-600/40 text-slate-500'}`}>
            {socketConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {socketConnected ? 'Live' : 'Polling'}
          </span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 animate-pulse">
              <Bell className="w-3 h-3" /> {criticalCount} Critical
            </span>
          )}
          <ExportReport dashboardData={dashboard} />
          <button
            onClick={loadDashboard}
            disabled={loadingMap.dashboard}
            className="p-1.5 rounded-lg border border-slate-600/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loadingMap.dashboard ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {globalError && <ErrorBanner msg={globalError} onDismiss={() => setGlobalError(null)} />}

      {/* Score + trend row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="md:col-span-1 flex flex-col items-center justify-center">
          <ScoreGauge
            score={dashboard?.overallScore ?? 0}
            prevScore={prevScore.current}
            live={socketConnected}
          />
          <ScoreTrend history={scoreHistory} />
          <p className="text-xs text-slate-500 mt-2">
            Last updated: {fmt(dashboard?.lastScanTime)}
          </p>
        </Card>

        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Open Ports',       value: network?.openPorts?.length ?? '—',         icon: Globe,      ok: (network?.openPorts?.length ?? 0) === 0 },
            { label: 'Threats',          value: (threats ?? []).length,                     icon: ShieldAlert, ok: (threats ?? []).length === 0 },
            { label: 'Vulnerabilities',  value: dashboard?.vulnerabilities?.length ?? '—',  icon: AlertTriangle, ok: (dashboard?.vulnerabilities?.length ?? 0) === 0 },
            { label: 'Disk Encrypted',   value: device?.diskEncryption?.enabled ? 'Yes' : 'No', icon: HardDrive, ok: device?.diskEncryption?.enabled },
            { label: 'Cert Alerts',      value: (certs ?? []).filter(c => daysUntil(c.expiresAt) != null && daysUntil(c.expiresAt) <= 30).length, icon: Link, ok: (certs ?? []).filter(c => daysUntil(c.expiresAt) != null && daysUntil(c.expiresAt) <= 30).length === 0 },
            { label: 'Rate Breaches',    value: (rateLimits ?? []).length,                 icon: Zap,        ok: (rateLimits ?? []).length === 0 }
          ].map(({ label, value, icon: Icon, ok }) => (
            <Card key={label} className="flex items-center gap-3 py-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ok ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <Icon className={`w-4 h-4 ${ok ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-100 leading-none">{String(value)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Column 1 */}
        <div className="space-y-4">
          <NetworkPanel  data={network}    loading={loadingMap.network} />
          <DevicePanel   data={device}     loading={loadingMap.device} />
          <RateLimitAlerts alerts={rateLimits} loading={loadingMap.rateLimits} />
        </div>

        {/* Column 2 */}
        <div className="space-y-4">
          <VulnerabilityScanner
            onScanComplete={data => {
              prevScore.current = dashboard?.overallScore ?? null;
              if (data?.overallScore != null) {
                setDashboard(prev => prev ? { ...prev, overallScore: data.overallScore } : prev);
              }
            }}
          />
          <ThreatFeed threats={threats} loading={loadingMap.threats} />
          <CertExpiry certs={certs} loading={loadingMap.certs} />
        </div>

        {/* Column 3 */}
        <div className="space-y-4 lg:col-span-2 xl:col-span-1">
          <EncryptionHealth
            data={encryption}
            loading={loadingMap.encryption}
            onRotate={() => loadSection('encryption', '/encryption-health', setEncryption)}
          />
          <MFAStatus  users={mfaUsers} loading={loadingMap.mfaUsers} />
          <APIKeyHealth keys={apiKeys}  loading={loadingMap.apiKeys} />
          <AuditLogViewer logs={auditLogs} loading={loadingMap.auditLogs} />
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-600 mt-6">
        Nexus AI Pro Security Dashboard v2 — © 2025-2026 Cameron Fox
      </p>
    </div>
  );
};

export default SecurityDashboardV2;
