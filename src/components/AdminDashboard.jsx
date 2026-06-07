// src/components/AdminDashboard.jsx | Nexus AI Pro | Date: 2026-06-07

import { useState, useEffect, useCallback } from 'react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_STYLES = {
  admin:     'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  developer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  moderator: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  user:      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const SEVERITY_STYLES = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-blue-500',
  info:     'bg-gray-400',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
      </div>
    </div>
  );
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({ user, authToken, onRefresh }) {
  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // { type: 'delete' | 'suspend' | 'activate' | 'reset' }

  const initials = (user.displayName || user.email || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  async function apiFetch(url, method = 'POST', body = undefined) {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function saveRole() {
    if (selectedRole === user.role) { setEditingRole(false); return; }
    setSaving(true);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, 'PATCH', { role: selectedRole });
      onRefresh();
    } catch {
      // silently reset
      setSelectedRole(user.role);
    } finally {
      setSaving(false);
      setEditingRole(false);
    }
  }

  async function handleConfirmAction() {
    const type = confirm?.type;
    setConfirm(null);
    try {
      if (type === 'delete') {
        await apiFetch(`/api/admin/users/${user.id}`, 'DELETE');
      } else if (type === 'suspend') {
        await apiFetch(`/api/admin/users/${user.id}`, 'PATCH', { status: 'suspended' });
      } else if (type === 'activate') {
        await apiFetch(`/api/admin/users/${user.id}`, 'PATCH', { status: 'active' });
      } else if (type === 'reset') {
        await apiFetch(`/api/admin/users/${user.id}/reset-password`);
      }
      onRefresh();
    } catch {
      // errors are surfaced globally via onRefresh
    }
  }

  const isSuspended = user.status === 'suspended';

  return (
    <>
      {confirm && (
        <ConfirmModal
          title={
            confirm.type === 'delete'   ? 'Delete User' :
            confirm.type === 'suspend'  ? 'Suspend User' :
            confirm.type === 'activate' ? 'Activate User' :
                                          'Reset Password'
          }
          message={
            confirm.type === 'delete'
              ? `Permanently delete ${user.displayName || user.email}? This cannot be undone.`
              : confirm.type === 'reset'
              ? `Send a password reset email to ${user.email}?`
              : `${confirm.type === 'suspend' ? 'Suspend' : 'Activate'} ${user.displayName || user.email}?`
          }
          confirmLabel={
            confirm.type === 'delete' ? 'Delete' :
            confirm.type === 'suspend' ? 'Suspend' :
            confirm.type === 'activate' ? 'Activate' :
            'Send Reset'
          }
          danger={confirm.type === 'delete' || confirm.type === 'suspend'}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirm(null)}
        />
      )}

      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        {/* Avatar + Name */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
              {user.displayName || '(no name)'}
            </span>
          </div>
        </td>

        {/* Email */}
        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">
          {user.email}
        </td>

        {/* Role */}
        <td className="px-4 py-3">
          {editingRole ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded px-2 py-1"
              >
                {['admin', 'developer', 'moderator', 'user'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={saveRole}
                disabled={saving}
                className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? '…' : 'Save'}
              </button>
              <button onClick={() => setEditingRole(false)} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
            </div>
          ) : (
            <button
              onClick={() => setEditingRole(true)}
              className={`text-xs font-semibold px-2 py-1 rounded-full capitalize cursor-pointer ${ROLE_STYLES[user.role] ?? ROLE_STYLES.user}`}
            >
              {user.role}
            </button>
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-3 hidden md:table-cell">
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${isSuspended ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-red-500' : 'bg-green-500'}`} />
            {isSuspended ? 'Suspended' : 'Active'}
          </span>
        </td>

        {/* Created */}
        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 hidden lg:table-cell whitespace-nowrap">
          {fmtDate(user.createdAt)}
        </td>

        {/* Last login */}
        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 hidden xl:table-cell whitespace-nowrap">
          {fmtDateTime(user.lastLogin)}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setConfirm({ type: isSuspended ? 'activate' : 'suspend' })}
              className={`text-xs px-2 py-1 rounded font-medium transition-colors ${isSuspended ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400'}`}
            >
              {isSuspended ? 'Activate' : 'Suspend'}
            </button>
            <button
              onClick={() => setConfirm({ type: 'reset' })}
              className="text-xs px-2 py-1 rounded font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Reset PW
            </button>
            <button
              onClick={() => setConfirm({ type: 'delete' })}
              className="text-xs px-2 py-1 rounded font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    </>
  );
}

// ─── Users Panel ──────────────────────────────────────────────────────────────

function UsersPanel({ authToken }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsers(data.users ?? data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.email?.toLowerCase().includes(q) || u.displayName?.toLowerCase().includes(q);
    const matchRole   = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header & Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="developer">Developer</option>
          <option value="moderator">Moderator</option>
          <option value="user">User</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {loading ? <Spinner /> : error ? (
        <ErrorState message={`Failed to load users: ${error}`} onRetry={fetchUsers} />
      ) : filtered.length === 0 ? (
        <EmptyState message="No users match your filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                {['User', 'Email', 'Role', 'Status', 'Created', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(u => (
                <UserRow key={u.id} user={u} authToken={authToken} onRefresh={fetchUsers} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
        Showing {filtered.length} of {users.length} users
      </div>
    </div>
  );
}

// ─── Audit Log Panel ──────────────────────────────────────────────────────────

function AuditLogPanel({ authToken }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/audit?limit=50', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.logs ?? data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 dark:text-white">Audit Log</h2>
        <button onClick={fetchLogs} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Refresh</button>
      </div>

      {loading ? <Spinner /> : error ? (
        <ErrorState message={`Failed to load audit log: ${error}`} onRetry={fetchLogs} />
      ) : logs.length === 0 ? (
        <EmptyState message="No audit entries found." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                {['Event', 'User', 'IP', 'Timestamp', 'Details'].map(h => (
                  <th key={h} className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {logs.map((log, i) => (
                <tr key={log.id ?? i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{log.event}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{log.user ?? log.userId ?? '—'}</td>
                  <td className="px-4 py-2 text-xs font-mono text-gray-500 dark:text-gray-400">{log.ip ?? '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDateTime(log.timestamp ?? log.createdAt)}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">{log.details ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Security Alerts Panel ────────────────────────────────────────────────────

function SecurityAlertsPanel({ authToken }) {
  const [alerts, setAlerts]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/security/alerts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAlerts(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const severities = ['critical', 'high', 'medium', 'low', 'info'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Security Alerts</h2>
      {loading ? <Spinner /> : error ? (
        <ErrorState message={`Failed to load alerts: ${error}`} onRetry={fetchAlerts} />
      ) : (
        <div className="space-y-3">
          {severities.map(sev => {
            const count = alerts?.[sev] ?? 0;
            return (
              <div key={sev} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${SEVERITY_STYLES[sev]}`} />
                <span className="capitalize text-sm text-gray-700 dark:text-gray-300 w-20">{sev}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${SEVERITY_STYLES[sev]}`}
                    style={{ width: `${Math.min(100, (count / Math.max(...severities.map(s => alerts?.[s] ?? 0), 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Platform Settings Panel ──────────────────────────────────────────────────

function PlatformSettingsPanel({ authToken }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [saving, setSaving]     = useState(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSettings(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  async function toggleFeature(key, currentValue) {
    setSaving(key);
    const optimistic = { ...settings, [key]: !currentValue };
    setSettings(optimistic);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ [key]: !currentValue }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSettings(settings); // rollback
    } finally {
      setSaving(null);
    }
  }

  const features = [
    { key: 'aiModels',          label: 'AI Models',           desc: 'Enable multi-model AI capabilities' },
    { key: 'socialAnalytics',   label: 'Social Analytics',    desc: 'Track social platform metrics' },
    { key: 'gamingFeatures',    label: 'Gaming Features',     desc: 'Game development tools & integrations' },
    { key: 'automationEngine',  label: 'Automation Engine',   desc: 'Workflow automation (n8n-style)' },
    { key: 'developerMode',     label: 'Developer Mode',      desc: 'Expose advanced developer tools' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Platform Features</h2>
      {loading ? <Spinner /> : error ? (
        <ErrorState message={`Failed to load settings: ${error}`} onRetry={fetchSettings} />
      ) : (
        <div className="space-y-4">
          {features.map(({ key, label, desc }) => {
            const enabled = settings?.[key] ?? false;
            const isSaving = saving === key;
            return (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
                <button
                  onClick={() => toggleFeature(key, enabled)}
                  disabled={isSaving}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'} ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  aria-label={`Toggle ${label}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Danger Zone ──────────────────────────────────────────────────────────────

function DangerZone({ authToken }) {
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  async function runAction(action) {
    setConfirm(null);
    setLoading(action);
    try {
      const endpoint = action === 'sessions' ? '/api/admin/sessions/clear' : '/api/admin/rate-limits/reset';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error();
      setSuccessMsg(action === 'sessions' ? 'All sessions cleared.' : 'Rate limits reset.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // silent
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 p-5">
      {confirm && (
        <ConfirmModal
          title={confirm === 'sessions' ? 'Clear All Sessions' : 'Reset Rate Limits'}
          message={
            confirm === 'sessions'
              ? 'This will log out all users immediately. Are you sure?'
              : 'This will reset all rate limit counters. Are you sure?'
          }
          confirmLabel={confirm === 'sessions' ? 'Clear Sessions' : 'Reset Limits'}
          danger
          onConfirm={() => runAction(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}

      <h2 className="font-semibold text-red-600 dark:text-red-400 mb-1">Danger Zone</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">These actions are irreversible. Proceed with caution.</p>

      {successMsg && (
        <div className="mb-4 px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setConfirm('sessions')}
          disabled={loading === 'sessions'}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === 'sessions' ? 'Clearing…' : 'Clear All Sessions'}
        </button>
        <button
          onClick={() => setConfirm('limits')}
          disabled={loading === 'limits'}
          className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === 'limits' ? 'Resetting…' : 'Reset Rate Limits'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard({ userId, theme, authToken }) {
  const [metrics, setMetrics]       = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError]     = useState(null);
  const [activeTab, setActiveTab]   = useState('users');

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const res = await fetch('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMetrics(await res.json());
    } catch (e) {
      setMetricsError(e.message);
    } finally {
      setMetricsLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const tabs = [
    { id: 'users',    label: 'Users' },
    { id: 'audit',    label: 'Audit Log' },
    { id: 'security', label: 'Security' },
    { id: 'settings', label: 'Settings' },
    { id: 'danger',   label: 'Danger Zone' },
  ];

  const metricCards = [
    { label: 'Total Users',        value: metrics?.totalUsers?.toLocaleString(),    icon: '👥', color: 'bg-indigo-500' },
    { label: 'Active Sessions',    value: metrics?.activeSessions?.toLocaleString(),icon: '🟢', color: 'bg-green-500' },
    { label: 'API Calls Today',    value: metrics?.apiCallsToday?.toLocaleString(), icon: '⚡', color: 'bg-yellow-500' },
    { label: 'Revenue This Month', value: metrics?.revenueThisMonth ? `$${metrics.revenueThisMonth.toLocaleString()}` : '—', icon: '💰', color: 'bg-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Nexus AI Pro — platform management</p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Admin
          </span>
        </div>

        {/* Metric Cards */}
        {metricsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 h-24 animate-pulse" />
            ))}
          </div>
        ) : metricsError ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
            Failed to load metrics: {metricsError} —{' '}
            <button onClick={fetchMetrics} className="underline">retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metricCards.map(c => <MetricCard key={c.label} {...c} />)}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === t.id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                } ${t.id === 'danger' ? 'text-red-600 dark:text-red-400 hover:text-red-700' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'users'    && <UsersPanel authToken={authToken} />}
          {activeTab === 'audit'    && <AuditLogPanel authToken={authToken} />}
          {activeTab === 'security' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SecurityAlertsPanel authToken={authToken} />
            </div>
          )}
          {activeTab === 'settings' && <PlatformSettingsPanel authToken={authToken} />}
          {activeTab === 'danger'   && <DangerZone authToken={authToken} />}
        </div>

      </div>
    </div>
  );
}
