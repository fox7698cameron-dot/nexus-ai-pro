// src/dashboards/ProjectTracker.jsx
// Nexus AI Pro - Real-Time Project Tracking Dashboard
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  GitBranch, Gamepad2, Code, Box, Layers, Activity, CheckCircle, Clock,
  Plus, Star, Zap, Trophy, Target, RefreshCw, Tag, Globe, Cpu
} from 'lucide-react';

// Project type enumeration
const PROJECT_TYPE = { CODE: 'code', GAME: 'game', AR_VR: 'ar_vr', MOBILE: 'mobile', WEB: 'web' };
const ENGINE_LABEL = { unreal: 'Unreal Engine', unity: 'Unity', godot: 'Godot', gamemaker: 'GameMaker', custom: 'Custom' };
const PLATFORM_LABEL = { epic: 'Epic Games', sony_psn: 'PlayStation', microsoft_xbox: 'Xbox', ubisoft: 'Ubisoft', steam: 'Steam', itch: 'Itch.io' };

const TYPE_CONFIG = {
  code: { label: 'Code', color: '#3b82f6', icon: Code, emoji: '💻' },
  game: { label: 'Game Dev', color: '#8b5cf6', icon: Gamepad2, emoji: '🎮' },
  ar_vr: { label: 'AR/VR/3D', color: '#10b981', icon: Box, emoji: '🥽' },
  mobile: { label: 'Mobile', color: '#f59e0b', icon: Layers, emoji: '📱' },
  web: { label: 'Web', color: '#06b6d4', icon: Globe, emoji: '🌐' },
};

function ProgressBar({ value, color = '#8b5cf6' }) {
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function AchievementBadge({ achievement }) {
  const rarityColors = {
    common: 'bg-gray-100 text-gray-600 border-gray-200',
    uncommon: 'bg-green-50 text-green-700 border-green-200',
    rare: 'bg-blue-50 text-blue-700 border-blue-200',
    epic: 'bg-purple-50 text-purple-700 border-purple-200',
    legendary: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${rarityColors[achievement.rarity] || rarityColors.common}`}>
      <span className="text-lg">{achievement.icon || '🏆'}</span>
      <div>
        <p className="font-semibold">{achievement.name}</p>
        <p className="opacity-70">{achievement.description}</p>
      </div>
    </div>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  const cfg = TYPE_CONFIG[project.type] || TYPE_CONFIG.code;
  const Icon = cfg.icon;
  return (
    <button
      onClick={() => onSelect(project)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? 'border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 shadow-md'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cfg.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{project.name}</p>
            <p className="text-xs text-gray-500">{cfg.label}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          project.status === 'active' ? 'bg-green-100 text-green-700' :
          project.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-500'
        }`}>{project.status}</span>
      </div>
      <ProgressBar value={project.progress} color={cfg.color} />
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
        <span>{project.progress}% complete</span>
        <span>{project.commits || 0} commits</span>
      </div>
    </button>
  );
}

const DEMO_PROJECTS = [
  {
    id: '1', name: 'Nexus AI Core', type: PROJECT_TYPE.CODE, status: 'active', progress: 78,
    commits: 342, openIssues: 12, closedIssues: 89, buildStatus: 'passing',
    language: 'JavaScript/TypeScript', engine: null, platform: 'github',
    milestones: [
      { name: 'MVP', progress: 100, dueDate: '2025-12-01', done: true },
      { name: 'Beta', progress: 80, dueDate: '2026-03-01', done: false },
      { name: 'v1.0', progress: 40, dueDate: '2026-06-01', done: false },
    ],
    achievements: [
      { id: 'a1', name: '100 Commits', description: 'Reached 100 commits', rarity: 'uncommon', icon: '💾' },
      { id: 'a2', name: 'First Deploy', description: 'Successfully deployed', rarity: 'rare', icon: '🚀' },
    ],
    weeklyCommits: [12, 18, 9, 24, 15, 8, 21],
  },
  {
    id: '2', name: 'Cosmos VR', type: PROJECT_TYPE.AR_VR, status: 'active', progress: 45,
    commits: 128, openIssues: 7, closedIssues: 34, buildStatus: 'passing',
    language: 'C++/Blueprint', engine: 'unreal', platform: 'epic',
    milestones: [
      { name: 'Prototype', progress: 100, dueDate: '2025-11-01', done: true },
      { name: 'Alpha', progress: 45, dueDate: '2026-04-01', done: false },
    ],
    achievements: [
      { id: 'b1', name: 'VR Pioneer', description: 'First VR level complete', rarity: 'epic', icon: '🥽' },
    ],
    weeklyCommits: [8, 12, 6, 15, 10, 4, 9],
  },
  {
    id: '3', name: 'Street Racer 3D', type: PROJECT_TYPE.GAME, status: 'paused', progress: 30,
    commits: 67, openIssues: 19, closedIssues: 22, buildStatus: 'warning',
    language: 'C#', engine: 'unity', platform: 'steam',
    milestones: [
      { name: 'Concept', progress: 100, dueDate: '2025-10-01', done: true },
      { name: 'Pre-alpha', progress: 30, dueDate: '2026-07-01', done: false },
    ],
    achievements: [
      { id: 'c1', name: 'Physics Master', description: 'Car physics tuned perfectly', rarity: 'rare', icon: '🏎️' },
    ],
    weeklyCommits: [4, 3, 8, 2, 6, 1, 5],
  },
];

export default function ProjectTracker({ userId, accessToken }) {
  const [projects, setProjects] = useState(DEMO_PROJECTS);
  const [selectedProject, setSelectedProject] = useState(DEMO_PROJECTS[0]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [newProjectModal, setNewProjectModal] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${userId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.projects?.length) {
          setProjects(data.projects);
          setSelectedProject(data.projects[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [userId, accessToken]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filteredProjects = filter === 'all' ? projects : projects.filter(p => p.type === filter);
  const proj = selectedProject;
  const cfg = proj ? (TYPE_CONFIG[proj.type] || TYPE_CONFIG.code) : null;

  const weeklyData = proj?.weeklyCommits?.map((v, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    commits: v,
  })) || [];

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{projects.length} projects · {projects.filter(p => p.status === 'active').length} active</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchProjects} disabled={loading} className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setNewProjectModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Plus size={14} /> New Project
          </button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            filter === 'all' ? 'bg-gray-800 text-white border-gray-800 dark:bg-gray-200 dark:text-gray-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600'
          }`}
        >
          All ({projects.length})
        </button>
        {Object.entries(TYPE_CONFIG).map(([type, c]) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === type ? 'text-white border-transparent' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600'
            }`}
            style={filter === type ? { backgroundColor: c.color, borderColor: c.color } : {}}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project list */}
        <div className="space-y-3">
          {filteredProjects.map(p => (
            <ProjectCard key={p.id} project={p} onSelect={setSelectedProject} selected={selectedProject?.id === p.id} />
          ))}
          {filteredProjects.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Code size={32} className="mx-auto mb-2" />
              <p className="text-sm">No projects in this category</p>
            </div>
          )}
        </div>

        {/* Project detail */}
        {proj && cfg && (
          <div className="lg:col-span-2 space-y-4">
            {/* Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: cfg.color + '20' }}>
                    <cfg.icon size={20} style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{proj.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500">{cfg.emoji} {cfg.label}</span>
                      {proj.engine && <span className="text-xs text-gray-400">· {ENGINE_LABEL[proj.engine] || proj.engine}</span>}
                      {proj.platform && <span className="text-xs text-gray-400">· {PLATFORM_LABEL[proj.platform] || proj.platform}</span>}
                      {proj.language && <span className="text-xs font-mono text-purple-600 dark:text-purple-400">· {proj.language}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    proj.buildStatus === 'passing' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {proj.buildStatus === 'passing' ? '✓ Build Passing' : '⚠ Build Warning'}
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Overall Progress</span>
                  <span className="font-medium">{proj.progress}%</span>
                </div>
                <ProgressBar value={proj.progress} color={cfg.color} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Commits', value: proj.commits, icon: GitBranch, color: 'blue' },
                  { label: 'Open Issues', value: proj.openIssues, icon: Target, color: 'yellow' },
                  { label: 'Closed', value: proj.closedIssues, icon: CheckCircle, color: 'green' },
                ].map(m => (
                  <div key={m.label} className="text-center p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg">
                    <m.icon size={16} className={`mx-auto mb-1 text-${m.color}-500`} />
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{m.value}</p>
                    <p className="text-xs text-gray-500">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly commits */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Activity size={14} style={{ color: cfg.color }} /> Weekly Commits
              </h3>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="commits" fill={cfg.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Milestones */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Target size={14} className="text-purple-600" /> Milestones
              </h3>
              <div className="space-y-3">
                {(proj.milestones || []).map((m, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        {m.done ? <CheckCircle size={12} className="text-green-500" /> : <Clock size={12} className="text-gray-400" />}
                        <span className={`font-medium ${m.done ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}>{m.name}</span>
                      </div>
                      <span className="text-gray-400">{m.dueDate} · {m.progress}%</span>
                    </div>
                    <ProgressBar value={m.progress} color={m.done ? '#10b981' : cfg.color} />
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            {proj.achievements?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Trophy size={14} className="text-yellow-500" /> Achievements
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {proj.achievements.map(a => <AchievementBadge key={a.id} achievement={a} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
