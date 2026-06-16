// File: ModeratorDashboard.jsx | Date: 2026-06-16 | Nexus AI Pro

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  Flag, User, Ban, AlertCircle, Check, X, Clock,
  MessageSquare, Shield, ChevronRight
} from 'lucide-react';

const MOCK_MOD_DATA = {
  contentQueue: [
    { id: 'q1', type: 'post', platform: 'tiktok', content: 'Misleading health claims in video description...', reporter: 'user_watchdog', reportedAt: '2026-06-16T11:20:00Z', reason: 'Misinformation', priority: 'high' },
    { id: 'q2', type: 'comment', platform: 'discord', content: 'Hate speech targeting a community member...', reporter: 'mod_helper', reportedAt: '2026-06-16T10:55:00Z', reason: 'Hate speech', priority: 'critical' },
    { id: 'q3', type: 'profile', platform: 'nexus', content: 'Profile photo appears to violate guidelines', reporter: 'auto_scan', reportedAt: '2026-06-16T09:00:00Z', reason: 'Inappropriate content', priority: 'medium' },
    { id: 'q4', type: 'post', platform: 'reddit', content: 'Spam affiliate links disguised as review...', reporter: 'spam_detector', reportedAt: '2026-06-16T08:30:00Z', reason: 'Spam', priority: 'low' },
  ],
  userReports: [
    { id: 'r1', reportedUser: 'BadActor42', reportedBy: 'victim_user', reason: 'Harassment via DMs', status: 'open', createdAt: '2026-06-15T14:00:00Z' },
    { id: 'r2', reportedUser: 'SpamBot99', reportedBy: 'mod_alert', reason: 'Automated spam posting', status: 'resolved', createdAt: '2026-06-14T09:00:00Z' },
  ],
  bans: [
    { id: 'b1', user: 'SpamBot99', reason: 'Automated spam', bannedAt: '2026-06-14T10:00:00Z', expires: null, permanent: true, bannedBy: 'mod_kate' },
    { id: 'b2', user: 'TempBanned22', reason: 'First offense harassment', bannedAt: '2026-06-10T00:00:00Z', expires: '2026-06-24T00:00:00Z', permanent: false, bannedBy: 'mod_alex' },
  ],
  activityLog: [
    { id: 'l1', action: 'CONTENT_REMOVED', target: 'post #q2', moderator: 'mod_kate', timestamp: '2026-06-16T11:00:00Z' },
    { id: 'l2', action: 'USER_BANNED', target: 'SpamBot99', moderator: 'mod_alex', timestamp: '2026-06-14T10:00:00Z' },
    { id: 'l3', action: 'APPEAL_APPROVED', target: 'user TempUnbanned', moderator: 'mod_kate', timestamp: '2026-06-13T15:00:00Z' },
    { id: 'l4', action: 'WARNING_ISSUED', target: 'user Repeat_Offend', moderator: 'mod_alex', timestamp: '2026-06-12T12:00:00Z' },
  ],
  appeals: [
    { id: 'ap1', user: 'TempBanned22', banReason: 'Harassment', appealText: 'It was a misunderstanding...', status: 'pending', submittedAt: '2026-06-11T00:00:00Z' },
  ],
};

const PRIORITY_STYLES = {
  critical: 'bg-red-100 text-red-800 border border-red-300',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

const TYPE_STYLES = {
  post: 'bg-blue-100 text-blue-700',
  comment: 'bg-indigo-100 text-indigo-700',
  profile: 'bg-purple-100 text-purple-700',
};

const ACTION_STYLES = {
  CONTENT_REMOVED: 'text-red-600',
  USER_BANNED: 'text-orange-600',
  APPEAL_APPROVED: 'text-green-600',
  APPEAL_DENIED: 'text-red-600',
  WARNING_ISSUED: 'text-yellow-600',
};

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function truncate(text, len = 100) {
  return text.length > len ? text.slice(0, len) + '…' : text;
}

function SummaryCards({ contentQueue, bans, appeals }) {
  const pending = contentQueue.filter(i => i._status === 'pending' || !i._status).length;
  const activeBans = bans.length;
  const pendingAppeals = appeals.filter(a => a.status === 'pending').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Pending Reports', value: pending, icon: Flag, color: 'text-orange-600', bg: 'bg-orange-50' },
        { label: 'Active Bans', value: activeBans, icon: Ban, color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Appeals Pending', value: pendingAppeals, icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { label: 'Removed Today', value: 3, icon: X, color: 'text-gray-600', bg: 'bg-gray-50' },
      ].map(card => (
        <div key={card.label} className={`${card.bg} rounded-xl p-5 flex items-center gap-4`}>
          <card.icon className={`w-6 h-6 ${card.color} shrink-0`} />
          <div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-gray-600 mt-0.5">{card.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContentQueue({ queue, setQueue }) {
  const handleAction = async (id, action) => {
    try {
      await fetch(`/api/moderation/content/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (_) {}
    setQueue(prev => prev.map(item => item.id === id ? { ...item, _status: action === 'approve' ? 'approved' : 'removed' } : item));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Flag className="w-4 h-4 text-orange-500" /> Content Queue
        </h2>
        <span className="text-xs text-gray-400">{queue.filter(i => !i._status).length} pending</span>
      </div>
      <div className="divide-y divide-gray-50">
        {queue.map(item => {
          const resolved = item._status && item._status !== 'pending';
          return (
            <div key={item.id} className={`px-5 py-4 ${resolved ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={PRIORITY_STYLES[item.priority]}>{item.priority}</Badge>
                    <Badge className={TYPE_STYLES[item.type] || 'bg-gray-100 text-gray-600'}>{item.type}</Badge>
                    <Badge className="bg-gray-100 text-gray-500 capitalize">{item.platform}</Badge>
                    <Badge className="bg-slate-100 text-slate-600">{item.reason}</Badge>
                  </div>
                  <p className="text-sm text-gray-700">{truncate(item.content, 100)}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>Reported by <span className="text-gray-600 font-medium">{item.reporter}</span></span>
                    <span>·</span>
                    <Clock className="w-3 h-3" />
                    <span>{timeAgo(item.reportedAt)}</span>
                  </div>
                </div>
                {!resolved ? (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(item.id, 'approve')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Check className="w-3 h-3" /> Keep
                    </button>
                    <button
                      onClick={() => handleAction(item.id, 'remove')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      <X className="w-3 h-3" /> Remove
                    </button>
                  </div>
                ) : (
                  <Badge className={item._status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {item._status}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UserReportsTable({ reports, setReports }) {
  const handleResolve = async (id) => {
    try {
      await fetch(`/api/moderation/reports/${id}/resolve`, { method: 'POST', credentials: 'include' });
    } catch (_) {}
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-500" /> User Reports
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Reported User</th>
              <th className="px-5 py-3 text-left">Reported By</th>
              <th className="px-5 py-3 text-left">Reason</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Date</th>
              <th className="px-5 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {reports.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{r.reportedUser}</td>
                <td className="px-5 py-3 text-gray-500">{r.reportedBy}</td>
                <td className="px-5 py-3 text-gray-600">{r.reason}</td>
                <td className="px-5 py-3">
                  <Badge className={r.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                    {r.status}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">{timeAgo(r.createdAt)}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button className="text-xs text-indigo-600 hover:underline font-medium">View</button>
                    {r.status === 'open' && (
                      <button
                        onClick={() => handleResolve(r.id)}
                        className="text-xs text-green-600 hover:underline font-medium"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BansTable({ bans, setBans }) {
  const handleUnban = async (id) => {
    try {
      await fetch(`/api/moderation/users/${id}/unban`, { method: 'POST', credentials: 'include' });
    } catch (_) {}
    setBans(prev => prev.filter(b => b.id !== id));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Ban className="w-4 h-4 text-red-500" /> Active Bans
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">User</th>
              <th className="px-5 py-3 text-left">Reason</th>
              <th className="px-5 py-3 text-left">Banned At</th>
              <th className="px-5 py-3 text-left">Expires</th>
              <th className="px-5 py-3 text-left">Banned By</th>
              <th className="px-5 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bans.map(ban => (
              <tr key={ban.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{ban.user}</td>
                <td className="px-5 py-3 text-gray-600">{ban.reason}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{timeAgo(ban.bannedAt)}</td>
                <td className="px-5 py-3">
                  {ban.permanent
                    ? <Badge className="bg-red-100 text-red-700">Permanent</Badge>
                    : <span className="text-xs text-gray-500">{new Date(ban.expires).toLocaleDateString()}</span>
                  }
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">{ban.bannedBy}</td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => handleUnban(ban.id)}
                    className="text-xs text-orange-600 hover:underline font-medium"
                  >
                    Unban
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityLog({ log }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" /> Moderation Activity Log
        </h2>
      </div>
      <div className="divide-y divide-gray-50">
        {log.map(entry => (
          <div key={entry.id} className="px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`text-xs font-bold shrink-0 ${ACTION_STYLES[entry.action] || 'text-gray-600'}`}>
                {entry.action.replace(/_/g, ' ')}
              </span>
              <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
              <span className="text-sm text-gray-600 truncate">{entry.target}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs text-gray-400">
              <span className="font-medium text-gray-500">{entry.moderator}</span>
              <span>{timeAgo(entry.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppealsQueue({ appeals, setAppeals }) {
  const handleAppealAction = async (id, action) => {
    try {
      await fetch(`/api/moderation/appeals/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (_) {}
    setAppeals(prev => prev.map(a => a.id === id ? { ...a, status: action === 'approve' ? 'approved' : 'denied' } : a));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" /> Appeals Queue
        </h2>
      </div>
      <div className="divide-y divide-gray-50">
        {appeals.map(appeal => (
          <div key={appeal.id} className="px-5 py-4 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">{appeal.user}</span>
                  <Badge className={
                    appeal.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                    : appeal.status === 'approved' ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                  }>
                    {appeal.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  Ban reason: <span className="font-medium text-gray-700">{appeal.banReason}</span>
                </p>
                <p className="text-sm text-gray-600 italic">&ldquo;{truncate(appeal.appealText, 120)}&rdquo;</p>
                <p className="text-xs text-gray-400 mt-1">Submitted {timeAgo(appeal.submittedAt)}</p>
              </div>
              {appeal.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAppealAction(appeal.id, 'approve')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Check className="w-3 h-3" /> Approve
                  </button>
                  <button
                    onClick={() => handleAppealAction(appeal.id, 'deny')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    <X className="w-3 h-3" /> Deny
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {appeals.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No pending appeals.</div>
        )}
      </div>
    </div>
  );
}

export default function ModeratorDashboard() {
  const { role } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contentQueue, setContentQueue] = useState([]);
  const [userReports, setUserReports] = useState([]);
  const [bans, setBans] = useState([]);
  const [appeals, setAppeals] = useState([]);
  const [activityLog, setActivityLog] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/moderation/dashboard', { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        setData(json);
        setContentQueue(json.contentQueue);
        setUserReports(json.userReports);
        setBans(json.bans);
        setAppeals(json.appeals);
        setActivityLog(json.activityLog);
      } catch (_) {
        setData(MOCK_MOD_DATA);
        setContentQueue(MOCK_MOD_DATA.contentQueue);
        setUserReports(MOCK_MOD_DATA.userReports);
        setBans(MOCK_MOD_DATA.bans);
        setAppeals(MOCK_MOD_DATA.appeals);
        setActivityLog(MOCK_MOD_DATA.activityLog);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const ALLOWED_ROLES = ['moderator', 'developer', 'admin', 'super_admin'];
  if (!ALLOWED_ROLES.includes(role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center shadow-sm">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">Moderator, Developer, or Admin role required.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Shield className="w-5 h-5 animate-pulse text-indigo-500" />
          <span className="text-sm">Loading moderation data...</span>
        </div>
      </div>
    );
  }

  const pendingCount = contentQueue.filter(i => !i._status).length + appeals.filter(a => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Moderation Center</h1>
              <p className="text-sm text-gray-500">Review, act, and keep the community safe.</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{pendingCount} items need attention</span>
            </div>
          )}
        </div>

        <SummaryCards contentQueue={contentQueue} bans={bans} appeals={appeals} />

        <ContentQueue queue={contentQueue} setQueue={setContentQueue} />

        <UserReportsTable reports={userReports} setReports={setUserReports} />

        <BansTable bans={bans} setBans={setBans} />

        <ActivityLog log={activityLog} />

        <AppealsQueue appeals={appeals} setAppeals={setAppeals} />
      </div>
    </div>
  );
}
