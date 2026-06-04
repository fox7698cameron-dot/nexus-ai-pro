// ================================================
// NEXUS AI PRO — Game Development Dashboard
// Connectors: Epic/Unreal, PlayStation, Xbox,
//             Ubisoft Connect
// AR/VR/3D project tracking
// Achievement & progress system
// Created: 2026-06-04
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Gamepad2, Star, Zap, Award, Layers, Link, Plus, TrendingUp, Clock, BarChart2, Target } from 'lucide-react';

const PLATFORM_META = {
  epic:        { label: 'Epic Games / Unreal', icon: '🎮', color: '#ff6b35' },
  playstation: { label: 'PlayStation',         icon: '🎮', color: '#003087' },
  xbox:        { label: 'Xbox',                icon: '🎮', color: '#107c10' },
  ubisoft:     { label: 'Ubisoft Connect',     icon: '🎮', color: '#0070ff' },
  steam:       { label: 'Steam',               icon: '🎮', color: '#1b2838' },
  custom:      { label: 'Custom / Local',      icon: '⚙️',  color: '#6366f1' }
};

const RARITY_CONFIG = {
  common:    { label: 'Common',    color: '#888',    bg: '#88888822' },
  uncommon:  { label: 'Uncommon', color: '#10b981', bg: '#10b98122' },
  rare:      { label: 'Rare',      color: '#3b82f6', bg: '#3b82f622' },
  epic:      { label: 'Epic',      color: '#a855f7', bg: '#a855f722' },
  legendary: { label: 'Legendary', color: '#f59e0b', bg: '#f59e0b22' }
};

function AchievementCard({ achievement }) {
  const rarity = RARITY_CONFIG[achievement.rarity] || RARITY_CONFIG.common;
  const platform = PLATFORM_META[achievement.platform] || PLATFORM_META.custom;
  return (
    <div style={{ background: rarity.bg, border: `1px solid ${rarity.color}44`, borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 28 }}>🏆</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{achievement.name}</div>
        <div style={{ color: '#888', fontSize: 11, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{achievement.description}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          <span style={{ background: rarity.bg, color: rarity.color, border: `1px solid ${rarity.color}44`, borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>{rarity.label}</span>
          <span style={{ background: platform.color + '22', color: platform.color, border: `1px solid ${platform.color}44`, borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>{platform.label}</span>
          <span style={{ background: '#f59e0b22', color: '#f59e0b', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>+{achievement.xp} XP</span>
        </div>
      </div>
    </div>
  );
}

function GameProgressCard({ progress }) {
  const platform = PLATFORM_META[progress.platform] || PLATFORM_META.custom;
  return (
    <div style={{ background: '#16213e', borderRadius: 12, padding: 14, border: '1px solid #2d2d44' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{progress.gameId}</div>
          <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
            {platform.icon} {platform.label} · Level {progress.level}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#f59e0b', fontWeight: 800, fontSize: 20 }}>{progress.percentage}%</div>
          <div style={{ color: '#666', fontSize: 10 }}>Complete</div>
        </div>
      </div>
      <div style={{ background: '#1a1a2e', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{ background: `linear-gradient(90deg, ${platform.color}, ${platform.color}88)`, height: '100%', width: `${progress.percentage}%`, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ color: '#888', fontSize: 11 }}>Playtime: {fmtHours(progress.playtime)}</span>
        {progress.checkpoint && <span style={{ color: '#888', fontSize: 11 }}>📍 {progress.checkpoint}</span>}
      </div>
    </div>
  );
}

function ConnectorCard({ platform, connected, displayName, connectedAt, onConnect, onDisconnect }) {
  const meta = PLATFORM_META[platform] || PLATFORM_META.custom;
  return (
    <div style={{ background: '#16213e', borderRadius: 12, padding: 16, border: `1px solid ${connected ? meta.color + '44' : '#2d2d44'}`, display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ fontSize: 24 }}>{meta.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>{meta.label}</div>
        {connected ? (
          <div style={{ color: '#10b981', fontSize: 11, marginTop: 2 }}>
            ● {displayName} · Connected {new Date(connectedAt).toLocaleDateString()}
          </div>
        ) : (
          <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>Not connected</div>
        )}
      </div>
      <button
        onClick={() => connected ? onDisconnect(platform) : onConnect(platform)}
        style={{
          background: connected ? '#ef444422' : meta.color,
          color: connected ? '#ef4444' : '#fff',
          border: `1px solid ${connected ? '#ef444444' : meta.color}`,
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontWeight: 600
        }}
      >
        <Link size={12} />
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}

export default function GameDevDashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [progress, setProgress] = useState([]);
  const [connectors, setConnectors] = useState([]);
  const [arvrProjects, setArvrProjects] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, aRes, pRes, cRes, arRes, lbRes] = await Promise.all([
        fetch('/api/gamedev/stats', { headers }),
        fetch('/api/gamedev/achievements', { headers }),
        fetch('/api/gamedev/progress', { headers }),
        fetch('/api/gamedev/connectors', { headers }),
        fetch('/api/gamedev/arvr-projects', { headers }),
        fetch('/api/gamedev/leaderboard', { headers })
      ]);
      if (sRes.ok)  setStats(await sRes.json());
      if (aRes.ok)  { const d = await aRes.json(); setAchievements(d.achievements || []); }
      if (pRes.ok)  { const d = await pRes.json(); setProgress(d.progress || []); }
      if (cRes.ok)  { const d = await cRes.json(); setConnectors(d.platforms || []); }
      if (arRes.ok) { const d = await arRes.json(); setArvrProjects(d.projects || []); }
      if (lbRes.ok) { const d = await lbRes.json(); setLeaderboard(d.leaderboard || []); }
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleConnect(platform) {
    const accountId = prompt(`Enter ${PLATFORM_META[platform]?.label} Account ID:`);
    if (!accountId) return;
    const accessToken = prompt('Enter Access Token / API Key:');
    if (!accessToken) return;
    const displayName = prompt('Display Name (optional):') || accountId;

    try {
      const res = await fetch('/api/gamedev/connectors/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ platform, accessToken, accountId, displayName })
      });
      if (res.ok) fetchAll();
    } catch {
      // swallow
    }
  }

  async function handleDisconnect(platform) {
    try {
      await fetch(`/api/gamedev/connectors/${platform}`, { method: 'DELETE', headers });
      fetchAll();
    } catch {
      // swallow
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'progress', label: 'Game Progress', icon: Target },
    { id: 'connectors', label: 'Connectors', icon: Link },
    { id: 'arvr', label: 'AR/VR/3D', icon: Layers },
    { id: 'leaderboard', label: 'Leaderboard', icon: Star }
  ];

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>Loading game data…</div>;
  }

  return (
    <div style={{ background: '#0a0a1a', minHeight: '100%', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#fff' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Gamepad2 size={28} color="#f59e0b" style={{ flexShrink: 0 }} />
          Game Development Hub
        </h1>
        <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
          {stats?.connectedPlatforms || 0} platforms connected · {stats?.totalAchievements || 0} achievements
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#16213e', borderRadius: 10, padding: 4, overflowX: 'auto' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{ flex: 1, minWidth: 80, background: tab === id ? '#1a1a2e' : 'transparent', color: tab === id ? '#fff' : '#888', border: 'none', borderRadius: 8, padding: '8px 4px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.15s', whiteSpace: 'nowrap' }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: 'Achievements', value: stats.totalAchievements, icon: Trophy, color: '#f59e0b' },
            { label: 'Total XP', value: fmtNum(stats.totalXP), icon: Zap, color: '#6366f1' },
            { label: 'Games Tracked', value: stats.gamesTracked, icon: Gamepad2, color: '#10b981' },
            { label: 'Total Playtime', value: fmtHours(stats.totalPlaytime), icon: Clock, color: '#3b82f6' },
            { label: 'Avg Completion', value: `${stats.averageCompletion}%`, icon: Target, color: '#a855f7' },
            { label: 'Platforms', value: stats.connectedPlatforms, icon: Link, color: '#f97316' }
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ background: '#16213e', borderRadius: 12, padding: 16, border: '1px solid #2d2d44', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ background: color + '22', borderRadius: 8, padding: 8 }}><Icon size={16} color={color} /></div>
              <div>
                <div style={{ color: '#888', fontSize: 11 }}>{label}</div>
                <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Achievements */}
      {tab === 'achievements' && (
        <div>
          {achievements.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: 48, background: '#16213e', borderRadius: 16, border: '1px solid #2d2d44' }}>
              <Trophy size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <div>No achievements yet. Connect a gaming platform to import them.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {achievements.map(a => <AchievementCard key={a.id} achievement={a} />)}
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      {tab === 'progress' && (
        <div>
          {progress.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: 48, background: '#16213e', borderRadius: 16, border: '1px solid #2d2d44' }}>
              <Target size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <div>No game progress tracked yet.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {progress.map(p => <GameProgressCard key={p.id} progress={p} />)}
            </div>
          )}
        </div>
      )}

      {/* Connectors */}
      {tab === 'connectors' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {connectors.map(c => (
            <ConnectorCard
              key={c.platform}
              {...c}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          ))}
        </div>
      )}

      {/* AR/VR/3D */}
      {tab === 'arvr' && (
        <div>
          {arvrProjects.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: 48, background: '#16213e', borderRadius: 16, border: '1px solid #2d2d44' }}>
              <Layers size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
              <div>No AR/VR/3D projects yet.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {arvrProjects.map(p => (
                <div key={p.id} style={{ background: '#16213e', borderRadius: 12, padding: 16, border: '1px solid #2d2d44' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700 }}>{p.name}</div>
                      <div style={{ color: '#888', fontSize: 11, textTransform: 'uppercase' }}>{p.type} · {p.engine}</div>
                    </div>
                    <span style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98144', borderRadius: 6, padding: '2px 8px', fontSize: 11 }}>{p.status}</span>
                  </div>
                  {p.targetPlatforms?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {p.targetPlatforms.map(pl => (
                        <span key={pl} style={{ background: '#6366f122', color: '#6366f1', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>{pl}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {tab === 'leaderboard' && (
        <div style={{ background: '#16213e', borderRadius: 16, padding: 20, border: '1px solid #2d2d44' }}>
          <h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: 15 }}>🏆 Global Leaderboard</h3>
          {leaderboard.length === 0 ? (
            <div style={{ color: '#888', textAlign: 'center', padding: 32 }}>No leaderboard data yet.</div>
          ) : (
            leaderboard.map((entry, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid #1a1a2e' }}>
                <div style={{ width: 28, textAlign: 'center', color: i < 3 ? ['#f59e0b', '#888', '#cd7f32'][i] : '#666', fontWeight: 800, fontSize: 16 }}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${entry.rank}`}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{entry.userId.slice(0, 8)}…</div>
                  <div style={{ color: '#888', fontSize: 11 }}>{entry.gameId}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#f59e0b', fontWeight: 700 }}>Lv. {entry.level}</div>
                  <div style={{ color: '#888', fontSize: 11 }}>{entry.percentage}%</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function fmtNum(n) {
  const num = Number(n) || 0;
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

function fmtHours(minutes) {
  const mins = Number(minutes) || 0;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}
