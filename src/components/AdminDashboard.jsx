// Nexus AI Pro - AdminDashboard | 2026-10-12
import { useState, useEffect, useCallback } from 'react';

const ROLE_OPTIONS = ['user', 'moderator', 'developer', 'admin'];

function useAdminData(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { credentials: 'include' });
      if (res.status === 401 || res.status === 403) throw new Error('Unauthorized');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setData(d);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

function MetricGauge({ label, value, max = 100, unit = '%' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const color = pct > 85 ? 'bg-red-500' : pct > 60 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold">{value}{unit}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function UserRow({ user, onBan, onUnban, onChangeRole }) {
  const [newRole, setNewRole] = useState(user.role);

  return (
    <tr className="border-b border-gray-700/50 hover:bg-gray-700/20">
      <td className="py-2 pr-3 text-sm">{user.username}</td>
      <td className="py-2 pr-3 text-xs text-gray-400 max-w-[160px] truncate">{user.email}</td>
      <td className="py-2 pr-3">
        <select
          value={newRole}
          onChange={e => setNewRole(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-xs text-white focus:border-blue-500 focus:outline-none"
          aria-label={`Change role for ${user.username}`}
        >
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {newRole !== user.role && (
          <button
            onClick={() => onChangeRole(user.id, newRole)}
            className="ml-1 text-xs text-blue-400 hover:text-blue-300"
            aria-label={`Save role change for ${user.username}`}
          >
            Save
          </button>
        )}
      </td>
      <td className="py-2 pr-3">
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${user.banned ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
          {user.banned ? 'Banned' : 'Active'}
        </span>
      </td>
      <td className="py-2">
        <div className="flex gap-1">
          {user.banned ? (
            <button
              onClick={() => onUnban(user.id)}
              className="text-xs px-2 py-0.5 bg-green-900/50 hover:bg-green-900 text-green-300 border border-green-700 rounded transition-colors"
              aria-label={`Unban ${user.username}`}
            >
              Unban
            </button>
          ) : (
            <button
              onClick={() => onBan(user.id)}
              className="text-xs px-2 py-0.5 bg-red-900/50 hover:bg-red-900 text-red-300 border border-red-700 rounded transition-colors"
              aria-label={`Ban ${user.username}`}
            >
              Ban
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function ApiKeyRow({ apiKey, onRevoke }) {
  return (
    <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
      <div>
        <div className="text-sm font-medium">{apiKey.name}</div>
        <div className="text-xs text-gray-400 font-mono mt-0.5">••••••••••••{apiKey.lastFour}</div>
        <div className="text-xs text-gray-500 mt-0.5">Created {new Date(apiKey.createdAt).toLocaleDateString()}</div>
      </div>
      <button
        onClick={() => onRevoke(apiKey.id)}
        className="text-xs px-3 py-1 bg-red-900/50 hover:bg-red-900 text-red-300 border border-red-700 rounded transition-colors"
        aria-label={`Revoke API key ${apiKey.name}`}
      >
        Revoke
      </button>
    </div>
  );
}

export default function AdminDashboard({ jwtRole }) {
  const [activeTab, setActiveTab] = useState('system');
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditDateFrom, setAuditDateFrom] = useState('');
  const [auditDateTo, setAuditDateTo] = useState('');
  const [apiKeys, setApiKeys] = useState([]);
  const [featureFlags, setFeatureFlags] = useState({});
  const [sessions, setSessions] = useState([]);
  const [rateLimits, setRateLimits] = useState({});
  const [healthData, setHealthData] = useState(null);
  const [actionError, setActionError] = useState(null);

  const { data: systemData, loading: sysLoading, error: sysError, refetch: refetchSystem } = useAdminData('/api/admin/system');

  const isAdmin = jwtRole === 'admin';

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users', { credentials: 'include' });
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users ?? d);
    }
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (auditDateFrom) params.set('from', auditDateFrom);
    if (auditDateTo) params.set('to', auditDateTo);
    const res = await fetch(`/api/admin/audit-logs?${params}`, { credentials: 'include' });
    if (res.ok) {
      const d = await res.json();
      setAuditLogs(d.logs ?? d);
    }
  }, [auditDateFrom, auditDateTo]);

  const fetchApiKeys = useCallback(async () => {
    const res = await fetch('/api/admin/api-keys', { credentials: 'include' });
    if (res.ok) {
      const d = await res.json();
      setApiKeys(d.keys ?? d);
    }
  }, []);

  const fetchFeatureFlags = useCallback(async () => {
    const res = await fetch('/api/admin/feature-flags', { credentials: 'include' });
    if (res.ok) {
      const d = await res.json();
      setFeatureFlags(d.flags ?? d);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    const res = await fetch('/api/admin/sessions', { credentials: 'include' });
    if (res.ok) {
      const d = await res.json();
      setSessions(d.sessions ?? d);
    }
  }, []);

  const fetchRateLimits = useCallback(async () => {
    const res = await fetch('/api/admin/rate-limits', { credentials: 'include' });
    if (res.ok) {
      const d = await res.json();
      setRateLimits(d.limits ?? d);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    const res = await fetch('/api/admin/health', { credentials: 'include' });
    if (res.ok) {
      const d = await res.json();
      setHealthData(d);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'audit') fetchAuditLogs();
    if (activeTab === 'apikeys') fetchApiKeys();
    if (activeTab === 'flags') fetchFeatureFlags();
    if (activeTab === 'sessions') { fetchSessions(); fetchHealth(); }
    if (activeTab === 'ratelimits') fetchRateLimits();
  }, [activeTab, isAdmin, fetchUsers, fetchAuditLogs, fetchApiKeys, fetchFeatureFlags, fetchSessions, fetchHealth, fetchRateLimits]);

  const adminAction = useCallback(async (url, method = 'POST', body) => {
    setActionError(null);
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.message ?? `HTTP ${res.status}`);
      return false;
    }
    return true;
  }, []);

  const banUser = async (id) => {
    if (!window.confirm('Ban this user?')) return;
    const ok = await adminAction(`/api/admin/users/${id}/ban`);
    if (ok) setUsers(prev => prev.map(u => u.id === id ? { ...u, banned: true } : u));
  };

  const unbanUser = async (id) => {
    const ok = await adminAction(`/api/admin/users/${id}/unban`);
    if (ok) setUsers(prev => prev.map(u => u.id === id ? { ...u, banned: false } : u));
  };

  const changeRole = async (id, role) => {
    const ok = await adminAction(`/api/admin/users/${id}/role`, 'PUT', { role });
    if (ok) setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const revokeApiKey = async (id) => {
    if (!window.confirm('Revoke this API key? This cannot be undone.')) return;
    const ok = await adminAction(`/api/admin/api-keys/${id}/revoke`, 'DELETE');
    if (ok) setApiKeys(prev => prev.filter(k => k.id !== id));
  };

  const toggleFlag = async (flag, currentValue) => {
    const ok = await adminAction(`/api/admin/feature-flags/${flag}`, 'PUT', { enabled: !currentValue });
    if (ok) setFeatureFlags(prev => ({ ...prev, [flag]: !currentValue }));
  };

  const saveRateLimit = async (key, value) => {
    await adminAction(`/api/admin/rate-limits`, 'PUT', { key, value });
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 text-white" role="alert">
        <div className="text-center">
          <div className="text-4xl mb-3">🔒</div>
          <div className="text-lg font-bold">Admin Access Required</div>
          <div className="text-gray-400 text-sm mt-1">You must have the admin role to view this page.</div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'system', label: 'System' },
    { id: 'users', label: 'Users' },
    { id: 'audit', label: 'Audit Log' },
    { id: 'apikeys', label: 'API Keys' },
    { id: 'flags', label: 'Feature Flags' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'ratelimits', label: 'Rate Limits' },
  ];

  return (
    <main className="p-4 md:p-6 text-white min-h-screen bg-gray-900" aria-label="Admin Dashboard">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      {actionError && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm" role="alert">
          {actionError}
        </div>
      )}

      <nav className="flex gap-1 border-b border-gray-700 mb-5 overflow-x-auto" aria-label="Admin sections">
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

      {activeTab === 'system' && (
        <section aria-label="System metrics">
          {sysLoading && <div className="text-gray-400 animate-pulse">Loading system metrics...</div>}
          {sysError && <div className="text-red-400 text-sm">{sysError}</div>}
          {systemData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <MetricGauge label="CPU Usage" value={systemData.cpu?.usage ?? 0} />
                <MetricGauge label="Memory" value={systemData.memory?.usedPercent ?? 0} />
                <MetricGauge label="Disk" value={systemData.disk?.usedPercent ?? 0} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Uptime', systemData.uptime],
                  ['Node Version', systemData.nodeVersion],
                  ['Platform', systemData.platform],
                  ['Total Requests', systemData.totalRequests?.toLocaleString()],
                ].map(([label, val]) => (
                  <div key={label} className="bg-gray-800 rounded-xl p-3">
                    <div className="text-gray-400 text-xs">{label}</div>
                    <div className="text-sm font-semibold mt-1">{val ?? '—'}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={refetchSystem}
                className="mt-4 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition-colors"
                aria-label="Refresh system metrics"
              >
                Refresh
              </button>
            </>
          )}
        </section>
      )}

      {activeTab === 'users' && (
        <section aria-label="User management">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Users ({users.length})</h2>
            <button onClick={fetchUsers} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-xs rounded-lg transition-colors">Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table" aria-label="User list">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700 text-left">
                  <th className="py-2 pr-3 font-medium" scope="col">Username</th>
                  <th className="py-2 pr-3 font-medium" scope="col">Email</th>
                  <th className="py-2 pr-3 font-medium" scope="col">Role</th>
                  <th className="py-2 pr-3 font-medium" scope="col">Status</th>
                  <th className="py-2 font-medium" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <UserRow key={user.id} user={user} onBan={banUser} onUnban={unbanUser} onChangeRole={changeRole} />
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="py-4 text-center text-gray-500">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'audit' && (
        <section aria-label="Audit log">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1" htmlFor="audit-from">From</label>
              <input
                id="audit-from"
                type="date"
                value={auditDateFrom}
                onChange={e => setAuditDateFrom(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1" htmlFor="audit-to">To</label>
              <input
                id="audit-to"
                type="date"
                value={auditDateTo}
                onChange={e => setAuditDateTo(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button onClick={fetchAuditLogs} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-sm rounded-lg transition-colors">
              Filter
            </button>
          </div>
          <div className="space-y-2">
            {auditLogs.map((log, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3 flex gap-3">
                <div className="text-gray-500 text-xs font-mono flex-shrink-0 pt-0.5">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
                <div>
                  <div className="text-sm"><span className="text-blue-300">{log.user}</span> · {log.action}</div>
                  {log.details && <div className="text-xs text-gray-400 mt-0.5">{log.details}</div>}
                </div>
              </div>
            ))}
            {auditLogs.length === 0 && (
              <div className="text-center text-gray-500 py-8">No audit logs found</div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'apikeys' && (
        <section aria-label="API key management">
          <h2 className="font-semibold mb-3">API Keys</h2>
          <p className="text-xs text-gray-400 mb-3">Only the last 4 characters of each key are shown.</p>
          <div className="space-y-2">
            {apiKeys.map(key => (
              <ApiKeyRow key={key.id} apiKey={key} onRevoke={revokeApiKey} />
            ))}
            {apiKeys.length === 0 && (
              <div className="text-center text-gray-500 py-8">No API keys found</div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'flags' && (
        <section aria-label="Feature flags">
          <h2 className="font-semibold mb-3">Feature Flags</h2>
          <div className="space-y-2">
            {Object.entries(featureFlags).map(([flag, enabled]) => (
              <div key={flag} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                <div>
                  <div className="text-sm font-medium">{flag}</div>
                  <div className={`text-xs mt-0.5 ${enabled ? 'text-green-400' : 'text-gray-500'}`}>
                    {enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <button
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Toggle feature flag ${flag}`}
                  onClick={() => toggleFlag(flag, enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-600' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            ))}
            {Object.keys(featureFlags).length === 0 && (
              <div className="text-center text-gray-500 py-8">No feature flags found</div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'sessions' && (
        <section aria-label="Active sessions and platform health">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h2 className="font-semibold mb-3">Active Sessions ({sessions.length})</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sessions.map((session, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{session.username}</span>
                      <span className="text-xs text-gray-400">{session.role}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{session.ip} · {session.userAgent?.slice(0, 40)}</div>
                  </div>
                ))}
                {sessions.length === 0 && <div className="text-gray-500 text-sm py-4 text-center">No active sessions</div>}
              </div>
            </div>
            {healthData && (
              <div>
                <h2 className="font-semibold mb-3">Platform Health</h2>
                <div className="space-y-2">
                  {Object.entries(healthData).map(([service, status]) => (
                    <div key={service} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                      <span className="text-sm capitalize">{service}</span>
                      <span className={`text-xs font-medium ${status === 'healthy' || status === 'ok' ? 'text-green-400' : status === 'degraded' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === 'ratelimits' && (
        <section aria-label="Rate limit configuration">
          <h2 className="font-semibold mb-3">Rate Limits</h2>
          <div className="space-y-3">
            {Object.entries(rateLimits).map(([key, config]) => (
              <RateLimitRow key={key} name={key} config={config} onSave={saveRateLimit} />
            ))}
            {Object.keys(rateLimits).length === 0 && (
              <div className="text-center text-gray-500 py-8">No rate limit configuration found</div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function RateLimitRow({ name, config, onSave }) {
  const [value, setValue] = useState(config.limit ?? config);
  const dirty = value !== (config.limit ?? config);

  return (
    <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
      <div className="flex-1 text-sm font-medium">{name}</div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400" htmlFor={`rl-${name}`}>Limit/min</label>
        <input
          id={`rl-${name}`}
          type="number"
          min={0}
          value={value}
          onChange={e => setValue(Number(e.target.value))}
          className="w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
        />
        {dirty && (
          <button
            onClick={() => onSave(name, value)}
            className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded transition-colors"
            aria-label={`Save rate limit for ${name}`}
          >
            Save
          </button>
        )}
      </div>
    </div>
  );
}
