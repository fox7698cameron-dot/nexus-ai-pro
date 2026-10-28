/**
 * src/components/GameDevTracker.jsx
 * Game development tracking: Unreal, Epic, Sony, Microsoft, Ubisoft Connect
 * Achievement & game progress tracking
 * Created: 2026-10-28
 */
import React, { useState, useEffect } from 'react';

// ─── Connectors ───────────────────────────────────────────────────────────────
const CONNECTORS = [
  { id: 'unreal',     label: 'Unreal Engine',      icon: '⚙️', color: '#0f0f0f', accent: '#0070f3', company: 'Epic Games' },
  { id: 'epic',       label: 'Epic Games Store',   icon: '🎮', color: '#2d2d2d', accent: '#0077ee', company: 'Epic' },
  { id: 'sony',       label: 'PlayStation Network',icon: '🎮', color: '#00439c', accent: '#0070cc', company: 'Sony Interactive' },
  { id: 'xbox',       label: 'Xbox Live / GDK',    icon: '🟢', color: '#107c10', accent: '#52b043', company: 'Microsoft' },
  { id: 'ubisoft',    label: 'Ubisoft Connect',    icon: '💙', color: '#1a1a2e', accent: '#0fc0ff', company: 'Ubisoft' },
  { id: 'steam',      label: 'Steam',              icon: '🎯', color: '#1b2838', accent: '#66c0f4', company: 'Valve' },
  { id: 'unity',      label: 'Unity',              icon: '⬛', color: '#222c37', accent: '#ffffff', company: 'Unity Technologies' },
  { id: 'godot',      label: 'Godot Engine',       icon: '🎭', color: '#1a1a2e', accent: '#478cbf', company: 'Godot Foundation' },
];

// ─── Synthetic project data ───────────────────────────────────────────────────
const SAMPLE_GAMES = [
  {
    id: 1, title: 'Galaxy Runner', engine: 'unreal', status: 'development',
    platform: ['Xbox', 'PS5', 'PC'], genre: 'Action RPG',
    progress: 62, milestone: 'Alpha', buildVersion: '0.4.2',
    team: 8, tasks: { total: 240, done: 149, bugs: 23 },
    achievements: [
      { id: 'a1', title: 'First Steps', description: 'Complete the tutorial', unlocked: true, rarity: 'common', points: 10 },
      { id: 'a2', title: 'Speed Runner', description: 'Complete level 1 in under 60 seconds', unlocked: false, rarity: 'rare', points: 50 },
      { id: 'a3', title: 'Completionist', description: 'Find all secrets in Chapter 1', unlocked: false, rarity: 'epic', points: 100 },
      { id: 'a4', title: 'No Damage', description: 'Complete a level without taking damage', unlocked: true, rarity: 'uncommon', points: 25 },
    ],
    metrics: { fps: 142, buildTime: '4m 32s', crashes: 2, coverage: 67 },
    lastBuild: '2h ago',
  },
  {
    id: 2, title: 'VR Escape Room', engine: 'unity', status: 'pre-production',
    platform: ['PCVR', 'Meta Quest', 'PSVR2'], genre: 'Puzzle / Horror',
    progress: 18, milestone: 'Concept', buildVersion: '0.0.9',
    team: 3, tasks: { total: 80, done: 14, bugs: 5 },
    achievements: [],
    metrics: { fps: 90, buildTime: '1m 10s', crashes: 0, coverage: 24 },
    lastBuild: '1d ago',
  },
  {
    id: 3, title: 'Pixel Kingdoms', engine: 'godot', status: 'launch-ready',
    platform: ['PC', 'iOS', 'Android'], genre: 'Strategy',
    progress: 97, milestone: 'RC-1', buildVersion: '1.0.0-rc1',
    team: 2, tasks: { total: 120, done: 116, bugs: 4 },
    achievements: [
      { id: 'b1', title: 'Founder', description: 'Be among the first 1000 players', unlocked: false, rarity: 'legendary', points: 200 },
      { id: 'b2', title: 'Builder', description: 'Construct 10 buildings', unlocked: false, rarity: 'common', points: 10 },
    ],
    metrics: { fps: 60, buildTime: '45s', crashes: 0, coverage: 84 },
    lastBuild: '30m ago',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  'pre-production': { color: '#60a5fa', bg: '#60a5fa15', label: 'Pre-Production' },
  'development':    { color: '#fbbf24', bg: '#fbbf2415', label: 'Development' },
  'alpha':          { color: '#f97316', bg: '#f9731615', label: 'Alpha' },
  'beta':           { color: '#a78bfa', bg: '#a78bfa15', label: 'Beta' },
  'launch-ready':   { color: '#34d399', bg: '#34d39915', label: 'Launch Ready' },
  'live':           { color: '#34d399', bg: '#34d39920', label: '🟢 Live' },
};

const RARITY_COLOR = { common: '#9ca3af', uncommon: '#34d399', rare: '#60a5fa', epic: '#a78bfa', legendary: '#fbbf24' };

function AchievementBadge({ ach }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: ach.unlocked ? `${RARITY_COLOR[ach.rarity]}15` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${ach.unlocked ? RARITY_COLOR[ach.rarity] + '50' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: 8, padding: '8px 10px', opacity: ach.unlocked ? 1 : 0.55,
    }}>
      <div style={{ fontSize: 20 }}>{ach.unlocked ? '🏆' : '🔒'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: ach.unlocked ? '#f9fafb' : '#6b7280' }}>{ach.title}</div>
        <div style={{ fontSize: 10, color: '#6b7280' }}>{ach.description}</div>
        <div style={{ fontSize: 10, color: RARITY_COLOR[ach.rarity], marginTop: 2, textTransform: 'capitalize' }}>
          {ach.rarity} · {ach.points}G
        </div>
      </div>
    </div>
  );
}

function ConnectorCard({ connector, connected, onConnect, onDisconnect }) {
  return (
    <div style={{
      background: connected ? `${connector.accent}10` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${connected ? connector.accent + '50' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ fontSize: 24 }}>{connector.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#f9fafb' }}>{connector.label}</div>
        <div style={{ fontSize: 10, color: '#6b7280' }}>{connector.company}</div>
      </div>
      {connected
        ? <button onClick={() => onDisconnect(connector.id)} style={{ background: '#ef444420', color: '#f87171', border: '1px solid #ef444440', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11 }}>
            Disconnect
          </button>
        : <button onClick={() => onConnect(connector.id)} style={{ background: connector.accent + '20', color: connector.accent, border: `1px solid ${connector.accent}40`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11 }}>
            Connect
          </button>}
    </div>
  );
}

function GameCard({ game, connectors }) {
  const [tab, setTab] = useState('overview');
  const eng = CONNECTORS.find(c => c.id === game.engine);
  const st  = STATUS_STYLE[game.status] || STATUS_STYLE['development'];

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>{eng?.icon}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#f9fafb' }}>{game.title}</span>
            <span style={{ fontSize: 10, background: st.bg, color: st.color, borderRadius: 20, padding: '2px 8px', fontWeight: 700 }}>{st.label}</span>
          </div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            {eng?.label} · {game.genre} · v{game.buildVersion} · Last build: {game.lastBuild}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {game.platform.map(p => (
            <span key={p} style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', color: '#9ca3af', borderRadius: 4, padding: '2px 7px' }}>{p}</span>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#9ca3af' }}>
          <span>Overall Progress — {game.milestone}</span>
          <span style={{ color: '#a78bfa', fontWeight: 700 }}>{game.progress}%</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 7, overflow: 'hidden' }}>
          <div style={{ width: `${game.progress}%`, height: '100%', background: `linear-gradient(90deg, ${eng?.accent || '#6366f1'}, #a78bfa)`, borderRadius: 99, transition: 'width 0.6s' }} />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#6b7280', flexWrap: 'wrap' }}>
          <span>✅ {game.tasks.done}/{game.tasks.total} tasks</span>
          <span style={{ color: game.tasks.bugs > 0 ? '#f87171' : '#34d399' }}>🐛 {game.tasks.bugs} bugs</span>
          <span>👥 {game.team} team members</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 2, padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {['overview', 'achievements', 'metrics'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: tab === t ? 'rgba(99,102,241,0.2)' : 'transparent', color: tab === t ? '#a78bfa' : '#6b7280', border: 'none', borderRadius: 6, padding: '5px 0', cursor: 'pointer', fontSize: 11, textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 16px' }}>
        {tab === 'overview' && (
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            {game.title} is a {game.genre} game targeting {game.platform.join(', ')}. Currently in {st.label} phase with {game.tasks.total - game.tasks.done} tasks remaining.
          </div>
        )}
        {tab === 'achievements' && (
          game.achievements.length > 0
            ? <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {game.achievements.map(a => <AchievementBadge key={a.id} ach={a} />)}
              </div>
            : <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', padding: '10px 0' }}>No achievements defined yet</div>
        )}
        {tab === 'metrics' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: 'Target FPS', value: `${game.metrics.fps} FPS`, color: '#34d399' },
              { label: 'Build Time', value: game.metrics.buildTime, color: '#60a5fa' },
              { label: 'Crashes', value: String(game.metrics.crashes), color: game.metrics.crashes > 0 ? '#f87171' : '#34d399' },
              { label: 'Test Coverage', value: `${game.metrics.coverage}%`, color: game.metrics.coverage >= 70 ? '#34d399' : '#fbbf24' },
            ].map(m => (
              <div key={m.label} style={{ flex: '1 1 100px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#6b7280' }}>{m.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: m.color, marginTop: 3 }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main GameDevTracker ──────────────────────────────────────────────────────
export default function GameDevTracker() {
  const [tab, setTab] = useState('projects');
  const [connected, setConnected] = useState({ unreal: true, epic: true, xbox: true });
  const [games] = useState(SAMPLE_GAMES);

  const connect    = (id) => setConnected(c => ({ ...c, [id]: true }));
  const disconnect = (id) => setConnected(c => ({ ...c, [id]: false }));

  return (
    <div style={{ background: '#0a0a14', minHeight: '100vh', color: '#f9fafb', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#f9fafb' }}>🎮 Game Dev Tracker</h1>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
          {Object.values(connected).filter(Boolean).length} engines/platforms connected
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4 }}>
        {['projects', 'connectors'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: tab === t ? 'rgba(99,102,241,0.3)' : 'transparent', color: tab === t ? '#c4b5fd' : '#6b7280', border: 'none', borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 700 : 400, textTransform: 'capitalize' }}>
            {t === 'projects' ? '🗂 Projects' : '🔌 Connectors'}
          </button>
        ))}
      </div>

      {tab === 'projects' && (
        <div>
          {games.map(g => <GameCard key={g.id} game={g} connectors={CONNECTORS} />)}
        </div>
      )}

      {tab === 'connectors' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {CONNECTORS.map(c => (
            <ConnectorCard key={c.id} connector={c} connected={!!connected[c.id]} onConnect={connect} onDisconnect={disconnect} />
          ))}
        </div>
      )}
    </div>
  );
}
