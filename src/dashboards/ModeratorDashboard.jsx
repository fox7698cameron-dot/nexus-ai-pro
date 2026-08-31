// File: ModeratorDashboard.jsx | Created: 2026-08-31 | Nexus AI Pro

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Eye, Ban, CheckCircle2, XCircle, AlertTriangle,
  MessageSquare, User, Clock, Flag, ThumbsDown, ThumbsUp,
  Trash2, RotateCcw, Search, Filter, ChevronDown,
  Activity, Bell, FileText, List, Hash, Send,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rnd   = (a, b) => Math.floor(Math.random() * (b - a) + a);

const REPORT_REASONS  = ['Spam','Harassment','Hate speech','Misinformation','Nudity','Violence','Impersonation','Other'];
const CONTENT_TYPES   = ['Post','Comment','Image','Video','Profile','Review'];
const USER_NAMES      = ['alice23','bob_m','carol_x','danlee','eve99','frank_b','grace_k','hank_t','iris_p','jack_z'];
const CHAT_MSGS = [
  'hey anyone there?',
  'this app is amazing',
  'how do i reset my password?',
  'admin is corrupt lol',
  'buy cheap meds at link.xyz',
  'just joined, excited!',
  'the dark mode is so clean',
  'anyone want to collab?',
];

function makeReport(i = 0) {
  const reporter = pick(USER_NAMES);
  const reported = pick(USER_NAMES.filter(n => n !== reporter));
  return {
    id:       `r${i}-${Math.random().toString(36).slice(2,6)}`,
    reporter,
    reported,
    reason:   pick(REPORT_REASONS),
    content:  pick(CONTENT_TYPES),
    preview:  `Sample ${pick(CONTENT_TYPES).toLowerCase()} content flagged by user…`,
    ts:       Date.now() - rnd(0, 86_400_000),
    status:   pick(['pending','pending','pending','resolved','dismissed']),
    severity: pick(['critical','high','medium','low']),
  };
}

function makeQueueItem(i = 0) {
  return {
    id:      `q${i}-${Math.random().toString(36).slice(2,6)}`,
    type:    pick(CONTENT_TYPES),
    author:  pick(USER_NAMES),
    preview: `This is a piece of content pending review. It contains information that may need approval before going live.`,
    ts:      Date.now() - rnd(0, 7_200_000),
    status:  'pending',
  };
}

function makeBanned(i = 0) {
  const reasons = ['Repeated spam','Hate speech','Abuse','Fraud','ToS violation','Doxxing'];
  return {
    id:       `b${i}`,
    username: pick(USER_NAMES),
    reason:   pick(reasons),
    bannedAt: `2026-0${rnd(1,8)}-${String(rnd(1,28)).padStart(2,'0')}`,
    duration: pick(['Permanent','7 days','30 days','1 year']),
    bannedBy: 'moderator',
  };
}

function makeActivityLog() {
  const actions = ['Content approved','Content rejected','User warned','User banned','Report dismissed',
                   'Comment removed','Post hidden','Appeal reviewed'];
  return {
    id:     Math.random().toString(36).slice(2,8),
    action: pick(actions),
    actor:  'moderator',
    target: pick(USER_NAMES),
    ts:     Date.now() - rnd(0, 3_600_000),
  };
}

function makeChat() {
  return {
    id:      Math.random().toString(36).slice(2,8),
    user:    pick(USER_NAMES),
    message: pick(CHAT_MSGS),
    ts:      Date.now() - rnd(0, 60_000),
    flagged: Math.random() < 0.2,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SEVERITY_BADGE = {
  critical: 'bg-red-600 text-white',
  high:     'bg-orange-500 text-white',
  medium:   'bg-yellow-500 text-black',
  low:      'bg-blue-500 text-white',
};

function SeverityBadge({ level }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${SEVERITY_BADGE[level] ?? ''}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function Card({ title, icon: Icon, children, className = '', action, count }) {
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm ${className}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 font-semibold text-sm text-gray-800 dark:text-gray-100">
          {Icon && <Icon size={15} className="text-indigo-500" />}
          {title}
          {count !== undefined && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full">
              {count}
            </span>
          )}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function ActionBtn({ label, color, Icon, onClick, disabled }) {
  const colorMap = {
    green:  'bg-green-600 hover:bg-green-700 text-white',
    red:    'bg-red-600 hover:bg-red-700 text-white',
    amber:  'bg-amber-500 hover:bg-amber-600 text-white',
    gray:   'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1 px-2 py-1 text-xs rounded font-semibold disabled:opacity-40 transition-colors ${colorMap[color]}`}
    >
      {Icon && <Icon size={11} />}{label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ModeratorDashboard() {
  const [queue,       setQueue]       = useState(() => Array.from({ length: 8 }, (_, i) => makeQueueItem(i)));
  const [reports,     setReports]     = useState(() => Array.from({ length: 10 }, (_, i) => makeReport(i)));
  const [banned,      setBanned]      = useState(() => Array.from({ length: 6 }, (_, i) => makeBanned(i)));
  const [activityLog, setActivityLog] = useState(() => Array.from({ length: 8 }, makeActivityLog));
  const [chatFeed,    setChatFeed]    = useState(() => Array.from({ length: 12 }, makeChat));
  const [reportFilter,setReportFilter]= useState('all');
  const [searchQ,     setSearchQ]     = useState('');
  const [warnTarget,  setWarnTarget]  = useState('');
  const [banDuration, setBanDuration] = useState('7 days');
  const [activeTab,   setActiveTab]   = useState('queue');

  // Live chat simulation
  useEffect(() => {
    const id = setInterval(() => {
      setChatFeed(prev => [makeChat(), ...prev].slice(0, 30));
      setActivityLog(prev => [makeActivityLog(), ...prev].slice(0, 20));
      // Occasionally add new reports
      if (Math.random() > 0.6) setReports(prev => [makeReport(prev.length), ...prev].slice(0, 30));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const approveContent = (id) => {
    setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'approved' } : q));
    setActivityLog(prev => [{ id: Math.random().toString(36).slice(2,8), action:'Content approved', actor:'moderator', target: id, ts: Date.now() }, ...prev]);
  };

  const rejectContent = (id) => {
    setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'rejected' } : q));
    setActivityLog(prev => [{ id: Math.random().toString(36).slice(2,8), action:'Content rejected', actor:'moderator', target: id, ts: Date.now() }, ...prev]);
  };

  const resolveReport = (id, action) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
    setActivityLog(prev => [{ id: Math.random().toString(36).slice(2,8), action:`Report ${action}`, actor:'moderator', target: id, ts: Date.now() }, ...prev]);
  };

  const warnUser = () => {
    if (!warnTarget.trim()) return;
    setActivityLog(prev => [{ id: Math.random().toString(36).slice(2,8), action:'User warned', actor:'moderator', target: warnTarget.trim(), ts: Date.now() }, ...prev]);
    setWarnTarget('');
  };

  const banUser = (username) => {
    if (banned.find(b => b.username === username)) return;
    setBanned(prev => [{
      id: Math.random().toString(36).slice(2,8),
      username,
      reason: 'Manual ban',
      bannedAt: new Date().toISOString().slice(0,10),
      duration: banDuration,
      bannedBy: 'moderator',
    }, ...prev]);
    setActivityLog(prev => [{ id: Math.random().toString(36).slice(2,8), action:'User banned', actor:'moderator', target: username, ts: Date.now() }, ...prev]);
  };

  const unbanUser = (id) => {
    setBanned(prev => prev.filter(b => b.id !== id));
    setActivityLog(prev => [{ id: Math.random().toString(36).slice(2,8), action:'User unbanned', actor:'moderator', target: id, ts: Date.now() }, ...prev]);
  };

  const removeChatMsg = (id) => setChatFeed(prev => prev.filter(m => m.id !== id));

  const fmtTime = (ms) => {
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    return `${Math.floor(s/3600)}h ago`;
  };

  const pendingQueue   = queue.filter(q => q.status === 'pending');
  const pendingReports = reports.filter(r => r.status === 'pending');

  const filteredReports = reports
    .filter(r => reportFilter === 'all' || r.status === reportFilter)
    .filter(r => !searchQ || r.reporter.includes(searchQ) || r.reported.includes(searchQ) || r.reason.toLowerCase().includes(searchQ.toLowerCase()));

  const TABS = [
    { id:'queue',   label:'Queue',    count: pendingQueue.length   },
    { id:'reports', label:'Reports',  count: pendingReports.length },
    { id:'banned',  label:'Banned',   count: banned.length         },
    { id:'chat',    label:'Chat',     count: chatFeed.filter(m => m.flagged).length },
    { id:'logs',    label:'Activity', count: null                  },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-600 rounded-lg"><Shield size={20} className="text-white" /></div>
          <div>
            <h1 className="text-xl font-bold">Moderator Dashboard</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Content moderation &amp; community management</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><Activity size={13} className="text-green-500" />Live</span>
          <span className="flex items-center gap-1"><Flag size={13} className="text-red-400" />{pendingReports.length} pending reports</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:'Queue Items',    value: pendingQueue.length,   color:'text-indigo-500',  Icon: List          },
          { label:'Open Reports',   value: pendingReports.length, color:'text-amber-500',   Icon: Flag          },
          { label:'Banned Users',   value: banned.length,         color:'text-red-500',     Icon: Ban           },
          { label:'Flagged Chats',  value: chatFeed.filter(m=>m.flagged).length, color:'text-orange-400', Icon: MessageSquare },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><k.Icon size={12}/>{k.label}</div>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Warning/Ban Quick Action */}
      <Card title="Quick Actions" icon={AlertTriangle}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Issue Warning</p>
            <div className="flex gap-2">
              <input
                value={warnTarget}
                onChange={e => setWarnTarget(e.target.value)}
                placeholder="Username"
                className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
              <ActionBtn label="Warn" color="amber" Icon={AlertTriangle} onClick={warnUser} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Ban User</p>
            <div className="flex gap-2">
              <input
                placeholder="Username"
                id="ban-target"
                className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
              <select
                value={banDuration}
                onChange={e => setBanDuration(e.target.value)}
                className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              >
                {['7 days','30 days','1 year','Permanent'].map(d => <option key={d}>{d}</option>)}
              </select>
              <ActionBtn
                label="Ban" color="red" Icon={Ban}
                onClick={() => {
                  const el = document.getElementById('ban-target');
                  if (el?.value) { banUser(el.value.trim()); el.value = ''; }
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors border-b-2 ${
              activeTab === t.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Approval Queue */}
      {activeTab === 'queue' && (
        <Card title="Content Approval Queue" icon={CheckCircle2} count={pendingQueue.length}>
          <div className="space-y-3">
            {queue.map(item => (
              <div
                key={item.id}
                className={`rounded-lg border p-3 ${
                  item.status === 'approved' ? 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20' :
                  item.status === 'rejected' ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20'         :
                  'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{item.type}</span>
                      <span className="text-xs text-gray-400">by <strong>{item.author}</strong></span>
                      <span className="text-xs text-gray-400">{fmtTime(item.ts)}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{item.preview}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'pending' ? (
                      <>
                        <ActionBtn label="Approve" color="green" Icon={CheckCircle2} onClick={() => approveContent(item.id)} />
                        <ActionBtn label="Reject"  color="red"   Icon={XCircle}     onClick={() => rejectContent(item.id)} />
                      </>
                    ) : (
                      <span className={`text-xs font-semibold capitalize ${item.status === 'approved' ? 'text-green-600' : 'text-red-500'}`}>
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* User Reports Table */}
      {activeTab === 'reports' && (
        <Card title="User Reports" icon={Flag}>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search reports…"
                className="w-full pl-7 pr-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              />
            </div>
            <select
              value={reportFilter} onChange={e => setReportFilter(e.target.value)}
              className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              {['all','pending','resolved','dismissed'].map(v => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase()+v.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 dark:border-gray-700 text-left">
                  {['Reporter','Reported','Reason','Content','Severity','Status','Actions'].map(h => (
                    <th key={h} className="pb-2 font-medium pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 pr-3 font-mono">{r.reporter}</td>
                    <td className="py-2 pr-3 font-mono">{r.reported}</td>
                    <td className="py-2 pr-3">{r.reason}</td>
                    <td className="py-2 pr-3">{r.content}</td>
                    <td className="py-2 pr-3"><SeverityBadge level={r.severity} /></td>
                    <td className="py-2 pr-3">
                      <span className={`capitalize font-medium ${
                        r.status === 'pending'   ? 'text-amber-400'  :
                        r.status === 'resolved'  ? 'text-green-500' : 'text-gray-400'
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-2">
                      {r.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <ActionBtn label="Resolve"  color="green" onClick={() => resolveReport(r.id, 'resolved')}  />
                          <ActionBtn label="Dismiss"  color="gray"  onClick={() => resolveReport(r.id, 'dismissed')} />
                          <ActionBtn label="Ban"      color="red"   Icon={Ban} onClick={() => banUser(r.reported)}   />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Banned Users */}
      {activeTab === 'banned' && (
        <Card title="Banned Users" icon={Ban} count={banned.length}>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100 dark:border-gray-700 text-left">
                  {['Username','Reason','Duration','Banned On','By','Action'].map(h => (
                    <th key={h} className="pb-2 font-medium pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {banned.map(b => (
                  <tr key={b.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 pr-4 font-mono text-red-400">{b.username}</td>
                    <td className="py-2 pr-4">{b.reason}</td>
                    <td className="py-2 pr-4">
                      <span className={`font-medium ${b.duration === 'Permanent' ? 'text-red-500' : 'text-orange-400'}`}>
                        {b.duration}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-400">{b.bannedAt}</td>
                    <td className="py-2 pr-4 text-gray-400">{b.bannedBy}</td>
                    <td className="py-2">
                      <ActionBtn label="Unban" color="green" Icon={RotateCcw} onClick={() => unbanUser(b.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Real-time Chat Monitoring */}
      {activeTab === 'chat' && (
        <Card title="Real-time Chat Monitor" icon={MessageSquare}>
          <div className="space-y-2 max-h-96 overflow-auto">
            {chatFeed.map(msg => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg border ${
                  msg.flagged
                    ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                    : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold">{msg.user}</span>
                    {msg.flagged && (
                      <span className="flex items-center gap-0.5 text-xs text-red-500 font-medium">
                        <AlertTriangle size={10}/>Flagged
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{fmtTime(msg.ts)}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{msg.message}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {msg.flagged && (
                    <ActionBtn label="Ban" color="red" Icon={Ban} onClick={() => banUser(msg.user)} />
                  )}
                  <button onClick={() => removeChatMsg(msg.id)} className="text-gray-400 hover:text-red-400">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Activity Logs */}
      {activeTab === 'logs' && (
        <Card title="Activity Logs" icon={FileText}>
          <div className="space-y-2 max-h-96 overflow-auto">
            {activityLog.map(l => (
              <div key={l.id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-700/50 text-xs">
                <Clock size={12} className="text-gray-400 shrink-0" />
                <span className="text-gray-400 shrink-0 w-16">{fmtTime(l.ts)}</span>
                <span className="font-medium flex-1">{l.action}</span>
                {l.target && (
                  <span className="text-gray-500 dark:text-gray-400 font-mono">→ {l.target}</span>
                )}
                <span className="text-indigo-400">{l.actor}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
