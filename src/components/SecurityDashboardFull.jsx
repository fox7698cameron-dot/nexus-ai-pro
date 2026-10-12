// Nexus AI Pro - SecurityDashboardFull | 2026-10-12
import { useState, useEffect, useCallback, useRef } from 'react';

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', bg: 'bg-red-900/50', border: 'border-red-700', text: 'text-red-300', dot: 'bg-red-500' },
  high: { label: 'High', bg: 'bg-orange-900/50', border: 'border-orange-700', text: 'text-orange-300', dot: 'bg-orange-500' },
  medium: { label: 'Medium', bg: 'bg-yellow-900/50', border: 'border-yellow-700', text: 'text-yellow-300', dot: 'bg-yellow-500' },
  low: { label: 'Low', bg: 'bg-blue-900/50', border: 'border-blue-700', text: 'text-blue-300', dot: 'bg-blue-400' },
};

const REFRESH_INTERVAL_MS = 30_000;

function SeverityBadge({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.low;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

function MetricCard({ label, value, sublabel, status }) {
  const statusColor = status === 'ok' ? 'text-green-400' : status === 'warn' ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className={`text-xl font-bold ${statusColor}`}>{value}</div>
      {sublabel && <div className="text-gray-500 text-xs mt-0.5">{sublabel}</div>}
    </div>
  );
}

function AlertRow({ alert, onDismiss }) {
  const cfg = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`} role="listitem">
      <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${cfg.text}`}>{alert.title}</div>
        <div className="text-gray-400 text-xs mt-0.5 break-words">{alert.description}</div>
        {alert.timestamp && (
          <div className="text-gray-500 text-xs mt-1">{new Date(alert.timestamp).toLocaleString()}</div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <SeverityBadge severity={alert.severity} />
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-gray-500 hover:text-gray-300 text-xs"
            aria-label={`Dismiss alert: ${alert.title}`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export default function SecurityDashboardFull() {
  const [scanData, setScanData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const timerRef = useRef(null);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/security/scan');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setScanData(data);
      setLastScan(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runScan();
    timerRef.current = setInterval(runScan, REFRESH_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [runScan]);

  useEffect(() => {
    const socket = window.socketInstance;
    if (!socket) return;
    const handler = (alert) => {
      setAlerts(prev => [{ ...alert, id: alert.id ?? Date.now() }, ...prev].slice(0, 100));
    };
    socket.on('security:alert', handler);
    return () => socket.off('security:alert', handler);
  }, []);

  const dismissAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'network', label: 'Network' },
    { id: 'alerts', label: `Alerts${alerts.length ? ` (${alerts.length})` : ''}` },
    { id: 'cve', label: 'CVE' },
    { id: 'connections', label: 'Connections' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" aria-live="polite" aria-busy="true">
        <div className="text-gray-400 animate-pulse">Running security scan...</div>
      </div>
    );
  }

  const scan = scanData ?? {};

  return (
    <main className="p-4 md:p-6 text-white min-h-screen bg-gray-900" aria-label="Security Dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Security Dashboard</h1>
          {lastScan && (
            <p className="text-gray-400 text-xs mt-1">Last scan: {lastScan.toLocaleString()} · Auto-refresh every 30s</p>
          )}
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-sm rounded-lg transition-colors disabled:opacity-50"
          aria-label="Run security scan now"
        >
          {scanning ? 'Scanning...' : 'Scan Now'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm" role="alert">
          Scan error: {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Firewall" value={scan.firewall?.status ?? 'Unknown'} status={scan.firewall?.status === 'Active' ? 'ok' : 'error'} />
        <MetricCard label="SSL Certificates" value={`${scan.ssl?.valid ?? 0} / ${scan.ssl?.total ?? 0}`} sublabel="valid" status={scan.ssl?.valid === scan.ssl?.total ? 'ok' : 'warn'} />
        <MetricCard label="Open Ports" value={scan.openPorts?.count ?? '—'} sublabel="detected" status={scan.openPorts?.count > 20 ? 'warn' : 'ok'} />
        <MetricCard label="Active Connections" value={scan.connections?.active ?? '—'} status="ok" />
      </div>

      <nav className="flex gap-1 border-b border-gray-700 mb-4 overflow-x-auto" aria-label="Security sections">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <section aria-label="Security overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <h2 className="font-semibold mb-3">Threat Summary</h2>
              {['critical', 'high', 'medium', 'low'].map(sev => {
                const count = scan.threats?.[sev] ?? 0;
                const cfg = SEVERITY_CONFIG[sev];
                return (
                  <div key={sev} className="flex items-center justify-between py-1.5 border-b border-gray-700 last:border-0">
                    <SeverityBadge severity={sev} />
                    <span className={`font-bold ${cfg.text}`}>{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <h2 className="font-semibold mb-3">On-Device Issues</h2>
              {(scan.deviceIssues ?? []).length === 0 ? (
                <p className="text-green-400 text-sm">No issues detected</p>
              ) : (
                <ul className="space-y-2">
                  {(scan.deviceIssues ?? []).map((issue, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <SeverityBadge severity={issue.severity} />
                      <span className="text-sm text-gray-300">{issue.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'network' && (
        <section aria-label="Network analysis">
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="font-semibold mb-3">Network Traffic Analysis</h2>
            {(scan.networkTraffic ?? []).length === 0 ? (
              <p className="text-gray-400 text-sm">No traffic data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 pr-4" scope="col">Source</th>
                      <th className="text-left py-2 pr-4" scope="col">Destination</th>
                      <th className="text-left py-2 pr-4" scope="col">Protocol</th>
                      <th className="text-left py-2 pr-4" scope="col">Bytes</th>
                      <th className="text-left py-2" scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(scan.networkTraffic ?? []).map((row, i) => (
                      <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-2 pr-4 font-mono text-xs">{row.src}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{row.dst}</td>
                        <td className="py-2 pr-4">{row.protocol}</td>
                        <td className="py-2 pr-4">{row.bytes}</td>
                        <td className="py-2">
                          <SeverityBadge severity={row.severity ?? 'low'} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'alerts' && (
        <section aria-label="Security alerts">
          {alerts.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-6 text-center text-gray-400">
              No active alerts
            </div>
          ) : (
            <div className="space-y-2" role="list">
              {alerts.map(alert => (
                <AlertRow key={alert.id} alert={alert} onDismiss={dismissAlert} />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'cve' && (
        <section aria-label="CVE database lookups">
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="font-semibold mb-3">CVE Findings</h2>
            {(scan.cves ?? []).length === 0 ? (
              <p className="text-green-400 text-sm">No CVEs detected</p>
            ) : (
              <div className="space-y-3">
                {(scan.cves ?? []).map((cve, i) => (
                  <div key={i} className="border border-gray-700 rounded-lg p-3">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-blue-300">{cve.id}</span>
                      <SeverityBadge severity={cve.severity} />
                      {cve.score && <span className="text-xs text-gray-400">CVSS: {cve.score}</span>}
                    </div>
                    <p className="text-sm text-gray-300">{cve.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'connections' && (
        <section aria-label="Active connections">
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="font-semibold mb-3">Active Connections ({scan.connections?.active ?? 0})</h2>
            {(scan.connections?.list ?? []).length === 0 ? (
              <p className="text-gray-400 text-sm">No connection data available</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="table">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left py-2 pr-4" scope="col">Local</th>
                      <th className="text-left py-2 pr-4" scope="col">Remote</th>
                      <th className="text-left py-2 pr-4" scope="col">State</th>
                      <th className="text-left py-2" scope="col">PID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(scan.connections?.list ?? []).map((conn, i) => (
                      <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-2 pr-4 font-mono text-xs">{conn.local}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{conn.remote}</td>
                        <td className="py-2 pr-4">
                          <span className={conn.state === 'ESTABLISHED' ? 'text-green-400' : 'text-yellow-400'}>
                            {conn.state}
                          </span>
                        </td>
                        <td className="py-2 font-mono text-xs">{conn.pid ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
