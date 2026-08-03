/**
 * SecurityDashboardEnhanced — Real-time security monitoring
 * Features: live scans, network issue detection, on-device issue alerts
 * Works in web + Electron contexts
 * @date 2026-08-03
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const SEVERITY_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#3b82f6', info: '#64748b' };
const SEVERITY_ICON  = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: 'ℹ️' };

function ScoreGauge({ score }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const r = 44, cx = 56, cy = 56;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const dash = (pct / 100) * circ;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={112} height={112} viewBox="0 0 112 112">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth={10} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: 'stroke-dasharray 0.6s' }} />
        <text x={cx} y={cy} textAnchor="middle" dy="0.35em"
          fill={color} fontSize={22} fontWeight={800}>{score}</text>
      </svg>
      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Security Score</div>
    </div>
  );
}

function AlertBadge({ count, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{count}</div>
      <div style={{ color: '#64748b', fontSize: 11 }}>{label}</div>
    </div>
  );
}

function VulnerabilityRow({ vuln, onPatch }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
      borderBottom: '1px solid #1e293b'
    }}>
      <span style={{ fontSize: 16 }}>{SEVERITY_ICON[vuln.severity] || 'ℹ️'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{vuln.name}</div>
        {vuln.description && <div style={{ color: '#64748b', fontSize: 11 }}>{vuln.description}</div>}
      </div>
      <span style={{
        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
        background: `${SEVERITY_COLOR[vuln.severity] || '#64748b'}22`,
        color: SEVERITY_COLOR[vuln.severity] || '#64748b'
      }}>{vuln.severity}</span>
      <span style={{
        padding: '2px 8px', borderRadius: 12, fontSize: 11,
        background: vuln.status === 'resolved' ? '#10b98122' : '#f59e0b22',
        color: vuln.status === 'resolved' ? '#10b981' : '#f59e0b'
      }}>{vuln.status || 'open'}</span>
      {vuln.status !== 'resolved' && (
        <button onClick={() => onPatch(vuln.id)} style={{
          padding: '4px 10px', borderRadius: 6, background: '#6366f1',
          border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer'
        }}>Patch</button>
      )}
    </div>
  );
}

function NetworkIssueRow({ issue }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid #1e293b' }}>
      <span style={{ color: SEVERITY_COLOR[issue.severity] || '#64748b' }}>{SEVERITY_ICON[issue.severity]}</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#e2e8f0', fontSize: 13 }}>{issue.type}</div>
        <div style={{ color: '#64748b', fontSize: 11 }}>{issue.details}</div>
      </div>
      <span style={{ color: '#64748b', fontSize: 11 }}>{new Date(issue.timestamp).toLocaleTimeString()}</span>
    </div>
  );
}

function ScanProgress({ active, phase }) {
  return active ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      background: '#0f172a', borderRadius: 8, marginBottom: 16, border: '1px solid #334155' }}>
      <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6',
        animation: 'pulse 1s infinite' }} />
      <span style={{ color: '#94a3b8', fontSize: 13 }}>
        Scanning: <span style={{ color: '#60a5fa' }}>{phase}</span>
      </span>
    </div>
  ) : null;
}

function EncryptionStatus({ data }) {
  if (!data) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
      {[
        { label: 'Algorithm', value: data.algorithm, color: '#10b981' },
        { label: 'Key Length', value: `${data.keyLength || 256} bit`, color: '#3b82f6' },
        { label: 'Status', value: data.status, color: '#10b981' }
      ].map(({ label, value, color }) => (
        <div key={label} style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
          <div style={{ color, fontWeight: 700, fontSize: 14, marginTop: 4 }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

const SCAN_PHASES = [
  'Initializing scan engines',
  'Checking dependencies',
  'Auditing authentication',
  'Scanning network interfaces',
  'Checking encryption integrity',
  'Analysing stored data',
  'Verifying TLS certificates',
  'Checking rate limits',
  'Scanning for secrets exposure',
  'Finalising report'
];

export default function SecurityDashboardEnhanced() {
  const [dashboard, setDashboard] = useState(null);
  const [encryption, setEncryption] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState('');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const phaseInterval = useRef(null);
  const pollInterval = useRef(null);

  const headers = useCallback(() => {
    const token = sessionStorage.getItem('nexus_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [dashRes, encRes, alertsRes] = await Promise.all([
        fetch('/api/security/dashboard', { headers: headers() }),
        fetch('/api/security/encryption-health', { headers: headers() }),
        fetch('/api/security/alerts', { headers: headers() })
      ]);
      if (dashRes.ok)   setDashboard(await dashRes.json());
      if (encRes.ok)    setEncryption(await encRes.json());
      if (alertsRes.ok) setAlerts((await alertsRes.json()).alerts || []);
      setLastUpdated(new Date());
      setError('');
    } catch (e) {
      setError(`Failed to fetch security data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchAll();
    pollInterval.current = setInterval(fetchAll, 15_000);
    return () => clearInterval(pollInterval.current);
  }, [fetchAll]);

  async function runScan() {
    setScanning(true);
    let phaseIdx = 0;
    setScanPhase(SCAN_PHASES[0]);
    phaseInterval.current = setInterval(() => {
      phaseIdx = (phaseIdx + 1) % SCAN_PHASES.length;
      setScanPhase(SCAN_PHASES[phaseIdx]);
    }, 700);

    try {
      const res = await fetch('/api/security/scan', {
        method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        await fetchAll();
      } else {
        const d = await res.json();
        setError(d.error || 'Scan failed');
      }
    } catch (e) {
      setError(`Scan error: ${e.message}`);
    } finally {
      clearInterval(phaseInterval.current);
      setScanning(false);
      setScanPhase('');
    }
  }

  async function patchVulnerability(vulnId) {
    try {
      await fetch('/api/security/patch', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ vulnId })
      });
      await fetchAll();
    } catch (e) {
      setError(`Patch failed: ${e.message}`);
    }
  }

  async function rotateKeys() {
    try {
      const res = await fetch('/api/security/rotate-keys', {
        method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' }
      });
      if (res.ok) await fetchAll();
    } catch (e) {
      setError(`Key rotation failed: ${e.message}`);
    }
  }

  const vulnerabilities = dashboard?.vulnerabilities || [];
  const threats         = dashboard?.threats || [];
  const networkIssues   = alerts.filter(a => a.event?.includes('NETWORK') || a.event?.includes('BLOCKED'));
  const deviceIssues    = alerts.filter(a => a.event?.includes('DEVICE') || a.event?.includes('ERROR'));

  return (
    <div style={{ color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🔒 Security Dashboard</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Real-time threat monitoring & vulnerability management
            {lastUpdated && <span> · {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={runScan} disabled={scanning} style={{
            padding: '8px 18px', borderRadius: 8, background: scanning ? '#334155' : '#6366f1',
            border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: scanning ? 'not-allowed' : 'pointer'
          }}>
            {scanning ? '⏳ Scanning...' : '🔍 Run Scan'}
          </button>
          <button onClick={rotateKeys} style={{
            padding: '8px 18px', borderRadius: 8, background: 'transparent',
            border: '1.5px solid #334155', color: '#94a3b8', fontWeight: 600, fontSize: 13, cursor: 'pointer'
          }}>🔑 Rotate Keys</button>
          <button onClick={fetchAll} style={{
            padding: '8px 14px', borderRadius: 8, background: 'transparent',
            border: '1.5px solid #334155', color: '#94a3b8', fontSize: 13, cursor: 'pointer'
          }}>↻</button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>
          {error}
        </div>
      )}

      <ScanProgress active={scanning} phase={scanPhase} />

      {/* Score + counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, background: '#1e293b', borderRadius: 14, padding: 24, marginBottom: 20, border: '1px solid #334155' }}>
        <ScoreGauge score={dashboard?.overallScore || 0} />
        <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
          <AlertBadge count={vulnerabilities.filter(v => v.severity === 'critical').length} label="Critical" color="#ef4444" />
          <AlertBadge count={vulnerabilities.filter(v => v.severity === 'high').length} label="High" color="#f97316" />
          <AlertBadge count={vulnerabilities.filter(v => v.severity === 'medium').length} label="Medium" color="#f59e0b" />
          <AlertBadge count={threats.length} label="Threats Blocked" color="#10b981" />
          <AlertBadge count={networkIssues.length} label="Network Issues" color="#3b82f6" />
          <AlertBadge count={deviceIssues.length} label="Device Issues" color="#8b5cf6" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Vulnerabilities */}
        <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155' }}>
          <div style={{ padding: '16px 14px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>🛡️ Vulnerabilities ({vulnerabilities.length})</span>
          </div>
          {vulnerabilities.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#10b981' }}>✓ No vulnerabilities found</div>
          ) : (
            vulnerabilities.map(v => <VulnerabilityRow key={v.id} vuln={v} onPatch={patchVulnerability} />)
          )}
        </div>

        {/* Threats */}
        <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155' }}>
          <div style={{ padding: '16px 14px', borderBottom: '1px solid #334155' }}>
            <span style={{ fontWeight: 700 }}>⚡ Recent Threats ({threats.length})</span>
          </div>
          {threats.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#10b981' }}>✓ No threats detected</div>
          ) : (
            threats.map((t, i) => <NetworkIssueRow key={i} issue={{ type: t.event, details: `Status: ${t.status}`, severity: 'high', timestamp: t.timestamp }} />)
          )}
        </div>
      </div>

      {/* Network Issues */}
      <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', marginBottom: 20 }}>
        <div style={{ padding: '16px 14px', borderBottom: '1px solid #334155' }}>
          <span style={{ fontWeight: 700 }}>🌐 Network Issue Detection ({networkIssues.length})</span>
        </div>
        {networkIssues.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#10b981' }}>✓ Network healthy</div>
        ) : (
          networkIssues.map((issue, i) => (
            <NetworkIssueRow key={i} issue={{
              type: issue.event, details: JSON.stringify(issue.details || {}),
              severity: 'medium', timestamp: issue.timestamp
            }} />
          ))
        )}
      </div>

      {/* Encryption Status */}
      <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', padding: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>🔐 Encryption Health</div>
        <div style={{ color: '#64748b', fontSize: 12 }}>
          Last key rotation: {encryption?.lastKeyRotation
            ? new Date(encryption.lastKeyRotation).toLocaleString()
            : 'Unknown'}
          {' · '}Next: {encryption?.nextKeyRotation
            ? new Date(encryption.nextKeyRotation).toLocaleString()
            : 'Unknown'}
        </div>
        <EncryptionStatus data={encryption} />
      </div>

      {loading && !dashboard && (
        <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading security dashboard...</div>
      )}
    </div>
  );
}
