/**
 * filename: GameDevDashboard.jsx
 * purpose:  Comprehensive React game development tracking dashboard with real-time
 *           project status, platform connectors, achievement tracking, build pipeline
 *           monitoring, and AR/VR/3D project support.
 * date:     2026-08-22
 * copyright: Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *            Licensed under the Apache-2.0 License.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Mock data (shown when no live connector is active)
// ---------------------------------------------------------------------------

const MOCK_PROJECTS = [
  { id: 'p1', name: 'Nexus Realms', type: 'Game Development', engine: 'Unreal Engine 5', progress: 72, status: 'active', platforms: ['PS5', 'Xbox Series X', 'PC'], lastUpdated: '2026-08-22T09:00:00Z' },
  { id: 'p2', name: 'ShadowCraft VR', type: 'AR/VR/3D Projects', engine: 'Unreal Engine 5', progress: 45, status: 'active', platforms: ['PSVR2', 'Meta Quest 3', 'SteamVR'], lastUpdated: '2026-08-21T22:00:00Z' },
  { id: 'p3', name: 'Nexus Companion App', type: 'App Development', engine: 'React Native', progress: 88, status: 'review', platforms: ['iOS', 'Android'], lastUpdated: '2026-08-22T07:30:00Z' },
  { id: 'p4', name: 'Procedural World Gen', type: 'Coding Projects', engine: 'C++ / WASM', progress: 31, status: 'active', platforms: ['PC'], lastUpdated: '2026-08-20T15:00:00Z' },
  { id: 'p5', name: 'HoloCity AR', type: 'AR/VR/3D Projects', engine: 'Unity 2025', progress: 60, status: 'active', platforms: ['HoloLens 2', 'Apple Vision Pro'], lastUpdated: '2026-08-22T06:00:00Z' },
];

const MOCK_ACHIEVEMENTS = [
  { id: 'a1', name: 'First Blood', platform: 'Epic Games', description: 'First game shipped on Epic Games Store', unlockedAt: '2026-06-01T00:00:00Z', xp: 100, icon: '🎮' },
  { id: 'a2', name: 'Platinum Hunter', platform: 'PlayStation', description: 'Earned first Platinum trophy', unlockedAt: '2026-08-01T12:00:00Z', xp: 500, icon: '🏆' },
  { id: 'a3', name: 'Launch Day', platform: 'Xbox', description: 'Published to Xbox marketplace', unlockedAt: '2026-06-15T00:00:00Z', xp: 150, icon: '🚀' },
  { id: 'a4', name: 'Steam Greenlit', platform: 'Steam', description: '1000 wishlists reached', unlockedAt: '2026-07-10T00:00:00Z', xp: 200, icon: '⭐' },
  { id: 'a5', name: 'Connect Master', platform: 'Ubisoft', description: 'Ubisoft Connect integration live', unlockedAt: '2026-06-22T00:00:00Z', xp: 300, icon: '🔗' },
];

const MOCK_BUILDS = [
  { id: 'b1', project: 'Nexus Realms', platform: 'PS5', status: 'passing', duration: '14m 22s', commit: 'a3f9b12', startedAt: '2026-08-22T08:45:00Z', shaders: 98, assets: 100 },
  { id: 'b2', project: 'Nexus Realms', platform: 'Xbox Series X', status: 'passing', duration: '12m 05s', commit: 'a3f9b12', startedAt: '2026-08-22T08:45:00Z', shaders: 100, assets: 100 },
  { id: 'b3', project: 'Nexus Realms', platform: 'PC (Win64)', status: 'building', duration: '—', commit: 'a3f9b12', startedAt: '2026-08-22T09:10:00Z', shaders: 63, assets: 100 },
  { id: 'b4', project: 'ShadowCraft VR', platform: 'PSVR2', status: 'failed', duration: '08m 41s', commit: 'c12d445', startedAt: '2026-08-22T07:00:00Z', shaders: 55, assets: 90 },
  { id: 'b5', project: 'Nexus Companion App', platform: 'iOS', status: 'passing', duration: '06m 18s', commit: 'f88a01b', startedAt: '2026-08-22T06:00:00Z', shaders: null, assets: 100 },
  { id: 'b6', project: 'Nexus Companion App', platform: 'Android', status: 'passing', duration: '05m 55s', commit: 'f88a01b', startedAt: '2026-08-22T06:00:00Z', shaders: null, assets: 100 },
];

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'CamFox_Dev', score: 98420, platform: 'Steam', badge: '🥇' },
  { rank: 2, name: 'NexusPlayer1', score: 87300, platform: 'PlayStation', badge: '🥈' },
  { rank: 3, name: 'XboxElite99', score: 76100, platform: 'Xbox', badge: '🥉' },
  { rank: 4, name: 'EpicGamer42', score: 64800, platform: 'Epic', badge: '🏅' },
  { rank: 5, name: 'VRExplorer', score: 53200, platform: 'Meta Quest', badge: '🏅' },
];

const PLATFORM_CONNECTORS = [
  { id: 'epic', name: 'Epic Games / UE5', icon: '⚡', color: '#0078f8', envVars: ['EPIC_CLIENT_ID', 'EPIC_CLIENT_SECRET'] },
  { id: 'sony', name: 'Sony PlayStation', icon: '🎮', color: '#003087', envVars: ['SONY_PARTNER_ID', 'SONY_API_KEY'] },
  { id: 'microsoft', name: 'Microsoft Xbox', icon: '🟢', color: '#107c10', envVars: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_TENANT_ID'] },
  { id: 'ubisoft', name: 'Ubisoft Connect', icon: '🔵', color: '#0070ba', envVars: ['UBISOFT_APP_ID', 'UBISOFT_API_KEY'] },
  { id: 'steam', name: 'Steam / Steamworks', icon: '🌫️', color: '#1b2838', envVars: ['STEAM_PUBLISHER_KEY'] },
];

const TABS = ['Overview', 'Projects', 'Achievements', 'Builds', 'Analytics', 'Connectors'];

const PROJECT_TYPES = ['All', 'Game Development', 'App Development', 'AR/VR/3D Projects', 'Coding Projects'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status) {
  return { passing: '#22c55e', building: '#f59e0b', failed: '#ef4444', active: '#3b82f6', review: '#a855f7', cancelled: '#6b7280' }[status] ?? '#6b7280';
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, color = '#3b82f6', icon }) {
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: '18px 22px', minWidth: 130, flex: 1 }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, color = '#3b82f6', height = 8 }) {
  return (
    <div style={{ background: 'var(--bar-bg)', borderRadius: height, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: height, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function Badge({ status }) {
  const color = statusColor(status);
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {status.toUpperCase()}
    </span>
  );
}

function LiveDot({ active }) {
  return (
    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: active ? '#22c55e' : '#6b7280', marginRight: 6, boxShadow: active ? '0 0 6px #22c55e' : 'none' }} />
  );
}

// ---------------------------------------------------------------------------
// Tab panels
// ---------------------------------------------------------------------------

function OverviewTab({ projects, builds, achievements, socketConnected }) {
  const total = projects.length;
  const active = projects.filter(p => p.status === 'active').length;
  const avgProgress = Math.round(projects.reduce((s, p) => s + p.progress, 0) / (total || 1));
  const passing = builds.filter(b => b.status === 'passing').length;
  const failing = builds.filter(b => b.status === 'failed').length;

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard icon="📁" label="Total Projects" value={total} color="#3b82f6" />
        <StatCard icon="🔥" label="Active" value={active} color="#f59e0b" />
        <StatCard icon="📊" label="Avg Progress" value={`${avgProgress}%`} color="#22c55e" />
        <StatCard icon="✅" label="Builds Passing" value={passing} color="#22c55e" sub={`${failing} failing`} />
        <StatCard icon="🏆" label="Achievements" value={achievements.length} color="#a855f7" />
      </div>

      {/* Recent project activity */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Project Activity</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {projects.slice(0, 4).map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: '0 0 160px', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
              <div style={{ flex: '0 0 110px' }}><Badge status={p.status} /></div>
              <div style={{ flex: 1 }}><ProgressBar value={p.progress} /></div>
              <div style={{ flex: '0 0 40px', fontSize: 12, textAlign: 'right', color: 'var(--text-muted)' }}>{p.progress}%</div>
              <div style={{ flex: '0 0 70px', fontSize: 11, color: 'var(--text-dim)', textAlign: 'right' }}>{timeAgo(p.lastUpdated)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent builds */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Recent Builds</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {builds.slice(0, 5).map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
              <LiveDot active={b.status === 'building'} />
              <span style={{ flex: '0 0 130px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.project}</span>
              <span style={{ flex: '0 0 100px', color: 'var(--text-muted)' }}>{b.platform}</span>
              <Badge status={b.status} />
              <span style={{ flex: 1 }} />
              <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{b.duration}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectsTab({ projects }) {
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? projects : projects.filter(p => p.type === filter);

  return (
    <div>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {PROJECT_TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === t ? '#3b82f6' : 'var(--pill-bg)', color: filter === t ? '#fff' : 'var(--text-muted)', transition: 'background 0.15s' }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {filtered.map(p => (
          <div key={p.id} style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.type}</div>
              </div>
              <Badge status={p.status} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Engine: {p.engine}</div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>Progress</span><span style={{ fontWeight: 700 }}>{p.progress}%</span>
              </div>
              <ProgressBar value={p.progress} color={p.progress >= 75 ? '#22c55e' : p.progress >= 40 ? '#f59e0b' : '#ef4444'} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {p.platforms.map(pl => (
                <span key={pl} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--pill-bg)', color: 'var(--text-muted)', fontWeight: 500 }}>{pl}</span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 10, textAlign: 'right' }}>Updated {timeAgo(p.lastUpdated)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AchievementsTab({ achievements, leaderboard }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
      {/* Achievement list */}
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Achievement Unlocks</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {achievements.map(a => (
            <div key={a.id} style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ fontSize: 28, lineHeight: 1 }}>{a.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{a.description}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--pill-bg)', color: 'var(--text-muted)' }}>{a.platform}</span>
                  <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>+{a.xp} XP</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'right', flexShrink: 0 }}>
                {timeAgo(a.unlockedAt)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Global Leaderboard</h3>
        <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 16 }}>
          {leaderboard.map(entry => (
            <div key={entry.rank} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: entry.rank < leaderboard.length ? '1px solid var(--divider)' : 'none' }}>
              <span style={{ fontSize: 18, minWidth: 28 }}>{entry.badge}</span>
              <span style={{ fontWeight: 700, minWidth: 20, color: 'var(--text-muted)', fontSize: 13 }}>#{entry.rank}</span>
              <span style={{ flex: 1, fontWeight: 500, fontSize: 13 }}>{entry.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 60, textAlign: 'right' }}>{entry.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BuildsTab({ builds }) {
  const platforms = [...new Set(builds.map(b => b.platform))];

  return (
    <div>
      {/* Platform health grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {platforms.map(pl => {
          const plBuilds = builds.filter(b => b.platform === pl);
          const latest = plBuilds[0];
          return (
            <div key={pl} style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{pl}</div>
              <Badge status={latest?.status ?? 'unknown'} />
              {latest?.shaders != null && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Shaders {latest.shaders}%</div>
                  <ProgressBar value={latest.shaders} color="#a855f7" height={5} />
                </div>
              )}
              {latest?.assets != null && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Assets {latest.assets}%</div>
                  <ProgressBar value={latest.assets} color="#3b82f6" height={5} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Build table */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--divider)' }}>
              {['Project', 'Platform', 'Status', 'Duration', 'Commit', 'Shaders', 'Assets', 'Started'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {builds.map(b => (
              <tr key={b.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 500 }}>{b.project}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{b.platform}</td>
                <td style={{ padding: '10px 16px' }}><Badge status={b.status} /></td>
                <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{b.duration}</td>
                <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11 }}>{b.commit}</td>
                <td style={{ padding: '10px 16px' }}>{b.shaders != null ? <ProgressBar value={b.shaders} color="#a855f7" height={6} /> : <span style={{ color: 'var(--text-dim)' }}>N/A</span>}</td>
                <td style={{ padding: '10px 16px' }}>{b.assets != null ? <ProgressBar value={b.assets} color="#3b82f6" height={6} /> : <span style={{ color: 'var(--text-dim)' }}>N/A</span>}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-dim)', fontSize: 11, whiteSpace: 'nowrap' }}>{timeAgo(b.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnalyticsTab({ projects }) {
  const byType = PROJECT_TYPES.slice(1).map(t => ({
    type: t,
    count: projects.filter(p => p.type === t).length,
    avgProgress: Math.round(projects.filter(p => p.type === t).reduce((s, p) => s + p.progress, 0) / (projects.filter(p => p.type === t).length || 1)),
  }));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
        {byType.map(row => (
          <div key={row.type} style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{row.type}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6', marginBottom: 4 }}>{row.count}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>projects</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Avg Completion: {row.avgProgress}%</div>
            <ProgressBar value={row.avgProgress} color="#22c55e" />
          </div>
        ))}
      </div>

      {/* Platform distribution */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Platform Distribution</h3>
        {(() => {
          const plMap = {};
          projects.forEach(p => p.platforms.forEach(pl => { plMap[pl] = (plMap[pl] ?? 0) + 1; }));
          const max = Math.max(...Object.values(plMap));
          return Object.entries(plMap).sort(([,a],[,b]) => b - a).map(([pl, count]) => (
            <div key={pl} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ flex: '0 0 130px', fontSize: 13 }}>{pl}</div>
              <div style={{ flex: 1 }}><ProgressBar value={(count / max) * 100} color="#3b82f6" /></div>
              <div style={{ flex: '0 0 24px', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{count}</div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

function ConnectorsTab({ connectorStates, onConnect, onDisconnect }) {
  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
        Platform connectors read credentials from environment variables — no secrets are stored in the UI.
        Configure the listed env vars on your server, then click Connect.
      </p>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {PLATFORM_CONNECTORS.map(c => {
          const state = connectorStates[c.id] ?? { status: 'idle' };
          return (
            <div key={c.id} style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <span style={{ fontSize: 26 }}>{c.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                    <LiveDot active={state.status === 'connected'} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {state.status === 'connected' ? `Connected${state.mode === 'mock' ? ' (mock)' : ''}` : state.status === 'connecting' ? 'Connecting…' : state.status === 'error' ? 'Error' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>Required env vars:</div>
                {c.envVars.map(v => (
                  <div key={v} style={{ fontFamily: 'monospace', fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--code-bg)', marginBottom: 4, color: 'var(--text-muted)' }}>{v}</div>
                ))}
              </div>

              {state.status === 'error' && (
                <div style={{ fontSize: 12, color: '#ef4444', background: '#ef444422', padding: '8px 10px', borderRadius: 8, marginBottom: 12 }}>{state.error}</div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={state.status === 'connecting' || state.status === 'connected'}
                  onClick={() => onConnect(c.id)}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer', background: state.status === 'connected' ? '#22c55e33' : '#3b82f6', color: state.status === 'connected' ? '#22c55e' : '#fff', fontWeight: 600, fontSize: 13, opacity: state.status === 'connecting' ? 0.6 : 1 }}
                >
                  {state.status === 'connecting' ? 'Connecting…' : state.status === 'connected' ? 'Connected' : 'Connect'}
                </button>
                {state.status === 'connected' && (
                  <button onClick={() => onDisconnect(c.id)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--divider)', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)', fontSize: 13 }}>
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const GameDevDashboard = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [projects] = useState(MOCK_PROJECTS);
  const [achievements] = useState(MOCK_ACHIEVEMENTS);
  const [builds, setBuilds] = useState(MOCK_BUILDS);
  const [leaderboard] = useState(MOCK_LEADERBOARD);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectorStates, setConnectorStates] = useState({});
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const socketRef = useRef(null);

  // ---- Socket.IO setup ----
  useEffect(() => {
    let socket;
    try {
      // Dynamically import socket.io-client if available
      import('socket.io-client').then(({ io }) => {
        socket = io(window.location.origin, { path: '/socket.io', transports: ['websocket'] });
        socketRef.current = socket;

        socket.on('connect', () => setSocketConnected(true));
        socket.on('disconnect', () => setSocketConnected(false));

        socket.on('game:build-update', (data) => {
          setBuilds(prev => prev.map(b => b.id === data.id ? { ...b, ...data } : b));
          setLastUpdate(new Date());
        });

        socket.on('game:project-update', () => setLastUpdate(new Date()));
      }).catch(() => {
        // socket.io-client not available — silent no-op; polling not needed for a mock dashboard
      });
    } catch {
      // Not available in this environment
    }

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // ---- Connector logic ----
  const handleConnect = useCallback(async (connectorId) => {
    setConnectorStates(prev => ({ ...prev, [connectorId]: { status: 'connecting' } }));
    try {
      const { createAllConnectors } = await import('./GameConnectors.js');
      const connectors = createAllConnectors();
      const connector = connectors[connectorId];
      if (!connector) throw new Error('Unknown connector');
      const result = await connector.connect();
      setConnectorStates(prev => ({ ...prev, [connectorId]: { status: 'connected', mode: result.mode } }));
    } catch (err) {
      setConnectorStates(prev => ({ ...prev, [connectorId]: { status: 'error', error: err.message } }));
    }
  }, []);

  const handleDisconnect = useCallback((connectorId) => {
    setConnectorStates(prev => ({ ...prev, [connectorId]: { status: 'idle' } }));
  }, []);

  // ---- Render ----
  return (
    <div style={{ '--card-bg': 'var(--gd-card, #1e2230)', '--bar-bg': 'var(--gd-bar, #2a2f45)', '--pill-bg': 'var(--gd-pill, #2a2f45)', '--divider': 'var(--gd-div, #2e3450)', '--text-muted': 'var(--gd-muted, #94a3b8)', '--text-dim': 'var(--gd-dim, #64748b)', '--code-bg': 'var(--gd-code, #161b2e)', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: 'var(--gd-fg, #e2e8f0)', background: 'var(--gd-bg, #0f1320)', padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--divider)', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>🎮 Game Dev Dashboard</h1>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Nexus AI Pro — Multi-Platform Game Development Hub</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <LiveDot active={socketConnected} />
            {socketConnected ? 'Live' : 'Offline'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Updated {timeAgo(lastUpdate.toISOString())}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--divider)', padding: '0 28px', display: 'flex', gap: 0, overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: activeTab === tab ? 700 : 500, fontSize: 13, color: activeTab === tab ? '#3b82f6' : 'var(--text-muted)', borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent', whiteSpace: 'nowrap', transition: 'color 0.15s' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: '24px 28px', maxWidth: 1280, margin: '0 auto' }}>
        {activeTab === 'Overview' && <OverviewTab projects={projects} builds={builds} achievements={achievements} socketConnected={socketConnected} />}
        {activeTab === 'Projects' && <ProjectsTab projects={projects} />}
        {activeTab === 'Achievements' && <AchievementsTab achievements={achievements} leaderboard={leaderboard} />}
        {activeTab === 'Builds' && <BuildsTab builds={builds} />}
        {activeTab === 'Analytics' && <AnalyticsTab projects={projects} />}
        {activeTab === 'Connectors' && <ConnectorsTab connectorStates={connectorStates} onConnect={handleConnect} onDisconnect={handleDisconnect} />}
      </div>
    </div>
  );
};

export default GameDevDashboard;
