// File: GamePlatformConnectors.jsx | Created: 2026-08-31 | Nexus AI Pro

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Static platform metadata
// ---------------------------------------------------------------------------

const PLATFORMS = [
  {
    id: 'unreal',
    name: 'Unreal / Epic Games',
    icon: '🎮',
    color: '#0074E0',
    sdkVersion: '5.4.2',
    oauthProvider: 'epic',
  },
  {
    id: 'playstation',
    name: 'Sony PlayStation',
    icon: '🎯',
    color: '#003087',
    sdkVersion: 'PS5 SDK 8.0',
    oauthProvider: 'psn',
  },
  {
    id: 'xbox',
    name: 'Microsoft Xbox',
    icon: '🟢',
    color: '#107C10',
    sdkVersion: 'GDK 240601',
    oauthProvider: 'microsoft',
  },
  {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    icon: '🔷',
    color: '#0085CA',
    sdkVersion: '2.3.1',
    oauthProvider: 'ubisoft',
  },
  {
    id: 'steam',
    name: 'Steam',
    icon: '♨️',
    color: '#1b2838',
    sdkVersion: 'Steamworks 1.59',
    oauthProvider: 'steam',
  },
  {
    id: 'gog',
    name: 'GOG',
    icon: '🌌',
    color: '#86328A',
    sdkVersion: 'Galaxy SDK 2.0.3',
    oauthProvider: 'gog',
  },
];

// ---------------------------------------------------------------------------
// Mock data generators (replaced by real API calls in production)
// ---------------------------------------------------------------------------

function mockConnectionData(platformId, existing = {}) {
  return {
    connected: existing.connected ?? false,
    linkedAccount: existing.linkedAccount ?? null,
    lastSync: existing.lastSync ?? null,
    achievementProgress: existing.achievementProgress ?? 0,
    totalAchievements: existing.totalAchievements ?? 80,
    unlockedAchievements: existing.unlockedAchievements ?? 0,
    buildStatus: existing.buildStatus ?? 'idle',    // idle | building | success | failed
    games: existing.games ?? [],
  };
}

function generateMockGames(platformId) {
  const libraries = {
    steam: ['Nexus Quest', 'Void Runner', 'Stellar Drift'],
    playstation: ['Nexus Quest PS5', 'Shadow Protocol'],
    xbox: ['Nexus Quest Xbox', 'Orbital Strike'],
    unreal: ['UE5 Sample Project', 'Procedural World'],
    ubisoft: ['Nexus Quest PC', 'Urban Legion'],
    gog: ['Nexus Quest Classic', 'Retro Racer'],
  };
  return (libraries[platformId] || []).map((title, i) => ({
    id: `${platformId}-game-${i}`,
    title,
    playtime: Math.floor(Math.random() * 200),
    lastPlayed: new Date(Date.now() - Math.random() * 30 * 86400000).toLocaleDateString(),
  }));
}

function generateMockAchievement(platformId) {
  const names = [
    'First Victory', 'Speed Runner', 'Completionist', 'Master Builder',
    'Legendary Hero', 'Night Owl', 'Social Butterfly', 'Iron Will',
  ];
  return {
    id: `ach-${Date.now()}`,
    name: names[Math.floor(Math.random() * names.length)],
    platform: platformId,
    unlockedAt: new Date().toLocaleTimeString(),
    points: [10, 25, 50, 100][Math.floor(Math.random() * 4)],
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BuildStatusBadge({ status }) {
  const map = {
    idle:     { label: 'Idle',     bg: '#334155', color: '#94a3b8' },
    building: { label: 'Building', bg: '#1e3a5f', color: '#60a5fa' },
    success:  { label: 'Success',  bg: '#14532d', color: '#4ade80' },
    failed:   { label: 'Failed',   bg: '#4c0519', color: '#f87171' },
  };
  const s = map[status] || map.idle;
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color, letterSpacing: '0.04em',
    }}>
      {s.label}
    </span>
  );
}

function AchievementFeedItem({ item }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
      background: 'rgba(255,215,0,0.07)', borderRadius: 8, marginBottom: 4,
      borderLeft: '3px solid #f59e0b',
    }}>
      <span style={{ fontSize: 18 }}>🏆</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
        <div style={{ fontSize: 11, opacity: 0.6 }}>{item.platform} · {item.unlockedAt} · +{item.points} pts</div>
      </div>
    </div>
  );
}

function GameLibraryRow({ game }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13,
    }}>
      <span style={{ fontWeight: 500 }}>{game.title}</span>
      <span style={{ opacity: 0.5 }}>{game.playtime}h · {game.lastPlayed}</span>
    </div>
  );
}

function PlatformCard({ platform, data, onConnect, onDisconnect }) {
  const pct = data.totalAchievements > 0
    ? Math.round((data.unlockedAchievements / data.totalAchievements) * 100)
    : 0;

  return (
    <div style={{
      background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 26 }}>{platform.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{platform.name}</div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>SDK {platform.sdkVersion}</div>
        </div>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: data.connected ? '#4ade80' : '#ef4444',
          boxShadow: data.connected ? '0 0 6px #4ade80' : 'none',
        }} />
      </div>

      {/* Linked account */}
      <div style={{ fontSize: 12, opacity: 0.7 }}>
        {data.connected
          ? <>Linked: <strong>{data.linkedAccount}</strong> · Last sync: {data.lastSync}</>
          : 'No account linked'}
      </div>

      {/* Achievement progress */}
      {data.connected && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
            <span>Achievements</span>
            <span>{data.unlockedAchievements}/{data.totalAchievements} ({pct}%)</span>
          </div>
          <div style={{ background: '#334155', borderRadius: 6, height: 6, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: platform.color, borderRadius: 6, transition: 'width 0.4s' }} />
          </div>
        </div>
      )}

      {/* Build pipeline */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ opacity: 0.6 }}>Build pipeline</span>
        <BuildStatusBadge status={data.buildStatus} />
      </div>

      {/* Game library */}
      {data.connected && data.games.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, opacity: 0.7 }}>
            Game Library ({data.games.length})
          </div>
          <div style={{ maxHeight: 90, overflowY: 'auto' }}>
            {data.games.map((g) => <GameLibraryRow key={g.id} game={g} />)}
          </div>
        </div>
      )}

      {/* Connect / Disconnect */}
      <button
        onClick={() => data.connected ? onDisconnect(platform.id) : onConnect(platform.id)}
        style={{
          padding: '8px 0', borderRadius: 8, fontWeight: 600, fontSize: 13,
          cursor: 'pointer', border: 'none',
          background: data.connected ? 'rgba(239,68,68,0.15)' : platform.color,
          color: data.connected ? '#f87171' : '#fff',
          transition: 'opacity 0.2s',
        }}
      >
        {data.connected ? 'Disconnect' : `Connect via ${platform.oauthProvider}`}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GamePlatformConnectors({ userId, connections = {}, onConnect, onDisconnect }) {
  const [platformData, setPlatformData] = useState(() => {
    const init = {};
    PLATFORMS.forEach((p) => { init[p.id] = mockConnectionData(p.id, connections[p.id] || {}); });
    return init;
  });

  const [achievementFeed, setAchievementFeed] = useState([]);

  // Simulate real-time achievement unlocks while any platform is connected
  useEffect(() => {
    const anyConnected = PLATFORMS.some((p) => platformData[p.id]?.connected);
    if (!anyConnected) return;

    const connectedPlatforms = PLATFORMS.filter((p) => platformData[p.id]?.connected);
    const interval = setInterval(() => {
      const rnd = connectedPlatforms[Math.floor(Math.random() * connectedPlatforms.length)];
      if (!rnd) return;
      const ach = generateMockAchievement(rnd.name);
      setAchievementFeed((prev) => [ach, ...prev].slice(0, 10));
      setPlatformData((prev) => ({
        ...prev,
        [rnd.id]: {
          ...prev[rnd.id],
          unlockedAchievements: Math.min(
            (prev[rnd.id].unlockedAchievements || 0) + 1,
            prev[rnd.id].totalAchievements,
          ),
        },
      }));
    }, 8000);

    return () => clearInterval(interval);
  }, [platformData]);

  const handleConnect = useCallback((platformId) => {
    // Simulate OAuth redirect → callback
    setPlatformData((prev) => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        connected: true,
        linkedAccount: `user_${userId?.slice(0, 6) || '000000'}`,
        lastSync: new Date().toLocaleString(),
        buildStatus: 'building',
        games: generateMockGames(platformId),
        unlockedAchievements: Math.floor(Math.random() * 40),
      },
    }));
    setTimeout(() => {
      setPlatformData((prev) => ({
        ...prev,
        [platformId]: { ...prev[platformId], buildStatus: 'success' },
      }));
    }, 3000);
    onConnect?.(platformId);
  }, [userId, onConnect]);

  const handleDisconnect = useCallback((platformId) => {
    setPlatformData((prev) => ({
      ...prev,
      [platformId]: mockConnectionData(platformId),
    }));
    onDisconnect?.(platformId);
  }, [onDisconnect]);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#f1f5f9', padding: 20 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>Game Platform Connectors</h2>
      <p style={{ margin: '0 0 20px', opacity: 0.5, fontSize: 13 }}>
        Connect your game platform accounts to sync achievements, games, and builds.
      </p>

      {/* Platform grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16, marginBottom: 28,
      }}>
        {PLATFORMS.map((p) => (
          <PlatformCard
            key={p.id}
            platform={p}
            data={platformData[p.id]}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>

      {/* Real-time achievement feed */}
      {achievementFeed.length > 0 && (
        <div style={{ background: '#1e293b', borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
            🔴 Live Achievement Feed
          </div>
          {achievementFeed.map((a) => <AchievementFeedItem key={a.id} item={a} />)}
        </div>
      )}
    </div>
  );
}
