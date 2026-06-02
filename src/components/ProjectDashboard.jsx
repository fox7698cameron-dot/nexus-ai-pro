// src/components/ProjectDashboard.jsx
// Date: 2026-06-02
// Real-time project tracking: coding, game dev, AR/VR/3D
// Platform connectors, milestone tracking, achievement system

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Gamepad2, Code, Box, Layers, Trophy,
  CheckCircle2, Circle, Clock, AlertCircle, GitBranch,
  Cpu, Link2, RefreshCw, ChevronDown, ChevronRight,
  Hammer, BarChart3, Zap, Target,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TYPE_ICONS = {
  coding: Code,
  game: Gamepad2,
  ar_vr: Box,
  '3d': Layers,
  mobile: Cpu,
  web: GitBranch,
  tool: Hammer,
  plugin: Zap,
};

const STATUS_STYLES = {
  pending: { color: 'text-gray-400', icon: Circle, bg: 'bg-gray-800' },
  in_progress: { color: 'text-blue-400', icon: Clock, bg: 'bg-blue-900/20' },
  completed: { color: 'text-green-400', icon: CheckCircle2, bg: 'bg-green-900/20' },
  blocked: { color: 'text-red-400', icon: AlertCircle, bg: 'bg-red-900/20' },
};

const CONNECTOR_LOGOS = {
  unreal: '🎮', unity: '🔵', godot: '🤖', epic_games: '🏆',
  sony_psn: '🎮', microsoft_xbox: '💚', ubisoft: '🔷', steam: '🎲',
};

function ProgressBar({ value }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{
          width: `${value}%`,
          background: value === 100 ? '#10b981' : 'linear-gradient(90deg, #8b5cf6, #6366f1)',
        }}
      />
    </div>
  );
}

function MilestoneItem({ milestone, projectId, onUpdate, token }) {
  const styles = STATUS_STYLES[milestone.status] || STATUS_STYLES.pending;
  const Icon = styles.icon;

  const cycleStatus = async () => {
    const order = ['pending', 'in_progress', 'completed', 'blocked'];
    const next = order[(order.indexOf(milestone.status) + 1) % order.length];
    await fetch(`/api/projects/${projectId}/milestones/${milestone.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: next }),
    });
    onUpdate();
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${styles.bg} border border-transparent hover:border-gray-700 cursor-pointer`} onClick={cycleStatus}>
      <Icon size={16} className={`mt-0.5 flex-shrink-0 ${styles.color}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white font-medium">{milestone.title}</div>
        {milestone.description && <div className="text-xs text-gray-400 mt-0.5 truncate">{milestone.description}</div>}
        {milestone.dueDate && <div className="text-xs text-gray-500 mt-1">Due: {milestone.dueDate}</div>}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full ${styles.bg} ${styles.color} border border-current border-opacity-30`}>
        {milestone.status.replace('_', ' ')}
      </span>
    </div>
  );
}

function ProjectCard({ project, selected, onSelect }) {
  const Icon = TYPE_ICONS[project.type] || Code;
  return (
    <button
      onClick={() => onSelect(project)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${selected ? 'border-violet-500 bg-violet-900/20' : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-violet-400" />
        <span className="font-medium text-white truncate">{project.name}</span>
      </div>
      <div className="text-xs text-gray-400 mb-2 capitalize">{project.type.replace('_', '/')}</div>
      <ProgressBar value={project.progress} />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{project.progress}% complete</span>
        <span>{project.milestones?.length || 0} milestones</span>
      </div>
    </button>
  );
}

function NewProjectModal({ onClose, onCreate, token }) {
  const [form, setForm] = useState({ name: '', type: 'coding', description: '', technologies: '' });
  const { t } = useTranslation();

  const submit = async () => {
    if (!form.name.trim()) return;
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: form.name,
        type: form.type,
        description: form.description,
        technologies: form.technologies.split(',').map(s => s.trim()).filter(Boolean),
      }),
    });
    onCreate();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-white mb-4">{t('projects.newProject')}</h3>
        <input
          type="text"
          placeholder={t('projects.projectName')}
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 mb-3"
        />
        <select
          value={form.type}
          onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 mb-3"
        >
          <option value="coding">Coding</option>
          <option value="game">Game Development</option>
          <option value="ar_vr">AR / VR</option>
          <option value="3d">3D Project</option>
          <option value="mobile">Mobile App</option>
          <option value="web">Web App</option>
          <option value="tool">Dev Tool</option>
          <option value="plugin">Plugin</option>
        </select>
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 mb-3 h-20 resize-none"
        />
        <input
          type="text"
          placeholder="Technologies (comma-separated)"
          value={form.technologies}
          onChange={e => setForm(f => ({ ...f, technologies: e.target.value }))}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 mb-4"
        />
        <div className="flex gap-2">
          <button onClick={submit} className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm">Create</button>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ProjectDetail({ project, token, onRefresh }) {
  const [milestoneForm, setMilestoneForm] = useState({ title: '', dueDate: '' });
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [statsForm, setStatsForm] = useState({ linesAdded: '', commits: '', bugsFixed: '', hoursLogged: '' });
  const [showStats, setShowStats] = useState(false);
  const [showConnector, setShowConnector] = useState(false);
  const [connectorForm, setConnectorForm] = useState({ platform: 'unreal', accessToken: '' });

  const addMilestone = async () => {
    if (!milestoneForm.title.trim()) return;
    await fetch(`/api/projects/${project.id}/milestones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(milestoneForm),
    });
    setMilestoneForm({ title: '', dueDate: '' });
    setShowMilestoneForm(false);
    onRefresh();
  };

  const logStats = async () => {
    await fetch(`/api/projects/${project.id}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(statsForm),
    });
    setStatsForm({ linesAdded: '', commits: '', bugsFixed: '', hoursLogged: '' });
    setShowStats(false);
    onRefresh();
  };

  const connectPlatform = async () => {
    if (!connectorForm.accessToken.trim()) return;
    await fetch(`/api/projects/${project.id}/connectors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(connectorForm),
    });
    setConnectorForm({ platform: 'unreal', accessToken: '' });
    setShowConnector(false);
    onRefresh();
  };

  const Icon = TYPE_ICONS[project.type] || Code;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-violet-900/30">
          <Icon size={20} className="text-violet-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{project.name}</h3>
          <span className="text-xs text-gray-400 capitalize">{project.type.replace('_', '/')} project</span>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Overall Progress</span>
          <span className="text-white font-medium">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Lines of Code', value: (project.linesOfCode || 0).toLocaleString(), icon: Code, color: '#8b5cf6' },
          { label: 'Commits', value: project.commits || 0, icon: GitBranch, color: '#06b6d4' },
          { label: 'Bugs Fixed', value: project.bugsFixed || 0, icon: Target, color: '#10b981' },
          { label: 'Hours Logged', value: project.hoursLogged || 0, icon: Clock, color: '#f59e0b' },
        ].map(s => {
          const SIcon = s.icon;
          return (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-2">
              <SIcon size={16} style={{ color: s.color }} />
              <div>
                <div className="text-xs text-gray-400">{s.label}</div>
                <div className="text-lg font-bold text-white">{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Log stats button */}
      <button onClick={() => setShowStats(v => !v)} className="w-full text-sm py-2 rounded-lg border border-gray-700 text-gray-300 hover:border-violet-500 hover:text-violet-300 transition-colors flex items-center justify-center gap-2">
        <BarChart3 size={14} /> Log Development Stats
        {showStats ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {showStats && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          {[
            { key: 'linesAdded', placeholder: 'Lines added' },
            { key: 'commits', placeholder: 'Commits' },
            { key: 'bugsFixed', placeholder: 'Bugs fixed' },
            { key: 'hoursLogged', placeholder: 'Hours logged' },
          ].map(f => (
            <input key={f.key} type="number" min="0" placeholder={f.placeholder}
              value={statsForm[f.key]} onChange={e => setStatsForm(s => ({ ...s, [f.key]: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 text-sm"
            />
          ))}
          <button onClick={logStats} className="w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm">Save Stats</button>
        </div>
      )}

      {/* Milestones */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300">Milestones</h4>
          <button onClick={() => setShowMilestoneForm(v => !v)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300">
            <Plus size={14} />
          </button>
        </div>
        {showMilestoneForm && (
          <div className="mb-3 space-y-2">
            <input type="text" placeholder="Milestone title" value={milestoneForm.title}
              onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 text-sm"
            />
            <input type="date" value={milestoneForm.dueDate}
              onChange={e => setMilestoneForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 text-sm"
            />
            <button onClick={addMilestone} className="w-full py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs">Add Milestone</button>
          </div>
        )}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(project.milestones || []).length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-2">No milestones yet. Click + to add one.</p>
          ) : (
            project.milestones.map(m => (
              <MilestoneItem key={m.id} milestone={m} projectId={project.id} token={token} onUpdate={onRefresh} />
            ))
          )}
        </div>
      </div>

      {/* Platform connectors */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2"><Link2 size={14} /> Platform Connectors</h4>
          <button onClick={() => setShowConnector(v => !v)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300">
            <Plus size={14} />
          </button>
        </div>
        {showConnector && (
          <div className="mb-3 space-y-2">
            <select value={connectorForm.platform} onChange={e => setConnectorForm(f => ({ ...f, platform: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 text-sm"
            >
              {Object.entries(CONNECTOR_LOGOS).map(([k, v]) => (
                <option key={k} value={k}>{v} {k.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
            <input type="password" placeholder="Platform access token"
              value={connectorForm.accessToken} onChange={e => setConnectorForm(f => ({ ...f, accessToken: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 text-sm"
            />
            <button onClick={connectPlatform} className="w-full py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs">Connect</button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {(project.connectors || []).length === 0 ? (
            <p className="text-xs text-gray-500">No platform connectors yet.</p>
          ) : (
            project.connectors.map(c => (
              <span key={c.platform} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-800 text-xs text-gray-300">
                {CONNECTOR_LOGOS[c.platform] || '🔗'} {c.platform.replace('_', ' ').toUpperCase()}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Achievements */}
      {(project.achievements || []).length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-yellow-400" /> Achievements
          </h4>
          <div className="flex flex-wrap gap-2">
            {project.achievements.map((id, i) => (
              <span key={i} className="px-2 py-1 rounded-lg bg-yellow-900/30 text-yellow-400 text-xs">🏆 Achievement</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectDashboard({ token }) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        if (selected) {
          const fresh = data.projects.find(p => p.id === selected.id);
          if (fresh) setSelected(fresh);
        }
      }
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, [token, selected]);

  useEffect(() => { fetchProjects(); }, []);
  useEffect(() => {
    const interval = setInterval(fetchProjects, 15000);
    return () => clearInterval(interval);
  }, [fetchProjects]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="animate-spin text-violet-400" size={24} /></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{t('projects.title')}</h2>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm transition-colors">
          <Plus size={14} /> {t('projects.newProject')}
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Gamepad2 size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No projects yet</p>
          <p className="text-sm mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} selected={selected?.id === p.id} onSelect={setSelected} />
            ))}
          </div>
          <div className="lg:col-span-2">
            {selected ? (
              <ProjectDetail project={selected} token={token} onRefresh={fetchProjects} />
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500">Select a project</div>
            )}
          </div>
        </div>
      )}

      {showNew && <NewProjectModal token={token} onClose={() => setShowNew(false)} onCreate={fetchProjects} />}
    </div>
  );
}
