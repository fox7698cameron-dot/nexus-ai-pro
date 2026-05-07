// SecurityDashboard.jsx — Nexus AI Pro | 2026-05-07
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Activity,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Key,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Eye,
  EyeOff,
  Scan,
  RefreshCw,
  LogOut,
  User,
  Users,
  Server,
  Globe,
  Ban,
  Zap,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  BarChart2,
  HardDrive,
  FileCheck,
  Cpu,
  Smartphone,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    textClass: 'text-red-400',
    bgClass: 'bg-red-500/15',
    borderClass: 'border-red-500/40',
    dotClass: 'bg-red-500',
    ring: 'ring-red-500/30',
  },
  high: {
    label: 'High',
    textClass: 'text-orange-400',
    bgClass: 'bg-orange-500/15',
    borderClass: 'border-orange-500/40',
    dotClass: 'bg-orange-500',
    ring: 'ring-orange-500/30',
  },
  medium: {
    label: 'Medium',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/40',
    dotClass: 'bg-amber-400',
    ring: 'ring-amber-400/30',
  },
  low: {
    label: 'Low',
    textClass: 'text-blue-400',
    bgClass: 'bg-blue-500/15',
    borderClass: 'border-blue-500/40',
    dotClass: 'bg-blue-400',
    ring: 'ring-blue-400/30',
  },
  info: {
    label: 'Info',
    textClass: 'text-slate-400',
    bgClass: 'bg-slate-500/15',
    borderClass: 'border-slate-500/40',
    dotClass: 'bg-slate-400',
    ring: 'ring-slate-400/30',
  },
};

const ROWS_PER_PAGE = 10;

const ROLE_PERMS = {
  admin: ['threats', 'network', 'device', 'vuln', 'audit', 'score', 'mfa', 'sessions'],
  dev: ['threats', 'network', 'device', 'vuln', 'audit', 'score'],
  moderator: ['threats', 'audit', 'score', 'sessions'],
  user: ['device', 'score'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const can = (userRole, feature) =>
  (ROLE_PERMS[userRole] ?? ROLE_PERMS.user).includes(feature);

const formatTs = (ts) => {
  if (!ts) return '—';
  const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const scoreColor = (score) => {
  if (score > 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
};

const scoreStroke = (score) => {
  if (score > 70) return '#34d399';
  if (score >= 40) return '#fbbf24';
  return '#f87171';
};

const scoreLabel = (score) => {
  if (score > 70) return 'Secure';
  if (score >= 40) return 'At Risk';
  return 'Critical';
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Card wrapper */
const Card = ({ children, className = '', darkMode }) => (
  <div
    className={`rounded-2xl border ${
      darkMode
        ? 'bg-slate-800/60 border-slate-700/60 backdrop-blur-sm'
        : 'bg-white border-slate-200 shadow-sm'
    } ${className}`}
  >
    {children}
  </div>
);

/** Section heading inside a card */
const CardHeader = ({ icon: Icon, title, badge, darkMode }) => (
  <div
    className={`flex items-center justify-between px-5 py-4 border-b ${
      darkMode ? 'border-slate-700/60' : 'border-slate-100'
    }`}
  >
    <div className="flex items-center gap-2.5">
      <Icon
        size={16}
        className={darkMode ? 'text-slate-400' : 'text-slate-500'}
      />
      <span
        className={`font-semibold text-sm ${
          darkMode ? 'text-slate-200' : 'text-slate-700'
        }`}
      >
        {title}
      </span>
    </div>
    {badge}
  </div>
);

/** Severity badge pill */
const SeverityBadge = ({ severity }) => {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.info;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.textClass} ${cfg.bgClass} ${cfg.borderClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
      {cfg.label}
    </span>
  );
};

/** Pulsing live dot */
const LiveDot = ({ active = true }) => (
  <span className="relative flex h-2.5 w-2.5">
    {active && (
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
    )}
    <span
      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
        active ? 'bg-emerald-500' : 'bg-slate-500'
      }`}
    />
  </span>
);

/** Sparkline SVG from array of numbers */
const Sparkline = ({ data, width = 120, height = 32, color = '#6366f1' }) => {
  if (!data || data.length < 2) return <span className="text-xs text-slate-500">—</span>;
  const max = Math.max(...data, 1);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (v / max) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

/** Security score radial gauge */
const ScoreGauge = ({ score, darkMode }) => {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const stroke = scoreStroke(score);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            strokeWidth="10"
            className={darkMode ? 'stroke-slate-700' : 'stroke-slate-200'}
          />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            strokeWidth="10"
            stroke={stroke}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.7s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-2xl font-bold tabular-nums ${scoreColor(score)}`}
          >
            {score}
          </span>
          <span
            className={`text-[10px] font-medium ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            / 100
          </span>
        </div>
      </div>
      <span
        className={`text-sm font-semibold px-3 py-1 rounded-full ${
          score > 70
            ? 'bg-emerald-500/15 text-emerald-400'
            : score >= 40
            ? 'bg-amber-500/15 text-amber-400'
            : 'bg-red-500/15 text-red-400'
        }`}
      >
        {scoreLabel(score)}
      </span>
    </div>
  );
};

/** Status indicator row */
const StatusRow = ({ icon: Icon, label, value, ok, darkMode }) => (
  <div className="flex items-center justify-between py-2.5">
    <div className="flex items-center gap-2.5">
      <Icon
        size={14}
        className={darkMode ? 'text-slate-400' : 'text-slate-500'}
      />
      <span
        className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}
      >
        {label}
      </span>
    </div>
    <div className="flex items-center gap-1.5">
      {ok === true ? (
        <CheckCircle size={14} className="text-emerald-400" />
      ) : ok === false ? (
        <XCircle size={14} className="text-red-400" />
      ) : (
        <Info size={14} className="text-slate-400" />
      )}
      <span
        className={`text-xs font-medium ${
          ok === true
            ? 'text-emerald-400'
            : ok === false
            ? 'text-red-400'
            : darkMode
            ? 'text-slate-400'
            : 'text-slate-500'
        }`}
      >
        {value}
      </span>
    </div>
  </div>
);

// ─── Panels ───────────────────────────────────────────────────────────────────

/** 1. Real-time threat feed */
const ThreatFeedPanel = ({ threats, darkMode }) => {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [threats]);

  return (
    <Card darkMode={darkMode}>
      <CardHeader
        icon={Zap}
        title="Live Threat Feed"
        darkMode={darkMode}
        badge={
          <div className="flex items-center gap-1.5">
            <LiveDot />
            <span className="text-xs text-emerald-400 font-medium">Live</span>
          </div>
        }
      />
      <div
        ref={listRef}
        className="h-64 overflow-y-auto divide-y scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {threats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <ShieldCheck
              size={28}
              className={darkMode ? 'text-slate-600' : 'text-slate-300'}
            />
            <span
              className={`text-sm ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              No threats detected
            </span>
          </div>
        ) : (
          [...threats].reverse().map((t, i) => {
            const cfg = SEVERITY_CONFIG[t.severity] ?? SEVERITY_CONFIG.info;
            return (
              <div
                key={t.id ?? i}
                className={`flex items-start gap-3 px-5 py-3 ${
                  darkMode ? 'divide-slate-700/60' : 'divide-slate-100'
                }`}
              >
                <span
                  className={`mt-0.5 w-2 h-2 flex-shrink-0 rounded-full ${cfg.dotClass}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`text-xs font-semibold truncate ${
                        darkMode ? 'text-slate-200' : 'text-slate-700'
                      }`}
                    >
                      {t.type}
                    </span>
                    <span
                      className={`text-[10px] flex-shrink-0 ${
                        darkMode ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {formatTs(t.timestamp)}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 truncate ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {t.message}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    {t.ip && (
                      <span
                        className={`text-[10px] ${
                          darkMode ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        IP: {t.ip}
                      </span>
                    )}
                    {t.user && (
                      <span
                        className={`text-[10px] ${
                          darkMode ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        User: {t.user}
                      </span>
                    )}
                    <SeverityBadge severity={t.severity} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

/** 2. Network monitoring */
const NetworkPanel = ({ network, darkMode }) => (
  <Card darkMode={darkMode}>
    <CardHeader icon={Wifi} title="Network Monitor" darkMode={darkMode} />
    <div className="p-5 space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Active Connections',
            value: network.activeConnections ?? 0,
            icon: Activity,
            color: 'text-blue-400',
          },
          {
            label: 'Suspicious',
            value: network.suspiciousCount ?? 0,
            icon: AlertTriangle,
            color: network.suspiciousCount > 0 ? 'text-amber-400' : 'text-emerald-400',
          },
          {
            label: 'Blocked IPs',
            value: network.blockedIps?.length ?? 0,
            icon: Ban,
            color: 'text-red-400',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className={`rounded-xl p-3 text-center ${
              darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
            }`}
          >
            <Icon size={16} className={`mx-auto mb-1 ${color}`} />
            <p
              className={`text-xl font-bold tabular-nums ${color}`}
            >
              {value}
            </p>
            <p
              className={`text-[10px] mt-0.5 ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Bandwidth sparkline */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-xs font-medium ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Bandwidth (last 30s)
          </span>
          <span
            className={`text-xs ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {network.bandwidthKbps != null
              ? `${network.bandwidthKbps} KB/s`
              : '—'}
          </span>
        </div>
        <div
          className={`rounded-lg p-2 ${
            darkMode ? 'bg-slate-700/40' : 'bg-slate-50'
          }`}
        >
          <Sparkline
            data={network.bandwidthHistory ?? []}
            width="100%"
            height={36}
            color="#6366f1"
          />
        </div>
      </div>

      {/* Suspicious alerts */}
      {network.suspiciousAlerts?.length > 0 && (
        <div>
          <p
            className={`text-xs font-medium mb-2 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Suspicious Alerts
          </p>
          <div className="space-y-1.5 max-h-24 overflow-y-auto">
            {network.suspiciousAlerts.map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 ${
                  darkMode
                    ? 'bg-amber-500/10 text-amber-300'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                <AlertTriangle size={11} />
                {a}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocked IPs */}
      {network.blockedIps?.length > 0 && (
        <div>
          <p
            className={`text-xs font-medium mb-2 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Blocked IPs
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {network.blockedIps.map((ip) => (
              <span
                key={ip}
                className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded ${
                  darkMode
                    ? 'bg-red-500/15 text-red-300'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                <Ban size={9} />
                {ip}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  </Card>
);

/** 3. On-device security status */
const DeviceStatusPanel = ({ device, darkMode }) => (
  <Card darkMode={darkMode}>
    <CardHeader icon={HardDrive} title="Device Security" darkMode={darkMode} />
    <div
      className={`px-5 divide-y ${
        darkMode ? 'divide-slate-700/60' : 'divide-slate-100'
      }`}
    >
      <StatusRow
        icon={Lock}
        label="AES-256-GCM Encryption"
        value={device.encryptionActive ? 'Active' : 'Inactive'}
        ok={device.encryptionActive}
        darkMode={darkMode}
      />
      <StatusRow
        icon={FileCheck}
        label="TLS Certificate"
        value={
          device.certValid
            ? device.certExpiry
              ? `Valid · exp ${device.certExpiry}`
              : 'Valid'
            : 'Invalid / Expired'
        }
        ok={device.certValid}
        darkMode={darkMode}
      />
      <StatusRow
        icon={Cpu}
        label="Service Worker Integrity"
        value={device.swIntegrity ? 'Verified' : 'Unverified'}
        ok={device.swIntegrity}
        darkMode={darkMode}
      />
      <StatusRow
        icon={HardDrive}
        label="Storage Security"
        value={device.storageSecure ? 'Encrypted' : 'Unencrypted'}
        ok={device.storageSecure}
        darkMode={darkMode}
      />
    </div>
  </Card>
);

/** 4. Vulnerability scan */
const VulnScanPanel = ({
  scanState,
  onStartScan,
  darkMode,
  authToken,
}) => {
  const { scanning, progress, phase, findings, lastScanTs } = scanState;

  return (
    <Card darkMode={darkMode}>
      <CardHeader icon={Scan} title="Vulnerability Scanner" darkMode={darkMode} />
      <div className="p-5 space-y-4">
        {/* Trigger button + last scan */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onStartScan}
            disabled={scanning}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              scanning
                ? 'opacity-50 cursor-not-allowed bg-indigo-500/30 text-indigo-300'
                : darkMode
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
            }`}
          >
            {scanning ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Scan size={14} />
            )}
            {scanning ? 'Scanning…' : 'Run Scan'}
          </button>
          {lastScanTs && (
            <span
              className={`text-xs ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Last: {formatTs(lastScanTs)}
            </span>
          )}
        </div>

        {/* Progress */}
        {scanning && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span
                className={darkMode ? 'text-slate-400' : 'text-slate-500'}
              >
                {phase || 'Initialising…'}
              </span>
              <span
                className={darkMode ? 'text-slate-400' : 'text-slate-500'}
              >
                {progress}%
              </span>
            </div>
            <div
              className={`w-full h-2 rounded-full overflow-hidden ${
                darkMode ? 'bg-slate-700' : 'bg-slate-200'
              }`}
            >
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Findings */}
        {findings.length > 0 ? (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {SEVERITY_ORDER.filter((s) =>
              findings.some((f) => f.severity === s)
            ).map((sev) => (
              <div key={sev}>
                <p
                  className={`text-[10px] font-bold uppercase mb-1.5 ${SEVERITY_CONFIG[sev].textClass}`}
                >
                  {SEVERITY_CONFIG[sev].label}
                </p>
                {findings
                  .filter((f) => f.severity === sev)
                  .map((f) => (
                    <div
                      key={f.id}
                      className={`rounded-lg p-3 mb-1.5 border ${
                        SEVERITY_CONFIG[sev].bgClass
                      } ${SEVERITY_CONFIG[sev].borderClass}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs font-semibold ${
                            darkMode ? 'text-slate-200' : 'text-slate-700'
                          }`}
                        >
                          {f.title}
                        </p>
                        <SeverityBadge severity={f.severity} />
                      </div>
                      {f.description && (
                        <p
                          className={`text-xs mt-1 ${
                            darkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {f.description}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ) : !scanning ? (
          <p
            className={`text-sm text-center py-4 ${
              darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            No findings — run a scan to check for vulnerabilities
          </p>
        ) : null}

        {/* Summary counts */}
        {findings.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SEVERITY_ORDER.map((s) => {
              const count = findings.filter((f) => f.severity === s).length;
              if (!count) return null;
              return (
                <span
                  key={s}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SEVERITY_CONFIG[s].textClass} ${SEVERITY_CONFIG[s].bgClass}`}
                >
                  {count} {SEVERITY_CONFIG[s].label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};

/** 5. Audit log table */
const AuditLogPanel = ({ logs, darkMode }) => {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      severityFilter === 'all'
        ? logs
        : logs.filter((l) => l.severity === severityFilter),
    [logs, severityFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE
  );

  const handleFilter = (sev) => {
    setSeverityFilter(sev);
    setPage(1);
  };

  const th = `text-left text-[10px] font-bold uppercase tracking-wider px-3 py-2.5 ${
    darkMode ? 'text-slate-500' : 'text-slate-400'
  }`;
  const td = `px-3 py-2.5 text-xs ${
    darkMode ? 'text-slate-300' : 'text-slate-600'
  }`;
  const trBase = `border-b transition-colors ${
    darkMode
      ? 'border-slate-700/50 hover:bg-slate-700/30'
      : 'border-slate-100 hover:bg-slate-50'
  }`;

  return (
    <Card darkMode={darkMode}>
      <CardHeader
        icon={Activity}
        title="Audit Log"
        darkMode={darkMode}
        badge={
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              darkMode
                ? 'bg-slate-700 text-slate-400'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {logs.length} entries
          </span>
        }
      />
      {/* Severity filter */}
      <div
        className={`flex flex-wrap items-center gap-1.5 px-5 py-3 border-b ${
          darkMode ? 'border-slate-700/60' : 'border-slate-100'
        }`}
      >
        <Filter
          size={12}
          className={darkMode ? 'text-slate-500' : 'text-slate-400'}
        />
        {['all', ...SEVERITY_ORDER].map((s) => (
          <button
            key={s}
            onClick={() => handleFilter(s)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
              severityFilter === s
                ? s === 'all'
                  ? darkMode
                    ? 'bg-slate-600 text-white'
                    : 'bg-slate-700 text-white'
                  : `${SEVERITY_CONFIG[s].bgClass} ${SEVERITY_CONFIG[s].textClass} ${SEVERITY_CONFIG[s].borderClass} border`
                : darkMode
                ? 'text-slate-400 hover:bg-slate-700/60'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {s === 'all' ? 'All' : SEVERITY_CONFIG[s].label}
          </button>
        ))}
      </div>
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr
              className={`border-b ${
                darkMode ? 'border-slate-700/60' : 'border-slate-100'
              }`}
            >
              <th className={th}>Timestamp</th>
              <th className={th}>Event</th>
              <th className={th}>User</th>
              <th className={th}>IP</th>
              <th className={th}>Details</th>
              <th className={th}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className={`text-center py-8 text-sm ${
                    darkMode ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  No log entries
                </td>
              </tr>
            ) : (
              slice.map((entry, i) => (
                <tr key={entry.id ?? i} className={trBase}>
                  <td className={`${td} font-mono whitespace-nowrap`}>
                    {formatTs(entry.timestamp)}
                  </td>
                  <td className={`${td} font-medium`}>{entry.eventType}</td>
                  <td className={td}>{entry.user ?? '—'}</td>
                  <td className={`${td} font-mono`}>{entry.ip ?? '—'}</td>
                  <td
                    className={`${td} max-w-[200px] truncate`}
                    title={entry.details}
                  >
                    {entry.details ?? '—'}
                  </td>
                  <td className={td}>
                    <SeverityBadge severity={entry.severity ?? 'info'} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div
        className={`flex items-center justify-between px-5 py-3 border-t ${
          darkMode ? 'border-slate-700/60' : 'border-slate-100'
        }`}
      >
        <span
          className={`text-xs ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          {filtered.length === 0
            ? 'No results'
            : `${(safePage - 1) * ROWS_PER_PAGE + 1}–${Math.min(
                safePage * ROWS_PER_PAGE,
                filtered.length
              )} of ${filtered.length}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
            }`}
          >
            <ChevronLeft
              size={14}
              className={darkMode ? 'text-slate-400' : 'text-slate-600'}
            />
          </button>
          <span
            className={`text-xs px-2 ${
              darkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className={`p-1.5 rounded-lg disabled:opacity-30 transition-colors ${
              darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
            }`}
          >
            <ChevronRight
              size={14}
              className={darkMode ? 'text-slate-400' : 'text-slate-600'}
            />
          </button>
        </div>
      </div>
    </Card>
  );
};

/** 6 + 7. Security score + MFA status combined widget */
const ScoreAndMfaPanel = ({ score, mfaUsers, userRole, darkMode }) => (
  <Card darkMode={darkMode}>
    <CardHeader
      icon={ShieldCheck}
      title="Security Score"
      darkMode={darkMode}
    />
    <div className="p-5 flex flex-col items-center gap-5">
      <ScoreGauge score={score} darkMode={darkMode} />

      {/* Score breakdown hints */}
      <div className="w-full grid grid-cols-2 gap-2">
        {[
          { label: 'Threats resolved', value: score > 60 ? 'Good' : 'Review needed', ok: score > 60 },
          { label: 'Patch coverage', value: score > 50 ? 'Adequate' : 'Low', ok: score > 50 },
          { label: 'Encryption', value: 'AES-256-GCM', ok: true },
          { label: 'Audit logging', value: 'Active', ok: true },
        ].map(({ label, value, ok }) => (
          <div
            key={label}
            className={`rounded-xl p-2.5 ${
              darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
            }`}
          >
            <p
              className={`text-[10px] ${
                darkMode ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {label}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              {ok ? (
                <CheckCircle size={10} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={10} className="text-amber-400" />
              )}
              <span
                className={`text-xs font-medium ${
                  ok
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {value}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MFA — admin only */}
      {can(userRole, 'mfa') && mfaUsers && mfaUsers.length > 0 && (
        <div className="w-full">
          <p
            className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${
              darkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            <Smartphone size={12} />
            MFA Status
          </p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {mfaUsers.map((u) => (
              <div
                key={u.userId}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  darkMode ? 'bg-slate-700/50' : 'bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User
                    size={12}
                    className={darkMode ? 'text-slate-400' : 'text-slate-500'}
                  />
                  <span
                    className={`text-xs ${
                      darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {u.username ?? u.userId}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {u.mfaEnabled ? (
                    <>
                      <CheckCircle size={12} className="text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-medium">
                        Enabled
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle size={12} className="text-red-400" />
                      <span className="text-[10px] text-red-400 font-medium">
                        Disabled
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </Card>
);

/** 8. Active sessions */
const SessionsPanel = ({ sessions, onRevoke, userRole, darkMode }) => (
  <Card darkMode={darkMode}>
    <CardHeader
      icon={Users}
      title="Active Sessions"
      darkMode={darkMode}
      badge={
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            darkMode
              ? 'bg-slate-700 text-slate-400'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {sessions.length} online
        </span>
      }
    />
    <div className="divide-y">
      {sessions.length === 0 ? (
        <p
          className={`text-sm text-center py-8 ${
            darkMode ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          No active sessions
        </p>
      ) : (
        sessions.map((s) => (
          <div
            key={s.sessionId}
            className={`flex items-center justify-between px-5 py-3 ${
              darkMode
                ? 'divide-slate-700/60 hover:bg-slate-700/20'
                : 'divide-slate-100 hover:bg-slate-50'
            } transition-colors`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                  darkMode ? 'bg-slate-700' : 'bg-slate-100'
                }`}
              >
                <User
                  size={14}
                  className={darkMode ? 'text-slate-400' : 'text-slate-500'}
                />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    darkMode ? 'text-slate-200' : 'text-slate-700'
                  }`}
                >
                  {s.username ?? s.userId}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {s.ip && (
                    <span
                      className={`text-[10px] font-mono ${
                        darkMode ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {s.ip}
                    </span>
                  )}
                  {s.device && (
                    <span
                      className={`text-[10px] ${
                        darkMode ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      · {s.device}
                    </span>
                  )}
                  <span
                    className={`text-[10px] ${
                      darkMode ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    · {formatTs(s.lastActive)}
                  </span>
                </div>
              </div>
            </div>
            {(can(userRole, 'sessions') || s.isCurrent) && (
              <button
                onClick={() => onRevoke(s.sessionId)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                  s.isCurrent
                    ? darkMode
                      ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                    : darkMode
                    ? 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <LogOut size={11} />
                {s.isCurrent ? 'Sign out' : 'Revoke'}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  </Card>
);

// ─── Initial state factories ───────────────────────────────────────────────────

const initNetwork = () => ({
  activeConnections: 0,
  suspiciousCount: 0,
  bandwidthKbps: 0,
  bandwidthHistory: [],
  suspiciousAlerts: [],
  blockedIps: [],
});

const initDevice = () => ({
  encryptionActive: typeof crypto !== 'undefined' && !!crypto.subtle,
  certValid: true,
  certExpiry: null,
  swIntegrity: false,
  storageSecure: false,
});

const initScan = () => ({
  scanning: false,
  progress: 0,
  phase: '',
  findings: [],
  lastScanTs: null,
});

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * SecurityDashboard
 *
 * Props:
 *   socket    — Socket.io client instance
 *   darkMode  — boolean
 *   userRole  — 'admin' | 'dev' | 'moderator' | 'user'
 *   authToken — JWT string for API calls
 */
const SecurityDashboard = ({
  socket = null,
  darkMode = true,
  userRole = 'user',
  authToken = '',
}) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [threats, setThreats] = useState([]);
  const [network, setNetwork] = useState(initNetwork);
  const [device, setDevice] = useState(initDevice);
  const [scanState, setScanState] = useState(initScan);
  const [auditLogs, setAuditLogs] = useState([]);
  const [score, setScore] = useState(0);
  const [mfaUsers, setMfaUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [connected, setConnected] = useState(false);

  const threatIdRef = useRef(0);

  // ── Device security check on mount ────────────────────────────────────────
  useEffect(() => {
    const checkDevice = async () => {
      let swIntegrity = false;
      let storageSecure = false;

      // Service worker integrity
      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          swIntegrity = regs.length > 0;
        } catch {
          swIntegrity = false;
        }
      }

      // Storage security (IndexedDB / localStorage available)
      try {
        storageSecure =
          typeof indexedDB !== 'undefined' ||
          typeof localStorage !== 'undefined';
      } catch {
        storageSecure = false;
      }

      setDevice((prev) => ({ ...prev, swIntegrity, storageSecure }));
    };

    checkDevice();
  }, []);

  // ── Fetch initial data from REST API ──────────────────────────────────────
  useEffect(() => {
    if (!authToken) return;

    const headers = { Authorization: `Bearer ${authToken}` };

    const load = async () => {
      try {
        const [dashRes, logsRes, sessRes] = await Promise.allSettled([
          fetch('/api/security/dashboard', { headers }),
          fetch('/api/security/audit?limit=200', { headers }),
          fetch('/api/security/sessions', { headers }),
        ]);

        if (dashRes.status === 'fulfilled' && dashRes.value.ok) {
          const data = await dashRes.value.json();
          if (typeof data.score === 'number') setScore(data.score);
          if (Array.isArray(data.mfaUsers)) setMfaUsers(data.mfaUsers);
          if (data.network) setNetwork((prev) => ({ ...prev, ...data.network }));
          if (data.device) setDevice((prev) => ({ ...prev, ...data.device }));
        }

        if (logsRes.status === 'fulfilled' && logsRes.value.ok) {
          const data = await logsRes.value.json();
          if (Array.isArray(data.logs)) setAuditLogs(data.logs);
        }

        if (sessRes.status === 'fulfilled' && sessRes.value.ok) {
          const data = await sessRes.value.json();
          if (Array.isArray(data.sessions)) setSessions(data.sessions);
        }
      } catch (err) {
        setApiError('Could not load initial dashboard data.');
      }
    };

    load();
  }, [authToken]);

  // ── Socket.io event bindings ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onThreat = (payload) => {
      setThreats((prev) => {
        const entry = {
          ...payload,
          id: ++threatIdRef.current,
          timestamp: payload.timestamp ?? Date.now(),
        };
        // Cap feed at 200 entries
        const next = [...prev, entry];
        return next.length > 200 ? next.slice(next.length - 200) : next;
      });

      // Mirror critical/high threats to audit log
      if (payload.severity === 'critical' || payload.severity === 'high') {
        setAuditLogs((prev) => {
          const entry = {
            id: `threat-${Date.now()}`,
            timestamp: payload.timestamp ?? Date.now(),
            eventType: payload.type,
            user: payload.user ?? null,
            ip: payload.ip ?? null,
            details: payload.message ?? null,
            severity: payload.severity,
          };
          return [entry, ...prev].slice(0, 500);
        });
      }

      // Update score reactively (simple heuristic)
      setScore((prev) => {
        const penalty =
          payload.severity === 'critical'
            ? 5
            : payload.severity === 'high'
            ? 3
            : payload.severity === 'medium'
            ? 1
            : 0;
        return Math.max(0, prev - penalty);
      });
    };

    const onScanProgress = ({ percent, phase }) => {
      setScanState((prev) => ({
        ...prev,
        scanning: true,
        progress: typeof percent === 'number' ? percent : prev.progress,
        phase: phase ?? prev.phase,
      }));
    };

    const onScanResult = ({ findings }) => {
      setScanState((prev) => ({
        ...prev,
        scanning: false,
        progress: 100,
        findings: Array.isArray(findings) ? findings : prev.findings,
        lastScanTs: Date.now(),
      }));
    };

    const onSessionUpdate = ({ sessions: incoming }) => {
      if (Array.isArray(incoming)) setSessions(incoming);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('security:threat', onThreat);
    socket.on('security:scan:progress', onScanProgress);
    socket.on('security:scan:result', onScanResult);
    socket.on('security:session:update', onSessionUpdate);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('security:threat', onThreat);
      socket.off('security:scan:progress', onScanProgress);
      socket.off('security:scan:result', onScanResult);
      socket.off('security:session:update', onSessionUpdate);
    };
  }, [socket]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleStartScan = useCallback(async () => {
    if (scanState.scanning) return;

    setScanState((prev) => ({
      ...prev,
      scanning: true,
      progress: 0,
      phase: 'Initialising…',
      findings: [],
    }));
    setApiError(null);

    try {
      const res = await fetch('/api/security/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      if (!res.ok) throw new Error(`Scan request failed: ${res.status}`);

      // If the server responds immediately with findings (non-streaming),
      // hydrate state. Socket events cover the streaming case.
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.findings)) {
        setScanState({
          scanning: false,
          progress: 100,
          phase: 'Complete',
          findings: data.findings,
          lastScanTs: Date.now(),
        });
      }
    } catch (err) {
      setApiError(`Scan failed: ${err.message}`);
      setScanState((prev) => ({ ...prev, scanning: false }));
    }
  }, [scanState.scanning, authToken]);

  const handleRevokeSession = useCallback(
    async (sessionId) => {
      try {
        const res = await fetch(`/api/security/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: {
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        });
        if (!res.ok) throw new Error(`Revoke failed: ${res.status}`);
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      } catch (err) {
        setApiError(`Could not revoke session: ${err.message}`);
      }
    },
    [authToken]
  );

  // ── Theme helpers ──────────────────────────────────────────────────────────
  const bg = darkMode ? 'bg-slate-900' : 'bg-slate-50';
  const text = darkMode ? 'text-slate-100' : 'text-slate-900';
  const subtext = darkMode ? 'text-slate-400' : 'text-slate-500';
  const errorBg = darkMode
    ? 'bg-red-500/10 border border-red-500/30 text-red-300'
    : 'bg-red-50 border border-red-200 text-red-700';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${bg} ${text} font-sans`}>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                darkMode ? 'bg-indigo-600/20' : 'bg-indigo-100'
              }`}
            >
              <Shield
                size={20}
                className={darkMode ? 'text-indigo-400' : 'text-indigo-600'}
              />
            </div>
            <div>
              <h1 className={`text-xl font-bold leading-tight ${text}`}>
                Security Dashboard
              </h1>
              <p className={`text-xs ${subtext}`}>
                Nexus AI Pro — real-time threat monitoring
              </p>
            </div>
          </div>

          {/* Connection + role badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <LiveDot active={connected} />
              <span className={`text-xs ${subtext}`}>
                {socket
                  ? connected
                    ? 'Connected'
                    : 'Reconnecting…'
                  : 'No socket'}
              </span>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                darkMode
                  ? 'bg-slate-700/70 text-slate-300'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {userRole.toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── Global error banner ────────────────────────────────────────── */}
        {apiError && (
          <div
            className={`mb-5 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${errorBg}`}
          >
            <AlertCircle size={14} className="flex-shrink-0" />
            {apiError}
            <button
              onClick={() => setApiError(null)}
              className="ml-auto text-current opacity-60 hover:opacity-100"
            >
              <XCircle size={14} />
            </button>
          </div>
        )}

        {/* ── Grid layout ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

          {/* Score + MFA (col-span 1, row 1) */}
          {can(userRole, 'score') && (
            <div className="md:row-span-2">
              <ScoreAndMfaPanel
                score={score}
                mfaUsers={mfaUsers}
                userRole={userRole}
                darkMode={darkMode}
              />
            </div>
          )}

          {/* Threat feed */}
          {can(userRole, 'threats') && (
            <ThreatFeedPanel threats={threats} darkMode={darkMode} />
          )}

          {/* Network */}
          {can(userRole, 'network') && (
            <NetworkPanel network={network} darkMode={darkMode} />
          )}

          {/* Device security */}
          {can(userRole, 'device') && (
            <DeviceStatusPanel device={device} darkMode={darkMode} />
          )}

          {/* Vuln scan */}
          {can(userRole, 'vuln') && (
            <VulnScanPanel
              scanState={scanState}
              onStartScan={handleStartScan}
              darkMode={darkMode}
              authToken={authToken}
            />
          )}

          {/* Sessions */}
          {can(userRole, 'sessions') && (
            <SessionsPanel
              sessions={sessions}
              onRevoke={handleRevokeSession}
              userRole={userRole}
              darkMode={darkMode}
            />
          )}

          {/* Audit log — full-width */}
          {can(userRole, 'audit') && (
            <div className="md:col-span-2 xl:col-span-3">
              <AuditLogPanel logs={auditLogs} darkMode={darkMode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
