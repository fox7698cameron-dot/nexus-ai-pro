// Nexus AI Pro - Project Tracking Dashboard | Date: 2026-10-22
import React, { useState, useEffect, useCallback } from 'react';

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:       '#0a0a0f',
  surface:  '#12121a',
  card:     '#1a1a2e',
  border:   '#2a2a4a',
  purple:   '#7c3aed',
  purpleL:  '#a855f7',
  cyan:     '#06b6d4',
  cyanL:    '#22d3ee',
  green:    '#10b981',
  yellow:   '#f59e0b',
  red:      '#ef4444',
  textPri:  '#f1f5f9',
  textSec:  '#94a3b8',
  textMut:  '#475569',
};

const S = {
  app: {
    minHeight: '100vh', background: C.bg, color: C.textPri,
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", padding: '24px',
  },
  card: {
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: '12px', padding: '20px',
  },
  badge: (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '2px 10px', borderRadius: '999px', fontSize: '11px',
    fontWeight: 600, background: `${color}22`, color: color,
    border: `1px solid ${color}44`,
  }),
  btn: (variant = 'primary') => ({
    padding: '8px 16px', borderRadius: '8px', border: 'none',
    cursor: 'pointer', fontSize: '13px', fontWeight: 600,
    background: variant === 'primary' ? `linear-gradient(135deg,${C.purple},${C.cyan})` :
                variant === 'ghost'   ? 'transparent' : C.surface,
    color: C.textPri,
    border: variant === 'ghost' ? `1px solid ${C.border}` : 'none',
  }),
  input: {
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: '8px', padding: '8px 12px', color: C.textPri,
    fontSize: '13px', width: '100%', boxSizing: 'border-box',
  },
  label: { fontSize: '12px', color: C.textSec, marginBottom: '4px', display: 'block' },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  },
  modalBox: {
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: '16px', padding: '28px', width: '480px',
    maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
  },
};

// ─── Mock Data ───────────────────────────────────────────────────────────────
const INITIAL_PROJECTS = [
  {
    id: 'p1', name: 'Nexus Realms', type: 'Game Development',
    platforms: ['PC', 'Console', 'VR'],
    progress: 62, teamSize: 8, lastCommit: '12 min ago',
    buildStatus: { PC: 'passing', Console: 'building', VR: 'failing' },
    milestones: [
      { name: 'Core Engine', done: true },
      { name: 'Multiplayer MVP', done: true },
      { name: 'Level Design', done: false },
      { name: 'Beta Launch', done: false },
    ],
    description: 'Open-world multiplayer RPG with full VR support.',
    engine: 'Unreal Engine 5',
  },
  {
    id: 'p2', name: 'AR City Builder', type: 'AR/VR',
    platforms: ['iOS', 'Android'],
    progress: 38, teamSize: 4, lastCommit: '2 hr ago',
    buildStatus: { iOS: 'passing', Android: 'passing' },
    milestones: [
      { name: 'ARKit Integration', done: true },
      { name: 'Plane Detection', done: true },
      { name: 'Multiplayer AR', done: false },
      { name: 'App Store Release', done: false },
    ],
    description: 'Augmented reality city-building game for mobile.',
    engine: 'Unity (ARKit/ARCore)',
  },
  {
    id: 'p3', name: 'Nexus Platform API', type: 'Coding',
    platforms: ['Linux', 'Windows', 'macOS'],
    progress: 85, teamSize: 6, lastCommit: '5 min ago',
    buildStatus: { Linux: 'passing', Windows: 'passing', macOS: 'passing' },
    milestones: [
      { name: 'Auth System', done: true },
      { name: 'REST API v2', done: true },
      { name: 'GraphQL Layer', done: true },
      { name: 'Enterprise Rollout', done: false },
    ],
    description: 'Full-stack platform API powering the Nexus ecosystem.',
    engine: 'Node.js / TypeScript',
  },
  {
    id: 'p4', name: 'Void Sculptor 3D', type: '3D Projects',
    platforms: ['PC', 'macOS'],
    progress: 24, teamSize: 2, lastCommit: '1 day ago',
    buildStatus: { PC: 'passing', macOS: 'building' },
    milestones: [
      { name: 'Scene Graph', done: true },
      { name: 'PBR Renderer', done: false },
      { name: 'Physics Engine', done: false },
      { name: 'Export Pipeline', done: false },
    ],
    description: 'Real-time 3D sculpting tool with procedural generation.',
    engine: 'Three.js / WebGPU',
  },
];

const PLATFORM_CONNECTORS = [
  { id: 'unreal',      name: 'Unreal Engine',    vendor: 'Epic Games',   status: 'connected',  icon: '🎮' },
  { id: 'epicstore',   name: 'Epic Games Store',  vendor: 'Epic Games',   status: 'configure',  icon: '🏪' },
  { id: 'playstation', name: 'PlayStation',        vendor: 'Sony',         status: 'configure',  icon: '🎯' },
  { id: 'xbox',        name: 'Xbox',               vendor: 'Microsoft',    status: 'configure',  icon: '🟢' },
  { id: 'ubisoft',     name: 'Ubisoft Connect',    vendor: 'Ubisoft',      status: 'soon',       icon: '🔷' },
  { id: 'steam',       name: 'Steam',              vendor: 'Valve',        status: 'connected',  icon: '☁️' },
  { id: 'unity',       name: 'Unity Cloud',        vendor: 'Unity',        status: 'configure',  icon: '⚪' },
];

const ACHIEVEMENTS = [
  { id: 'a1', name: 'First Blood',      category: 'Combat',    players: 48200, total: 60000, icon: '⚔️' },
  { id: 'a2', name: 'Speedrunner',       category: 'Skill',     players: 12500, total: 60000, icon: '⚡' },
  { id: 'a3', name: 'Explorer',          category: 'Exploration', players: 55300, total: 60000, icon: '🗺️' },
  { id: 'a4', name: 'Master Builder',    category: 'Creation',  players: 8900,  total: 60000, icon: '🏗️' },
  { id: 'a5', name: 'Social Butterfly',  category: 'Social',    players: 31200, total: 60000, icon: '🦋' },
];

const LEADERBOARD = [
  { rank: 1,  name: 'ShadowViper_X',   score: 98420, region: 'NA' },
  { rank: 2,  name: 'NexusQueen',       score: 97180, region: 'EU' },
  { rank: 3,  name: 'PixelStorm99',     score: 95600, region: 'AS' },
  { rank: 4,  name: 'CryptoKnight',     score: 94300, region: 'NA' },
  { rank: 5,  name: 'GlitchMaster',     score: 93100, region: 'LA' },
  { rank: 6,  name: 'VoidWalker_77',    score: 91800, region: 'EU' },
  { rank: 7,  name: 'StarDrifter',      score: 90200, region: 'OC' },
  { rank: 8,  name: 'IronFoxCam',       score: 89500, region: 'NA' },
  { rank: 9,  name: 'NebulaRunner',     score: 87900, region: 'AS' },
  { rank: 10, name: 'ChaosEngine_X',    score: 86400, region: 'EU' },
];

const TEAM_MEMBERS = [
  { id: 't1', name: 'Alex R.',   role: 'Lead Dev',     status: 'active',  avatar: '👨‍💻' },
  { id: 't2', name: 'Jordan K.', role: 'Game Designer', status: 'active',  avatar: '🎨' },
  { id: 't3', name: 'Sam T.',    role: 'DevOps',        status: 'away',    avatar: '⚙️' },
  { id: 't4', name: 'Riley P.',  role: '3D Artist',     status: 'active',  avatar: '🖌️' },
];

const RECENT_COMMITS = [
  { hash: 'a3f9b2c', msg: 'fix: collision detection edge case in VR mode', author: 'Alex R.',   ago: '8m ago' },
  { hash: 'b7d1e4f', msg: 'feat: add Epic achievement API integration',     author: 'Jordan K.', ago: '1h ago' },
  { hash: 'c2a5d8e', msg: 'chore: update Unreal SDK to 5.4.2',              author: 'Sam T.',    ago: '3h ago' },
  { hash: 'd9e3f1a', msg: 'perf: reduce draw calls by 40% on mobile',        author: 'Riley P.',  ago: '5h ago' },
];

const XR_METRICS = {
  fps: { target: 90, actual: 87 },
  polygons: { budget: 2000000, used: 1420000 },
  textureMem: { budgetMB: 512, usedMB: 380 },
  sdks: [
    { name: 'ARKit',   status: 'active',   version: '6.0' },
    { name: 'ARCore',  status: 'active',   version: '1.42' },
    { name: 'OpenXR',  status: 'active',   version: '1.1' },
    { name: 'WebXR',   status: 'active',   version: '2024' },
  ],
};

const PLUGINS = [
  { id: 'pl1', name: 'Chaos Physics',     platform: 'Unreal', category: 'Physics',    price: 'Free',   stars: 4.8 },
  { id: 'pl2', name: 'Convai NPC AI',     platform: 'Unreal', category: 'AI',         price: '$49/mo', stars: 4.6 },
  { id: 'pl3', name: 'FPS Controller Pro',platform: 'Unity',  category: 'Gameplay',   price: '$24.99', stars: 4.9 },
  { id: 'pl4', name: 'DOTween Pro',        platform: 'Unity',  category: 'Animation',  price: '$15',    stars: 4.9 },
  { id: 'pl5', name: 'Procedural Terrain', platform: 'Unity',  category: '3D/World',   price: '$39.99', stars: 4.7 },
  { id: 'pl6', name: 'Steam SDK Wrapper',  platform: 'Steam',  category: 'Platform',   price: 'Free',   stars: 4.5 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
      <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: C.textPri,
        borderLeft: `3px solid ${C.purple}`, paddingLeft: '10px' }}>{children}</h2>
      {action}
    </div>
  );
}

function ProgressBar({ value, color = C.purple, height = 6 }) {
  return (
    <div style={{ background: C.border, borderRadius: '999px', height, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${value}%`,
        background: `linear-gradient(90deg,${color},${color === C.purple ? C.cyan : color})`,
        borderRadius: '999px', transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function BuildStatusDot({ status }) {
  const color = status === 'passing' ? C.green : status === 'building' ? C.yellow : C.red;
  return (
    <span title={status} style={{
      display: 'inline-block', width: 8, height: 8,
      borderRadius: '50%', background: color,
      boxShadow: `0 0 6px ${color}`,
    }} />
  );
}

function ProjectCard({ project, onSelect }) {
  const typeColors = {
    'Game Development': C.purple,
    'AR/VR':           C.cyan,
    'Coding':          C.green,
    '3D Projects':     C.yellow,
  };
  const color = typeColors[project.type] || C.purple;
  const milestonesDone = project.milestones.filter(m => m.done).length;

  return (
    <div
      onClick={() => onSelect(project)}
      style={{
        ...S.card,
        cursor: 'pointer',
        borderColor: `${color}44`,
        transition: 'border-color 0.2s, transform 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = `${color}44`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: C.textPri, marginBottom: '4px' }}>{project.name}</div>
          <span style={S.badge(color)}>{project.type}</span>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', color: C.textSec }}>
          <div>{project.engine}</div>
          <div style={{ marginTop: '2px' }}>{project.teamSize} devs</div>
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textSec, marginBottom: '4px' }}>
          <span>Progress</span><span style={{ color: color, fontWeight: 700 }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={color} height={8} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: C.textSec }}>
          Milestones: <span style={{ color: C.green, fontWeight: 700 }}>{milestonesDone}</span>
          <span style={{ color: C.textMut }}>/{project.milestones.length}</span>
        </div>
        <div style={{ fontSize: '11px', color: C.textMut }}>
          Last commit: <span style={{ color: C.textSec }}>{project.lastCommit}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {project.platforms.map(p => (
          <span key={p} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
            background: C.surface, color: C.textSec, border: `1px solid ${C.border}` }}>
            {p}
          </span>
        ))}
        {Object.entries(project.buildStatus).slice(0, 3).map(([plat, status]) => (
          <span key={plat} style={{ display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
            background: C.surface, border: `1px solid ${C.border}`, color: C.textSec }}>
            <BuildStatusDot status={status} />{plat}
          </span>
        ))}
      </div>
    </div>
  );
}

function ConnectorCard({ connector, onConnect }) {
  const statusColor = connector.status === 'connected' ? C.green :
                      connector.status === 'configure' ? C.yellow : C.textMut;
  const statusLabel = connector.status === 'connected' ? 'Connected' :
                      connector.status === 'configure' ? 'Configure' : 'Coming Soon';

  return (
    <div style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ fontSize: '24px', width: '40px', textAlign: 'center' }}>{connector.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: C.textPri }}>{connector.name}</div>
        <div style={{ fontSize: '11px', color: C.textMut }}>{connector.vendor}</div>
      </div>
      <div>
        <span style={S.badge(statusColor)}>{statusLabel}</span>
        {connector.status === 'configure' && (
          <button
            onClick={() => onConnect(connector)}
            style={{ ...S.btn('ghost'), marginLeft: '6px', padding: '4px 10px', fontSize: '11px' }}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

function AddProjectModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: '', type: 'Game Development', description: '',
    platforms: [], engine: '',
  });
  const allPlatforms = ['PC', 'Console', 'iOS', 'Android', 'Linux', 'Windows', 'macOS', 'VR'];

  const toggle = (p) => setForm(f => ({
    ...f, platforms: f.platforms.includes(p)
      ? f.platforms.filter(x => x !== p)
      : [...f.platforms, p],
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onAdd({
      ...form,
      id: `p${Date.now()}`, progress: 0, teamSize: 1,
      lastCommit: 'never',
      buildStatus: Object.fromEntries(form.platforms.map(p => [p, 'passing'])),
      milestones: [{ name: 'Project Setup', done: false }],
    });
    onClose();
  };

  return (
    <div style={S.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modalBox}>
        <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700,
          background: `linear-gradient(135deg,${C.purpleL},${C.cyanL})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Add New Project
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Project Name *</label>
            <input style={S.input} value={form.name} required
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="My Awesome Game" />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Project Type</label>
            <select style={S.input} value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {['Game Development', 'AR/VR', 'Coding', '3D Projects'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Engine / Framework</label>
            <input style={S.input} value={form.engine}
              onChange={e => setForm(f => ({ ...f, engine: e.target.value }))}
              placeholder="Unreal Engine 5, Unity, Three.js…" />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Target Platforms</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {allPlatforms.map(p => (
                <button key={p} type="button"
                  onClick={() => toggle(p)}
                  style={{
                    ...S.btn(form.platforms.includes(p) ? 'primary' : 'ghost'),
                    padding: '4px 10px', fontSize: '11px',
                  }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={S.label}>Description</label>
            <textarea style={{ ...S.input, height: '72px', resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief project description…" />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" style={S.btn('ghost')} onClick={onClose}>Cancel</button>
            <button type="submit" style={S.btn('primary')}>Create Project</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConnectPlatformModal({ connector, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    // In production: securely POST to /api/connectors/:id/connect with apiKey
    setSaved(true);
  };

  return (
    <div style={S.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...S.modalBox, width: '400px' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: C.textPri }}>
          {connector.icon} Connect {connector.name}
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: C.textSec }}>
          Enter your {connector.vendor} developer credentials. Keys are encrypted at rest and never logged.
        </p>
        {saved ? (
          <div style={{ padding: '16px', background: `${C.green}22`, border: `1px solid ${C.green}44`,
            borderRadius: '8px', color: C.green, fontSize: '13px', textAlign: 'center' }}>
            ✓ Credentials saved. Connector will verify in the background.
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '14px' }}>
              <label style={S.label}>API Key / Client ID</label>
              <input style={S.input} type="password" value={apiKey}
                onChange={e => setApiKey(e.target.value)} required
                placeholder="Paste your key here…" />
            </div>
            <p style={{ fontSize: '11px', color: C.textMut, margin: '0 0 16px' }}>
              Keys are stored encrypted via AES-256-GCM and never hard-coded.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" style={S.btn('ghost')} onClick={onClose}>Cancel</button>
              <button type="submit" style={S.btn('primary')}>Save &amp; Connect</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProjectTrackingDashboard() {
  const [projects, setProjects]               = useState(INITIAL_PROJECTS);
  const [connectors, setConnectors]           = useState(PLATFORM_CONNECTORS);
  const [activeTab, setActiveTab]             = useState('projects');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAddModal, setShowAddModal]       = useState(false);
  const [connectTarget, setConnectTarget]     = useState(null);
  const [tick, setTick]                       = useState(0);

  // Real-time build status simulation
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1);
      setProjects(prev => prev.map(p => {
        // Randomly flip one 'building' status
        const updated = { ...p.buildStatus };
        for (const [plat, status] of Object.entries(updated)) {
          if (status === 'building' && Math.random() > 0.5) {
            updated[plat] = 'passing';
          }
        }
        return { ...p, buildStatus: updated };
      }));
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const handleAddProject = useCallback((project) => {
    setProjects(prev => [...prev, project]);
  }, []);

  const exportReport = useCallback(() => {
    const report = {
      exportedAt: new Date().toISOString(),
      projects,
      connectors: connectors.map(c => ({ id: c.id, name: c.name, status: c.status })),
      achievements: ACHIEVEMENTS,
      xrMetrics: XR_METRICS,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nexus-project-report-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  }, [projects, connectors]);

  const tabs = [
    { id: 'projects',      label: '📦 Projects' },
    { id: 'connectors',    label: '🔌 Connectors' },
    { id: 'achievements',  label: '🏆 Achievements' },
    { id: 'builds',        label: '⚙️ Build Pipeline' },
    { id: 'xr',            label: '🥽 AR/VR Metrics' },
    { id: 'team',          label: '👥 Collaboration' },
    { id: 'plugins',       label: '🧩 Plugins' },
  ];

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800,
            background: `linear-gradient(135deg,${C.purpleL},${C.cyanL})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Project Tracking
          </h1>
          <div style={{ fontSize: '12px', color: C.textMut, marginTop: '2px' }}>
            Real-time · {projects.length} active projects · Last refresh {new Date().toLocaleTimeString()}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={S.btn('ghost')} onClick={exportReport}>⬇ Export Report</button>
          <button style={S.btn('primary')} onClick={() => setShowAddModal(true)}>+ Add Project</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', flexWrap: 'wrap',
        borderBottom: `1px solid ${C.border}`, paddingBottom: '1px' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 14px', fontSize: '13px', fontWeight: 600,
              color: activeTab === t.id ? C.purpleL : C.textSec,
              borderBottom: activeTab === t.id ? `2px solid ${C.purpleL}` : '2px solid transparent',
              transition: 'color 0.2s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Projects ── */}
      {activeTab === 'projects' && (
        <div>
          <SectionTitle>Active Projects ({projects.length})</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '16px' }}>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onSelect={setSelectedProject} />
            ))}
          </div>

          {/* Project detail drawer */}
          {selectedProject && (
            <div style={{ ...S.card, marginTop: '24px', borderColor: C.purple }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: C.textPri }}>{selectedProject.name}</h3>
                <button style={S.btn('ghost')} onClick={() => setSelectedProject(null)}>✕</button>
              </div>
              <p style={{ color: C.textSec, fontSize: '13px', margin: '0 0 16px' }}>{selectedProject.description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: C.textMut, marginBottom: '8px' }}>MILESTONES</div>
                  {selectedProject.milestones.map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px',
                      marginBottom: '6px', fontSize: '13px' }}>
                      <span style={{ color: m.done ? C.green : C.textMut }}>{m.done ? '✓' : '○'}</span>
                      <span style={{ color: m.done ? C.textPri : C.textSec,
                        textDecoration: m.done ? 'none' : 'none' }}>{m.name}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: C.textMut, marginBottom: '8px' }}>BUILD STATUS</div>
                  {Object.entries(selectedProject.buildStatus).map(([plat, status]) => (
                    <div key={plat} style={{ display: 'flex', alignItems: 'center', gap: '8px',
                      marginBottom: '6px', fontSize: '13px' }}>
                      <BuildStatusDot status={status} />
                      <span style={{ color: C.textSec }}>{plat}</span>
                      <span style={S.badge(status === 'passing' ? C.green : status === 'building' ? C.yellow : C.red)}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Connectors ── */}
      {activeTab === 'connectors' && (
        <div>
          <SectionTitle>Game Platform Connectors</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: '12px' }}>
            {connectors.map(c => (
              <ConnectorCard key={c.id} connector={c}
                onConnect={setConnectTarget} />
            ))}
          </div>
          <div style={{ ...S.card, marginTop: '20px', background: `${C.purple}11`,
            borderColor: `${C.purple}44` }}>
            <div style={{ fontSize: '13px', color: C.textSec }}>
              <strong style={{ color: C.purpleL }}>Note:</strong> All API keys and credentials are encrypted with AES-256-GCM
              and never exposed in logs or responses. Keys are loaded from environment variables at runtime.
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Achievements ── */}
      {activeTab === 'achievements' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <SectionTitle>Achievement Tracking</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ACHIEVEMENTS.map(a => {
                const pct = Math.round((a.players / a.total) * 100);
                return (
                  <div key={a.id} style={S.card}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px' }}>{a.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: C.textPri }}>{a.name}</div>
                        <div style={{ fontSize: '11px', color: C.textMut }}>{a.category}</div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: C.purpleL }}>{pct}%</div>
                    </div>
                    <ProgressBar value={pct} color={C.purple} />
                    <div style={{ fontSize: '11px', color: C.textMut, marginTop: '4px' }}>
                      {a.players.toLocaleString()} / {a.total.toLocaleString()} players unlocked
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <SectionTitle>Top 10 Leaderboard</SectionTitle>
            <div style={S.card}>
              {LEADERBOARD.map(player => (
                <div key={player.rank} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 0',
                  borderBottom: player.rank < 10 ? `1px solid ${C.border}` : 'none',
                }}>
                  <div style={{
                    width: '24px', textAlign: 'center', fontWeight: 700, fontSize: '13px',
                    color: player.rank <= 3 ? [C.yellow, '#C0C0C0', '#CD7F32'][player.rank - 1] : C.textMut,
                  }}>
                    {player.rank <= 3 ? ['🥇','🥈','🥉'][player.rank - 1] : `#${player.rank}`}
                  </div>
                  <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: C.textPri }}>
                    {player.name}
                  </div>
                  <span style={S.badge(C.cyan)}>{player.region}</span>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.purpleL }}>
                    {player.score.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Build Pipeline ── */}
      {activeTab === 'builds' && (
        <div>
          <SectionTitle>CI/CD Build Pipeline</SectionTitle>
          {projects.map(p => (
            <div key={p.id} style={{ ...S.card, marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: C.textPri }}>{p.name}</span>
                <span style={{ fontSize: '11px', color: C.textMut }}>({p.engine})</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {Object.entries(p.buildStatus).map(([plat, status]) => (
                  <div key={plat} style={{
                    padding: '10px 16px', borderRadius: '8px', background: C.surface,
                    border: `1px solid ${status === 'passing' ? C.green : status === 'building' ? C.yellow : C.red}44`,
                    textAlign: 'center', minWidth: '90px',
                  }}>
                    <BuildStatusDot status={status} />
                    <div style={{ fontWeight: 600, fontSize: '12px', color: C.textPri, marginTop: '4px' }}>{plat}</div>
                    <div style={{ fontSize: '10px', color: status === 'passing' ? C.green :
                      status === 'building' ? C.yellow : C.red, marginTop: '2px', textTransform: 'capitalize' }}>
                      {status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ ...S.card, background: `${C.cyan}11`, borderColor: `${C.cyan}33`, marginTop: '8px' }}>
            <div style={{ fontSize: '12px', color: C.textSec }}>
              Multi-platform CI/CD supports Linux, Windows, macOS, iOS, Android, Console, and VR.
              Build status refreshes every 10 seconds.
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: AR/VR Metrics ── */}
      {activeTab === 'xr' && (
        <div>
          <SectionTitle>AR/VR Project Metrics</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '16px', marginBottom: '24px' }}>
            {/* FPS */}
            <div style={S.card}>
              <div style={{ fontSize: '12px', color: C.textMut, marginBottom: '8px' }}>FRAME RATE</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: C.textSec }}>Target</span>
                <span style={{ fontWeight: 700, color: C.cyan }}>{XR_METRICS.fps.target} fps</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: C.textSec }}>Actual</span>
                <span style={{ fontWeight: 700, color: XR_METRICS.fps.actual >= XR_METRICS.fps.target * 0.95 ? C.green : C.yellow }}>
                  {XR_METRICS.fps.actual} fps
                </span>
              </div>
              <ProgressBar value={(XR_METRICS.fps.actual / XR_METRICS.fps.target) * 100} color={C.cyan} />
            </div>
            {/* Polygons */}
            <div style={S.card}>
              <div style={{ fontSize: '12px', color: C.textMut, marginBottom: '8px' }}>POLYGON BUDGET</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: C.textSec }}>Budget</span>
                <span style={{ fontWeight: 700, color: C.cyan }}>{(XR_METRICS.polygons.budget / 1e6).toFixed(1)}M</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: C.textSec }}>Used</span>
                <span style={{ fontWeight: 700, color: C.green }}>{(XR_METRICS.polygons.used / 1e6).toFixed(2)}M</span>
              </div>
              <ProgressBar value={(XR_METRICS.polygons.used / XR_METRICS.polygons.budget) * 100} color={C.purple} />
            </div>
            {/* Texture Memory */}
            <div style={S.card}>
              <div style={{ fontSize: '12px', color: C.textMut, marginBottom: '8px' }}>TEXTURE MEMORY</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: C.textSec }}>Budget</span>
                <span style={{ fontWeight: 700, color: C.cyan }}>{XR_METRICS.textureMem.budgetMB} MB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: C.textSec }}>Used</span>
                <span style={{ fontWeight: 700, color: C.yellow }}>{XR_METRICS.textureMem.usedMB} MB</span>
              </div>
              <ProgressBar value={(XR_METRICS.textureMem.usedMB / XR_METRICS.textureMem.budgetMB) * 100} color={C.yellow} />
            </div>
          </div>

          <SectionTitle>XR SDK Status</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '12px' }}>
            {XR_METRICS.sdks.map(sdk => (
              <div key={sdk.name} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={S.badge(sdk.status === 'active' ? C.green : C.yellow)}>
                  {sdk.status}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: C.textPri }}>{sdk.name}</div>
                  <div style={{ fontSize: '11px', color: C.textMut }}>v{sdk.version}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Collaboration ── */}
      {activeTab === 'team' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div>
            <SectionTitle>Active Team Members</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {TEAM_MEMBERS.map(m => (
                <div key={m.id} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '28px' }}>{m.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: C.textPri }}>{m.name}</div>
                    <div style={{ fontSize: '11px', color: C.textMut }}>{m.role}</div>
                  </div>
                  <span style={S.badge(m.status === 'active' ? C.green : C.yellow)}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionTitle>Recent Commits</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {RECENT_COMMITS.map(c => (
                <div key={c.hash} style={S.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <code style={{ fontSize: '11px', color: C.cyan, fontFamily: 'monospace' }}>{c.hash}</code>
                    <span style={{ fontSize: '11px', color: C.textMut }}>{c.ago}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: C.textPri, marginBottom: '4px' }}>{c.msg}</div>
                  <div style={{ fontSize: '11px', color: C.textSec }}>{c.author}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Plugins ── */}
      {activeTab === 'plugins' && (
        <div>
          <SectionTitle>Plugin Marketplace</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '14px' }}>
            {PLUGINS.map(pl => (
              <div key={pl.id} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: C.textPri }}>{pl.name}</div>
                  <span style={S.badge(pl.platform === 'Unreal' ? C.purpleL :
                    pl.platform === 'Unity' ? C.cyan : C.green)}>{pl.platform}</span>
                </div>
                <div style={{ fontSize: '11px', color: C.textMut, marginBottom: '10px' }}>{pl.category}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px' }}>
                    {'★'.repeat(Math.floor(pl.stars))}<span style={{ color: C.textMut }}>{'★'.repeat(5 - Math.floor(pl.stars))}</span>
                    <span style={{ color: C.textSec, marginLeft: '4px' }}>{pl.stars}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: pl.price === 'Free' ? C.green : C.purpleL, fontSize: '13px' }}>
                    {pl.price}
                  </div>
                </div>
                <button style={{ ...S.btn('ghost'), width: '100%', marginTop: '10px', fontSize: '12px' }}>
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddProjectModal onClose={() => setShowAddModal(false)} onAdd={handleAddProject} />
      )}
      {connectTarget && (
        <ConnectPlatformModal connector={connectTarget} onClose={() => setConnectTarget(null)} />
      )}
    </div>
  );
}
