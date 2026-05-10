// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  Rocket, Code, Gamepad2, Box, Smartphone, Globe, Brain, Zap,
  Plus, Edit3, Trash2, ChevronRight, Clock, Bug, CheckCircle,
  TrendingUp, BarChart3, GitBranch, Layers, Cpu
} from 'lucide-react';

const API = '/api';

const PROJECT_TYPES = [
  { key: 'all', label: 'All', icon: Layers },
  { key: 'coding', label: 'Coding', icon: Code },
  { key: 'game-dev', label: 'Game Dev', icon: Gamepad2 },
  { key: 'ar-vr', label: 'AR/VR', icon: Box },
  { key: '3d', label: '3D', icon: Cpu },
  { key: 'mobile', label: 'Mobile', icon: Smartphone },
  { key: 'web', label: 'Web', icon: Globe },
  { key: 'ai', label: 'AI', icon: Brain },
  { key: 'blockchain', label: 'Blockchain', icon: Zap },
];

const STATUSES = ['planning', 'in-progress', 'testing', 'complete'];
const STATUS_LABELS = { planning: 'Planning', 'in-progress': 'In Progress', testing: 'Testing', complete: 'Complete' };
const STATUS_COLORS = {
  planning: 'border-gray-600 bg-gray-800/40',
  'in-progress': 'border-blue-600 bg-blue-900/20',
  testing: 'border-yellow-600 bg-yellow-900/20',
  complete: 'border-green-600 bg-green-900/20',
};
const STATUS_HEADER_COLORS = {
  planning: 'text-gray-400 border-gray-600',
  'in-progress': 'text-blue-400 border-blue-600',
  testing: 'text-yellow-400 border-yellow-600',
  complete: 'text-green-400 border-green-600',
};
const TYPE_COLORS = {
  coding: 'bg-blue-500/20 text-blue-300',
  'game-dev': 'bg-purple-500/20 text-purple-300',
  'ar-vr': 'bg-cyan-500/20 text-cyan-300',
  '3d': 'bg-orange-500/20 text-orange-300',
  mobile: 'bg-green-500/20 text-green-300',
  web: 'bg-sky-500/20 text-sky-300',
  ai: 'bg-pink-500/20 text-pink-300',
  blockchain: 'bg-yellow-500/20 text-yellow-300',
};
const ARVR_3D = ['ar-vr', '3d'];

function ProgressBar({ value, animated }) {
  return (
    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 ${animated ? 'transition-all duration-700' : ''}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs text-gray-400">{label}</div>
      </div>
    </div>
  );
}

function SvgArc({ value, max, label, color }) {
  const pct = Math.min(1, value / max);
  const r = 40;
  const cx = 60, cy = 60;
  const startAngle = -210;
  const sweepAngle = 240;
  function polar(angle, radius) {
    const a = (angle * Math.PI) / 180;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  }
  function arcPath(start, sweep) {
    const end = start + sweep;
    const [sx, sy] = polar(start, r);
    const [ex, ey] = polar(end, r);
    const large = sweep > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
  }
  return (
    <svg viewBox="0 0 120 90" className="w-28 h-20">
      <path d={arcPath(startAngle, sweepAngle)} fill="none" stroke="#374151" strokeWidth="8" strokeLinecap="round" />
      <path d={arcPath(startAngle, sweepAngle * pct)} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="13" fill="white" fontWeight="bold">{value}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize="7" fill="#9CA3AF">{label}</text>
    </svg>
  );
}

function BurndownChart({ milestones }) {
  const total = milestones.length || 1;
  const done = milestones.filter(m => m.completed).length;
  const w = 260, h = 100, pad = 20;
  const pts = milestones.map((m, i) => {
    const x = pad + (i / Math.max(total - 1, 1)) * (w - pad * 2);
    const remaining = total - milestones.slice(0, i + 1).filter(mm => mm.completed).length;
    const y = pad + (remaining / total) * (h - pad * 2);
    return `${x},${y}`;
  });
  const ideal = `${pad},${pad} ${w - pad},${h - pad}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24 mt-2">
      <polyline points={ideal} fill="none" stroke="#374151" strokeWidth="1" strokeDasharray="4,3" />
      {pts.length > 1 && <polyline points={pts.join(' ')} fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />}
      <text x={pad} y={h - 4} fontSize="8" fill="#6B7280">0</text>
      <text x={w - pad} y={h - 4} fontSize="8" fill="#6B7280">End</text>
      <text x={pad} y={pad + 8} fontSize="8" fill="#6B7280">{total}</text>
    </svg>
  );
}

function ProjectCard({ project, onEdit, onDelete, onView, updated }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-all duration-500 ${updated ? 'ring-2 ring-blue-500' : ''} ${STATUS_COLORS[project.status]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white truncate">{project.name}</div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[project.type] || 'bg-gray-600 text-gray-300'}`}>
            {project.type}
          </span>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onView(project)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <ChevronRight size={14} />
          </button>
          <button onClick={() => onEdit(project)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <Edit3 size={14} />
          </button>
          <button onClick={() => onDelete(project.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} animated />
      </div>

      {project.techStack?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {project.techStack.slice(0, 4).map(t => (
            <span key={t} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{t}</span>
          ))}
          {project.techStack.length > 4 && <span className="text-xs text-gray-500">+{project.techStack.length - 4}</span>}
        </div>
      )}

      <div className="flex gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><Clock size={11} />{project.timeSpentHours}h</span>
        <span className="flex items-center gap-1 text-red-400"><Bug size={11} />{project.bugsOpen}</span>
        <span className="flex items-center gap-1 text-green-400"><CheckCircle size={11} />{project.bugsFixed}</span>
        {project.commits > 0 && <span className="flex items-center gap-1"><GitBranch size={11} />{project.commits}</span>}
      </div>
    </div>
  );
}

function NewProjectModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'coding', platform: '', engine: '', techStack: '', tags: '', targetDate: '', description: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = e => {
    e.preventDefault();
    onSave({
      ...form,
      techStack: form.techStack.split(',').map(s => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6">
        <h2 className="text-xl font-bold text-white mb-5">New Project</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Project Name *</label>
            <input value={form.name} onChange={set('name')} required placeholder="My Awesome Project"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Type *</label>
              <select value={form.type} onChange={set('type')}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                {PROJECT_TYPES.filter(t => t.key !== 'all').map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Target Date</label>
              <input type="date" value={form.targetDate} onChange={set('targetDate')}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Platform</label>
              <input value={form.platform} onChange={set('platform')} placeholder="PC, iOS, PS5..."
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Engine / Framework</label>
              <input value={form.engine} onChange={set('engine')} placeholder="React, Unreal, Unity..."
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Tech Stack (comma-separated)</label>
            <input value={form.techStack} onChange={set('techStack')} placeholder="React, Node.js, PostgreSQL"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Tags (comma-separated)</label>
            <input value={form.tags} onChange={set('tags')} placeholder="v2, priority, client"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={3} placeholder="Project overview..."
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="flex gap-3 justify-end mt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProjectModal({ project, onClose, onSave }) {
  const [form, setForm] = useState({
    name: project.name || '',
    status: project.status || 'planning',
    progress: project.progress || 0,
    bugsOpen: project.bugsOpen || 0,
    bugsFixed: project.bugsFixed || 0,
    linesOfCode: project.linesOfCode || 0,
    description: project.description || '',
  });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-white mb-5">Edit Project</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Name</label>
            <input value={form.name} onChange={set('name')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Status</label>
              <select value={form.status} onChange={set('status')}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Progress %</label>
              <input type="number" min={0} max={100} value={form.progress} onChange={set('progress')}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Bugs Open</label>
              <input type="number" min={0} value={form.bugsOpen} onChange={set('bugsOpen')}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Bugs Fixed</label>
              <input type="number" min={0} value={form.bugsFixed} onChange={set('bugsFixed')}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Lines of Code</label>
              <input type="number" min={0} value={form.linesOfCode} onChange={set('linesOfCode')}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Description</label>
            <textarea value={form.description} onChange={set('description')} rows={2}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
          </div>
          <div className="flex gap-3 justify-end mt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={() => onSave(form)} className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ project, onClose }) {
  const [commits, setCommits] = useState([]);
  const [timeLog, setTimeLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexus:token') || '';
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/projects/${project.id}/time`, { headers }).then(r => r.json()).catch(() => []),
      project.github_repo
        ? fetch(`${API}/projects/${project.id}/commits`, { headers }).then(r => r.json()).catch(() => [])
        : Promise.resolve([]),
    ]).then(([t, c]) => { setTimeLog(t); setCommits(Array.isArray(c) ? c : []); setLoading(false); });
  }, [project.id, project.github_repo]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl p-6 my-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-white">{project.name}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[project.type] || 'bg-gray-600 text-gray-300'}`}>{project.type}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-1"><span>Progress</span><span>{project.progress}%</span></div>
          <ProgressBar value={project.progress} animated />
        </div>

        {project.description && <p className="text-sm text-gray-400 mb-5">{project.description}</p>}

        <div className="grid grid-cols-2 gap-6 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><CheckCircle size={14} />Milestones</h3>
            {project.milestones?.length === 0 && <p className="text-xs text-gray-500">No milestones yet.</p>}
            <div className="flex flex-col gap-2">
              {project.milestones?.map(m => (
                <div key={m.id} className={`flex items-start gap-2 text-xs ${m.completed ? 'text-green-400' : 'text-gray-300'}`}>
                  <CheckCircle size={12} className={`mt-0.5 shrink-0 ${m.completed ? 'text-green-400' : 'text-gray-600'}`} />
                  <span>{m.name}</span>
                </div>
              ))}
            </div>
            <BurndownChart milestones={project.milestones || []} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Clock size={14} />Time Log</h3>
            {loading && <p className="text-xs text-gray-500">Loading...</p>}
            {!loading && timeLog.length === 0 && <p className="text-xs text-gray-500">No time entries.</p>}
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {timeLog.map(e => (
                <div key={e.id} className="flex justify-between text-xs text-gray-400">
                  <span className="truncate">{e.description || 'Work session'}</span>
                  <span className="shrink-0 ml-2 text-blue-400">{e.hours}h</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {commits.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><GitBranch size={14} />Recent Commits</h3>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
              {commits.slice(0, 10).map(c => (
                <div key={c.sha} className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="font-mono text-purple-400 shrink-0">{c.sha?.slice(0, 7)}</span>
                  <span className="truncate">{c.commit?.message?.split('\n')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-4 mt-5 text-xs text-gray-400 border-t border-gray-700 pt-4">
          <span>Started: {project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}</span>
          {project.targetDate && <span>Target: {new Date(project.targetDate).toLocaleDateString()}</span>}
          <span className="flex items-center gap-1"><Bug size={11} className="text-red-400" />{project.bugsOpen} open</span>
          <span className="flex items-center gap-1"><CheckCircle size={11} className="text-green-400" />{project.bugsFixed} fixed</span>
          {project.linesOfCode > 0 && <span>{project.linesOfCode.toLocaleString()} LOC</span>}
        </div>
      </div>
    </div>
  );
}

function ArVrMetricsPanel({ projectId }) {
  const [metrics, setMetrics] = useState({ frameRate: 0, polygonCount: 0, textureMemory: 0, buildSize: 0 });
  const [form, setForm] = useState({ frameRate: '', polygonCount: '', textureMemory: '', buildSize: '' });

  const logMetric = () => {
    const token = localStorage.getItem('nexus:token') || '';
    fetch(`${API}/projects/arvr/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ projectId, ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, parseFloat(v) || 0])) }),
    }).then(() => setMetrics(m => ({ ...m, ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, parseFloat(v) || m[k]])) })));
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 mt-6">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><Cpu size={14} />AR/VR/3D Performance Metrics</h3>
      <div className="flex flex-wrap gap-4 mb-4">
        <SvgArc value={metrics.frameRate} max={120} label="FPS" color="#818CF8" />
        <SvgArc value={metrics.polygonCount / 1000} max={10000} label="K Polys" color="#34D399" />
        <SvgArc value={metrics.textureMemory} max={8192} label="MB Tex" color="#F59E0B" />
        <SvgArc value={metrics.buildSize} max={10240} label="MB Build" color="#F87171" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['frameRate', 'polygonCount', 'textureMemory', 'buildSize'].map(k => (
          <div key={k} className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</label>
            <input type="number" placeholder="0" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
              className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500" />
          </div>
        ))}
      </div>
      <button onClick={logMetric} className="mt-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition-colors">
        Log Metrics
      </button>
    </div>
  );
}

export default function ProjectTracker() {
  const [projects, setProjects] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [updatedIds, setUpdatedIds] = useState(new Set());
  const [rtConnected, setRtConnected] = useState(false);
  const [selectedArVr, setSelectedArVr] = useState(null);
  const socketRef = useRef(null);

  const token = localStorage.getItem('nexus:token') || '';
  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    loadProjects();
    const socket = io({ auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => setRtConnected(true));
    socket.on('disconnect', () => setRtConnected(false));
    socket.on('project:update', updated => {
      setProjects(prev => {
        const idx = prev.findIndex(p => p.id === updated.id);
        if (idx === -1) return [...prev, updated];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
      setUpdatedIds(s => new Set([...s, updated.id]));
      setTimeout(() => setUpdatedIds(s => { const n = new Set(s); n.delete(updated.id); return n; }), 1500);
    });
    return () => socket.disconnect();
  }, []);

  async function loadProjects() {
    const res = await fetch(`${API}/projects`, { headers: authHeaders }).catch(() => ({ ok: false }));
    if (res.ok) { const data = await res.json(); setProjects(data); }
  }

  async function createProject(data) {
    const res = await fetch(`${API}/projects`, { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) { const p = await res.json(); setProjects(prev => [...prev, p]); setShowNew(false); }
  }

  async function updateProject(id, data) {
    const res = await fetch(`${API}/projects/${id}`, { method: 'PUT', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) { const p = await res.json(); setProjects(prev => prev.map(x => x.id === id ? p : x)); setEditTarget(null); }
  }

  async function deleteProject(id) {
    if (!confirm('Delete this project?')) return;
    const res = await fetch(`${API}/projects/${id}`, { method: 'DELETE', headers: authHeaders });
    if (res.ok) setProjects(prev => prev.filter(p => p.id !== id));
  }

  const filtered = typeFilter === 'all' ? projects : projects.filter(p => p.type === typeFilter);
  const byStatus = STATUSES.reduce((acc, s) => { acc[s] = filtered.filter(p => p.status === s); return acc; }, {});

  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const hoursThisWeek = projects.reduce((sum, p) => sum + (p.timeSpentHours || 0), 0);
  const bugsFixedMonth = projects.reduce((sum, p) => sum + (p.bugsFixed || 0), 0);
  const milestonesCompleted = projects.reduce((sum, p) => sum + (p.milestones?.filter(m => m.completed).length || 0), 0);

  const selectedProject = detailTarget || editTarget;
  const showArVr = selectedProject && ARVR_3D.includes(selectedProject?.type);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-screen-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
              <Rocket size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Project Tracker
              </h1>
              <p className="text-xs text-gray-400">{projects.length} active project{projects.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${rtConnected ? 'border-green-600 text-green-400' : 'border-gray-600 text-gray-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${rtConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
              {rtConnected ? 'Live' : 'Offline'}
            </div>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              <Plus size={16} />New Project
            </button>
          </div>
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Projects" value={projects.length} icon={BarChart3} color="bg-blue-500/20 text-blue-400" />
          <StatCard label="Hours This Week" value={Math.round(hoursThisWeek)} icon={Clock} color="bg-purple-500/20 text-purple-400" />
          <StatCard label="Bugs Fixed (Month)" value={bugsFixedMonth} icon={Bug} color="bg-green-500/20 text-green-400" />
          <StatCard label="Milestones Done" value={milestonesCompleted} icon={TrendingUp} color="bg-yellow-500/20 text-yellow-400" />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {PROJECT_TYPES.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTypeFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${typeFilter === key ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map(status => (
            <div key={status} className="flex flex-col gap-3">
              <div className={`flex items-center justify-between pb-2 border-b ${STATUS_HEADER_COLORS[status]}`}>
                <span className="text-sm font-semibold">{STATUS_LABELS[status]}</span>
                <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full">{byStatus[status].length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {byStatus[status].map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    updated={updatedIds.has(p.id)}
                    onEdit={setEditTarget}
                    onDelete={deleteProject}
                    onView={proj => { setDetailTarget(proj); if (ARVR_3D.includes(proj.type)) setSelectedArVr(proj.id); }}
                  />
                ))}
                {byStatus[status].length === 0 && (
                  <div className="text-center text-xs text-gray-600 py-6 border border-dashed border-gray-700 rounded-lg">No projects</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* AR/VR/3D Metrics */}
        {selectedArVr && <ArVrMetricsPanel projectId={selectedArVr} />}
      </div>

      {showNew && <NewProjectModal onClose={() => setShowNew(false)} onSave={createProject} />}
      {editTarget && <EditProjectModal project={editTarget} onClose={() => setEditTarget(null)} onSave={d => updateProject(editTarget.id, d)} />}
      {detailTarget && <DetailModal project={detailTarget} onClose={() => { setDetailTarget(null); setSelectedArVr(null); }} />}
    </div>
  );
}
