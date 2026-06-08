/**
 * Nexus AI Pro — Security Dashboard
 * Real-time scans, network issue detection, device health, threat log, audit trail.
 * date: 2026-06-08
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Activity, Wifi, Monitor, RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Lock, Unlock, Eye, Server, Zap } from 'lucide-react';

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const r = 40, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      <circle cx={50} cy={50} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
      <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" />
      <text x={50} y={46} textAnchor="middle" fill="white" fontSize={18} fontWeight="bold">{score}</text>
      <text x={50} y={60} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={9}>/ 100</text>
    </svg>
  );
}

// ── Severity badge ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }) {
  const cfg = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    info: 'bg-white/10 text-white/50 border-white/10',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border font-medium uppercase ${cfg[severity] || cfg.info}`}>
      {severity}
    </span>
  );
}

// ── Status indicator ──────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const colors = { ok: 'bg-emerald-400', warning: 'bg-yellow-400', error: 'bg-red-400', scanning: 'bg-blue-400 animate-pulse' };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-white/30'}`} />;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color = '#6366f1', sublabel }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-white/50">{label}</span>
        {Icon && <Icon size={14} style={{ color }} />}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sublabel && <div className="text-xs text-white/40 mt-0.5">{sublabel}</div>}
    </div>
  );
}

// ── Main Security Dashboard ───────────────────────────────────────────────────

export default function SecurityDashboard({ socket }) {
  const [data, setData] = useState(null);
  const [networkStats, setNetworkStats] = useState(null);
  const [deviceHealth, setDeviceHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);

  const authHeaders = { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };

  const load = useCallback(async () => {
    setError(null);
    try {
      const [dashRes, netRes, devRes, alertRes, auditRes] = await Promise.all([
        fetch('/api/security/dashboard', { headers: authHeaders }),
        fetch('/api/security/network', { headers: authHeaders }),
        fetch('/api/security/device', { headers: authHeaders }),
        fetch('/api/security/alerts?limit=20', { headers: authHeaders }),
        fetch('/api/security/audit?limit=20', { headers: authHeaders }),
      ]);
      if (dashRes.ok) setData(await dashRes.json());
      if (netRes.ok) setNetworkStats(await netRes.json());
      if (devRes.ok) setDeviceHealth(await devRes.json());
      if (alertRes.ok) setAlerts((await alertRes.json()).alerts || []);
      if (auditRes.ok) setAuditLog((await auditRes.json()).logs || []);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    if (!socket) return;
    socket.on('security:alert', alert => setAlerts(prev => [alert, ...prev.slice(0, 49)]));
    socket.on('security:scan', result => { setData(prev => prev ? { ...prev, ...result } : result); setScanning(false); });
    socket.on('device:health', health => setDeviceHealth(health));
    return () => { socket.off('security:alert'); socket.off('security:scan'); socket.off('device:health'); };
  }, [socket]);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/security/scan', { method: 'POST', headers: authHeaders });
      if (res.ok) {
        const result = await res.json();
        setData(prev => prev ? { ...prev, ...result } : result);
      }
    } catch (e) { setError(e.message); }
    finally { setScanning(false); }
  };

  const rotateKeys = async () => {
    try {
      await fetch('/api/security/rotate-keys', { method: 'POST', headers: authHeaders });
      await load();
    } catch (e) { setError(e.message); }
  };

  const resolveAlert = async (alertId) => {
    try {
      await fetch(`/api/security/alerts/${alertId}/resolve`, { method: 'POST', headers: authHeaders });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolvedAt: Date.now() } : a));
    } catch {}
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'network', label: 'Network', icon: Wifi },
    { id: 'device', label: 'Device', icon: Monitor },
    { id: 'alerts', label: `Alerts ${alerts.filter(a => !a.resolvedAt).length > 0 ? `(${alerts.filter(a => !a.resolvedAt).length})` : ''}`, icon: AlertTriangle },
    { id: 'audit', label: 'Audit Log', icon: Eye },
  ];

  const score = data?.score ?? data?.overallScore ?? 85;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="text-emerald-400" size={24} /> Security Dashboard
          </h1>
          <p className="text-white/50 text-sm mt-0.5">Real-time threat detection, network monitoring & device health</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={rotateKeys} className="px-3 py-1.5 text-xs border border-white/20 rounded-lg hover:bg-white/5 text-white/70 flex items-center gap-1.5">
            <Lock size={11} /> Rotate Keys
          </button>
          <button onClick={runScan} disabled={scanning} className="px-4 py-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-emerald-300 flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw size={11} className={scanning ? 'animate-spin' : ''} />
            {scanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'}`}
          >
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Score ring */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center">
              <div className="text-sm text-white/50 mb-3">Security Score</div>
              <ScoreRing score={score} />
              <div className={`mt-3 text-sm font-semibold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {score >= 80 ? 'Excellent' : score >= 60 ? 'Needs Attention' : 'At Risk'}
              </div>
            </div>
            {/* Quick stats */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-3">
              <StatCard label="Encryption" value="AES-256-GCM" icon={Lock} color="#10b981" sublabel="Active" />
              <StatCard label="Threats Blocked" value={networkStats?.blockedIPs || 0} icon={ShieldAlert} color="#ef4444" sublabel="Blocked IPs" />
              <StatCard label="Active Alerts" value={alerts.filter(a => !a.resolvedAt).length} icon={AlertTriangle} color="#f59e0b" sublabel="Unresolved" />
              <StatCard label="Last Scan" value={data?.scannedAt ? new Date(data.scannedAt).toLocaleTimeString() : '—'} icon={Clock} color="#6366f1" />
            </div>
          </div>

          {/* Findings */}
          {data?.findings?.length > 0 && (
            <div>
              <h3 className="text-sm text-white/50 uppercase tracking-wider mb-3">Scan Findings</h3>
              <div className="space-y-2">
                {data.findings.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      {f.status === 'resolved' ? <CheckCircle size={14} className="text-emerald-400 shrink-0" /> : <AlertTriangle size={14} className="text-yellow-400 shrink-0" />}
                      <span className="text-sm text-white/80">{f.title}</span>
                    </div>
                    <SeverityBadge severity={f.severity} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Network tab ── */}
      {activeTab === 'network' && networkStats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard label="Network Interfaces" value={networkStats.interfaces?.length || 0} icon={Wifi} color="#22d3ee" />
            <StatCard label="Blocked IPs" value={networkStats.blockedIPs || 0} icon={ShieldAlert} color="#ef4444" />
            <StatCard label="Uptime" value={`${Math.floor((networkStats.uptimeSeconds || 0) / 3600)}h`} icon={Activity} color="#10b981" />
          </div>
          <div>
            <h3 className="text-sm text-white/50 uppercase tracking-wider mb-2">Network Interfaces</h3>
            <div className="bg-white/3 border border-white/10 rounded-xl overflow-hidden">
              {(networkStats.interfaces || []).map((iface, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-3 ${i < networkStats.interfaces.length - 1 ? 'border-b border-white/8' : ''}`}>
                  <div className="flex items-center gap-3">
                    <Server size={13} className="text-white/40" />
                    <div>
                      <span className="text-sm text-white/80">{iface.name}</span>
                      <span className="text-xs text-white/40 ml-2">{iface.family}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white/60">{iface.address}</span>
                    <StatusDot status={iface.internal ? 'warning' : 'ok'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {networkStats.recentThreats?.length > 0 && (
            <div>
              <h3 className="text-sm text-white/50 uppercase tracking-wider mb-2">Recent Threats</h3>
              <div className="space-y-1.5">
                {networkStats.recentThreats.map((t, i) => (
                  <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2 text-xs">
                    <span className="text-red-400 font-mono">{t.ip}</span>
                    <span className="text-white/40 mx-2">·</span>
                    <span className="text-white/60">{t.path}</span>
                    <span className="text-white/30 ml-2">{new Date(t.ts).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Device tab ── */}
      {activeTab === 'device' && deviceHealth && (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${deviceHealth.overall === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
            {deviceHealth.overall === 'healthy' ? <ShieldCheck size={20} className="text-emerald-400" /> : <AlertTriangle size={20} className="text-yellow-400" />}
            <div>
              <div className="font-semibold text-white capitalize">{deviceHealth.overall}</div>
              <div className="text-xs text-white/50">{deviceHealth.platform} · {deviceHealth.arch} · Node {deviceHealth.nodeVersion}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <StatCard label="CPU Cores" value={deviceHealth.cpuCount} icon={Zap} color="#6366f1" sublabel={deviceHealth.cpuModel?.slice(0, 20)} />
            <StatCard label="Memory Usage" value={`${deviceHealth.memory?.usagePercent}%`} icon={Activity} color={parseFloat(deviceHealth.memory?.usagePercent) > 80 ? '#ef4444' : '#10b981'} sublabel={`${Math.round((deviceHealth.memory?.used || 0) / 1024 / 1024)} MB used`} />
            <StatCard label="Load Avg (1m)" value={deviceHealth.loadAvg?.[0]?.toFixed(2)} icon={Server} color="#f59e0b" />
          </div>
          <div>
            <h3 className="text-sm text-white/50 uppercase tracking-wider mb-2">Health Checks</h3>
            <div className="space-y-2">
              {(deviceHealth.healthChecks || []).map((h, i) => (
                <div key={i} className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <StatusDot status={h.status} />
                    <span className="text-sm text-white/80">{h.name}</span>
                  </div>
                  <span className="text-xs text-white/40">{h.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Alerts tab ── */}
      {activeTab === 'alerts' && (
        <div className="space-y-2">
          {alerts.length === 0 && <div className="text-center py-10 text-white/30">No alerts</div>}
          {alerts.map(alert => (
            <div key={alert.id} className={`flex items-start justify-between p-3 rounded-xl border ${alert.resolvedAt ? 'opacity-40 bg-white/2 border-white/8' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className="flex items-start gap-3">
                {alert.resolvedAt ? <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />}
                <div>
                  <div className="text-sm text-white/80">{alert.message}</div>
                  <div className="text-xs text-white/40 mt-0.5">{new Date(alert.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <SeverityBadge severity={alert.severity} />
                {!alert.resolvedAt && (
                  <button onClick={() => resolveAlert(alert.id)} className="text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded border border-white/10 hover:border-white/20">
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Audit log tab ── */}
      {activeTab === 'audit' && (
        <div>
          <div className="bg-white/3 border border-white/10 rounded-xl overflow-hidden">
            {auditLog.length === 0 && <div className="text-center py-8 text-white/30 text-sm">No audit entries</div>}
            {auditLog.map((entry, i) => (
              <div key={entry.id || i} className={`flex items-center justify-between px-4 py-2.5 ${i < auditLog.length - 1 ? 'border-b border-white/8' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-indigo-400 w-36 truncate">{entry.event}</span>
                  <span className="text-xs text-white/50 truncate max-w-xs">{entry.details ? JSON.stringify(entry.details).slice(0, 80) : ''}</span>
                </div>
                <span className="text-xs text-white/30 shrink-0 ml-4">{new Date(entry.timestamp || entry.ts || entry.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
