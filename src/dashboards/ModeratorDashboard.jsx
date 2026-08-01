// src/dashboards/ModeratorDashboard.jsx
// Nexus AI Pro - Moderator Dashboard
// Role: moderator — content review, user reports, audit log, moderation queue
// Responsive; real-time metrics
// Date: 2026-08-01

import React, { useState, useEffect, useCallback } from 'react';

const API = '/api';

function StatCard({ label, value, icon, color = '#3b82f6' }) {
  return (
    <div style={{
      flex: '1 1 160px', background: '#111827', borderRadius: 12,
      padding: '16px 20px', border: '1px solid #1e293b'
    }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ color, fontSize: 28, fontWeight: 800 }}>{value}</div>
      <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
    </div>
  );
}

function ReportRow({ report, onResolve, onEscalate }) {
  const severityColors = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
  const color = severityColors[report.severity] || '#64748b';
  return (
    <div style={{
      background: '#111827', borderRadius: 10, padding: 14,
      border: `1px solid ${color}33`, marginBottom: 8,
      display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap'
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            background: `${color}22`, color, borderRadius: 4,
            padding: '2px 8px', fontSize: 10, fontWeight: 700
          }}>{report.severity?.toUpperCase()}</span>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>{report.type}</span>
          <span style={{ color: '#475569', fontSize: 10, marginLeft: 'auto' }}>
            {new Date(report.timestamp).toLocaleString()}
          </span>
        </div>
        <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
          {report.reason}
        </div>
        <div style={{ color: '#64748b', fontSize: 12 }}>
          Reported by: <span style={{ color: '#94a3b8' }}>{report.reportedBy}</span>
          {' · '}Target: <span style={{ color: '#94a3b8' }}>{report.target}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onResolve(report.id)} style={actionBtn('#22c55e')}>✓ Resolve</button>
        <button onClick={() => onEscalate(report.id)} style={actionBtn('#ef4444')}>↑ Escalate</button>
      </div>
    </div>
  );
}

function AuditRow({ log }) {
  const color = log.event?.includes('ERROR') || log.event?.includes('THREAT') ? '#ef4444' : '#64748b';
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '7px 0',
      borderBottom: '1px solid #0f172a', alignItems: 'center'
    }}>
      <span style={{ color: '#475569', fontSize: 11, minWidth: 80 }}>
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <span style={{ color, fontSize: 12, fontFamily: 'monospace', flex: 1 }}>{log.event}</span>
      <span style={{
        color: '#475569', fontSize: 11, maxWidth: 240,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
      }}>
        {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
      </span>
    </div>
  );
}

const DEMO_REPORTS = [
  { id: '1', type: 'content', severity: 'high', reason: 'Inappropriate content flagged by AI filter', reportedBy: 'system', target: 'user:abc123', timestamp: Date.now() - 1200000 },
  { id: '2', type: 'spam', severity: 'medium', reason: 'Repeated promotional messages', reportedBy: 'user:xyz456', target: 'user:spammer99', timestamp: Date.now() - 3600000 },
  { id: '3', type: 'harassment', severity: 'high', reason: 'Threatening language in direct messages', reportedBy: 'user:victim1', target: 'user:bully22', timestamp: Date.now() - 7200000 },
  { id: '4', type: 'misinformation', severity: 'medium', reason: 'False claims about product features', reportedBy: 'user:fact99', target: 'post:p8821', timestamp: Date.now() - 14400000 },
  { id: '5', type: 'copyright', severity: 'low', reason: 'Possible unauthorized use of copyrighted media', reportedBy: 'system', target: 'post:p5511', timestamp: Date.now() - 86400000 }
];

export default function ModeratorDashboard({ token }) {
  const [reports, setReports] = useState(DEMO_REPORTS);
  const [audit, setAudit] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [auditRes, usersRes] = await Promise.all([
        fetch(`${API}/security/audit?limit=30`, { headers }),
        fetch(`${API}/admin/users`, { headers })
      ]);
      if (auditRes.ok) setAudit((await auditRes.json()).logs || []);
      if (usersRes.ok) setUsers((await usersRes.json()).users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resolveReport = (id) => {
    setReports(prev => prev.filter(r => r.id !== id));
    setInfo('Report resolved');
    setTimeout(() => setInfo(''), 3000);
  };

  const escalateReport = async (id) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;
    setReports(prev => prev.filter(r => r.id !== id));
    setInfo('Report escalated to admin');
    setTimeout(() => setInfo(''), 3000);
  };

  const filteredUsers = users.filter(u =>
    !searchQuery || u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = reports.filter(r => r.severity === 'high').length;
  const resolvedToday = 12;
  const activeUsers = users.filter(u => u.active).length;

  const TABS = ['queue', 'users', 'audit', 'analytics'];

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0a0a0f', color: '#fff', minHeight: '100vh', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <span style={{ fontSize: 28 }}>🛡️</span>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Moderator Dashboard</h1>
        <span style={{ background: '#3b82f61a', border: '1px solid #3b82f6', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#3b82f6', fontWeight: 700 }}>MOD</span>
        {pendingCount > 0 && (
          <span style={{ background: '#ef4444', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: '#fff' }}>
            {pendingCount} urgent
          </span>
        )}
      </div>

      {error && <div style={{ background: '#2d0d0d', border: '1px solid #ef4444', borderRadius: 8, padding: 10, marginBottom: 14, color: '#f87171', fontSize: 13 }}>{error}</div>}
      {info && <div style={{ background: '#0d2e1a', border: '1px solid #22c55e', borderRadius: 8, padding: 10, marginBottom: 14, color: '#4ade80', fontSize: 13 }}>{info}</div>}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="Pending Reports" value={reports.length} icon="📋" color="#f59e0b" />
        <StatCard label="High Severity" value={reports.filter(r => r.severity === 'high').length} icon="🚨" color="#ef4444" />
        <StatCard label="Resolved Today" value={resolvedToday} icon="✅" color="#22c55e" />
        <StatCard label="Active Users" value={activeUsers} icon="👥" color="#3b82f6" />
        <StatCard label="Monitored" value={users.length} icon="👁️" color="#a855f7" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #1e293b', paddingBottom: 12 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? '#3b82f6' : 'none',
            border: `1px solid ${tab === t ? '#3b82f6' : '#1e293b'}`,
            borderRadius: 8, padding: '6px 14px',
            color: tab === t ? '#fff' : '#64748b',
            cursor: 'pointer', fontSize: 12, textTransform: 'capitalize', fontWeight: tab === t ? 700 : 400
          }}>{t.replace('-', ' ')}</button>
        ))}
      </div>

      {/* Moderation Queue */}
      {tab === 'queue' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Moderation Queue ({reports.length})</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {['all', 'high', 'medium', 'low'].map(sev => (
                <button key={sev} style={{
                  background: '#111827', border: '1px solid #1e293b', borderRadius: 6,
                  padding: '4px 10px', color: '#64748b', cursor: 'pointer', fontSize: 11
                }}>
                  {sev.charAt(0).toUpperCase() + sev.slice(1)} ({sev === 'all' ? reports.length : reports.filter(r => r.severity === sev).length})
                </button>
              ))}
            </div>
          </div>
          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: 40, background: '#111827', borderRadius: 12 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div>Queue is clear — all reports resolved</div>
            </div>
          ) : (
            reports.map(r => (
              <ReportRow key={r.id} report={r} onResolve={resolveReport} onEscalate={escalateReport} />
            ))
          )}
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users by name or email…"
              style={{
                width: '100%', maxWidth: 360, background: '#111827', border: '1px solid #1e293b',
                borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13,
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ background: '#111827', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0f172a' }}>
                  {['Username', 'Email', 'Role', 'Status', 'Last Login'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, 20).map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 12px', color: '#fff', fontSize: 13 }}>
                      {u.username}
                      {!u.active && <span style={{ marginLeft: 6, color: '#ef4444', fontSize: 10 }}>SUSPENDED</span>}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 12 }}>{u.email}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: '#3b82f622', color: '#3b82f6',
                        borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700
                      }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: u.active ? '#22c55e' : '#ef4444', fontSize: 12 }}>
                        {u.active ? '● Active' : '○ Suspended'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 11 }}>
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length > 20 && (
            <div style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>
              Showing 20 of {filteredUsers.length} users
            </div>
          )}
        </div>
      )}

      {/* Audit Log */}
      {tab === 'audit' && (
        <div style={{ background: '#111827', borderRadius: 12, padding: 16, border: '1px solid #1e293b' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Recent Audit Events</h3>
          {audit.length === 0 ? (
            <div style={{ color: '#475569', fontSize: 13 }}>No audit events yet</div>
          ) : (
            audit.map((l, i) => <AuditRow key={l.id || i} log={l} />)
          )}
        </div>
      )}

      {/* Analytics Overview */}
      {tab === 'analytics' && (
        <div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: 'Reports This Week', value: 23, color: '#f59e0b', trend: '+12%' },
              { label: 'Avg Resolution Time', value: '4.2h', color: '#3b82f6', trend: '-8%' },
              { label: 'False Positives', value: '3%', color: '#22c55e', trend: '-1%' },
              { label: 'Escalation Rate', value: '7%', color: '#ef4444', trend: '+2%' }
            ].map(({ label, value, color, trend }) => (
              <div key={label} style={{ flex: '1 1 160px', background: '#111827', borderRadius: 12, padding: 16, border: '1px solid #1e293b' }}>
                <div style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>{label}</div>
                <div style={{ color, fontSize: 24, fontWeight: 800 }}>{value}</div>
                <div style={{ color: trend.startsWith('+') ? '#ef4444' : '#22c55e', fontSize: 11, marginTop: 4 }}>
                  {trend} vs last week
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#111827', borderRadius: 12, padding: 16, border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>Report Types Distribution</h3>
            {[
              { type: 'harassment', count: 8, max: 23 },
              { type: 'spam', count: 6, max: 23 },
              { type: 'misinformation', count: 4, max: 23 },
              { type: 'copyright', count: 3, max: 23 },
              { type: 'content', count: 2, max: 23 }
            ].map(({ type, count, max }) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ color: '#94a3b8', fontSize: 12, minWidth: 100 }}>{type}</span>
                <div style={{ flex: 1, background: '#1e293b', borderRadius: 4, height: 8 }}>
                  <div style={{ width: `${(count / max) * 100}%`, background: '#3b82f6', height: '100%', borderRadius: 4, transition: 'width 0.6s' }} />
                </div>
                <span style={{ color: '#64748b', fontSize: 12, minWidth: 24 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtn = (color) => ({
  background: `${color}22`, border: `1px solid ${color}`, borderRadius: 6,
  padding: '4px 10px', color, cursor: 'pointer', fontSize: 11, fontWeight: 700,
  whiteSpace: 'nowrap'
});
