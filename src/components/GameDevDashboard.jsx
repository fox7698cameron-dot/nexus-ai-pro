// Created: 2026-09-30
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// GameDevDashboard.jsx — Real-time game development project tracking dashboard

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORMS = {
  EPIC: { id: 'epic', name: 'Epic Games / Unreal Engine', color: '#0078d7', icon: '🎮' },
  PLAYSTATION: { id: 'playstation', name: 'PlayStation Network', color: '#003087', icon: '🎮' },
  XBOX: { id: 'xbox', name: 'Xbox / Microsoft', color: '#107c10', icon: '🎮' },
  UBISOFT: { id: 'ubisoft', name: 'Ubisoft Connect', color: '#0070f3', icon: '🎮' },
};

const ENGINE_COLORS = {
  'Unreal Engine': '#0078d7',
  Unity: '#222222',
  Godot: '#478cbf',
  'AR/VR': '#8b5cf6',
  '3D': '#f59e0b',
  Other: '#6b7280',
};

const STATUS_COLORS = {
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  running: '#3b82f6',
  idle: '#6b7280',
};

// ─── Utility helpers ──────────────────────────────────────────────────────────

const fmtBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};

const fmtRelativeTime = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge = ({ color, children, style = {} }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '0.72rem',
      fontWeight: 600,
      letterSpacing: '0.02em',
      background: color + '22',
      color,
      border: `1px solid ${color}44`,
      ...style,
    }}
  >
    {children}
  </span>
);

const StatusDot = ({ status }) => (
  <span
    style={{
      display: 'inline-block',
      width: 9,
      height: 9,
      borderRadius: '50%',
      background: STATUS_COLORS[status] || STATUS_COLORS.idle,
      marginRight: 6,
      flexShrink: 0,
    }}
  />
);

const ProgressBar = ({ value, max = 100, color = '#3b82f6', height = 6 }) => (
  <div
    style={{
      width: '100%',
      height,
      background: '#e5e7eb33',
      borderRadius: 999,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        width: `${Math.min(100, (value / max) * 100)}%`,
        height: '100%',
        background: color,
        borderRadius: 999,
        transition: 'width 0.4s ease',
      }}
    />
  </div>
);

const MetricCard = ({ label, value, sub, color, darkMode }) => (
  <div
    style={{
      background: darkMode ? '#1f2937' : '#f9fafb',
      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: 10,
      padding: '14px 16px',
      minWidth: 120,
      flex: '1 1 120px',
    }}
  >
    <div style={{ fontSize: '0.72rem', color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: 4 }}>
      {label}
    </div>
    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: color || (darkMode ? '#f9fafb' : '#111827') }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: '0.72rem', color: darkMode ? '#6b7280' : '#9ca3af', marginTop: 2 }}>
        {sub}
      </div>
    )}
  </div>
);

const PlatformConnectorCard = ({ platform, connected, syncing, lastSync, achievementCount, darkMode, onConnect, onSync }) => (
  <div
    style={{
      background: darkMode ? '#1f2937' : '#ffffff',
      border: `1px solid ${connected ? platform.color + '66' : (darkMode ? '#374151' : '#e5e7eb')}`,
      borderRadius: 12,
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '1.3rem' }}>{platform.icon}</span>
        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: darkMode ? '#f3f4f6' : '#111827' }}>
          {platform.name}
        </span>
      </div>
      <Badge color={connected ? STATUS_COLORS.success : STATUS_COLORS.idle}>
        {connected ? 'Connected' : 'Disconnected'}
      </Badge>
    </div>

    {connected && (
      <>
        <div style={{ fontSize: '0.78rem', color: darkMode ? '#9ca3af' : '#6b7280' }}>
          <StatusDot status={syncing ? 'running' : 'success'} />
          {syncing ? 'Syncing…' : `Last sync: ${lastSync ? fmtRelativeTime(lastSync) : 'Never'}`}
        </div>
        <div style={{ fontSize: '0.78rem', color: darkMode ? '#d1d5db' : '#374151' }}>
          Achievements tracked: <strong>{achievementCount ?? 0}</strong>
        </div>
        <button
          onClick={onSync}
          disabled={syncing}
          style={{
            marginTop: 4,
            padding: '6px 12px',
            borderRadius: 8,
            border: 'none',
            background: syncing ? '#6b7280' : platform.color,
            color: '#fff',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: syncing ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s',
          }}
        >
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </>
    )}

    {!connected && (
      <button
        onClick={onConnect}
        style={{
          padding: '7px 14px',
          borderRadius: 8,
          border: `1px solid ${platform.color}`,
          background: 'transparent',
          color: platform.color,
          fontSize: '0.8rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Connect
      </button>
    )}
  </div>
);

const AchievementRow = ({ achievement, darkMode }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
      borderBottom: `1px solid ${darkMode ? '#374151' : '#f3f4f6'}`,
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: achievement.unlocked ? '#f59e0b22' : (darkMode ? '#374151' : '#f3f4f6'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.1rem',
        flexShrink: 0,
      }}
    >
      {achievement.unlocked ? '🏆' : '🔒'}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: darkMode ? '#f3f4f6' : '#111827', truncate: true }}>
        {achievement.name}
      </div>
      <div style={{ fontSize: '0.75rem', color: darkMode ? '#9ca3af' : '#6b7280' }}>
        {achievement.platform} · {achievement.game}
      </div>
    </div>
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <Badge color={achievement.unlocked ? STATUS_COLORS.success : STATUS_COLORS.idle}>
        {achievement.unlocked ? 'Unlocked' : 'Locked'}
      </Badge>
      {achievement.unlocked && achievement.unlockedAt && (
        <div style={{ fontSize: '0.7rem', color: darkMode ? '#6b7280' : '#9ca3af', marginTop: 2 }}>
          {fmtRelativeTime(achievement.unlockedAt)}
        </div>
      )}
    </div>
  </div>
);

const ProjectCard = ({ project, darkMode, onSelect, selected }) => {
  const engineColor = ENGINE_COLORS[project.engine] || ENGINE_COLORS.Other;
  return (
    <div
      onClick={() => onSelect(project.id)}
      style={{
        background: darkMode ? (selected ? '#1e3a5f' : '#1f2937') : (selected ? '#eff6ff' : '#ffffff'),
        border: `1px solid ${selected ? '#3b82f6' : (darkMode ? '#374151' : '#e5e7eb')}`,
        borderRadius: 12,
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: darkMode ? '#f9fafb' : '#111827' }}>
            {project.name}
          </div>
          <Badge color={engineColor} style={{ marginTop: 4 }}>{project.engine}</Badge>
        </div>
        <Badge color={STATUS_COLORS[project.buildStatus] || STATUS_COLORS.idle}>
          {project.buildStatus}
        </Badge>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontSize: '0.75rem', color: darkMode ? '#9ca3af' : '#6b7280' }}>
          {project.assetCount} assets · {fmtBytes(project.projectSize)}
        </span>
        <span style={{ fontSize: '0.75rem', color: darkMode ? '#9ca3af' : '#6b7280' }}>
          · {project.openBugs} open bugs
        </span>
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
          <span style={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>Progress</span>
          <span style={{ color: darkMode ? '#d1d5db' : '#374151' }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} color={engineColor} />
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: darkMode ? '#6b7280' : '#9ca3af' }}>FPS Target</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: darkMode ? '#f3f4f6' : '#111827' }}>
            {project.fpsTarget} fps
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', color: darkMode ? '#6b7280' : '#9ca3af' }}>Last Commit</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: darkMode ? '#f3f4f6' : '#111827' }}>
            {fmtRelativeTime(project.lastCommit)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', color: darkMode ? '#6b7280' : '#9ca3af' }}>Commits</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: darkMode ? '#f3f4f6' : '#111827' }}>
            {project.commitCount}
          </div>
        </div>
      </div>
    </div>
  );
};

const CommitHistoryItem = ({ commit, darkMode }) => (
  <div
    style={{
      display: 'flex',
      gap: 10,
      padding: '8px 0',
      borderBottom: `1px solid ${darkMode ? '#374151' : '#f3f4f6'}`,
    }}
  >
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#3b82f6',
        marginTop: 6,
        flexShrink: 0,
      }}
    />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '0.82rem', color: darkMode ? '#f3f4f6' : '#111827', fontWeight: 500 }}>
        {commit.message}
      </div>
      <div style={{ fontSize: '0.72rem', color: darkMode ? '#6b7280' : '#9ca3af' }}>
        {commit.author} · {fmtRelativeTime(commit.timestamp)}
      </div>
    </div>
    <code
      style={{
        fontSize: '0.7rem',
        background: darkMode ? '#374151' : '#f3f4f6',
        color: darkMode ? '#93c5fd' : '#2563eb',
        padding: '2px 6px',
        borderRadius: 4,
        flexShrink: 0,
        alignSelf: 'flex-start',
      }}
    >
      {commit.hash}
    </code>
  </div>
);

// ─── Mock data generators (replaced by WebSocket in production) ───────────────

const generateMockProject = (id, name, engine) => ({
  id,
  name,
  engine,
  buildStatus: ['success', 'running', 'warning', 'error'][Math.floor(Math.random() * 4)],
  progress: Math.floor(Math.random() * 100),
  assetCount: Math.floor(Math.random() * 2000) + 100,
  projectSize: Math.floor(Math.random() * 50 * 1024 ** 3),
  openBugs: Math.floor(Math.random() * 30),
  fpsTarget: [30, 60, 90, 120][Math.floor(Math.random() * 4)],
  lastCommit: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
  commitCount: Math.floor(Math.random() * 500) + 20,
  performanceBenchmarks: {
    avgFps: Math.floor(Math.random() * 30) + 50,
    renderTime: (Math.random() * 10 + 2).toFixed(2),
    memoryUsage: Math.floor(Math.random() * 4096) + 512,
  },
  commits: Array.from({ length: 8 }, (_, i) => ({
    hash: Math.random().toString(16).slice(2, 9),
    message: [
      'Fix shader compilation error on DirectX12',
      'Add LOD system for large open-world assets',
      'Optimize physics collision detection',
      'Update multiplayer netcode lag compensation',
      'Implement dynamic lighting for cave system',
      'Refactor animation state machine',
      'Add new character abilities with VFX',
      'Performance pass on render pipeline',
    ][i % 8],
    author: ['cameron', 'dev-bot', 'artist1', 'level-designer'][Math.floor(Math.random() * 4)],
    timestamp: new Date(Date.now() - Math.random() * 86400000 * 14).toISOString(),
  })),
});

const INITIAL_PROJECTS = [
  generateMockProject('proj-1', 'Nexus World — Open World RPG', 'Unreal Engine'),
  generateMockProject('proj-2', 'Shadow Protocol — Stealth Game', 'Unity'),
  generateMockProject('proj-3', 'Cosmos VR — Space Explorer', 'AR/VR'),
  generateMockProject('proj-4', 'Dungeon Crawler 3D', 'Godot'),
  generateMockProject('proj-5', 'Nexus AI Companion App', 'Other'),
];

const INITIAL_ACHIEVEMENTS = [
  { id: 'ach-1', name: 'First Blood', game: 'Shadow Protocol', platform: 'PlayStation', unlocked: true, unlockedAt: new Date(Date.now() - 3600000 * 48).toISOString() },
  { id: 'ach-2', name: 'Completionist', game: 'Nexus World', platform: 'Epic Games', unlocked: true, unlockedAt: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: 'ach-3', name: 'Speed Runner', game: 'Dungeon Crawler 3D', platform: 'Xbox', unlocked: false },
  { id: 'ach-4', name: 'Master Builder', game: 'Nexus World', platform: 'Ubisoft', unlocked: true, unlockedAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'ach-5', name: 'Platinum Trophy', game: 'Cosmos VR', platform: 'PlayStation', unlocked: false },
  { id: 'ach-6', name: 'Veteran', game: 'Shadow Protocol', platform: 'Xbox', unlocked: true, unlockedAt: new Date(Date.now() - 3600000 * 100).toISOString() },
];

const INITIAL_PLATFORM_STATE = {
  epic: { connected: true, syncing: false, lastSync: new Date(Date.now() - 600000).toISOString(), achievementCount: 42 },
  playstation: { connected: true, syncing: false, lastSync: new Date(Date.now() - 1800000).toISOString(), achievementCount: 87 },
  xbox: { connected: false, syncing: false, lastSync: null, achievementCount: 0 },
  ubisoft: { connected: true, syncing: false, lastSync: new Date(Date.now() - 7200000).toISOString(), achievementCount: 23 },
};

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * GameDevDashboard — Real-time game development tracking dashboard.
 *
 * @param {object}  props
 * @param {boolean} [props.darkMode=true]         Enable dark theme.
 * @param {string}  [props.wsUrl]                 WebSocket server URL for live updates.
 * @param {string}  [props.apiBase='/api/gamedev'] REST API base path.
 */
const GameDevDashboard = ({ darkMode = true, wsUrl, apiBase = '/api/gamedev' }) => {
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState(INITIAL_PROJECTS[0].id);
  const [achievements, setAchievements] = useState(INITIAL_ACHIEVEMENTS);
  const [platformState, setPlatformState] = useState(INITIAL_PLATFORM_STATE);
  const [wsStatus, setWsStatus] = useState('disconnected'); // 'connecting' | 'connected' | 'disconnected'
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'achievements' | 'connectors'
  const [achievementFilter, setAchievementFilter] = useState('all'); // 'all' | 'unlocked' | 'locked'
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // ── WebSocket connection ────────────────────────────────────────────────────

  const connectWs = useCallback(() => {
    if (!wsUrl) return;
    if (wsRef.current && wsRef.current.readyState < 2) return; // already open/connecting

    setWsStatus('connecting');
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
        ws.send(JSON.stringify({ type: 'subscribe', channels: ['projects', 'achievements', 'platforms'] }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'project:update':
              setProjects((prev) =>
                prev.map((p) => (p.id === msg.payload.id ? { ...p, ...msg.payload } : p))
              );
              break;
            case 'project:create':
              setProjects((prev) => [...prev, msg.payload]);
              break;
            case 'achievement:unlock':
              setAchievements((prev) =>
                prev.map((a) =>
                  a.id === msg.payload.id
                    ? { ...a, unlocked: true, unlockedAt: msg.payload.unlockedAt }
                    : a
                )
              );
              break;
            case 'platform:sync:complete':
              setPlatformState((prev) => ({
                ...prev,
                [msg.payload.platformId]: {
                  ...prev[msg.payload.platformId],
                  syncing: false,
                  lastSync: msg.payload.timestamp,
                  achievementCount: msg.payload.achievementCount ?? prev[msg.payload.platformId]?.achievementCount,
                },
              }));
              break;
            default:
              break;
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
        reconnectTimerRef.current = setTimeout(connectWs, 5000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setWsStatus('disconnected');
      reconnectTimerRef.current = setTimeout(connectWs, 5000);
    }
  }, [wsUrl]);

  useEffect(() => {
    connectWs();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  // ── Platform handlers ───────────────────────────────────────────────────────

  const handleConnect = useCallback((platformId) => {
    // Trigger OAuth flow via the backend; redirect to platform auth page
    window.location.href = `${apiBase}/auth/${platformId}/start`;
  }, [apiBase]);

  const handleSync = useCallback((platformId) => {
    setPlatformState((prev) => ({
      ...prev,
      [platformId]: { ...prev[platformId], syncing: true },
    }));
    // Signal WebSocket server to trigger sync; falls back to REST
    if (wsRef.current?.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'platform:sync', platformId }));
    } else {
      fetch(`${apiBase}/platforms/${platformId}/sync`, { method: 'POST' })
        .then((r) => r.json())
        .then((data) => {
          setPlatformState((prev) => ({
            ...prev,
            [platformId]: {
              ...prev[platformId],
              syncing: false,
              lastSync: data.timestamp || new Date().toISOString(),
              achievementCount: data.achievementCount ?? prev[platformId]?.achievementCount,
            },
          }));
        })
        .catch(() => {
          setPlatformState((prev) => ({
            ...prev,
            [platformId]: { ...prev[platformId], syncing: false },
          }));
        });
    }
  }, [apiBase]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const filteredAchievements = achievements.filter((a) => {
    if (achievementFilter === 'unlocked') return a.unlocked;
    if (achievementFilter === 'locked') return !a.unlocked;
    return true;
  });

  const totalAchievements = achievements.length;
  const unlockedAchievements = achievements.filter((a) => a.unlocked).length;
  const successBuilds = projects.filter((p) => p.buildStatus === 'success').length;
  const totalBugs = projects.reduce((s, p) => s + p.openBugs, 0);

  // ── Styles ──────────────────────────────────────────────────────────────────

  const bg = darkMode ? '#0f172a' : '#f8fafc';
  const surface = darkMode ? '#1e293b' : '#ffffff';
  const border = darkMode ? '#334155' : '#e2e8f0';
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a';
  const textSecondary = darkMode ? '#94a3b8' : '#64748b';

  const tabStyle = (active) => ({
    padding: '8px 18px',
    borderRadius: 8,
    border: 'none',
    background: active ? (darkMode ? '#3b82f6' : '#2563eb') : 'transparent',
    color: active ? '#ffffff' : textSecondary,
    fontWeight: active ? 700 : 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        background: bg,
        color: textPrimary,
        minHeight: '100vh',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: textPrimary }}>
            🕹 Game Dev Dashboard
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: textSecondary }}>
            Real-time project tracking &amp; platform connectors
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusDot status={wsStatus === 'connected' ? 'success' : wsStatus === 'connecting' ? 'running' : 'idle'} />
          <span style={{ fontSize: '0.78rem', color: textSecondary }}>
            {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting…' : 'Offline'}
          </span>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <MetricCard label="Total Projects" value={projects.length} darkMode={darkMode} />
        <MetricCard label="Successful Builds" value={successBuilds} color={STATUS_COLORS.success} darkMode={darkMode} />
        <MetricCard label="Open Bugs" value={totalBugs} color={totalBugs > 20 ? STATUS_COLORS.error : STATUS_COLORS.warning} darkMode={darkMode} />
        <MetricCard
          label="Achievements"
          value={`${unlockedAchievements}/${totalAchievements}`}
          color="#f59e0b"
          sub={`${Math.round((unlockedAchievements / totalAchievements) * 100)}% unlocked`}
          darkMode={darkMode}
        />
        <MetricCard
          label="Avg FPS"
          value={`${Math.round(projects.reduce((s, p) => s + p.performanceBenchmarks.avgFps, 0) / projects.length)}`}
          sub="across projects"
          darkMode={darkMode}
        />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: darkMode ? '#1e293b' : '#f1f5f9',
          borderRadius: 10,
          padding: 4,
          marginBottom: 20,
          width: 'fit-content',
        }}
      >
        {['projects', 'achievements', 'connectors'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(activeTab === tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Tab: Projects ─────────────────────────────────────────────────────── */}
      {activeTab === 'projects' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 340px) 1fr',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {/* Project list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                darkMode={darkMode}
                onSelect={setSelectedProjectId}
                selected={project.id === selectedProjectId}
              />
            ))}
          </div>

          {/* Project detail */}
          {selectedProject && (
            <div
              style={{
                background: surface,
                border: `1px solid ${border}`,
                borderRadius: 14,
                padding: '20px 22px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: textPrimary }}>
                    {selectedProject.name}
                  </h2>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <Badge color={ENGINE_COLORS[selectedProject.engine] || ENGINE_COLORS.Other}>
                      {selectedProject.engine}
                    </Badge>
                    <Badge color={STATUS_COLORS[selectedProject.buildStatus]}>
                      Build: {selectedProject.buildStatus}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Performance metrics */}
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                  Performance Benchmarks
                </h3>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <MetricCard label="Avg FPS" value={selectedProject.performanceBenchmarks.avgFps} color={selectedProject.performanceBenchmarks.avgFps >= selectedProject.fpsTarget ? STATUS_COLORS.success : STATUS_COLORS.error} sub={`target: ${selectedProject.fpsTarget}`} darkMode={darkMode} />
                  <MetricCard label="Render Time" value={`${selectedProject.performanceBenchmarks.renderTime}ms`} darkMode={darkMode} />
                  <MetricCard label="Memory" value={fmtBytes(selectedProject.performanceBenchmarks.memoryUsage * 1024 * 1024)} darkMode={darkMode} />
                  <MetricCard label="Assets" value={selectedProject.assetCount} darkMode={darkMode} />
                  <MetricCard label="Project Size" value={fmtBytes(selectedProject.projectSize)} darkMode={darkMode} />
                  <MetricCard label="Open Bugs" value={selectedProject.openBugs} color={selectedProject.openBugs > 10 ? STATUS_COLORS.error : STATUS_COLORS.warning} darkMode={darkMode} />
                </div>
              </div>

              {/* FPS target progress */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                  <span style={{ color: textSecondary }}>FPS vs Target ({selectedProject.fpsTarget} fps)</span>
                  <span style={{ color: textPrimary }}>{selectedProject.performanceBenchmarks.avgFps} fps</span>
                </div>
                <ProgressBar
                  value={selectedProject.performanceBenchmarks.avgFps}
                  max={selectedProject.fpsTarget * 1.2}
                  color={selectedProject.performanceBenchmarks.avgFps >= selectedProject.fpsTarget ? STATUS_COLORS.success : STATUS_COLORS.error}
                  height={8}
                />
              </div>

              {/* Commit history */}
              <div>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                  Recent Commits ({selectedProject.commitCount} total)
                </h3>
                <div>
                  {selectedProject.commits.map((commit) => (
                    <CommitHistoryItem key={commit.hash} commit={commit} darkMode={darkMode} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Achievements ─────────────────────────────────────────────────── */}
      {activeTab === 'achievements' && (
        <div
          style={{
            background: surface,
            border: `1px solid ${border}`,
            borderRadius: 14,
            padding: '20px 22px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: textPrimary }}>
              Achievement Tracker
            </h2>
            <div style={{ display: 'flex', gap: 4 }}>
              {['all', 'unlocked', 'locked'].map((f) => (
                <button
                  key={f}
                  onClick={() => setAchievementFilter(f)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 7,
                    border: `1px solid ${achievementFilter === f ? '#3b82f6' : border}`,
                    background: achievementFilter === f ? '#3b82f622' : 'transparent',
                    color: achievementFilter === f ? '#3b82f6' : textSecondary,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: achievementFilter === f ? 600 : 400,
                  }}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Overall progress */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
              <span style={{ color: textSecondary }}>Overall progress</span>
              <span style={{ color: textPrimary }}>{unlockedAchievements} / {totalAchievements}</span>
            </div>
            <ProgressBar value={unlockedAchievements} max={totalAchievements} color="#f59e0b" height={8} />
          </div>

          {/* Platform breakdown */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            {Object.values(PLATFORMS).map((pl) => {
              const plAchievements = achievements.filter((a) => a.platform.toLowerCase().includes(pl.id));
              const plUnlocked = plAchievements.filter((a) => a.unlocked).length;
              return (
                <div
                  key={pl.id}
                  style={{
                    background: darkMode ? '#1f2937' : '#f9fafb',
                    border: `1px solid ${border}`,
                    borderRadius: 10,
                    padding: '10px 14px',
                    flex: '1 1 130px',
                    minWidth: 130,
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: textSecondary, marginBottom: 2 }}>{pl.name}</div>
                  <div style={{ fontWeight: 700, color: textPrimary }}>{plUnlocked}/{plAchievements.length}</div>
                </div>
              );
            })}
          </div>

          {/* Achievement list */}
          <div>
            {filteredAchievements.length === 0 && (
              <div style={{ textAlign: 'center', color: textSecondary, padding: '24px 0', fontSize: '0.85rem' }}>
                No achievements match this filter.
              </div>
            )}
            {filteredAchievements.map((achievement) => (
              <AchievementRow key={achievement.id} achievement={achievement} darkMode={darkMode} />
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Connectors ───────────────────────────────────────────────────── */}
      {activeTab === 'connectors' && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: textPrimary }}>
              Platform Connectors
            </h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: textSecondary }}>
              Connect your gaming platform accounts for achievement and progress sync.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 14,
            }}
          >
            {Object.values(PLATFORMS).map((platform) => {
              const state = platformState[platform.id] || {};
              return (
                <PlatformConnectorCard
                  key={platform.id}
                  platform={platform}
                  connected={state.connected}
                  syncing={state.syncing}
                  lastSync={state.lastSync}
                  achievementCount={state.achievementCount}
                  darkMode={darkMode}
                  onConnect={() => handleConnect(platform.id)}
                  onSync={() => handleSync(platform.id)}
                />
              );
            })}
          </div>

          {/* Sync status summary */}
          <div
            style={{
              background: surface,
              border: `1px solid ${border}`,
              borderRadius: 14,
              padding: '18px 20px',
              marginTop: 16,
            }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sync Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.values(PLATFORMS).map((platform) => {
                const state = platformState[platform.id] || {};
                return (
                  <div key={platform.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <StatusDot status={!state.connected ? 'idle' : state.syncing ? 'running' : 'success'} />
                    <span style={{ fontSize: '0.82rem', color: textPrimary, flex: '0 0 220px' }}>{platform.name}</span>
                    <span style={{ fontSize: '0.78rem', color: textSecondary }}>
                      {!state.connected
                        ? 'Not connected'
                        : state.syncing
                        ? 'Syncing…'
                        : state.lastSync
                        ? `Synced ${fmtRelativeTime(state.lastSync)}`
                        : 'Never synced'}
                    </span>
                    {state.connected && (
                      <Badge color="#f59e0b" style={{ marginLeft: 'auto' }}>
                        {state.achievementCount} achievements
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameDevDashboard;
