// File: src/components/GameDevDashboard.jsx
// Updated: 2026-10-20
// Game development & AR/VR/3D project tracking dashboard

import React, { useState, useEffect, useCallback, useMemo } from 'react';

const ENGINES = {
  unreal:  { label: 'Unreal Engine', icon: '⬛', color: '#0f76bc' },
  unity:   { label: 'Unity',         icon: '⚪', color: '#222c37' },
  godot:   { label: 'Godot',         icon: '🔵', color: '#478cbf' },
  custom:  { label: 'Custom',        icon: '🔧', color: '#6b7280' },
};

const CATEGORIES = ['All', 'Game', 'AR', 'VR', '3D', 'Mobile', 'Console'];

const PLATFORM_CONNECTORS = [
  { id: 'epic',      label: 'Epic Games / Unreal',  icon: '⬛', authUrl: '#' },
  { id: 'sony',      label: 'Sony PlayStation',      icon: '🎮', authUrl: '#' },
  { id: 'microsoft', label: 'Microsoft Xbox',        icon: '🟩', authUrl: '#' },
  { id: 'ubisoft',   label: 'Ubisoft Connect',       icon: '🔷', authUrl: '#' },
];

const BUILD_STATUS = { passing: '#22c55e', failing: '#ef4444', pending: '#f59e0b', skipped: '#6b7280' };

const SAMPLE_PROJECTS = [
  {
    id: 'p1', name: 'Neon Abyss II', category: 'Game', engine: 'unreal',
    platforms: ['PC', 'PlayStation', 'Xbox'], progress: 72,
    milestones: [
      { name: 'Pre-Alpha', done: true  },
      { name: 'Alpha',     done: true  },
      { name: 'Beta',      done: false },
      { name: 'Gold',      done: false },
    ],
    buildStatus: 'passing', coverage: 64, bugs: { open: 12, closed: 48 },
    loc: 142000, localization: ['en', 'es', 'fr', 'de', 'ja'],
    achievements: 32, achievementsUnlocked: 18,
    lastBuild: '2m ago',
  },
  {
    id: 'p2', name: 'VoidWalker VR', category: 'VR', engine: 'unity',
    platforms: ['VR', 'PC'], progress: 45,
    milestones: [
      { name: 'Concept',   done: true  },
      { name: 'Prototype', done: true  },
      { name: 'Alpha',     done: false },
      { name: 'Release',   done: false },
    ],
    buildStatus: 'pending', coverage: 38, bugs: { open: 7, closed: 19 },
    loc: 68000, localization: ['en', 'ja'],
    achievements: 20, achievementsUnlocked: 0,
    lastBuild: '14m ago',
  },
  {
    id: 'p3', name: 'AR City Builder', category: 'AR', engine: 'unity',
    platforms: ['Mobile', 'AR'], progress: 31,
    milestones: [
      { name: 'Research',  done: true  },
      { name: 'Prototype', done: false },
      { name: 'Alpha',     done: false },
      { name: 'Launch',    done: false },
    ],
    buildStatus: 'failing', coverage: 21, bugs: { open: 23, closed: 5 },
    loc: 35000, localization: ['en'],
    achievements: 15, achievementsUnlocked: 0,
    lastBuild: '1h ago',
  },
  {
    id: 'p4', name: 'Stellar 3D Engine', category: '3D', engine: 'custom',
    platforms: ['PC'], progress: 58,
    milestones: [
      { name: 'Core Renderer', done: true  },
      { name: 'Physics',       done: true  },
      { name: 'Audio',         done: false },
      { name: 'Scripting',     done: false },
    ],
    buildStatus: 'passing', coverage: 77, bugs: { open: 4, closed: 31 },
    loc: 210000, localization: ['en'],
    achievements: 0, achievementsUnlocked: 0,
    lastBuild: '5m ago',
  },
];

const ProgressBar = ({ value, color = 'var(--accent)' }) => (
  <div style={{ background: 'var(--bg-3)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
    <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 6, transition: 'width 0.6s ease' }} />
  </div>
);

const BuildBadge = ({ status }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, padding: '2px 8px', borderRadius: 10,
    background: `${BUILD_STATUS[status]}22`, color: BUILD_STATUS[status], fontWeight: 600,
  }}>
    <span>●</span> {status.toUpperCase()}
  </span>
);

const MilestoneTrail = ({ milestones }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
    {milestones.map((m, i) => (
      <React.Fragment key={m.name}>
        <div title={m.name} style={{
          width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
          background: m.done ? '#22c55e' : 'var(--bg-3)',
          border: `2px solid ${m.done ? '#22c55e' : 'var(--border)'}`,
          cursor: 'default',
        }} />
        {i < milestones.length - 1 && (
          <div style={{ flex: 1, height: 2, background: milestones[i + 1].done ? '#22c55e' : 'var(--border)', minWidth: 12 }} />
        )}
      </React.Fragment>
    ))}
  </div>
);

const ConnectorCard = ({ c, connected, onToggle }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10,
    padding: '10px 14px', marginBottom: 8,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 20 }}>{c.icon}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{c.label}</div>
        <div style={{ fontSize: 11, color: connected ? '#22c55e' : 'var(--text-3)' }}>
          {connected ? 'Connected – OAuth active' : 'Not connected'}
        </div>
      </div>
    </div>
    <button
      onClick={() => onToggle(c.id)}
      style={{
        padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
        background: connected ? '#ef444422' : 'var(--accent)', color: connected ? '#ef4444' : '#fff',
        cursor: 'pointer', fontSize: 12, fontWeight: 600,
      }}
    >
      {connected ? 'Disconnect' : 'Connect'}
    </button>
  </div>
);

export default function GameDevDashboard() {
  const [category, setCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState(null);
  const [connectors, setConnectors] = useState({ epic: true, sony: false, microsoft: false, ubisoft: false });
  const [notifications, setNotifications] = useState([
    { id: 1, text: '✅ Neon Abyss II – Build #312 passed', time: '2m ago' },
    { id: 2, text: '⚠️ AR City Builder – Build #88 failed: linker error', time: '1h ago' },
  ]);
  const [tab, setTab] = useState('projects');

  const filtered = useMemo(() =>
    SAMPLE_PROJECTS.filter(p => category === 'All' || p.category === category),
    [category]
  );

  const toggleConnector = useCallback((id) => {
    setConnectors(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Simulate build notification
  useEffect(() => {
    const t = setInterval(() => {
      const proj = SAMPLE_PROJECTS[Math.floor(Math.random() * SAMPLE_PROJECTS.length)];
      const ok = Math.random() > 0.35;
      setNotifications(prev => [
        { id: Date.now(), text: `${ok ? '✅' : '❌'} ${proj.name} – Build completed`, time: 'just now' },
        ...prev.slice(0, 9),
      ]);
    }, 20000);
    return () => clearInterval(t);
  }, []);

  const proj = selectedProject ? SAMPLE_PROJECTS.find(p => p.id === selectedProject) : null;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: 'var(--text-1)' }}>
      <style>{`
        .gd-tabs { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
        .gd-tab { padding:7px 16px; border-radius:8px; border:1px solid var(--border); background:var(--bg-2); cursor:pointer; font-size:13px; color:var(--text-2); transition:all 0.2s; }
        .gd-tab.active { background:var(--accent); color:#fff; border-color:var(--accent); }
        .cat-tab { padding:4px 12px; border-radius:14px; border:1px solid var(--border); background:var(--bg-2); cursor:pointer; font-size:12px; color:var(--text-3); }
        .cat-tab.active { background:var(--accent); color:#fff; border-color:var(--accent); }
        .proj-card { background:var(--bg-2); border:1px solid var(--border); border-radius:12px; padding:16px; cursor:pointer; transition:border-color 0.2s, box-shadow 0.2s; }
        .proj-card:hover, .proj-card.selected { border-color:var(--accent); box-shadow:0 0 0 2px var(--accent)22; }
        .proj-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
        .detail-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(100px,1fr)); gap:10px; margin:12px 0; }
        .detail-stat { background:var(--bg-3); border-radius:8px; padding:10px 12px; text-align:center; }
        .detail-stat .v { font-size:18px; font-weight:700; }
        .detail-stat .l { font-size:11px; color:var(--text-3); margin-top:2px; }
        .notif-list { max-height:200px; overflow-y:auto; }
        .notif-item { padding:8px 0; border-bottom:1px solid var(--border); font-size:13px; display:flex; justify-content:space-between; align-items:center; }
        .notif-item:last-child { border-bottom:none; }
        @media (max-width:600px) { .proj-grid { grid-template-columns:1fr; } }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>🎮 Game Dev Tracker</h2>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{SAMPLE_PROJECTS.length} projects · {SAMPLE_PROJECTS.filter(p => p.buildStatus === 'passing').length} builds passing</div>
      </div>

      {/* Main Tabs */}
      <div className="gd-tabs">
        {['projects', 'connectors', 'builds', 'achievements'].map(t2 => (
          <button key={t2} className={`gd-tab${tab === t2 ? ' active' : ''}`} onClick={() => setTab(t2)}>
            {t2 === 'projects' ? '📁' : t2 === 'connectors' ? '🔌' : t2 === 'builds' ? '🔨' : '🏆'} {t2.charAt(0).toUpperCase() + t2.slice(1)}
          </button>
        ))}
      </div>

      {/* Projects Tab */}
      {tab === 'projects' && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {CATEGORIES.map(c => (
              <button key={c} className={`cat-tab${category === c ? ' active' : ''}`} onClick={() => setCategory(c)}>{c}</button>
            ))}
          </div>
          <div className="proj-grid">
            {filtered.map(p => (
              <div key={p.id} className={`proj-card${selectedProject === p.id ? ' selected' : ''}`} onClick={() => setSelectedProject(selectedProject === p.id ? null : p.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      {ENGINES[p.engine]?.label} · {p.category}
                    </div>
                  </div>
                  <BuildBadge status={p.buildStatus} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>
                    <span>Progress</span><span>{p.progress}%</span>
                  </div>
                  <ProgressBar value={p.progress} color={p.buildStatus === 'failing' ? '#ef4444' : 'var(--accent)'} />
                </div>
                <MilestoneTrail milestones={p.milestones} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  {p.platforms.map(pl => (
                    <span key={pl} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 8, background: 'var(--bg-3)', color: 'var(--text-2)' }}>{pl}</span>
                  ))}
                </div>
                {selectedProject === p.id && (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <div className="detail-grid">
                      <div className="detail-stat"><div className="v">{p.coverage}%</div><div className="l">Coverage</div></div>
                      <div className="detail-stat"><div className="v">{p.bugs.open}</div><div className="l">Open Bugs</div></div>
                      <div className="detail-stat"><div className="v">{(p.loc / 1000).toFixed(0)}K</div><div className="l">Lines of Code</div></div>
                      <div className="detail-stat"><div className="v">{p.localization.length}</div><div className="l">Languages</div></div>
                      <div className="detail-stat"><div className="v">{p.achievements}</div><div className="l">Achievements</div></div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      Localization: {p.localization.join(', ')} · Last build: {p.lastBuild}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Connectors Tab */}
      {tab === 'connectors' && (
        <div>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16 }}>
            Connect your platform accounts via OAuth to sync builds, achievements, and game progress automatically.
          </p>
          {PLATFORM_CONNECTORS.map(c => (
            <ConnectorCard key={c.id} c={c} connected={connectors[c.id]} onToggle={toggleConnector} />
          ))}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
            ⚠️ OAuth credentials are stored server-side via environment variables. Never expose client secrets in the frontend. Configure <code>EPIC_CLIENT_ID</code>, <code>SONY_CLIENT_ID</code>, <code>XBOX_CLIENT_ID</code>, <code>UBISOFT_CLIENT_ID</code> in your <code>.env</code> file.
          </div>
        </div>
      )}

      {/* Builds Tab */}
      {tab === 'builds' && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>🔴 Live Build Notifications</div>
          <div className="notif-list">
            {notifications.map(n => (
              <div key={n.id} className="notif-item">
                <span>{n.text}</span>
                <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{n.time}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Build Summary</div>
            {SAMPLE_PROJECTS.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span>{p.name}</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{p.lastBuild}</span>
                  <BuildBadge status={p.buildStatus} />
                  <span style={{ color: p.coverage >= 60 ? '#22c55e' : '#f59e0b', fontSize: 12 }}>{p.coverage}% cov</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements Tab */}
      {tab === 'achievements' && (
        <div>
          {SAMPLE_PROJECTS.filter(p => p.achievements > 0).map(p => (
            <div key={p.id} style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{p.achievementsUnlocked}/{p.achievements} unlocked</span>
              </div>
              <ProgressBar value={(p.achievementsUnlocked / p.achievements) * 100} color="#f59e0b" />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {Array.from({ length: Math.min(p.achievements, 12) }).map((_, i) => (
                  <div key={i} title={i < p.achievementsUnlocked ? 'Unlocked' : 'Locked'} style={{
                    width: 32, height: 32, borderRadius: 8, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i < p.achievementsUnlocked ? '#f59e0b22' : 'var(--bg-3)',
                    border: `1px solid ${i < p.achievementsUnlocked ? '#f59e0b' : 'var(--border)'}`,
                  }}>
                    {i < p.achievementsUnlocked ? '🏆' : '🔒'}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
