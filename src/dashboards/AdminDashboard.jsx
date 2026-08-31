// File: AdminDashboard.jsx | Created: 2026-08-31 | Nexus AI Pro

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, UserX, UserCheck, Shield,
  Cpu, MemoryStick, HardDrive, Wifi,
  Key, Eye, EyeOff, RotateCcw, Trash2, Plus,
  FileText, ToggleLeft, ToggleRight, Database,
  DollarSign, TrendingUp, Activity, Server,
  Rocket, CheckCircle2, Clock, AlertTriangle,
  Edit2, Save, X, ChevronDown, Search, Download,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLES = ['User', 'Developer', 'Moderator', 'Admin'];

const ROLE_COLOR = {
  User:      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  Developer: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Moderator: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Admin:     'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const SEVERITY_COLOR = {
  critical: 'text-red-500', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-blue-400',
};

const rnd  = (min, max) => Math.floor(Math.random() * (max - min) + min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function makeUser(i = 0) {
  const names = ['Alice Chen','Bob Martin','Carol Davis','Dan Lee','Eve Wilson',
                 'Frank Brown','Grace Kim','Hank Torres','Iris Patel','Jack Zhao'];
  const name = names[i % names.length];
  return {
    id:      `u${i + 1}`,
    name,
    email:   name.toLowerCase().replace(' ', '.') + '@example.com',
    role:    pick(ROLES),
    status:  Math.random() > 0.2 ? 'Active' : 'Suspended',
    joined:  `2025-${String(rnd(1,12)).padStart(2,'0')}-${String(rnd(1,28)).padStart(2,'0')}`,
    lastSeen: `${rnd(1,24)}h ago`,
  };
}

function makeApiKey(i = 0) {
  const names = ['Production API', 'Staging API', 'Mobile SDK', 'Webhook Service', 'Analytics'];
  return {
    id:      `k${i}`,
    name:    names[i % names.length],
    key:     'nxp_' + Array.from({ length: 32 }, () => '0123456789abcdef'[rnd(0,16)]).join(''),
    created: `2026-0${i+1}-01`,
    lastUsed:`${rnd(1,72)}h ago`,
    status:  Math.random() > 0.1 ? 'Active' : 'Revoked',
  };
}

function makeFlag(name, desc, on) {
  return { id: name.toLowerCase().replace(/\s+/g,'-'), name, desc, enabled: on };
}

function makeAuditEntry() {
  const events = ['User login','Config changed','API key rotated','Feature flag toggled',
                  'User role changed','Deployment triggered','DB backup completed','Rate limit updated'];
  const actors = ['admin','cameron.fox','system','ci-bot'];
  return {
    id:       Math.random().toString(36).slice(2,8),
    event:    pick(events),
    actor:    pick(actors),
    severity: pick(['low','medium','high','critical']),
    ts:       Date.now() - rnd(0, 7_200_000),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, icon: Icon, children, className = '', action }) {
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 font-semibold text-sm text-gray-800 dark:text-gray-100">
          {Icon && <Icon size={15} className="text-indigo-500" />}
          {title}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ProgressBar({ value, color = 'bg-indigo-500' }) {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-1.5 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function MetricBar({ label, value, color, Icon }) {
  const warn = value > 80;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400"><Icon size={12}/>{label}</span>
        <span className={`font-semibold ${warn ? 'text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>{Math.floor(value)}%</span>
      </div>
      <ProgressBar value={value} color={warn ? 'bg-red-500' : color} />
    </div>
  );
}

function RoleBadge({ role }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROLE_COLOR[role] ?? ''}`}>{role}</span>
  );
}

function StatusDot({ status }) {
  const ok = status === 'Active';
  return (
    <span className={`flex items-center gap-1 text-xs ${ok ? 'text-green-500' : 'text-gray-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-400'}`} />
      {status}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [users,       setUsers]       = useState(() => Array.from({ length: 10 }, (_, i) => makeUser(i)));
  const [apiKeys,     setApiKeys]     = useState(() => Array.from({ length: 4  }, (_, i) => makeApiKey(i)));
  const [featureFlags,setFeatureFlags]= useState(() => [
    makeFlag('Dark Mode',           'Enable dark theme toggle for all users',           true),
    makeFlag('AI Suggestions',      'Show AI-powered content suggestions',               true),
    makeFlag('Beta API v3',         'Enable experimental API v3 endpoints',             false),
    makeFlag('Analytics Dashboard', 'Show analytics tab in user dashboards',            true),
    makeFlag('Email Digest',        'Weekly email digest for users',                    false),
    makeFlag('Multi-Tenant Mode',   'Allow workspace-level isolation',                  false),
  ]);
  const [auditLogs,   setAuditLogs]   = useState(() => Array.from({ length: 10 }, makeAuditEntry));
  const [visibleKeys, setVisibleKeys] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [editRole,    setEditRole]    = useState('');
  const [userSearch,  setUserSearch]  = useState('');
  const [logFilter,   setLogFilter]   = useState('all');
  const [cpu,         setCpu]         = useState(45);
  const [mem,         setMem]         = useState(62);
  const [disk,        setDisk]        = useState(71);
  const [net,         setNet]         = useState(38);
  const [activeConns, setActiveConns] = useState(284);
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUser,     setNewUser]     = useState({ name:'', email:'', role:'User' });

  // Drift system metrics
  useEffect(() => {
    const id = setInterval(() => {
      setCpu(v  => Math.min(95, Math.max(5,  v + (Math.random()-0.48)*5)));
      setMem(v  => Math.min(95, Math.max(10, v + (Math.random()-0.48)*3)));
      setDisk(v => Math.min(99, Math.max(20, v + (Math.random()-0.47)*1)));
      setNet(v  => Math.min(95, Math.max(5,  v + (Math.random()-0.50)*8)));
      setActiveConns(v => Math.max(0, v + rnd(-10, 15)));
      setAuditLogs(prev => [makeAuditEntry(), ...prev].slice(0, 20));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  const toggleKeyVisibility = (id) =>
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));

  const rotateKey = (id) =>
    setApiKeys(prev => prev.map(k =>
      k.id === id ? { ...k, key: 'nxp_' + Array.from({length:32}, () => '0123456789abcdef'[rnd(0,16)]).join('') } : k
    ));

  const revokeKey = (id) =>
    setApiKeys(prev => prev.map(k => k.id === id ? { ...k, status: 'Revoked' } : k));

  const startEditUser = (u) => { setEditingUser(u.id); setEditRole(u.role); };

  const saveEditUser = (id) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: editRole } : u));
    setEditingUser(null);
  };

  const toggleUserStatus = (id) =>
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, status: u.status === 'Active' ? 'Suspended' : 'Active' } : u
    ));

  const deleteUser = (id) => setUsers(prev => prev.filter(u => u.id !== id));

  const addUser = () => {
    if (!newUser.name || !newUser.email) return;
    setUsers(prev => [{
      id: `u${Date.now()}`, ...newUser, status:'Active',
      joined: new Date().toISOString().slice(0,10), lastSeen: 'Just now',
    }, ...prev]);
    setNewUser({ name:'', email:'', role:'User' });
    setNewUserOpen(false);
  };

  const toggleFlag = (id) =>
    setFeatureFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));

  const fmtTime = (ms) => {
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    return `${Math.floor(s/3600)}h ago`;
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredLogs = auditLogs.filter(l => logFilter === 'all' || l.severity === logFilter);

  const revenue = { mrr: 48_320, arr: 579_840, growth: 12.4, churn: 1.8 };

  // Deployment status
  const deployments = [
    { env: 'Production', version: 'v2.4.1', status: 'healthy', ts: '2026-08-30 14:22' },
    { env: 'Staging',    version: 'v2.5.0', status: 'deploying', ts: '2026-08-31 09:01' },
    { env: 'Dev',        version: 'v2.5.1', status: 'healthy', ts: '2026-08-31 07:45' },
  ];

  const dbStats = [
    { label: 'Total Records', value: '2.4M' },
    { label: 'DB Size',       value: '18.3 GB' },
    { label: 'Connections',   value: activeConns.toString() },
    { label: 'Query Avg',     value: '4.2 ms' },
    { label: 'Uptime',        value: '99.98%' },
    { label: 'Backup',        value: '2h ago' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600 rounded-lg"><Shield size={20} className="text-white" /></div>
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">System management &amp; oversight</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Activity size={13} className="text-green-500" />
          <span>{activeConns} active connections</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Total Users',     value: users.length,    Icon: Users,       color:'text-indigo-500' },
          { label:'MRR',             value:`$${(revenue.mrr/1000).toFixed(1)}k`, Icon:DollarSign,color:'text-green-500' },
          { label:'Growth',          value:`+${revenue.growth}%`,Icon:TrendingUp,color:'text-cyan-500' },
          { label:'Active Conns',    value: activeConns,     Icon: Wifi,        color:'text-purple-500' },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><k.Icon size={12}/>{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* System Health */}
      <Card title="System Health" icon={Server}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <MetricBar label="CPU"     value={cpu}  Icon={Cpu}        color="bg-indigo-500" />
          <MetricBar label="Memory"  value={mem}  Icon={MemoryStick}color="bg-purple-500" />
          <MetricBar label="Disk"    value={disk} Icon={HardDrive}  color="bg-cyan-500"   />
          <MetricBar label="Network" value={net}  Icon={Wifi}       color="bg-amber-500"  />
        </div>
      </Card>

      {/* User Management */}
      <Card
        title="User Management"
        icon={Users}
        action={
          <button
            onClick={() => setNewUserOpen(v => !v)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
          >
            <UserPlus size={12} />Add User
          </button>
        }
      >
        {/* Add User Form */}
        {newUserOpen && (
          <div className="mb-4 p-3 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input value={newUser.name} onChange={e => setNewUser(p=>({...p,name:e.target.value}))}
              placeholder="Full name" className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            <input value={newUser.email} onChange={e => setNewUser(p=>({...p,email:e.target.value}))}
              placeholder="Email" className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            <select value={newUser.role} onChange={e => setNewUser(p=>({...p,role:e.target.value}))}
              className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={addUser} className="flex-1 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-semibold">Save</button>
              <button onClick={() => setNewUserOpen(false)} className="flex-1 py-1.5 text-xs bg-gray-500 hover:bg-gray-600 text-white rounded font-semibold">Cancel</button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={userSearch} onChange={e => setUserSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          />
        </div>

        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 dark:border-gray-700 text-left">
                {['Name','Email','Role','Status','Joined','Last Seen','Actions'].map(h => (
                  <th key={h} className="pb-2 font-medium pr-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-2 pr-3 font-medium">{u.name}</td>
                  <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">{u.email}</td>
                  <td className="py-2 pr-3">
                    {editingUser === u.id ? (
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value)}
                        className="text-xs px-1 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                      >
                        {ROLES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    ) : <RoleBadge role={u.role} />}
                  </td>
                  <td className="py-2 pr-3"><StatusDot status={u.status} /></td>
                  <td className="py-2 pr-3 text-gray-400">{u.joined}</td>
                  <td className="py-2 pr-3 text-gray-400">{u.lastSeen}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-1.5">
                      {editingUser === u.id ? (
                        <>
                          <button onClick={() => saveEditUser(u.id)} className="text-green-500 hover:text-green-400"><Save size={13}/></button>
                          <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-300"><X size={13}/></button>
                        </>
                      ) : (
                        <button onClick={() => startEditUser(u)} className="text-indigo-400 hover:text-indigo-300"><Edit2 size={13}/></button>
                      )}
                      <button onClick={() => toggleUserStatus(u.id)} className="text-amber-400 hover:text-amber-300">
                        {u.status === 'Active' ? <UserX size={13}/> : <UserCheck size={13}/>}
                      </button>
                      <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-300"><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* API Keys + Feature Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="API Key Management" icon={Key}>
          <div className="space-y-3">
            {apiKeys.map(k => (
              <div key={k.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{k.name}</span>
                  <span className={`text-xs font-medium ${k.status === 'Active' ? 'text-green-500' : 'text-gray-400 line-through'}`}>
                    {k.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded overflow-hidden text-ellipsis">
                    {visibleKeys[k.id] ? k.key : '•'.repeat(24)}
                  </code>
                  <button onClick={() => toggleKeyVisibility(k.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    {visibleKeys[k.id] ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Created {k.created} · Used {k.lastUsed}</span>
                  <div className="flex gap-2">
                    <button onClick={() => rotateKey(k.id)} disabled={k.status === 'Revoked'}
                      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 disabled:opacity-40">
                      <RotateCcw size={11}/>Rotate
                    </button>
                    <button onClick={() => revokeKey(k.id)} disabled={k.status === 'Revoked'}
                      className="flex items-center gap-1 text-red-400 hover:text-red-300 disabled:opacity-40">
                      <Trash2 size={11}/>Revoke
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Feature Flags" icon={ToggleRight}>
          <div className="space-y-3">
            {featureFlags.map(f => (
              <div key={f.id} className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold">{f.name}</p>
                  <p className="text-xs text-gray-400 truncate">{f.desc}</p>
                </div>
                <button
                  onClick={() => toggleFlag(f.id)}
                  className={`shrink-0 transition-colors ${f.enabled ? 'text-green-500' : 'text-gray-400'}`}
                >
                  {f.enabled ? <ToggleRight size={28}/> : <ToggleLeft size={28}/>}
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Revenue + DB Stats + Deployments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Revenue Metrics" icon={DollarSign}>
          <div className="space-y-3">
            {[
              { label:'MRR',   value:`$${revenue.mrr.toLocaleString()}`,  color:'text-green-500' },
              { label:'ARR',   value:`$${revenue.arr.toLocaleString()}`,  color:'text-green-600' },
              { label:'Growth',value:`+${revenue.growth}% MoM`,           color:'text-cyan-500'  },
              { label:'Churn', value:`${revenue.churn}%`,                 color:'text-red-400'   },
            ].map(r => (
              <div key={r.label} className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">{r.label}</span>
                <span className={`font-bold ${r.color}`}>{r.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Database Stats" icon={Database}>
          <div className="space-y-2.5">
            {dbStats.map(s => (
              <div key={s.label} className="flex justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">{s.label}</span>
                <span className="font-mono font-semibold">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Deployment Status" icon={Rocket}>
          <div className="space-y-3">
            {deployments.map(d => (
              <div key={d.env} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold">{d.env}</p>
                  <p className="text-xs text-gray-400 font-mono">{d.version}</p>
                  <p className="text-xs text-gray-400">{d.ts}</p>
                </div>
                <span className={`text-xs font-medium flex items-center gap-1 ${d.status === 'healthy' ? 'text-green-500' : 'text-amber-400'}`}>
                  {d.status === 'healthy'
                    ? <><CheckCircle2 size={12}/>Healthy</>
                    : <><Clock size={12}/>Deploying…</>}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Audit Log Viewer */}
      <Card title="Audit Log Viewer" icon={FileText} action={
        <select
          value={logFilter}
          onChange={e => setLogFilter(e.target.value)}
          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
        >
          <option value="all">All</option>
          {['critical','high','medium','low'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      }>
        <div className="overflow-auto max-h-64">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 dark:border-gray-700 text-left">
                {['Event','Actor','Severity','Time'].map(h => <th key={h} className="pb-2 font-medium pr-4">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(l => (
                <tr key={l.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-1.5 pr-4">{l.event}</td>
                  <td className="py-1.5 pr-4 text-gray-400">{l.actor}</td>
                  <td className="py-1.5 pr-4">
                    <span className={`font-semibold capitalize ${SEVERITY_COLOR[l.severity]}`}>{l.severity}</span>
                  </td>
                  <td className="py-1.5 text-gray-400">{fmtTime(l.ts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
