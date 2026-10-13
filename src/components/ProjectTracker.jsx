// src/components/ProjectTracker.jsx
// Real-Time Project Tracking: Code, Game Dev, AR/VR/3D
// Updated: 2026-10-13

import React, { useState, useEffect, useCallback } from 'react';
import {
  Code, Gamepad2, Box, Plus, Check, Clock, Activity,
  GitBranch, Package, Cpu, Play, Pause, BarChart3,
  ChevronRight, Star, Zap, Globe, Target, Award,
  Monitor, Smartphone, Shield
} from 'lucide-react';

const PROJECT_TYPES = {
  code: { label: 'Coding', icon: Code, color: '#6366f1' },
  game: { label: 'Game Dev', icon: Gamepad2, color: '#f59e0b' },
  arvr: { label: 'AR/VR/3D', icon: Box, color: '#10b981' }
};

const GAME_ENGINES = {
  unreal: { name: 'Unreal Engine 5', icon: '⚡', vendor: 'Epic Games', color: '#0f3460' },
  unity: { name: 'Unity 6', icon: '🎮', vendor: 'Unity Technologies', color: '#222c37' },
  godot: { name: 'Godot 4', icon: '🟢', vendor: 'Open Source', color: '#478cbf' },
  sony: { name: 'Sony Dev Kit', icon: '🎮', vendor: 'Sony Interactive', color: '#003087' },
  microsoft: { name: 'Xbox GDK', icon: '🟩', vendor: 'Microsoft', color: '#107c10' },
  ubisoft: { name: 'Ubisoft Connect', icon: '🔵', vendor: 'Ubisoft', color: '#0070cc' }
};

const ACHIEVEMENT_TYPES = [
  { id: 'first_commit', name: 'First Commit', icon: '🌱', xp: 50 },
  { id: 'milestone_100', name: '100 Commits', icon: '💯', xp: 500 },
  { id: 'first_build', name: 'First Build', icon: '🔨', xp: 100 },
  { id: 'green_ci', name: 'CI Green', icon: '✅', xp: 200 },
  { id: 'first_release', name: 'First Release', icon: '🚀', xp: 1000 },
  { id: 'collab', name: 'Collaborator', icon: '🤝', xp: 300 },
  { id: 'test_coverage', name: '80% Coverage', icon: '🧪', xp: 400 },
  { id: 'performance', name: 'Performance Pro', icon: '⚡', xp: 600 }
];

const SAMPLE_PROJECTS = [
  {
    id: 'p1', name: 'Nexus AI Pro', type: 'code', status: 'active',
    language: 'JavaScript/React', progress: 78, commits: 284, tests: 67,
    platform: 'Web/Desktop/Mobile', branch: 'main', lastActive: Date.now() - 300000,
    tags: ['react', 'nodejs', 'socket.io']
  },
  {
    id: 'p2', name: 'Shadow Realm VR', type: 'game', status: 'active',
    engine: 'unreal', progress: 45, builds: 23, bugs: 12,
    platform: 'PC/PS5/Xbox', branch: 'feature/level-2', lastActive: Date.now() - 900000,
    tags: ['ue5', 'vr', 'multiplayer']
  },
  {
    id: 'p3', name: 'Holographic UI Kit', type: 'arvr', status: 'paused',
    engine: 'unity', progress: 31, builds: 8, bugs: 5,
    platform: 'Meta Quest/HoloLens', branch: 'develop', lastActive: Date.now() - 3600000,
    tags: ['ar', 'holographic', 'unity']
  }
];

function StatusBadge({ status }) {
  const colors = {
    active: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#34d399' },
    paused: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', text: '#fbbf24' },
    completed: { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', text: '#818cf8' }
  };
  const c = colors[status] || colors.paused;
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600
    }}>
      {status.toUpperCase()}
    </span>
  );
}

function ProgressRing({ value, size = 44, color }) {
  const r = (size / 2) - 4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.5s' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" fill="#fff" fontSize={size * 0.28} fontWeight="700">
        {value}%
      </text>
    </svg>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  const typeInfo = PROJECT_TYPES[project.type];
  const Icon = typeInfo.icon;
  const timeAgo = (ms) => {
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div
      onClick={() => onSelect(project.id)}
      style={{
        background: selected ? `${typeInfo.color}22` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${selected ? typeInfo.color : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 10, padding: 14, cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: `${typeInfo.color}33`, borderRadius: 8, padding: 6 }}>
            <Icon size={16} style={{ color: typeInfo.color }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{project.name}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{project.language || GAME_ENGINES[project.engine]?.name}</div>
          </div>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <ProgressRing value={project.progress} size={44} color={typeInfo.color} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
            {project.commits ? `${project.commits} commits` : `${project.builds} builds`}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {project.tags.map(t => (
              <span key={t} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 6px', fontSize: 10, color: '#aaa' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 10, color: '#666' }}>
        <Clock size={10} />
        {timeAgo(project.lastActive)} · {project.platform}
      </div>
    </div>
  );
}

function AchievementsPanel({ unlockedIds }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14 }}>
      <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#ccc', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Award size={14} style={{ color: '#fbbf24' }} /> Achievements
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
        {ACHIEVEMENT_TYPES.map(ach => {
          const unlocked = unlockedIds.includes(ach.id);
          return (
            <div key={ach.id} style={{
              background: unlocked ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${unlocked ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 8, padding: '8px 10px', opacity: unlocked ? 1 : 0.5
            }}>
              <div style={{ fontSize: 20 }}>{ach.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{ach.name}</div>
              <div style={{ fontSize: 10, color: '#fbbf24' }}>+{ach.xp} XP</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConnectorsPanel() {
  const [connected, setConnected] = useState({});

  const toggle = (key) => setConnected(p => ({ ...p, [key]: !p[key] }));

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14 }}>
      <h4 style={{ margin: '0 0 12px', fontSize: 13, color: '#ccc' }}>Game Engine Connectors</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(GAME_ENGINES).map(([key, eng]) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px',
            border: `1px solid ${connected[key] ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.06)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{eng.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{eng.name}</div>
                <div style={{ fontSize: 10, color: '#888' }}>{eng.vendor}</div>
              </div>
            </div>
            <button
              onClick={() => toggle(key)}
              style={{
                background: connected[key] ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${connected[key] ? '#10b981' : 'rgba(255,255,255,0.15)'}`,
                borderRadius: 20, padding: '3px 12px', cursor: 'pointer',
                color: connected[key] ? '#34d399' : '#888', fontSize: 11
              }}
            >
              {connected[key] ? 'Connected' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectTracker() {
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [selectedId, setSelectedId] = useState('p1');
  const [activeType, setActiveType] = useState('all');
  const [unlockedAchievements] = useState(['first_commit', 'milestone_100', 'first_build', 'green_ci']);
  const [metrics, setMetrics] = useState({
    totalCommits: 0, activeSessions: 0, bugsFixed: 0, deployments: 0
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(m => ({
        totalCommits: m.totalCommits + Math.floor(Math.random() * 3),
        activeSessions: Math.floor(Math.random() * 8) + 1,
        bugsFixed: m.bugsFixed + (Math.random() > 0.8 ? 1 : 0),
        deployments: m.deployments + (Math.random() > 0.95 ? 1 : 0)
      }));
    }, 5000);
    setMetrics({ totalCommits: 312, activeSessions: 4, bugsFixed: 27, deployments: 18 });
    return () => clearInterval(interval);
  }, []);

  const filtered = activeType === 'all' ? projects : projects.filter(p => p.type === activeType);
  const selected = projects.find(p => p.id === selectedId);

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui, sans-serif', fontSize: 14, padding: 16, height: '100%', overflowY: 'auto' }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>Project Tracker</h2>
      <p style={{ margin: '0 0 16px', color: '#888', fontSize: 12 }}>Real-time coding, game dev, AR/VR/3D projects</p>

      {/* Live Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'Commits', value: metrics.totalCommits, icon: GitBranch, color: '#6366f1' },
          { label: 'Active', value: metrics.activeSessions, icon: Activity, color: '#10b981' },
          { label: 'Bugs Fixed', value: metrics.bugsFixed, icon: Shield, color: '#f59e0b' },
          { label: 'Deploys', value: metrics.deployments, icon: Zap, color: '#ec4899' }
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}44`, borderRadius: 8, padding: '10px 12px' }}>
              <Icon size={14} style={{ color: stat.color, marginBottom: 4 }} />
              <div style={{ fontSize: 20, fontWeight: 700 }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: '#888' }}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Type Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[{ id: 'all', label: 'All' }, ...Object.entries(PROJECT_TYPES).map(([id, t]) => ({ id, label: t.label }))].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveType(t.id)}
            style={{
              background: activeType === t.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${activeType === t.id ? '#6366f1' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
              color: activeType === t.id ? '#818cf8' : '#888', fontSize: 12
            }}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => {
            const newId = `p${projects.length + 1}`;
            setProjects(p => [...p, {
              id: newId, name: 'New Project', type: 'code', status: 'active',
              language: 'JavaScript', progress: 0, commits: 0, tests: 0,
              platform: 'Web', branch: 'main', lastActive: Date.now(), tags: ['new']
            }]);
          }}
          style={{
            marginLeft: 'auto', background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1',
            borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: '#818cf8', fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 4
          }}
        >
          <Plus size={12} /> New
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Project List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(p => (
            <ProjectCard key={p.id} project={p} selected={selectedId === p.id} onSelect={setSelectedId} />
          ))}
        </div>

        {/* Detail Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {selected && (
            <div style={{ background: `${PROJECT_TYPES[selected.type].color}15`, border: `1px solid ${PROJECT_TYPES[selected.type].color}44`, borderRadius: 10, padding: 14 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14 }}>{selected.name}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Branch', selected.branch],
                  ['Platform', selected.platform],
                  ['Progress', `${selected.progress}%`],
                  ['Type', PROJECT_TYPES[selected.type].label]
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '6px 10px' }}>
                    <div style={{ fontSize: 10, color: '#888' }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ConnectorsPanel />
          <AchievementsPanel unlockedIds={unlockedAchievements} />
        </div>
      </div>
    </div>
  );
}
