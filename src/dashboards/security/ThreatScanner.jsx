// 2026-07-20
import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Shield, Archive, CheckCircle, Clock, AlertTriangle,
  Trash2, Plus, RefreshCw, Lock, FileText, X, Calendar,
} from 'lucide-react';

const API_BASE = '/api/security';

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_DETECTIONS = [
  { id: 'd1', path: '/tmp/miner_stub.bin',        threat: 'Cryptominer',        severity: 'critical', hash: 'a3f4b2c...', quarantined: false, detectedAt: Date.now() - 300000 },
  { id: 'd2', path: '/home/user/.bash_history',    threat: 'Credential Leakage', severity: 'high',     hash: '9c1e2b4...', quarantined: false, detectedAt: Date.now() - 600000 },
  { id: 'd3', path: '/var/log/syslog.bak',         threat: 'Log Tampering',      severity: 'medium',   hash: 'f7a8d3e...', quarantined: true,  detectedAt: Date.now() - 900000 },
  { id: 'd4', path: '/etc/cron.d/suspicious_job',  threat: 'Persistence Hook',   severity: 'high',     hash: '2b5c8a1...', quarantined: false, detectedAt: Date.now() - 120000 },
];

const SYSTEM_HASHES = [
  { path: '/bin/bash',         expected: 'sha256:7b3e...', actual: 'sha256:7b3e...', ok: true  },
  { path: '/usr/bin/python3',  expected: 'sha256:4f1a...', actual: 'sha256:4f1a...', ok: true  },
  { path: '/etc/passwd',       expected: 'sha256:9c2b...', actual: 'sha256:MISMATCH', ok: false },
  { path: '/usr/sbin/sshd',    expected: 'sha256:1d8f...', actual: 'sha256:1d8f...', ok: true  },
];

const SCHEDULES = [
  { id: 's1', name: 'Daily Quick Scan',    type: 'quick',   cron: '0 3 * * *',  enabled: true  },
  { id: 's2', name: 'Weekly Deep Scan',    type: 'deep',    cron: '0 2 * * 0',  enabled: true  },
  { id: 's3', name: 'Hourly Network Scan', type: 'network', cron: '0 * * * *',  enabled: false },
];

const SEV_COLORS = {
  critical: { text: 'text-red-400',    badge: 'bg-red-500',    bg: 'bg-red-900/30 border-red-500/40' },
  high:     { text: 'text-orange-400', badge: 'bg-orange-500', bg: 'bg-orange-900/30 border-orange-500/40' },
  medium:   { text: 'text-yellow-400', badge: 'bg-yellow-500', bg: 'bg-yellow-900/30 border-yellow-500/40' },
  low:      { text: 'text-blue-400',   badge: 'bg-blue-500',   bg: 'bg-blue-900/30 border-blue-500/40' },
};

// ── Scan Progress Bar ────────────────────────────────────────────────────────
function ScanProgress({ pct, type, phase }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-400 flex items-center gap-1.5">
          <Search size={11} className="animate-pulse text-indigo-400" />
          <span className="capitalize">{type} scan · {phase}</span>
        </span>
        <span className="text-indigo-300 font-mono font-bold">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-500"
          style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-gray-600 font-mono">Scanning: /home/user/nexus-ai-pro/src/…</div>
    </div>
  );
}

export default function ThreatScanner() {
  const [scanning,     setScanning]     = useState(false);
  const [scanType,     setScanType]     = useState('quick');
  const [scanPct,      setScanPct]      = useState(0);
  const [scanPhase,    setScanPhase]    = useState('Initialising…');
  const [detections,   setDetections]   = useState(MOCK_DETECTIONS);
  const [quarantined,  setQuarantined]  = useState(MOCK_DETECTIONS.filter(d => d.quarantined));
  const [whitelist,    setWhitelist]    = useState(['/usr/lib/jvm/**', '/home/user/.vscode/**']);
  const [newWhitePath, setNewWhitePath] = useState('');
  const [schedules,    setSchedules]    = useState(SCHEDULES);
  const [hashes,       setHashes]       = useState(SYSTEM_HASHES);
  const [hashChecking, setHashChecking] = useState(false);
  const [tab,          setTab]          = useState('scan');

  const PHASES = ['Initialising…', 'File system index…', 'Signature matching…', 'Heuristic analysis…', 'Network probes…', 'Finalising report…'];

  const startScan = async () => {
    setScanning(true);
    setScanPct(0);
    setScanPhase(PHASES[0]);
    try {
      await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: scanType }),
      });
    } catch { /* continue with mock */ }

    let pct   = 0;
    let phase = 0;
    const t = setInterval(() => {
      pct = Math.min(100, pct + 1.5 + Math.random() * 1.5);
      setScanPct(pct);
      const pi = Math.min(PHASES.length - 1, Math.floor((pct / 100) * PHASES.length));
      if (pi !== phase) { phase = pi; setScanPhase(PHASES[pi]); }
      if (pct >= 100) { clearInterval(t); setScanning(false); }
    }, 300);
  };

  const quarantineItem = async (item) => {
    try {
      await fetch(`${API_BASE}/quarantine/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: item.path }),
      });
    } catch { /* silent */ }
    setDetections(prev => prev.map(d => d.id === item.id ? { ...d, quarantined: true } : d));
    setQuarantined(prev => [...prev.filter(q => q.id !== item.id), { ...item, quarantined: true, quarantinedAt: Date.now() }]);
  };

  const removeFromQuarantine = (id) => {
    setQuarantined(prev => prev.filter(q => q.id !== id));
    setDetections(prev => prev.map(d => d.id === id ? { ...d, quarantined: false } : d));
  };

  const addWhitelist = () => {
    if (!newWhitePath.trim()) return;
    setWhitelist(prev => [...prev, newWhitePath.trim()]);
    setNewWhitePath('');
  };

  const verifyHashes = async () => {
    setHashChecking(true);
    await new Promise(r => setTimeout(r, 1800));
    setHashes(prev => prev.map(h => ({ ...h, verifiedAt: Date.now() })));
    setHashChecking(false);
  };

  const toggleSchedule = (id) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const activeThreats = detections.filter(d => !d.quarantined);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-purple-600/20 rounded-xl border border-purple-500/30">
          <Search size={22} className="text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Threat Scanner</h1>
          <p className="text-xs text-gray-500">File system · malware detection · quarantine</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800/60 p-1 rounded-xl w-fit flex-wrap">
        {[['scan','Scanner'],['quarantine',`Quarantine (${quarantined.length})`],['whitelist','Whitelist'],['schedule','Schedule'],['hashes','Hash Verify']].map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === k ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {v}
          </button>
        ))}
      </div>

      {/* ── Scanner Tab ── */}
      {tab === 'scan' && (
        <div className="space-y-4">
          <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5 space-y-4">
            <h2 className="font-semibold text-sm text-gray-300 flex items-center gap-2">
              <Search size={14} className="text-purple-400" /> Scan Controls
            </h2>
            <div className="flex flex-wrap gap-2">
              {[['quick','Quick (≈8s)'],['deep','Deep (≈30s)'],['network','Network (≈15s)']].map(([t, l]) => (
                <button key={t} onClick={() => setScanType(t)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
                    scanType === t ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-700/60 border-gray-600 text-gray-300 hover:border-purple-500'
                  }`}>{l}</button>
              ))}
            </div>
            {scanning ? (
              <ScanProgress pct={scanPct} type={scanType} phase={scanPhase} />
            ) : (
              <button onClick={startScan}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition">
                <Search size={15} /> Start {scanType.charAt(0).toUpperCase() + scanType.slice(1)} Scan
              </button>
            )}
          </div>

          <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
            <h2 className="font-semibold text-sm text-gray-300 mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" /> Detections ({activeThreats.length} active)
            </h2>
            {activeThreats.length === 0 ? (
              <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle size={16} /> No threats detected</div>
            ) : (
              <div className="space-y-3">
                {activeThreats.map(d => {
                  const c = SEV_COLORS[d.severity] ?? SEV_COLORS.low;
                  return (
                    <div key={d.id} className={`p-4 rounded-xl border ${c.bg}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase ${c.badge}`}>{d.severity}</span>
                            <span className="text-sm font-medium text-white">{d.threat}</span>
                          </div>
                          <p className="text-xs font-mono text-gray-400 truncate">{d.path}</p>
                          <p className="text-xs text-gray-600 mt-1">Hash: <code className="text-gray-500">{d.hash}</code></p>
                        </div>
                        <button onClick={() => quarantineItem(d)}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium flex items-center gap-1 transition">
                          <Archive size={11} /> Quarantine
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Quarantine Tab ── */}
      {tab === 'quarantine' && (
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
          <h2 className="font-semibold text-sm text-gray-300 mb-4 flex items-center gap-2">
            <Archive size={14} className="text-orange-400" /> Quarantine ({quarantined.length} files)
          </h2>
          {quarantined.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">Quarantine is empty</div>
          ) : (
            <div className="space-y-3">
              {quarantined.map(q => (
                <div key={q.id} className="flex items-center justify-between gap-3 p-4 rounded-xl bg-orange-900/20 border border-orange-500/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate font-mono">{q.path}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{q.threat} · {new Date(q.quarantinedAt ?? q.detectedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => removeFromQuarantine(q.id)}
                      className="px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-medium flex items-center gap-1 transition">
                      <CheckCircle size={11} /> Restore
                    </button>
                    <button onClick={() => setQuarantined(prev => prev.filter(x => x.id !== q.id))}
                      className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-medium flex items-center gap-1 transition">
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Whitelist Tab ── */}
      {tab === 'whitelist' && (
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
          <h2 className="font-semibold text-sm text-gray-300 mb-4 flex items-center gap-2">
            <CheckCircle size={14} className="text-green-400" /> Whitelist Management
          </h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text" value={newWhitePath} onChange={e => setNewWhitePath(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addWhitelist()}
              placeholder="/path/to/safe/file or glob/**"
              className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
            <button onClick={addWhitelist}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium flex items-center gap-1 transition">
              <Plus size={14} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {whitelist.map((path, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-green-900/20 border border-green-500/30">
                <code className="text-sm text-green-300 font-mono">{path}</code>
                <button onClick={() => setWhitelist(prev => prev.filter((_, idx) => idx !== i))}
                  className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-red-400 transition">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Schedule Tab ── */}
      {tab === 'schedule' && (
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
          <h2 className="font-semibold text-sm text-gray-300 mb-4 flex items-center gap-2">
            <Calendar size={14} className="text-blue-400" /> Scan Schedule
          </h2>
          <div className="space-y-3">
            {schedules.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-700/40 border border-gray-600/40">
                <div>
                  <div className="text-sm font-medium text-white">{s.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 font-mono">
                    cron: <code className="text-indigo-300">{s.cron}</code> · type: <span className="capitalize">{s.type}</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={s.enabled} onChange={() => toggleSchedule(s.id)} className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-600 peer-checked:bg-indigo-600 rounded-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Hash Verify Tab ── */}
      {tab === 'hashes' && (
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm text-gray-300 flex items-center gap-2">
              <Lock size={14} className="text-indigo-400" /> Hash Verification — Critical System Files
            </h2>
            <button onClick={verifyHashes} disabled={hashChecking}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1 transition disabled:opacity-50">
              <RefreshCw size={12} className={hashChecking ? 'animate-spin' : ''} /> Re-verify
            </button>
          </div>
          <div className="space-y-3">
            {hashes.map((h, i) => (
              <div key={i} className={`p-4 rounded-xl border ${h.ok ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/30 border-red-500/40'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-gray-200 truncate">{h.path}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">expected: {h.expected}</p>
                    {!h.ok && <p className="text-xs text-red-400 mt-0.5 font-mono">actual: {h.actual}</p>}
                  </div>
                  {h.ok
                    ? <CheckCircle size={18} className="text-green-400 shrink-0" />
                    : <AlertTriangle size={18} className="text-red-400 shrink-0 animate-pulse" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
