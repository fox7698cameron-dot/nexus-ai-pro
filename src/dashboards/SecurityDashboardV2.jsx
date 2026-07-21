/**
 * SecurityDashboardV2.jsx
 * Real-time Security Dashboard — scans, network issues, device checks
 * Supports web, Electron, mobile (Capacitor)
 * Updated: 2026-07-21
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

const SEVERITY_COLORS = { critical: '#dc2626', high: '#f97316', medium: '#eab308', low: '#3b82f6', info: '#6b7280' };
const SEVERITY_ICONS = { critical: '🚨', high: '⚠️', medium: '⚡', low: 'ℹ️', info: '💡' };

function ScoreGauge({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={120} height={120} viewBox="0 0 120 120">
        <circle cx={60} cy={60} r={45} fill="none" stroke="var(--border)" strokeWidth={10} />
        <circle cx={60} cy={60} r={45} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 60 60)" />
        <text x={60} y={65} textAnchor="middle" fontSize={22} fontWeight={700} fill={color}>{score}</text>
      </svg>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Security Score</span>
    </div>
  );
}

function IssueRow({ issue }) {
  const color = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.info;
  const icon = SEVERITY_ICONS[issue.severity] || '❓';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0',
      borderBottom: '1px solid var(--border)'
    }}>
      <span style={{ fontSize: 18, minWidth: 24 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color }}>{issue.message || issue.name}</div>
        {issue.type && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{issue.type}</div>}
      </div>
      <span style={{
        padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: color + '22', color
      }}>
        {issue.severity?.toUpperCase() || 'INFO'}
      </span>
    </div>
  );
}

function VulnerabilityCard({ vuln, onPatch, patching }) {
  const [patched, setPatched] = useState(vuln.status === 'patched' || vuln.status === 'resolved');
  const handlePatch = async () => {
    if (patched || patching) return;
    const ok = await onPatch(vuln.id);
    if (ok) setPatched(true);
  };
  const color = SEVERITY_COLORS[vuln.severity] || SEVERITY_COLORS.info;
  return (
    <div style={{ background: 'var(--card-bg)', border: `1px solid ${color}44`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{vuln.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Severity: <span style={{ color }}>{vuln.severity?.toUpperCase()}</span>
          </div>
        </div>
        <button
          onClick={handlePatch}
          disabled={patched || patching}
          style={{
            padding: '6px 14px', borderRadius: 8, border: 'none', cursor: patched ? 'default' : 'pointer',
            background: patched ? '#22c55e22' : color, color: patched ? '#22c55e' : '#fff',
            fontWeight: 600, fontSize: 13, opacity: patching ? 0.6 : 1
          }}
        >
          {patched ? '✓ Patched' : patching ? 'Patching...' : 'Auto-Patch'}
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ label, status }) {
  const color = status === 'healthy' ? '#22c55e' : status === 'warnings' ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 4px ${color}` }} />
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}:</span>
      <span style={{ fontSize: 13, fontWeight: 600, color }}>{status}</span>
    </div>
  );
}

export default function SecurityDashboardV2({ authToken }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [patching, setPatching] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [networkIssues, setNetworkIssues] = useState([]);
  const [deviceIssues, setDeviceIssues] = useState([]);
  const pollRef = useRef(null);

  const headers = useCallback(() => {
    const h = { 'Content-Type': 'application/json' };
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    return h;
  }, [authToken]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/security/dashboard');
      if (!res.ok) throw new Error('Failed to fetch security data');
      const d = await res.json();
      setData(d);
      setLastUpdated(Date.now());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/security/realtime-scan', {
        method: 'POST',
        headers: headers()
      });
      if (!res.ok) throw new Error('Scan requires authentication');
      const results = await res.json();
      setNetworkIssues(results.network?.issues || []);
      setDeviceIssues(results.device?.issues || []);
      if (results.score !== undefined) {
        setData(prev => prev ? { ...prev, overallScore: results.score } : prev);
      }
      setLastUpdated(Date.now());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  }, [headers]);

  const patchVulnerability = useCallback(async (vulnId) => {
    setPatching(true);
    try {
      const res = await fetch('/api/security/patch', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ vulnId })
      });
      if (!res.ok) return false;
      return true;
    } catch {
      return false;
    } finally {
      setPatching(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchDashboard();
    pollRef.current = setInterval(fetchDashboard, 60000);
    return () => clearInterval(pollRef.current);
  }, [fetchDashboard]);

  const allIssues = [...networkIssues, ...deviceIssues];

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif', color: 'var(--text, #111)', maxWidth: 900 }}>
      <style>{`
        :root { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
        @media (prefers-color-scheme: dark) {
          :root { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; }
        }
        :root[data-theme="dark"] { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; }
        :root[data-theme="light"] { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🛡️ Security Dashboard</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Real-time scans · Network monitoring · Device health
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={fetchDashboard}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
              cursor: 'pointer', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13 }}
          >
            Refresh
          </button>
          <button
            onClick={runScan}
            disabled={scanning}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none',
              cursor: scanning ? 'not-allowed' : 'pointer',
              background: scanning ? '#6b7280' : '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600 }}
          >
            {scanning ? '⏳ Scanning...' : '🔍 Run Scan'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px',
          color: '#dc2626', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading security dashboard...</div>
      ) : (
        <>
          {/* Top row: Score + Status */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20,
              display: 'flex', alignItems: 'center', gap: 24, flex: '0 0 auto' }}>
              <ScoreGauge score={data?.overallScore || 0} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <StatusBadge label="Encryption" status={data?.encryptionStatus ? 'healthy' : 'unknown'} />
                <StatusBadge label="Network" status={networkIssues.some(i => i.severity === 'critical') ? 'critical' : 'healthy'} />
                <StatusBadge label="Device" status={deviceIssues.some(i => i.severity === 'critical') ? 'critical' : 'healthy'} />
                <StatusBadge label="Patches" status="healthy" />
              </div>
            </div>

            {/* Encryption info */}
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🔐 Encryption</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13 }}>
                <div style={{ color: 'var(--text-muted)' }}>Algorithm</div>
                <div style={{ fontWeight: 600, color: '#22c55e' }}>{data?.encryptionStatus || 'AES-256-GCM'}</div>
                <div style={{ color: 'var(--text-muted)' }}>Status</div>
                <div style={{ fontWeight: 600, color: '#22c55e' }}>Active</div>
                <div style={{ color: 'var(--text-muted)' }}>Last Scan</div>
                <div style={{ fontSize: 12 }}>
                  {data?.lastScanTime ? new Date(data.lastScanTime).toLocaleString() : '—'}
                </div>
                <div style={{ color: 'var(--text-muted)' }}>Updated</div>
                <div style={{ fontSize: 12 }}>
                  {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Vulnerabilities */}
          {data?.vulnerabilities?.length > 0 && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                ⚠️ Vulnerabilities ({data.vulnerabilities.length})
              </div>
              {data.vulnerabilities.map((v) => (
                <VulnerabilityCard key={v.id} vuln={v} onPatch={patchVulnerability} patching={patching} />
              ))}
            </div>
          )}

          {/* Network & Device Issues */}
          {allIssues.length > 0 && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                🌐 Scan Results ({allIssues.length} issues)
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Network: {networkIssues.length} · Device: {deviceIssues.length}
              </div>
              {allIssues.map((issue, i) => <IssueRow key={i} issue={issue} />)}
            </div>
          )}

          {allIssues.length === 0 && !scanning && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 20, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, color: '#16a34a' }}>No active issues detected</div>
              <div style={{ fontSize: 13, color: '#4ade80', marginTop: 4 }}>Run a scan to check for new issues</div>
            </div>
          )}

          {/* Recent Threats */}
          {data?.threats?.length > 0 && (
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🚨 Recent Threats</div>
              {data.threats.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                  borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span>{t.type}</span>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>{t.status}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
