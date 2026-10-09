// src/components/GameDevDashboard.jsx
// Nexus AI Pro - Game Development & Project Tracking Dashboard
// Date: 2026-10-09

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Plus, Edit3, Trash2, CheckCircle, Clock,
  BarChart3, Trophy, Star, Zap, GitBranch, Play,
  Layers, Box, RefreshCw, Link, Settings, Upload,
  Code, ArrowRight, ChevronDown, ChevronRight, Activity,
} from 'lucide-react';

// ── Platform Connectors ────────────────────────────────────────────────────
const ENGINE_CONNECTORS = [
  { id: 'unreal',    name: 'Unreal Engine 5',        icon: '⚡', color: '#2980B9', status: 'available', url: 'https://www.unrealengine.com/' },
  { id: 'unity',     name: 'Unity',                  icon: '🎮', color: '#222c37', status: 'available', url: 'https://unity.com/' },
  { id: 'godot',     name: 'Godot 4',               icon: '🌀', color: '#478cbf', status: 'available', url: 'https://godotengine.org/' },
  { id: 'cryengine', name: 'CryEngine',              icon: '💠', color: '#00a0c8', status: 'available', url: 'https://www.cryengine.com/' },
];

const PLATFORM_CONNECTORS = [
  { id: 'epic',      name: 'Epic Games Store',        icon: '⚡', color: '#2980B9', status: 'configure' },
  { id: 'steam',     name: 'Steam / Valve',           icon: '🎮', color: '#1b2838', status: 'configure' },
  { id: 'sony',      name: 'PlayStation (Sony)',      icon: '🎯', color: '#003087', status: 'configure' },
  { id: 'microsoft', name: 'Xbox / Microsoft',        icon: '🟩', color: '#107c10', status: 'configure' },
  { id: 'ubisoft',   name: 'Ubisoft Connect',         icon: '🔷', color: '#0070ff', status: 'configure' },
  { id: 'nintendo',  name: 'Nintendo eShop',          icon: '🔴', color: '#e4000f', status: 'configure' },
  { id: 'gog',       name: 'GOG Galaxy',              icon: '🌌', color: '#b9282a', status: 'configure' },
  { id: 'itch',      name: 'itch.io',                 icon: '🍑', color: '#fa5c5c', status: 'configure' },
];

// ── Sample project data ────────────────────────────────────────────────────
const SAMPLE_PROJECTS = [
  {
    id: 'p1',
    name: 'Nexus Chronicles',
    type: 'game',
    genre: 'Action RPG',
    engine: 'unreal',
    status: 'in_development',
    progress: 68,
    platforms: ['steam', 'epic', 'sony'],
    lang: ['C++', 'Blueprint'],
    team: 3,
    milestones: [
      { id: 'm1', name: 'Core Mechanics',   done: true,  dueDate: '2026-08-01' },
      { id: 'm2', name: 'Level Design v1',  done: true,  dueDate: '2026-09-15' },
      { id: 'm3', name: 'Alpha Build',      done: false, dueDate: '2026-11-01' },
      { id: 'm4', name: 'Beta Testing',     done: false, dueDate: '2027-01-15' },
      { id: 'm5', name: 'Launch',           done: false, dueDate: '2027-03-01' },
    ],
    achievements: [
      { id: 'a1', name: 'First Boot',        desc: 'Launch the game for the first time',        unlocked: false, xp: 10 },
      { id: 'a2', name: 'Explorer',          desc: 'Visit all starter zones',                   unlocked: false, xp: 25 },
      { id: 'a3', name: 'Boss Slayer',       desc: 'Defeat the first dungeon boss',             unlocked: false, xp: 50 },
      { id: 'a4', name: 'Completionist',     desc: 'Complete all main story quests',            unlocked: false, xp: 100 },
    ],
    builds: [
      { id: 'b1', version: '0.3.2-alpha', platform: 'PC', date: '2026-10-05', size: '4.2 GB' },
      { id: 'b2', version: '0.3.1-alpha', platform: 'PC', date: '2026-09-28', size: '4.1 GB' },
    ],
  },
  {
    id: 'p2',
    name: 'VR Arena',
    type: 'ar_vr',
    genre: 'VR Shooter',
    engine: 'unreal',
    status: 'planning',
    progress: 18,
    platforms: ['epic', 'steam'],
    lang: ['C++'],
    team: 2,
    milestones: [
      { id: 'm1', name: 'Concept & Design', done: true,  dueDate: '2026-09-01' },
      { id: 'm2', name: 'VR Prototype',     done: false, dueDate: '2026-12-01' },
      { id: 'm3', name: 'Beta',             done: false, dueDate: '2027-04-01' },
    ],
    achievements: [],
    builds: [],
  },
  {
    id: 'p3',
    name: 'Pixel Quest 3D',
    type: 'game',
    genre: '3D Platformer',
    engine: 'unity',
    status: 'in_development',
    progress: 45,
    platforms: ['nintendo', 'steam'],
    lang: ['C#'],
    team: 1,
    milestones: [
      { id: 'm1', name: 'Core Movement',    done: true,  dueDate: '2026-07-01' },
      { id: 'm2', name: '5 Levels',         done: false, dueDate: '2026-11-15' },
      { id: 'm3', name: 'Polish & Ship',    done: false, dueDate: '2027-02-01' },
    ],
    achievements: [],
    builds: [
      { id: 'b1', version: '0.4.0', platform: 'PC', date: '2026-10-01', size: '1.1 GB' },
    ],
  },
];

const STATUS_META = {
  planning:       { label: 'Planning',       color: '#8b5cf6', bg: '#8b5cf622' },
  in_development: { label: 'In Development', color: '#3b82f6', bg: '#3b82f622' },
  testing:        { label: 'Testing',        color: '#f59e0b', bg: '#f59e0b22' },
  released:       { label: 'Released',       color: '#34d399', bg: '#34d39922' },
};

const TYPE_ICONS = { game: '🎮', ar_vr: '🥽', '3d': '📦' };

function ProgressBar({ value, color = '#3b82f6' }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}

function ProjectCard({ project, onClick, selected }) {
  const status = STATUS_META[project.status] || STATUS_META.planning;
  const engineConn = ENGINE_CONNECTORS.find(e => e.id === project.engine);
  const doneCount = project.milestones.filter(m => m.done).length;

  return (
    <div
      className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition-all hover:border-purple-500 ${selected ? 'border-purple-500' : 'border-gray-700'}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{TYPE_ICONS[project.type] || '🎮'}</span>
          <div>
            <div className="font-semibold text-white text-sm">{project.name}</div>
            <div className="text-xs text-gray-400">{project.genre}</div>
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: status.bg, color: status.color }}>
          {status.label}
        </span>
      </div>

      <ProgressBar value={project.progress} color={engineConn?.color || '#3b82f6'} />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{project.progress}% complete</span>
        <span>{doneCount}/{project.milestones.length} milestones</span>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {project.lang.map(l => (
          <span key={l} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded font-mono">{l}</span>
        ))}
        {engineConn && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Layers size={10} />{engineConn.name}
          </span>
        )}
      </div>
    </div>
  );
}

function MilestoneList({ milestones }) {
  return (
    <div className="space-y-2">
      {milestones.map((m, i) => (
        <div key={m.id} className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${m.done ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
            {m.done && <CheckCircle size={12} className="text-white" />}
          </div>
          <div className={`flex-1 text-sm ${m.done ? 'line-through text-gray-500' : 'text-white'}`}>{m.name}</div>
          <div className="text-xs text-gray-500">{m.dueDate}</div>
          {i < milestones.length - 1 && !m.done && milestones[i + 1] && !milestones[i + 1].done && (
            <ArrowRight size={12} className="text-blue-400 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

function AchievementList({ achievements }) {
  if (!achievements.length) return <p className="text-gray-500 text-sm">No achievements defined yet.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {achievements.map(a => (
        <div key={a.id} className={`p-3 rounded-lg border flex items-start gap-2 ${a.unlocked ? 'border-yellow-500 bg-yellow-50010' : 'border-gray-700 bg-gray-800'}`}>
          <Trophy size={14} className={a.unlocked ? 'text-yellow-400' : 'text-gray-600'} />
          <div>
            <div className={`text-xs font-medium ${a.unlocked ? 'text-yellow-300' : 'text-white'}`}>{a.name}</div>
            <div className="text-xs text-gray-400">{a.desc}</div>
            <div className="text-xs text-purple-400 mt-0.5">+{a.xp} XP</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GameDevDashboard() {
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [selectedId, setSelectedId] = useState(SAMPLE_PROJECTS[0]?.id);
  const [tab, setTab] = useState('milestones');
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [connectorStatus, setConnectorStatus] = useState({});

  const selected = projects.find(p => p.id === selectedId);

  const handleConnectorToggle = (id) => {
    setConnectorStatus(prev => ({
      ...prev,
      [id]: prev[id] === 'connected' ? 'disconnected' : 'connected',
    }));
  };

  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'in_development').length;
  const avgProgress = Math.round(projects.reduce((s, p) => s + p.progress, 0) / (projects.length || 1));

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-800">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Gamepad2 size={20} className="text-purple-400" />
            Game Dev Studio
          </h2>
          <p className="text-gray-400 text-xs">Real-time project tracking · Game &amp; AR/VR/3D</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConnectorsOpen(o => !o)}
            className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-3 py-1.5 text-sm"
          >
            <Link size={14} />
            Connectors
          </button>
          <button className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium">
            <Plus size={14} />
            New Project
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {[
          { label: 'Projects', value: totalProjects, icon: Box, color: '#a78bfa' },
          { label: 'Active', value: activeProjects, icon: Play, color: '#34d399' },
          { label: 'Avg Progress', value: `${avgProgress}%`, icon: BarChart3, color: '#60a5fa' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-3 border border-gray-700 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.color + '22' }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-lg font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Platform Connectors */}
      {connectorsOpen && (
        <div className="mx-4 mb-4 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2"><Link size={14} />Platform Connectors</h4>
            <button onClick={() => setConnectorsOpen(false)} className="text-gray-400 hover:text-white text-xs">Close</button>
          </div>
          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[...ENGINE_CONNECTORS, ...PLATFORM_CONNECTORS].map(c => {
              const isConn = connectorStatus[c.id] === 'connected';
              return (
                <button
                  key={c.id}
                  onClick={() => handleConnectorToggle(c.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${isConn ? 'border-green-500 bg-green-50010' : 'border-gray-600 hover:border-gray-400'}`}
                >
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-xs text-gray-300 leading-tight">{c.name}</span>
                  <span className={`text-xs font-medium ${isConn ? 'text-green-400' : 'text-gray-500'}`}>
                    {isConn ? 'Connected' : 'Connect'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Project List + Detail */}
      <div className="flex flex-col lg:flex-row gap-4 px-4 pb-4 flex-1">
        {/* Left: project cards */}
        <div className="lg:w-64 shrink-0 space-y-2">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              selected={p.id === selectedId}
              onClick={() => setSelectedId(p.id)}
            />
          ))}
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 flex flex-col overflow-hidden">
            {/* Project header */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{TYPE_ICONS[selected.type] || '🎮'}</span>
                  <div>
                    <h3 className="font-bold text-white">{selected.name}</h3>
                    <p className="text-xs text-gray-400">{selected.genre} · {ENGINE_CONNECTORS.find(e => e.id === selected.engine)?.name}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"><Edit3 size={14} /></button>
                  <button className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Overall Progress</span>
                  <span className="text-white font-medium">{selected.progress}%</span>
                </div>
                <ProgressBar value={selected.progress} />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-2 border-b border-gray-700 overflow-x-auto">
              {[
                { id: 'milestones', label: 'Milestones', icon: CheckCircle },
                { id: 'achievements', label: 'Achievements', icon: Trophy },
                { id: 'builds', label: 'Builds', icon: Upload },
                { id: 'langs', label: 'Tech Stack', icon: Code },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  <t.icon size={11} />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {tab === 'milestones' && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-semibold text-gray-300">Milestones</h4>
                    <span className="text-xs text-gray-400">
                      {selected.milestones.filter(m => m.done).length} / {selected.milestones.length} done
                    </span>
                  </div>
                  <MilestoneList milestones={selected.milestones} />
                </div>
              )}

              {tab === 'achievements' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Game Achievements</h4>
                  <AchievementList achievements={selected.achievements} />
                  <button className="mt-3 flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300">
                    <Plus size={14} />Add Achievement
                  </button>
                </div>
              )}

              {tab === 'builds' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Build History</h4>
                  {selected.builds.length === 0 ? (
                    <p className="text-gray-500 text-sm">No builds yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selected.builds.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                          <div>
                            <div className="text-sm font-medium text-white font-mono">{b.version}</div>
                            <div className="text-xs text-gray-400">{b.platform} · {b.date}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400">{b.size}</div>
                            <button className="text-xs text-blue-400 hover:text-blue-300 mt-0.5">Download</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="mt-3 flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
                    <Upload size={14} />Upload Build
                  </button>
                </div>
              )}

              {tab === 'langs' && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-300 mb-3">Tech Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {selected.lang.map(l => (
                      <span key={l} className="px-3 py-1.5 bg-gray-700 text-gray-200 rounded-full text-sm font-mono">{l}</span>
                    ))}
                    {selected.engine && (
                      <span className="px-3 py-1.5 bg-blue-900 text-blue-200 rounded-full text-sm">
                        {ENGINE_CONNECTORS.find(e => e.id === selected.engine)?.name}
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <h5 className="text-xs text-gray-400 mb-2">Target Platforms</h5>
                    <div className="flex flex-wrap gap-2">
                      {selected.platforms.map(pid => {
                        const p = PLATFORM_CONNECTORS.find(p => p.id === pid) || ENGINE_CONNECTORS.find(p => p.id === pid);
                        return p ? (
                          <span key={pid} className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded-lg text-xs text-gray-200">
                            <span>{p.icon}</span>{p.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
