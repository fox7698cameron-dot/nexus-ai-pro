// 2026-07-20
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FolderOpen, Users, Calendar, TrendingUp, Gamepad2, Layers, Globe, Smartphone, Edit2, Trash2, X, Save, RefreshCw, BarChart2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE = '/api/projects';

const PROJECT_TYPES = [
  { id: 'general',  label: 'General',          icon: FolderOpen },
  { id: 'gamedev',  label: 'Game Dev',          icon: Gamepad2   },
  { id: 'arvr',     label: 'AR/VR/3D',          icon: Layers     },
  { id: 'mobile',   label: 'Mobile App',        icon: Smartphone },
  { id: 'web',      label: 'Web App',           icon: Globe      },
];

const COLUMNS = ['Backlog', 'In Progress', 'Review', 'Done'];

const COL_BORDER = {
  'Backlog':     'border-t-gray-500',
  'In Progress': 'border-t-blue-500',
  'Review':      'border-t-yellow-500',
  'Done':        'border-t-green-500',
};

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f97316', low: '#22c55e' };

const generateBurndown = (total, done) =>
  Array.from({ length: 14 }, (_, i) => ({
    day: `D${i + 1}`,
    ideal:  Math.max(0, total - (total / 14) * (i + 1)),
    actual: i < 8 ? Math.max(0, total - done * ((i + 1) / 8) + Math.random() * 2) : undefined,
  }));

// ── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onMove, onDelete }) {
  return (
    <div className="group p-3 bg-gray-700 rounded-xl border border-gray-600 mb-2 hover:border-purple-500/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-white font-medium leading-tight">{task.title}</p>
        <button onClick={() => onDelete(task.id || task.id)}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition">
          <X size={12} />
        </button>
      </div>
      {task.description && <p className="text-xs text-gray-500 mt-1 leading-tight">{task.description}</p>}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded font-medium"
          style={{ background: (PRIORITY_COLORS[task.priority] || '#6b7280') + '22', color: PRIORITY_COLORS[task.priority] || '#9ca3af' }}>
          {task.priority}
        </span>
        {task.assignee && (
          <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded">{task.assignee}</span>
        )}
      </div>
      <div className="flex gap-1 mt-2 flex-wrap opacity-0 group-hover:opacity-100 transition">
        {COLUMNS.filter(c => c !== (task.column || task.status)).map(col => (
          <button key={col} onClick={() => onMove(task.id, col)}
            className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600 transition">
            → {col.split(' ')[0]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Project Form ──────────────────────────────────────────────────────────────
function ProjectForm({ onSave, onCancel }) {
  const [name, setName]   = useState('');
  const [type, setType]   = useState('general');
  const [ms,   setMs]     = useState('');

  const submit = e => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), type, milestone: ms.trim(), tasks: [], sprint: 1, sprintEnd: Date.now() + 14 * 86400000, members: [] });
  };

  return (
    <div className="p-4 bg-gray-800 rounded-xl border border-purple-500/30 mb-4">
      <form onSubmit={submit} className="space-y-3">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name *" autoFocus
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
        <input value={ms} onChange={e => setMs(e.target.value)} placeholder="Milestone (optional)"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
        <div className="flex gap-2 flex-wrap">
          {PROJECT_TYPES.map(({ id, label }) => (
            <button type="button" key={id} onClick={() => setType(id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition ${type === id ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition">Create</button>
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── Add Task Inline ───────────────────────────────────────────────────────────
function AddTaskInline({ column, onAdd }) {
  const [open,  setOpen]  = useState(false);
  const [title, setTitle] = useState('');
  const [prio,  setPrio]  = useState('medium');

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ id: `t-${Date.now()}`, title: title.trim(), column, status: column, priority: prio, assignee: null, description: '' });
    setTitle('');
    setOpen(false);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full mt-2 py-1.5 rounded-xl border border-dashed border-gray-600 hover:border-purple-500 text-gray-500 hover:text-purple-400 text-xs flex items-center justify-center gap-1 transition">
      <Plus size={12} /> Add
    </button>
  );

  return (
    <div className="mt-2 space-y-1.5 bg-gray-700/60 rounded-xl p-2 border border-gray-600">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" autoFocus
        onKeyDown={e => e.key === 'Enter' && submit()}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none" />
      <select value={prio} onChange={e => setPrio(e.target.value)}
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <div className="flex gap-1">
        <button onClick={submit} className="flex-1 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium transition">Add</button>
        <button onClick={() => setOpen(false)} className="px-2 py-1 bg-gray-600 text-gray-300 rounded-lg text-xs transition">✕</button>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function ProjectDashboard() {
  const [projects,        setProjects]        = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeType,      setActiveType]      = useState('all');
  const [showForm,        setShowForm]        = useState(false);
  const [activeTab,       setActiveTab]       = useState('kanban'); // kanban | burndown | members
  const [loading,         setLoading]         = useState(false);

  // ── Fetch from API ────────────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(API_BASE);
      if (!r.ok) throw new Error();
      const d = await r.json();
      const list = (d.projects ?? []).map(p => ({
        ...p,
        tasks: p.tasks ?? [],
        members: p.members ?? [],
      }));
      setProjects(list);
      if (!selectedProject && list.length) setSelectedProject(list[0]);
    } catch {
      const mock = [
        { id: '1', name: 'Nexus AI Pro', type: 'web', milestone: 'Beta', sprint: 3,
          tasks: [
            { id: 't1', title: 'Auth system',         column: 'Done',        status: 'Done',        priority: 'high',   assignee: 'CamF', description: '' },
            { id: 't2', title: 'Analytics dashboard', column: 'In Progress', status: 'In Progress', priority: 'high',   assignee: 'CamF', description: '' },
            { id: 't3', title: 'Payment integration', column: 'Review',      status: 'Review',      priority: 'medium', assignee: 'CamF', description: '' },
            { id: 't4', title: 'Mobile PWA support',  column: 'Backlog',     status: 'Backlog',     priority: 'low',    assignee: null,   description: '' },
          ], members: [{ id: 'm1', name: 'Cameron Fox', role: 'Lead Dev', avatar: 'CF' }], sprintEnd: Date.now() + 7 * 86400000 },
        { id: '2', name: 'Project Aurora', type: 'gamedev', milestone: 'Alpha', sprint: 7,
          tasks: [
            { id: 't5', title: 'Scene design',       column: 'Done',        status: 'Done',        priority: 'high',   assignee: 'CamF', description: '' },
            { id: 't6', title: 'Physics opt.',        column: 'In Progress', status: 'In Progress', priority: 'medium', assignee: 'CamF', description: '' },
            { id: 't7', title: 'Multiplayer sync',    column: 'Backlog',     status: 'Backlog',     priority: 'high',   assignee: null,   description: '' },
          ], members: [], sprintEnd: Date.now() + 14 * 86400000 },
      ];
      setProjects(mock);
      if (!selectedProject) setSelectedProject(mock[0]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, []);

  const filtered = activeType === 'all' ? projects : projects.filter(p => p.type === activeType);

  // ── Kanban actions ────────────────────────────────────────────────────────
  function moveTask(taskId, newCol) {
    const updater = p => ({ ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, column: newCol, status: newCol } : t) });
    setProjects(prev => prev.map(p => ({ ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, column: newCol, status: newCol } : t) })));
    setSelectedProject(prev => prev ? updater(prev) : prev);
    fetch(`${API_BASE}/${selectedProject?.id}/tasks/${taskId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newCol }),
    }).catch(() => {});
  }

  function deleteTask(taskId) {
    const updater = p => ({ ...p, tasks: p.tasks.filter(t => t.id !== taskId) });
    setProjects(prev => prev.map(updater));
    setSelectedProject(prev => prev ? updater(prev) : prev);
    fetch(`${API_BASE}/${selectedProject?.id}/tasks/${taskId}`, { method: 'DELETE' }).catch(() => {});
  }

  function addTask(task) {
    const updater = p => ({ ...p, tasks: [...p.tasks, task] });
    setProjects(prev => prev.map(p => p.id === selectedProject?.id ? updater(p) : p));
    setSelectedProject(prev => prev ? updater(prev) : prev);
    fetch(`${API_BASE}/${selectedProject?.id}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task),
    }).catch(() => {});
  }

  // ── Project create/delete ─────────────────────────────────────────────────
  function createProject(data) {
    fetch(API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(r => r.json()).then(p => {
        setProjects(prev => [...prev, { ...p, tasks: p.tasks ?? [], members: p.members ?? [] }]);
        setSelectedProject({ ...p, tasks: p.tasks ?? [], members: p.members ?? [] });
      }).catch(() => {
        const p = { id: Date.now().toString(), ...data };
        setProjects(prev => [...prev, p]);
        setSelectedProject(p);
      });
    setShowForm(false);
  }

  function deleteProject(id) {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProject?.id === id) setSelectedProject(projects.find(p => p.id !== id) ?? null);
    fetch(`${API_BASE}/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  // Burndown data
  const sp   = selectedProject;
  const done  = sp?.tasks?.filter(t => (t.column || t.status) === 'Done').length || 0;
  const total = sp?.tasks?.length || 0;
  const burndown = sp ? generateBurndown(total, done) : [];

  const spDaysLeft = sp ? Math.max(0, Math.round((sp.sprintEnd - Date.now()) / 86400000)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <FolderOpen size={20} className="text-purple-400" /> Project Tracker
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition font-medium">
            <Plus size={16} /> New Project
          </button>
          <button onClick={fetchProjects} disabled={loading}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {showForm && <ProjectForm onSave={createProject} onCancel={() => setShowForm(false)} />}

      {/* Type filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setActiveType('all')}
          className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${activeType === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
          All ({projects.length})
        </button>
        {PROJECT_TYPES.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveType(id)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${activeType === id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Project list */}
        <div className="lg:col-span-1 space-y-2">
          {filtered.map(p => {
            const Icon = PROJECT_TYPES.find(t => t.id === p.type)?.icon || FolderOpen;
            const pDone  = p.tasks?.filter(t => (t.column || t.status) === 'Done').length || 0;
            const pTotal = p.tasks?.length || 0;
            return (
              <div key={p.id} onClick={() => setSelectedProject(p)}
                className={`group w-full text-left p-4 rounded-xl border cursor-pointer transition ${selectedProject?.id === p.id ? 'border-purple-500 bg-purple-600/10' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={14} className="text-purple-400 shrink-0" />
                    <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteProject(p.id); }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition">
                    <Trash2 size={11} />
                  </button>
                </div>
                {p.milestone && <p className="text-xs text-gray-500 mb-1.5">Sprint {p.sprint} · {p.milestone}</p>}
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                  <span>{pDone}/{pTotal} done</span>
                  <span className="flex items-center gap-1"><Users size={11} /> {p.members?.length || 0}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-purple-600 transition-all"
                    style={{ width: `${pTotal ? (pDone / pTotal) * 100 : 0}%` }} />
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-xs text-gray-600 text-center py-4">No projects</p>}
        </div>

        {/* Main panel */}
        {sp && (
          <div className="lg:col-span-3 space-y-4">
            {/* Sprint info bar */}
            <div className="flex items-center gap-4 flex-wrap bg-gray-800 rounded-xl border border-gray-700 p-3 text-xs text-gray-400">
              <span><span className="text-white font-semibold">{sp.name}</span></span>
              <span>Sprint {sp.sprint}</span>
              {sp.milestone && <span className="text-purple-300">{sp.milestone}</span>}
              <span className="ml-auto">{spDaysLeft}d left in sprint</span>
              <span>{done}/{total} tasks done</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-800/60 p-1 rounded-xl w-fit border border-gray-700">
              {[['kanban','Kanban'],['burndown','Burndown'],['members','Team']].map(([k, v]) => (
                <button key={k} onClick={() => setActiveTab(k)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === k ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  {v}
                </button>
              ))}
            </div>

            {/* ── Kanban ── */}
            {activeTab === 'kanban' && (
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 overflow-x-auto">
                {COLUMNS.map(col => {
                  const colTasks = (sp.tasks || []).filter(t => (t.column || t.status) === col);
                  return (
                    <div key={col} className={`min-w-[160px] bg-gray-800/50 rounded-xl border border-gray-700 border-t-2 ${COL_BORDER[col]} p-3 flex flex-col`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{col}</h3>
                        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                      </div>
                      <div className="flex-1 min-h-[80px]">
                        {colTasks.map(task => (
                          <TaskCard key={task.id} task={task} onMove={moveTask} onDelete={deleteTask} />
                        ))}
                      </div>
                      <AddTaskInline column={col} onAdd={addTask} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Burndown ── */}
            {activeTab === 'burndown' && burndown.length > 0 && (
              <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <TrendingUp size={16} /> Sprint {sp.sprint} Burndown · {total} story points
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={burndown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
                    <Line type="monotone" dataKey="ideal"  stroke="#6b7280" strokeDasharray="4 2" dot={false} name="Ideal" />
                    <Line type="monotone" dataKey="actual" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Actual" connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Members ── */}
            {activeTab === 'members' && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2"><Users size={14} /> Team</h3>
                {(sp.members ?? []).length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No team members assigned</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sp.members.map(m => (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-700/50 border border-gray-600/40">
                        <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300">
                          {m.avatar || m.name?.slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{m.name}</p>
                          <p className="text-xs text-gray-500">{m.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
