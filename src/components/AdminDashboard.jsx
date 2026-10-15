// AdminDashboard.jsx | Nexus AI Pro | Created: 2026-10-15 | Admin Panel
// Role-based dashboard for Admin, Moderator, and Developer

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, Activity, Key, BarChart3, Flag, Trash2, Edit3,
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Search, Filter,
  TrendingUp, DollarSign, UserPlus, Settings, Eye, Ban
} from 'lucide-react';

const ROLES = Object.freeze({
  USER: 'user',
  DEVELOPER: 'developer',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
});

const ROLE_COLORS = {
  [ROLES.ADMIN]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [ROLES.MODERATOR]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [ROLES.DEVELOPER]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [ROLES.USER]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

const TABS = ['Overview', 'Users', 'Revenue', 'API Keys', 'Feature Flags'];

const ROLE_TABS = {
  [ROLES.ADMIN]: TABS,
  [ROLES.MODERATOR]: ['Overview', 'Users'],
  [ROLES.DEVELOPER]: ['Overview', 'API Keys', 'Feature Flags'],
  [ROLES.USER]: [],
};

/** @param {{ userRole: string, userId: string }} props */
export default function AdminDashboard({ userRole = ROLES.ADMIN, userId }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [health, setHealth] = useState(null);
  const [users, setUsers] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [featureFlags, setFeatureFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState(null);

  const headers = { 'Content-Type': 'application/json', 'x-user-role': userRole };

  const fetchHealth = useCallback(async () => {
    const res = await fetch('/api/admin/health', { headers });
    if (res.ok) setHealth(await res.json());
  }, [userRole]);

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    const res = await fetch(`/api/admin/users?${params}`, { headers });
    if (res.ok) { const d = await res.json(); setUsers(d.users || []); }
  }, [userRole, search, roleFilter]);

  const fetchRevenue = useCallback(async () => {
    const res = await fetch('/api/admin/revenue', { headers });
    if (res.ok) setRevenue(await res.json());
  }, [userRole]);

  const fetchApiKeys = useCallback(async () => {
    const res = await fetch('/api/admin/api-keys', { headers });
    if (res.ok) { const d = await res.json(); setApiKeys(d.keys || []); }
  }, [userRole]);

  const fetchFlags = useCallback(async () => {
    const res = await fetch('/api/admin/feature-flags', { headers });
    if (res.ok) setFeatureFlags(await res.json());
  }, [userRole]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const allowed = ROLE_TABS[userRole] || [];
    if (!allowed.length) { setError('Access denied'); setLoading(false); return; }
    const promises = [];
    if (allowed.includes('Overview')) promises.push(fetchHealth());
    if (allowed.includes('Users')) promises.push(fetchUsers());
    if (allowed.includes('Revenue')) promises.push(fetchRevenue());
    if (allowed.includes('API Keys')) promises.push(fetchApiKeys());
    if (allowed.includes('Feature Flags')) promises.push(fetchFlags());
    Promise.all(promises).finally(() => setLoading(false));
  }, [userRole]);

  useEffect(() => {
    if (activeTab === 'Users') fetchUsers();
  }, [search, roleFilter]);

  const toggleFlag = async (flag, current) => {
    const res = await fetch(`/api/admin/feature-flags/${flag}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ enabled: !current.enabled }),
    });
    if (res.ok) setFeatureFlags(prev => ({ ...prev, [flag]: { ...current, enabled: !current.enabled } }));
  };

  const allowedTabs = ROLE_TABS[userRole] || [];

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-500">
          <Shield className="w-12 h-12 mx-auto mb-2" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!allowedTabs.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>Insufficient permissions to view this dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-500" />
              Admin Dashboard
            </h1>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[userRole]}`}>
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          </div>
          <button onClick={() => window.location.reload()} className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {allowedTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {!loading && activeTab === 'Overview' && health && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Activity />} label="Uptime" value={`${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`} color="green" />
            <StatCard icon={<Settings />} label="Memory Used" value={`${health.memory?.heapUsed || 0} MB`} color="blue" />
            <StatCard icon={<Activity />} label="Node Version" value={health.nodeVersion || 'N/A'} color="purple" />
            <StatCard icon={<Shield />} label="Environment" value={health.env || 'dev'} color="orange" />
          </div>
        )}

        {!loading && activeTab === 'Users' && (
          <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-sm"
                />
              </div>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600 text-sm"
              >
                <option value="">All Roles</option>
                {Object.values(ROLES).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-750">
                  <tr>
                    {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3 font-medium">{user.username}</td>
                      <td className="px-4 py-3 text-gray-500">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${ROLE_COLORS[user.role]}`}>{user.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        {user.active
                          ? <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" /> Active</span>
                          : <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3 h-3" /> Banned</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="text-blue-500 hover:text-blue-600"><Eye className="w-4 h-4" /></button>
                          {userRole === ROLES.ADMIN && <button className="text-red-500 hover:text-red-600"><Ban className="w-4 h-4" /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-8 text-gray-400">No users found</div>
              )}
            </div>
          </div>
        )}

        {!loading && activeTab === 'Revenue' && revenue && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<DollarSign />} label="MRR" value={`$${revenue.mrr?.toFixed(2)}`} color="green" />
              <StatCard icon={<TrendingUp />} label="ARR" value={`$${revenue.arr?.toFixed(2)}`} color="blue" />
              <StatCard icon={<XCircle />} label="Churn" value={`${revenue.churn}%`} color="red" />
              <StatCard icon={<UserPlus />} label="New Signups" value={revenue.newSignups} color="purple" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <h3 className="font-medium mb-3">Subscriptions</h3>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(revenue.activeSubscriptions || {}).map(([plan, count]) => (
                  <div key={plan} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-gray-500 capitalize">{plan}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'API Keys' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
                <h3 className="font-medium flex items-center gap-2"><Key className="w-4 h-4" /> API Keys</h3>
                <button className="text-sm bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600">Generate Key</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-750">
                  <tr>
                    {['Name', 'Key Prefix', 'Status', 'Created', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {apiKeys.map(key => (
                    <tr key={key.id}>
                      <td className="px-4 py-3 font-medium">{key.name}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{key.prefix}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${key.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {key.active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{new Date(key.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && activeTab === 'Feature Flags' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b dark:border-gray-700">
              <h3 className="font-medium flex items-center gap-2"><Flag className="w-4 h-4" /> Feature Flags</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {Object.entries(featureFlags).map(([flag, config]) => (
                <div key={flag} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-medium text-sm">{flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                    <div className="text-xs text-gray-400">Rollout: {config.rollout}%</div>
                  </div>
                  <button
                    onClick={() => userRole === ROLES.ADMIN && toggleFlag(flag, config)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                    } ${userRole !== ROLES.ADMIN ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    green: 'text-green-500 bg-green-50 dark:bg-green-900/20',
    blue: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    purple: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    orange: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
    red: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className={`inline-flex p-2 rounded-lg mb-2 ${colors[color]}`}>
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
