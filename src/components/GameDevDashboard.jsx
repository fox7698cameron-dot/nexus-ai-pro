// src/components/GameDevDashboard.jsx
// Game Development, AR/VR/3D Project Tracking
// Connectors for Unreal Engine, Epic Games, PlayStation, Xbox, Ubisoft Connect
// Achievement and game progress tracking
// Updated: 2026-10-21

import React, { useState, useEffect, useCallback } from 'react';

const PROJECT_TYPES = {
  game: { label: 'Game', icon: '🎮', color: '#6366f1' },
  arvr: { label: 'AR/VR', icon: '🥽', color: '#8b5cf6' },
  '3d': { label: '3D Project', icon: '🎲', color: '#ec4899' },
  mobile_game: { label: 'Mobile Game', icon: '📱', color: '#f97316' },
  web_game: { label: 'Web Game', icon: '🌐', color: '#06b6d4' },
};

const ENGINES = {
  unreal: { name: 'Unreal Engine', icon: '🎯', color: '#0070f3', connected: false },
  unity: { name: 'Unity', icon: '⬡', color: '#000', connected: false },
  godot: { name: 'Godot', icon: '🤖', color: '#478cbf', connected: false },
  blender: { name: 'Blender', icon: '🧊', color: '#ea7600', connected: false },
  unreal5: { name: 'Unreal 5 (MetaHuman)', icon: '🧬', color: '#0070f3', connected: false },
  cry: { name: 'CryEngine', icon: '💎', color: '#00adef', connected: false },
};

const PLATFORM_CONNECTORS = {
  epic: { name: 'Epic Games Store', icon: '🏆', color: '#2d2d2d', connected: false, features: ['Achievements', 'Leaderboards', 'Friends', 'Cloud Saves'] },
  sony: { name: 'PlayStation Network', icon: '🎮', color: '#003791', connected: false, features: ['Trophies', 'Cloud Save', 'Party', 'Share Play'] },
  microsoft: { name: 'Xbox / Game Pass', icon: '🟢', color: '#107c10', connected: false, features: ['Achievements', 'Cloud Gaming', 'Multiplayer', 'Leaderboards'] },
  ubisoft: { name: 'Ubisoft Connect', icon: '🦁', color: '#0057a3', connected: false, features: ['Units', 'Challenges', 'Rewards', 'Cross-save'] },
  steam: { name: 'Steam', icon: '🚂', color: '#1b2838', connected: false, features: ['Achievements', 'Workshop', 'Cloud', 'Leaderboards'] },
  gog: { name: 'GOG Galaxy', icon: '🌌', color: '#5c1a8b', connected: false, features: ['Achievements', 'Cloud Saves', 'Friends'] },
};

const SAMPLE_PROJECTS = [
  {
    id: 'p1', name: 'Project Nexus', type: 'game', engine: 'unreal5', status: 'active',
    progress: 67, tasks: { total: 124, done: 83, inProgress: 18, blocked: 5 },
    platforms: ['epic', 'sony', 'microsoft'],
    milestones: [
      { name: 'Alpha', date: '2026-12-01', done: true },
      { name: 'Beta', date: '2027-02-15', done: false },
      { name: 'Launch', date: '2027-06-01', done: false },
    ],
    achievements: 48,
    loc: 186_000,
    lastCommit: '2h ago',
  },
  {
    id: 'p2', name: 'MetaVerse Arena', type: 'arvr', engine: 'unreal', status: 'active',
    progress: 34, tasks: { total: 78, done: 26, inProgress: 12, blocked: 2 },
    platforms: ['epic'],
    milestones: [
      { name: 'Prototype', date: '2026-11-01', done: true },
      { name: 'Demo', date: '2027-01-15', done: false },
    ],
    achievements: 12,
    loc: 42_000,
    lastCommit: '1d ago',
  },
  {
    id: 'p3', name: 'BlockWorld 3D', type: '3d', engine: 'blender', status: 'paused',
    progress: 18, tasks: { total: 45, done: 8, inProgress: 3, blocked: 1 },
    platforms: [],
    milestones: [
      { name: 'Concept', date: '2026-09-01', done: true },
      { name: 'Prototype', date: '2027-03-01', done: false },
    ],
    achievements: 0,
    loc: 8_400,
    lastCommit: '2w ago',
  },
];

const ACHIEVEMENT_STATUSES = { unlocked: '✅', locked: '🔒', inProgress: '⏳' };

function ProjectCard({ project, selected, onSelect }) {
  const type = PROJECT_TYPES[project.type];
  const statusColor = { active: '#10b981', paused: '#f59e0b', completed: '#6366f1', cancelled: '#ef4444' }[project.status] || '#888';

  return (
    <button
      onClick={() => onSelect(project.id)}
      style={{
        background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected ? '#6366f1' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 14, padding: 18, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 22 }}>{type.icon}</span>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginTop: 4 }}>{project.name}</div>
          <div style={{ fontSize: 11, color: '#666' }}>{type.label} · {ENGINES[project.engine]?.name}</div>
        </div>
        <span style={{ padding: '3px 8px', background: `${statusColor}20`, color: statusColor, borderRadius: 5, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
          {project.status}
        </span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 4 }}>
          <span>Progress</span>
          <span style={{ color: type.color, fontWeight: 600 }}>{project.progress}%</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6 }}>
          <div style={{ width: `${project.progress}%`, height: '100%', background: type.color, borderRadius: 4, transition: 'width 0.5s' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#666' }}>
        <span>📋 {project.tasks.done}/{project.tasks.total}</span>
        <span>🏆 {project.achievements}</span>
        <span>🕐 {project.lastCommit}</span>
      </div>
    </button>
  );
}

function TaskBoard({ tasks }) {
  const cols = [
    { key: 'todo', label: 'To Do', color: '#6366f1', count: tasks.total - tasks.done - tasks.inProgress - tasks.blocked },
    { key: 'inProgress', label: 'In Progress', color: '#f59e0b', count: tasks.inProgress },
    { key: 'blocked', label: 'Blocked', color: '#ef4444', count: tasks.blocked },
    { key: 'done', label: 'Done', color: '#10b981', count: tasks.done },
  ];
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {cols.map(col => (
        <div key={col.key} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, minWidth: 80 }}>
          <div style={{ fontSize: 10, color: col.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{col.label}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{col.count}</div>
        </div>
      ))}
    </div>
  );
}

function MilestoneTimeline({ milestones }) {
  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.08)' }} />
      {milestones.map((m, i) => (
        <div key={i} style={{ position: 'relative', marginBottom: 14, paddingLeft: 16 }}>
          <div style={{
            position: 'absolute', left: -14, top: 2, width: 12, height: 12, borderRadius: '50%',
            background: m.done ? '#10b981' : '#333', border: `2px solid ${m.done ? '#10b981' : '#555'}`,
          }} />
          <div style={{ fontSize: 13, color: m.done ? '#fff' : '#aaa', fontWeight: m.done ? 600 : 400 }}>{m.name}</div>
          <div style={{ fontSize: 11, color: '#555' }}>{m.date}</div>
        </div>
      ))}
    </div>
  );
}

function ConnectorCard({ connKey, connector, onConnect }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${connector.connected ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 12, padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{connector.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{connector.name}</span>
        </div>
        <span style={{
          padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
          background: connector.connected ? '#10b98120' : 'rgba(255,255,255,0.05)',
          color: connector.connected ? '#10b981' : '#666',
        }}>
          {connector.connected ? 'CONNECTED' : 'OFFLINE'}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {connector.features.map(f => (
          <span key={f} style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, fontSize: 10, color: '#888' }}>{f}</span>
        ))}
      </div>
      {!connector.connected && (
        <button
          onClick={() => onConnect(connKey)}
          style={{ width: '100%', padding: '7px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 7, color: '#a5b4fc', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Connect
        </button>
      )}
    </div>
  );
}

function AchievementTracker({ project }) {
  const sampleAchievements = [
    { id: 'a1', name: 'First Commit', desc: 'Made the first code commit', icon: '🌱', status: 'unlocked', platform: 'epic' },
    { id: 'a2', name: 'Alpha Milestone', desc: 'Reached alpha build status', icon: '🎯', status: 'unlocked', platform: 'epic' },
    { id: 'a3', name: 'Bug Crusher', desc: 'Closed 100 bugs', icon: '🐛', status: 'inProgress', platform: 'microsoft' },
    { id: 'a4', name: 'Performance King', desc: 'Achieve 60fps on all platforms', icon: '⚡', status: 'locked', platform: 'sony' },
    { id: 'a5', name: 'Cross-Platform', desc: 'Launch on 3+ platforms', icon: '🌍', status: 'locked', platform: 'ubisoft' },
  ];

  return (
    <div>
      {sampleAchievements.map(ach => (
        <div key={ach.id} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          opacity: ach.status === 'locked' ? 0.5 : 1,
        }}>
          <span style={{ fontSize: 22, filter: ach.status === 'locked' ? 'grayscale(1)' : 'none' }}>{ach.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>
              {ACHIEVEMENT_STATUSES[ach.status]} {ach.name}
            </div>
            <div style={{ fontSize: 11, color: '#666' }}>{ach.desc}</div>
          </div>
          <span style={{ fontSize: 10, color: '#555', textTransform: 'uppercase' }}>{ach.platform}</span>
        </div>
      ))}
    </div>
  );
}

export default function GameDevDashboard() {
  const [projects, setProjects] = useState(SAMPLE_PROJECTS);
  const [selectedId, setSelectedId] = useState('p1');
  const [activeTab, setActiveTab] = useState('overview');
  const [connectors, setConnectors] = useState(PLATFORM_CONNECTORS);
  const [engines, setEngines] = useState(ENGINES);
  const [showNewProject, setShowNewProject] = useState(false);

  const project = projects.find(p => p.id === selectedId);

  const handleConnect = useCallback((key) => {
    setConnectors(prev => ({ ...prev, [key]: { ...prev[key], connected: true } }));
  }, []);

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'achievements', label: 'Achievements' },
    { key: 'connectors', label: 'Connectors' },
  ];

  return (
    <div style={{ background: '#0d0d1a', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Game Dev Studio</h1>
          <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: 13 }}>Game · AR/VR · 3D Project Tracking</p>
        </div>
        <button
          onClick={() => setShowNewProject(true)}
          style={{ padding: '8px 18px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          + New Project
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Project list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} selected={selectedId === p.id} onSelect={setSelectedId} />
          ))}
        </div>

        {/* Project detail */}
        {project && (
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '8px 16px', background: 'transparent',
                    border: 'none', borderBottom: activeTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
                    color: activeTab === tab.key ? '#a5b4fc' : '#666', cursor: 'pointer', fontSize: 13,
                    fontWeight: activeTab === tab.key ? 600 : 400, marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: 13, color: '#aaa' }}>Project Stats</h4>
                  {[
                    { label: 'Lines of Code', value: project.loc.toLocaleString() },
                    { label: 'Engine', value: ENGINES[project.engine]?.name },
                    { label: 'Achievements', value: project.achievements },
                    { label: 'Platforms', value: project.platforms.length },
                    { label: 'Last Commit', value: project.lastCommit },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                      <span style={{ color: '#666' }}>{label}</span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: 13, color: '#aaa' }}>Milestones</h4>
                  <MilestoneTimeline milestones={project.milestones} />
                </div>
                <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: 13, color: '#aaa' }}>Task Overview</h4>
                  <TaskBoard tasks={project.tasks} />
                </div>
              </div>
            )}

            {/* Tasks */}
            {activeTab === 'tasks' && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
                <h4 style={{ margin: '0 0 14px 0', fontSize: 13, color: '#aaa' }}>Task Board</h4>
                <TaskBoard tasks={project.tasks} />
                <div style={{ marginTop: 20 }}>
                  <p style={{ color: '#555', fontSize: 12 }}>
                    Connect to GitHub, Jira, or Linear to see live task data.
                    Full task management requires the integrations connector in Settings.
                  </p>
                </div>
              </div>
            )}

            {/* Achievements */}
            {activeTab === 'achievements' && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h4 style={{ margin: 0, fontSize: 13, color: '#aaa' }}>Achievements & Progress</h4>
                  <span style={{ fontSize: 12, color: '#666' }}>{project.achievements} unlocked</span>
                </div>
                <AchievementTracker project={project} />
              </div>
            )}

            {/* Connectors */}
            {activeTab === 'connectors' && (
              <div>
                <h4 style={{ margin: '0 0 14px 0', fontSize: 13, color: '#aaa' }}>Platform Connectors</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 24 }}>
                  {Object.entries(connectors).map(([key, conn]) => (
                    <ConnectorCard key={key} connKey={key} connector={conn} onConnect={handleConnect} />
                  ))}
                </div>
                <h4 style={{ margin: '0 0 14px 0', fontSize: 13, color: '#aaa' }}>Engine SDKs</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                  {Object.entries(engines).map(([key, eng]) => (
                    <div key={key} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{eng.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{eng.name}</div>
                        <div style={{ fontSize: 10, color: eng.connected ? '#10b981' : '#555' }}>{eng.connected ? 'Connected' : 'Available'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
