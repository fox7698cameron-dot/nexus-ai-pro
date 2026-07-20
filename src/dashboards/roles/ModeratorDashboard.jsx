// Date: 2026-07-20
import React, { useState } from 'react';
import {
  Shield, CheckCircle, XCircle, AlertTriangle, Ban, Search, ChevronUp,
  MessageSquare, Clock, Filter, Plus, Trash2, Eye, ArrowUpCircle,
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_QUEUE = [
  { id: 'r1', type: 'message', content: 'This contains potentially harmful content about...', user: 'user_1042', reported_by: 'user_0891', date: new Date(2026, 6, 20, 13, 22), severity: 'high', status: 'pending' },
  { id: 'r2', type: 'image', content: 'Image flagged by automated filter (NSFW)', user: 'user_2301', reported_by: 'system', date: new Date(2026, 6, 20, 11, 5), severity: 'medium', status: 'pending' },
  { id: 'r3', type: 'profile', content: 'Profile contains spam links: http://spam.example.com', user: 'user_0055', reported_by: 'user_1200', date: new Date(2026, 6, 19, 22, 33), severity: 'low', status: 'pending' },
  { id: 'r4', type: 'message', content: 'Repeated promotional messages violating ToS', user: 'user_7788', reported_by: 'user_3344', date: new Date(2026, 6, 19, 18, 10), severity: 'medium', status: 'pending' },
];

const MOCK_BANS = [
  { id: 'b1', user: 'user_1042', email: 'bad_actor@example.com', type: 'temporary', reason: 'Spam', expires: new Date(2026, 7, 20), by: 'mod_alice', date: new Date(2026, 6, 15) },
  { id: 'b2', user: 'user_0055', email: 'spam_bot@example.com', type: 'permanent', reason: 'Bot activity', expires: null, by: 'mod_bob', date: new Date(2026, 5, 1) },
];

const MOCK_HISTORY = [
  { id: 'h1', action: 'APPROVED', target: 'Message #r8813', by: 'mod_alice', date: new Date(2026, 6, 20, 10, 5) },
  { id: 'h2', action: 'REJECTED', target: 'Profile #r7712', by: 'mod_bob', date: new Date(2026, 6, 19, 17, 45) },
  { id: 'h3', action: 'BANNED', target: 'user_0055 (permanent)', by: 'mod_bob', date: new Date(2026, 5, 1, 9, 0) },
  { id: 'h4', action: 'ESCALATED', target: 'Image #r6600', by: 'mod_alice', date: new Date(2026, 6, 18, 14, 20) },
];

const WORD_FILTERS = ['spam', 'phishing', 'malware'];

const SEVERITY_COLORS = {
  high: 'text-red-400 bg-red-950 border-red-800',
  medium: 'text-amber-400 bg-amber-950 border-amber-800',
  low: 'text-blue-400 bg-blue-950 border-blue-800',
};

const ACTION_COLORS = {
  APPROVED: 'text-green-400',
  REJECTED: 'text-red-400',
  BANNED: 'text-red-400',
  ESCALATED: 'text-amber-400',
};

export default function ModeratorDashboard() {
  const [tab, setTab] = useState('queue');
  const [queue, setQueue] = useState(MOCK_QUEUE);
  const [bans, setBans] = useState(MOCK_BANS);
  const [history, setHistory] = useState(MOCK_HISTORY);
  const [wordFilters, setWordFilters] = useState(WORD_FILTERS);
  const [newWord, setNewWord] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [banModal, setBanModal] = useState(null);
  const [banForm, setBanForm] = useState({ type: 'temporary', reason: '', days: 7 });

  const handleAction = (id, action) => {
    const item = queue.find((q) => q.id === id);
    setQueue((prev) => prev.filter((q) => q.id !== id));
    setHistory((prev) => [
      { id: `h${Date.now()}`, action: action.toUpperCase(), target: `${item.type} #${id}`, by: 'mod_you', date: new Date() },
      ...prev,
    ]);
  };

  const addWordFilter = () => {
    const word = newWord.trim().toLowerCase();
    if (word && !wordFilters.includes(word)) {
      setWordFilters((prev) => [...prev, word]);
      setNewWord('');
    }
  };

  const removeWordFilter = (word) => setWordFilters((prev) => prev.filter((w) => w !== word));

  const submitBan = () => {
    if (!banModal || !banForm.reason) return;
    const expires = banForm.type === 'temporary'
      ? new Date(Date.now() + banForm.days * 86400000) : null;
    setBans((prev) => [...prev, {
      id: `b${Date.now()}`,
      user: banModal.user,
      email: `${banModal.user}@example.com`,
      type: banForm.type,
      reason: banForm.reason,
      expires,
      by: 'mod_you',
      date: new Date(),
    }]);
    handleAction(banModal.id, 'REJECTED');
    setBanModal(null);
    setBanForm({ type: 'temporary', reason: '', days: 7 });
  };

  const tabs = [
    { id: 'queue', label: `Queue (${queue.length})` },
    { id: 'bans', label: 'Ban Management' },
    { id: 'chat', label: 'Chat Logs' },
    { id: 'history', label: 'Action History' },
    { id: 'filters', label: 'Auto Filters' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <Shield size={20} className="text-amber-400" />
        <h1 className="text-lg font-bold">Moderator Dashboard</h1>
        {queue.length > 0 && (
          <span className="ml-auto text-xs bg-red-600 text-white rounded-full px-2 py-0.5 font-bold">
            {queue.length} pending
          </span>
        )}
      </div>

      <div className="flex gap-1 px-6 pt-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.id ? 'bg-amber-700 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-6 py-6 space-y-4">
        {/* ── Moderation Queue ── */}
        {tab === 'queue' && (
          queue.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              <CheckCircle size={40} className="mx-auto mb-3 text-green-700" />
              <p className="font-medium">Queue is clear!</p>
              <p className="text-sm mt-1">All reported content has been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => (
                <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded capitalize">{item.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${SEVERITY_COLORS[item.severity]}`}>
                        {item.severity}
                      </span>
                      <span className="text-xs text-gray-600">by {item.reported_by}</span>
                    </div>
                    <span className="text-xs text-gray-600 whitespace-nowrap">{format(item.date, 'MMM d, HH:mm')}</span>
                  </div>
                  <p className="text-sm text-gray-300 bg-gray-800 rounded-lg p-3 mb-3 border border-gray-700">
                    {item.content}
                  </p>
                  <p className="text-xs text-gray-600 mb-3">User: <span className="text-gray-400">{item.user}</span></p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleAction(item.id, 'APPROVED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-800 hover:bg-green-700 text-green-200 rounded-lg text-sm transition-colors"
                    >
                      <CheckCircle size={13} /> Approve
                    </button>
                    <button
                      onClick={() => handleAction(item.id, 'REJECTED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-200 rounded-lg text-sm transition-colors"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                    <button
                      onClick={() => setBanModal(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-amber-400 border border-amber-800 rounded-lg text-sm transition-colors"
                    >
                      <Ban size={13} /> Ban User
                    </button>
                    <button
                      onClick={() => handleAction(item.id, 'ESCALATED')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-violet-400 border border-violet-800 rounded-lg text-sm transition-colors"
                    >
                      <ArrowUpCircle size={13} /> Escalate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Ban Management ── */}
        {tab === 'bans' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-800">
              {bans.length === 0 && (
                <p className="p-6 text-gray-600 text-sm">No active bans.</p>
              )}
              {bans.map((b) => (
                <div key={b.id} className="p-4 flex items-start gap-3">
                  <Ban size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-200">{b.user}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        b.type === 'permanent' ? 'text-red-400 bg-red-950 border border-red-800' : 'text-amber-400 bg-amber-950 border border-amber-800'
                      }`}>{b.type}</span>
                    </div>
                    <p className="text-xs text-gray-500">Reason: {b.reason}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      By {b.by} on {format(b.date, 'MMM d, yyyy')}
                      {b.expires && ` — Expires ${format(b.expires, 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setBans((prev) => prev.filter((ban) => ban.id !== b.id))}
                    className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 border border-green-800 px-2 py-1 rounded-lg transition-colors"
                  >
                    <CheckCircle size={11} /> Unban
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Chat Logs ── */}
        {tab === 'chat' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex items-center gap-2">
              <Search size={14} className="text-gray-500" />
              <input
                type="text"
                placeholder="Search chat logs by user or content..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-600 outline-none"
              />
            </div>
            <div className="p-6 text-center text-gray-600">
              <MessageSquare size={32} className="mx-auto mb-2 text-gray-700" />
              <p className="text-sm">Chat log viewer — connect to your logging backend</p>
              <p className="text-xs mt-1">Query: <span className="font-mono text-gray-500">{chatSearch || '(all)'}</span></p>
            </div>
          </div>
        )}

        {/* ── History ── */}
        {tab === 'history' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-800">
              {history.map((h) => (
                <div key={h.id} className="p-4 flex items-center gap-3 hover:bg-gray-800/30 transition-colors">
                  <span className={`text-xs font-bold w-20 ${ACTION_COLORS[h.action] || 'text-gray-400'}`}>{h.action}</span>
                  <span className="text-sm text-gray-300 flex-1">{h.target}</span>
                  <span className="text-xs text-gray-600">{h.by}</span>
                  <span className="text-xs text-gray-600 whitespace-nowrap">{format(h.date, 'MMM d, HH:mm')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Auto Filters ── */}
        {tab === 'filters' && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Word/Phrase Filters</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addWordFilter()}
                placeholder="Add word or phrase..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 outline-none focus:border-amber-500"
              />
              <button
                onClick={addWordFilter}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm rounded-lg transition-colors"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {wordFilters.map((w) => (
                <div key={w} className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-full px-3 py-1.5 text-sm text-gray-300">
                  <span className="font-mono">{w}</span>
                  <button onClick={() => removeWordFilter(w)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <XCircle size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ban modal */}
      {banModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Ban size={18} className="text-red-400" /> Ban User</h3>
            <p className="text-sm text-gray-400 mb-4">User: <span className="text-gray-200">{banModal.user}</span></p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ban Type</label>
                <select
                  value={banForm.type}
                  onChange={(e) => setBanForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                >
                  <option value="temporary">Temporary</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
              {banForm.type === 'temporary' && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Duration (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={banForm.days}
                    onChange={(e) => setBanForm((f) => ({ ...f, days: Number(e.target.value) }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Reason</label>
                <textarea
                  value={banForm.reason}
                  onChange={(e) => setBanForm((f) => ({ ...f, reason: e.target.value }))}
                  rows={3}
                  placeholder="Enter reason for ban..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 outline-none resize-none focus:border-red-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBanModal(null)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors">Cancel</button>
              <button onClick={submitBan} className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors">Apply Ban</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
