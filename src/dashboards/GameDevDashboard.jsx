/**
 * Nexus AI Pro — Game Dev & Project Tracking Dashboard
 * Coding, game dev, AR/VR/3D. Connectors for Unreal, Epic, PlayStation, Xbox, Ubisoft.
 * Real-time achievement and progress tracking.
 * date: 2026-06-08
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Gamepad2, Code, Layers, Trophy, Target, Plus, ChevronRight, Users, Calendar, GitBranch, Zap, Star, RefreshCw, CheckCircle, Circle, Clock } from 'lucide-react';

// ── Platform configs ──────────────────────────────────────────────────────────

const GAME_PLATFORMS = [
  { id: 'unreal', label: 'Unreal Engine', icon: '🔵', color: '#0052CC' },
  { id: 'epic', label: 'Epic Games', icon: '⚫', color: '#2D2D2D' },
  { id: 'unity', label: 'Unity', icon: '⬛', color: '#222' },
  { id: 'playstation', label: 'PlayStation', icon: '🎮', color: '#003791' },
  { id: 'xbox', label: 'Xbox', icon: '🟢', color: '#107C10' },
  { id: 'ubisoft', label: 'Ubisoft Connect', icon: '🔷', color: '#0066CC' },
  { id: 'steam', label: 'Steam', icon: '💻', color: '#1B2838' },
];

const PROJECT_TYPES = [
  { id: 'coding', label: 'Coding', icon: <Code size={14} /> },
  { id: 'game', label: 'Game', icon: <Gamepad2 size={14} /> },
  { id: 'ar_vr', label: 'AR/VR', icon: '🥽' },
  { id: '3d', label: '3D', icon: <Layers size={14} /> },
  { id: 'mobile', label: 'Mobile', icon: '📱' },
  { id: 'web', label: 'Web', icon: '🌐' },
];

const STATUS_COLORS = {
  planning: 'text-blue-400 bg-blue-400/10',
  in_progress: 'text-yellow-400 bg-yellow-400/10',
  testing: 'text-purple-400 bg-purple-400/10',
  gold: 'text-amber-400 bg-amber-400/10',
  shipped: 'text-emerald-400 bg-emerald-400/10',
  on_hold: 'text-white/40 bg-white/5',
  cancelled: 'text-red-400/60 bg-red-400/5',
};

// ── Components ────────────────────────────────────────────────────────────────

function ProgressBar({ value = 0, color = '#6366f1' }) {
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
}

function AchievementBadge({ achievement }) {
  return (
    <div className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${achievement.earned ? 'border-amber-500/40 bg-amber-500/10' : 'border-white/10 bg-white/3 opacity-50'}`}>
      <span className="text-xl">{achievement.icon}</span>
      <div className="min-w-0">
        <div className="text-xs font-medium text-white/90 truncate">{achievement.name}</div>
        <div className="text-[10px] text-white/40 truncate">{achievement.desc}</div>
        {achievement.earned && <div className="text-[10px] text-amber-400">+{achievement.xp} XP</div>}
      </div>
    </div>
  );
}

function ProjectCard({ project, onSelect, onUpdateStatus }) {
  const typeCfg = PROJECT_TYPES.find(t => t.id === project.type) || PROJECT_TYPES[0];
  const statusClass = STATUS_COLORS[project.status] || 'text-white/40 bg-white/5';
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-colors cursor-pointer group" onClick={() => onSelect(project)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/40">{typeof typeCfg.icon === 'string' ? typeCfg.icon : typeCfg.icon}</span>
            <span className="text-xs text-white/40">{typeCfg.label}</span>
          </div>
          <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">{project.name}</h3>
          {project.description && <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{project.description}</p>}
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-lg font-medium capitalize shrink-0 ml-3 ${statusClass}`}>{project.status?.replace('_', ' ')}</span>
      </div>
      <ProgressBar value={project.progress || 0} />
      <div className="flex items-center justify-between mt-2 text-xs text-white/30">
        <span>{project.progress || 0}% complete</span>
        <div className="flex items-center gap-2">
          {project.teamMembers?.length > 1 && <span className="flex items-center gap-1"><Users size={10} /> {project.teamMembers.length}</span>}
          <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
      {project.tags?.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {project.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-white/5 text-white/40 rounded">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function NewProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '', type: 'coding', tags: '' });
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#111] border border-white/20 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">New Project</h3>
        <div className="space-y-3">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
            placeholder="Project name..." />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 resize-none"
            placeholder="Description..." rows={3} />
          <div className="grid grid-cols-3 gap-2">
            {PROJECT_TYPES.map(t => (
              <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs border transition-colors ${form.type === t.id ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-white/10 text-white/50 hover:border-white/20'}`}>
                <span>{typeof t.icon === 'string' ? t.icon : null}</span> {t.label}
              </button>
            ))}
          </div>
          <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
            placeholder="Tags (comma separated)..." />
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/20 text-sm text-white/70 hover:bg-white/5">Cancel</button>
          <button
            onClick={() => { onCreate({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) }); onClose(); }}
            disabled={!form.name.trim()}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-medium text-white"
          >Create</button>
        </div>
      </div>
    </div>
  );
}

function PlatformConnectModal({ onClose, onConnect }) {
  const [selected, setSelected] = useState(null);
  const [creds, setCreds] = useState({ accessToken: '', accountId: '' });
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#111] border border-white/20 rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">Connect Game Platform</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {GAME_PLATFORMS.map(p => (
            <button key={p.id} onClick={() => setSelected(p.id)}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs text-left transition-colors ${selected === p.id ? 'border-indigo-500 bg-indigo-500/20 text-white' : 'border-white/10 text-white/50 hover:border-white/20'}`}>
              <span>{p.icon}</span> {p.label}
            </button>
          ))}
        </div>
        {selected && (
          <div className="space-y-2">
            <input value={creds.accessToken} onChange={e => setCreds(c => ({ ...c, accessToken: e.target.value }))} type="password"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
              placeholder="Access token / OAuth token..." />
            <input value={creds.accountId} onChange={e => setCreds(c => ({ ...c, accountId: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500"
              placeholder="Account / Developer ID (optional)..." />
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/20 text-sm text-white/70">Cancel</button>
          <button
            onClick={() => { if (selected) { onConnect(selected, creds); onClose(); } }}
            disabled={!selected || !creds.accessToken}
            className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-sm font-medium text-white"
          >Connect</button>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function GameDevDashboard({ userId, socket }) {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [platformStats, setPlatformStats] = useState({});
  const [selected, setSelected] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [activeTab, setActiveTab] = useState('projects');
  const [showNewProject, setShowNewProject] = useState(false);
  const [showPlatformConnect, setShowPlatformConnect] = useState(false);
  const [loading, setLoading] = useState(false);

  const auth = { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, projRes, achRes, platRes] = await Promise.all([
        fetch('/api/projects/stats', { headers: auth }),
        fetch('/api/projects', { headers: auth }),
        fetch('/api/projects/achievements', { headers: auth }),
        fetch('/api/projects/platforms', { headers: auth }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (projRes.ok) setProjects(await projRes.json());
      if (achRes.ok) setAchievements(await achRes.json());
      if (platRes.ok) setConnectedPlatforms(await platRes.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!socket) return;
    socket.on('achievement:earned', (achievement) => {
      setAchievements(prev => prev.map(a => a.id === achievement.id ? { ...a, earned: true } : a));
    });
    return () => socket.off('achievement:earned');
  }, [socket]);

  const handleSelectProject = async (project) => {
    setSelected(project);
    try {
      const res = await fetch(`/api/projects/${project.id}/milestones`, { headers: auth });
      if (res.ok) setMilestones(await res.json());
    } catch {}
  };

  const handleCreateProject = async (data) => {
    try {
      const res = await fetch('/api/projects', { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (res.ok) { const p = await res.json(); setProjects(prev => [p, ...prev]); }
    } catch {}
  };

  const handleConnectPlatform = async (platform, credentials) => {
    try {
      await fetch('/api/projects/platforms/connect', {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, ...credentials }),
      });
      await load();
    } catch {}
  };

  const loadPlatformStats = async (platform) => {
    try {
      const res = await fetch(`/api/projects/platforms/${platform}/stats`, { headers: auth });
      if (res.ok) { const d = await res.json(); setPlatformStats(prev => ({ ...prev, [platform]: d })); }
    } catch {}
  };

  const tabs = [
    { id: 'projects', label: 'Projects', icon: Code },
    { id: 'platforms', label: 'Platforms', icon: Gamepad2 },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto text-white space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Gamepad2 className="text-purple-400" size={24} /> Game Dev & Project Tracker</h1>
          <p className="text-white/50 text-sm mt-0.5">Manage coding, game dev, AR/VR, and 3D projects with platform integrations</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10">
            <RefreshCw size={14} className={loading ? 'animate-spin text-indigo-400' : 'text-white/50'} />
          </button>
          <button onClick={() => setShowNewProject(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs text-purple-300">
            <Plus size={12} /> New Project
          </button>
        </div>
      </div>

      {/* XP & stats bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total Projects', value: stats.total || 0, icon: Code, color: '#6366f1' },
            { label: 'In Progress', value: stats.byStatus?.in_progress || 0, icon: Zap, color: '#f59e0b' },
            { label: 'Shipped', value: stats.byStatus?.shipped || 0, icon: CheckCircle, color: '#10b981' },
            { label: 'Platforms', value: stats.connectedPlatforms || 0, icon: Gamepad2, color: '#a78bfa' },
            { label: 'Total XP', value: (stats.xp || 0).toLocaleString(), icon: Star, color: '#fbbf24' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/40">{s.label}</span>
                <s.icon size={12} style={{ color: s.color }} />
              </div>
              <div className="text-xl font-bold text-white">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center transition-colors ${activeTab === t.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'}`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Projects tab ── */}
      {activeTab === 'projects' && (
        <div className={`grid gap-4 ${selected ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
          <div className="space-y-3">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onSelect={handleSelectProject} />
            ))}
            {projects.length === 0 && (
              <div className="text-center py-16 text-white/30">
                <Gamepad2 className="mx-auto mb-3 opacity-30" size={40} />
                <p>No projects yet. Create your first one!</p>
              </div>
            )}
          </div>

          {/* Project detail */}
          {selected && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                  <p className="text-sm text-white/50 mt-0.5">{selected.description}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white/60 text-xl leading-none">×</button>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-white/40">
                  <span>Progress</span><span>{selected.progress || 0}%</span>
                </div>
                <ProgressBar value={selected.progress || 0} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/3 rounded-lg p-2"><span className="text-white/40">Type</span><div className="text-white capitalize mt-0.5">{selected.type}</div></div>
                <div className="bg-white/3 rounded-lg p-2"><span className="text-white/40">Status</span><div className={`capitalize mt-0.5 ${STATUS_COLORS[selected.status]?.split(' ')[0]}`}>{selected.status?.replace('_', ' ')}</div></div>
                <div className="bg-white/3 rounded-lg p-2"><span className="text-white/40">Team</span><div className="text-white mt-0.5">{selected.teamMembers?.length || 1} member(s)</div></div>
                <div className="bg-white/3 rounded-lg p-2"><span className="text-white/40">Created</span><div className="text-white mt-0.5">{new Date(selected.createdAt).toLocaleDateString()}</div></div>
              </div>
              {/* Milestones */}
              <div>
                <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Milestones</div>
                {milestones.length === 0 && <div className="text-xs text-white/20 text-center py-4">No milestones</div>}
                {milestones.map(m => (
                  <div key={m.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                    {m.completedAt ? <CheckCircle size={12} className="text-emerald-400 shrink-0" /> : <Circle size={12} className="text-white/20 shrink-0" />}
                    <span className={`text-xs ${m.completedAt ? 'text-white/50 line-through' : 'text-white/80'}`}>{m.title}</span>
                    {m.dueDate && <span className="text-[10px] text-white/30 ml-auto"><Calendar size={9} className="inline mr-0.5" />{new Date(m.dueDate).toLocaleDateString()}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Platforms tab ── */}
      {activeTab === 'platforms' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowPlatformConnect(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-xs text-purple-300">
              <Plus size={12} /> Connect Platform
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {GAME_PLATFORMS.map(p => {
              const conn = connectedPlatforms.find(c => c.platform === p.id);
              const st = platformStats[p.id];
              return (
                <div key={p.id} className={`rounded-2xl p-4 border transition-colors ${conn ? 'border-white/20 bg-white/5' : 'border-dashed border-white/10 opacity-50'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{p.icon}</span>
                    <span className="text-sm font-semibold text-white">{p.label}</span>
                  </div>
                  {conn ? (
                    <>
                      <div className="text-xs text-emerald-400 mb-2">✓ Connected</div>
                      {st ? (
                        <div className="text-xs text-white/50 space-y-1">
                          {st.gamesPublished !== undefined && <div>Games: {st.gamesPublished}</div>}
                          {st.totalDownloads !== undefined && <div>Downloads: {st.totalDownloads?.toLocaleString()}</div>}
                          {st.gamerscore !== undefined && <div>Gamerscore: {st.gamerscore?.toLocaleString()}</div>}
                        </div>
                      ) : (
                        <button onClick={() => loadPlatformStats(p.id)} className="text-xs text-indigo-400 hover:text-indigo-300">Load stats →</button>
                      )}
                    </>
                  ) : (
                    <button onClick={() => setShowPlatformConnect(true)} className="text-xs text-white/40 hover:text-white/60">+ Connect</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Achievements tab ── */}
      {activeTab === 'achievements' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-white/50">{achievements.filter(a => a.earned).length} / {achievements.length} earned · {(stats?.xp || 0).toLocaleString()} XP</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {achievements.map(a => <AchievementBadge key={a.id} achievement={a} />)}
          </div>
        </div>
      )}

      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} onCreate={handleCreateProject} />}
      {showPlatformConnect && <PlatformConnectModal onClose={() => setShowPlatformConnect(false)} onConnect={handleConnectPlatform} />}
    </div>
  );
}
