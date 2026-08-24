/**
 * src/components/gamedev/GameDevDashboard.jsx
 * Game Development & AR/VR/3D Project Tracking Dashboard
 * Updated: 2026-08-24
 *
 * Connectors: Unreal Engine, Epic Games, Sony (PSN),
 *             Microsoft (Xbox/XDP), Ubisoft Connect
 * Features:
 * - Real-time project tracking (coding, game, AR/VR, 3D)
 * - Achievement & game progress tracking
 * - Build status & platform targets
 * - Plugin management for major engines
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AuthService from '../../auth/AuthService.js';

// ── Platform connectors ──────────────────────────────────────────────────────
const PLATFORMS = {
  unreal: {
    name: 'Unreal Engine',
    emoji: '🎮',
    color: '#313131',
    accent: '#0073e6',
    gradient: 'linear-gradient(135deg, #313131, #0073e6)',
    features: ['Blueprints', 'Nanite', 'Lumen', 'MetaHuman', 'PCG', 'Chaos Physics'],
    status: 'connected',
    version: '5.4',
    projectTypes: ['Game', 'ArchViz', 'Film/VFX', 'Simulation', 'AR/VR', 'MR'],
  },
  epic: {
    name: 'Epic Games Store',
    emoji: '🏪',
    color: '#2A2A2A',
    accent: '#0074E4',
    gradient: 'linear-gradient(135deg, #2A2A2A, #0074E4)',
    features: ['Store Analytics', 'Achievements API', 'Friends', 'DLC', 'Anti-Cheat'],
    status: 'connected',
    projectTypes: ['PC', 'Console'],
  },
  sony: {
    name: 'PlayStation Network',
    emoji: '🎮',
    color: '#003087',
    accent: '#00439C',
    gradient: 'linear-gradient(135deg, #003087, #00439C)',
    features: ['PS4/PS5', 'Trophy System', 'Share Play', 'PSN Friends', 'Remote Play'],
    status: 'available',
    projectTypes: ['PS4', 'PS5', 'PSVR2'],
  },
  microsoft: {
    name: 'Xbox / XDP',
    emoji: '🟢',
    color: '#107C10',
    accent: '#52B043',
    gradient: 'linear-gradient(135deg, #107C10, #52B043)',
    features: ['Achievement System', 'Game Pass', 'Xbox Live', 'DirectX 12', 'Smart Delivery'],
    status: 'available',
    projectTypes: ['Xbox Series X|S', 'Xbox One', 'Windows/PC'],
  },
  ubisoft: {
    name: 'Ubisoft Connect',
    emoji: '🔷',
    color: '#0078d4',
    accent: '#00b4ff',
    gradient: 'linear-gradient(135deg, #0078d4, #00b4ff)',
    features: ['Ubisoft Connect', 'Challenges', 'Units', 'News Feed', 'Cloud Saves'],
    status: 'available',
    projectTypes: ['PC', 'Console', 'Stadia'],
  },
  unity: {
    name: 'Unity',
    emoji: '⚫',
    color: '#222222',
    accent: '#AEAEAE',
    gradient: 'linear-gradient(135deg, #222222, #4a4a4a)',
    features: ['URP', 'HDRP', 'ECS', 'DOTS', 'AR Foundation', 'VR Framework'],
    status: 'available',
    projectTypes: ['Mobile', 'WebGL', 'PC', 'Console', 'AR', 'VR'],
  },
};

const PROJECT_TYPES = {
  game: { label: 'Game Development', icon: '🎮', color: '#6366f1' },
  arvr: { label: 'AR/VR', icon: '🥽', color: '#8b5cf6' },
  '3d': { label: '3D Projects', icon: '🧊', color: '#0ea5e9' },
  coding: { label: 'Coding Projects', icon: '💻', color: '#22c55e' },
};

// ── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max = 100, color = '#6366f1', label, showPct = true }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ width: '100%' }}>
      {(label || showPct) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          {label && <span style={{ color: '#94a3b8', fontSize: 12 }}>{label}</span>}
          {showPct && <span style={{ color: '#64748b', fontSize: 12 }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: color,
          borderRadius: 3, transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

// ── Project card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onOpen }) {
  const type = PROJECT_TYPES[project.type] || PROJECT_TYPES.coding;
  const buildColor = project.buildStatus === 'passing' ? '#22c55e'
    : project.buildStatus === 'failing' ? '#ef4444' : '#f59e0b';

  return (
    <div
      onClick={() => onOpen(project)}
      style={{
        background: 'rgba(30,41,59,0.8)', borderRadius: 14, padding: '18px 20px',
        border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
        transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column', gap: 12,
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = type.color + '66'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>{type.icon}</span>
            <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 15 }}>{project.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 20,
              background: type.color + '22', color: type.color, fontWeight: 500,
            }}>{type.label}</span>
            {project.engine && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20,
                background: 'rgba(148,163,184,0.1)', color: '#94a3b8',
              }}>{project.engine}</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'block', fontSize: 11, fontWeight: 600,
            color: buildColor, marginBottom: 2,
          }}>
            ● {project.buildStatus || 'unknown'}
          </span>
          {project.targetPlatforms?.map(p => (
            <span key={p} style={{ fontSize: 10, color: '#475569', display: 'block' }}>{p}</span>
          ))}
        </div>
      </div>

      <ProgressBar value={project.completion} color={type.color} label="Completion" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { label: 'Commits', value: project.commits || 0 },
          { label: 'Issues', value: project.issues || 0 },
          { label: 'Build #', value: project.buildNumber || 1 },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'rgba(15,23,42,0.5)', borderRadius: 8, padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 16 }}>{value}</div>
            <div style={{ color: '#475569', fontSize: 11 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Achievement card ──────────────────────────────────────────────────────────
function AchievementCard({ achievement }) {
  const { unlocked, rarity, icon, title, description, progress, maxProgress, xp } = achievement;
  const rarityColors = { common: '#94a3b8', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' };
  return (
    <div style={{
      background: unlocked ? 'rgba(30,41,59,0.9)' : 'rgba(15,23,42,0.6)',
      borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start',
      border: `1px solid ${unlocked ? rarityColors[rarity] + '44' : 'rgba(255,255,255,0.04)'}`,
      opacity: unlocked ? 1 : 0.6,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: unlocked ? `linear-gradient(135deg, ${rarityColors[rarity]}44, ${rarityColors[rarity]}22)` : '#1e293b',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        border: `1px solid ${rarityColors[rarity]}33`, flexShrink: 0,
      }}>
        {unlocked ? icon : '🔒'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{title}</span>
          {xp && <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 700 }}>+{xp}XP</span>}
        </div>
        <p style={{ color: '#64748b', fontSize: 11, margin: '2px 0 6px', lineHeight: 1.4 }}>{description}</p>
        {maxProgress && (
          <ProgressBar value={progress || 0} max={maxProgress} color={rarityColors[rarity]} showPct={false} />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: rarityColors[rarity], fontSize: 11, fontWeight: 500, textTransform: 'capitalize' }}>
            {rarity}
          </span>
          {maxProgress && (
            <span style={{ color: '#475569', fontSize: 11 }}>{progress}/{maxProgress}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Connector badge ──────────────────────────────────────────────────────────
function ConnectorBadge({ platformKey, platform, onConnect }) {
  const isConnected = platform.status === 'connected';
  return (
    <div style={{
      background: 'rgba(30,41,59,0.7)', borderRadius: 12, padding: '14px 16px',
      border: `1px solid ${isConnected ? platform.accent + '44' : 'rgba(255,255,255,0.06)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 20 }}>{platform.emoji}</span>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>{platform.name}</div>
            {platform.version && <div style={{ color: '#475569', fontSize: 11 }}>v{platform.version}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: isConnected ? '#22c55e' : '#475569', display: 'block',
          }} />
          <span style={{ fontSize: 11, color: isConnected ? '#22c55e' : '#64748b', fontWeight: 500 }}>
            {isConnected ? 'Connected' : 'Available'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {platform.features.slice(0, 3).map(f => (
          <span key={f} style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 20,
            background: 'rgba(148,163,184,0.1)', color: '#64748b',
          }}>{f}</span>
        ))}
        {platform.features.length > 3 && (
          <span style={{ fontSize: 10, color: '#475569' }}>+{platform.features.length - 3} more</span>
        )}
      </div>
      <button
        onClick={() => onConnect(platformKey)}
        style={{
          width: '100%', padding: '7px', borderRadius: 8, border: 'none',
          cursor: 'pointer', fontSize: 12, fontWeight: 600,
          background: isConnected ? 'rgba(34,197,94,0.1)' : platform.gradient,
          color: isConnected ? '#22c55e' : '#fff', transition: 'all 0.2s',
        }}
      >
        {isConnected ? '✓ Manage Connection' : '+ Connect'}
      </button>
    </div>
  );
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_PROJECTS = [
  {
    id: 'p1', name: 'Nexus Realms', type: 'game', engine: 'Unreal 5.4',
    completion: 68, commits: 1247, issues: 12, buildNumber: 294,
    buildStatus: 'passing', targetPlatforms: ['PC', 'PS5', 'Xbox Series X'],
  },
  {
    id: 'p2', name: 'VR Training Suite', type: 'arvr', engine: 'Unity 2023',
    completion: 42, commits: 580, issues: 5, buildNumber: 87,
    buildStatus: 'passing', targetPlatforms: ['PSVR2', 'Quest 3', 'Vision Pro'],
  },
  {
    id: 'p3', name: 'Procedural World Gen', type: '3d', engine: 'Unreal 5.4',
    completion: 85, commits: 2100, issues: 3, buildNumber: 512,
    buildStatus: 'passing', targetPlatforms: ['PC'],
  },
  {
    id: 'p4', name: 'Nexus AI Pro Backend', type: 'coding',
    completion: 72, commits: 890, issues: 8, buildNumber: 156,
    buildStatus: 'passing', targetPlatforms: ['Linux', 'macOS', 'Windows'],
  },
];

const MOCK_ACHIEVEMENTS = [
  { icon: '🏆', title: 'First Launch', description: 'Successfully shipped your first build', rarity: 'common', unlocked: true, xp: 100, progress: 1, maxProgress: 1 },
  { icon: '🔥', title: 'Commit Streak', description: 'Commit code 30 days in a row', rarity: 'rare', unlocked: true, xp: 500, progress: 30, maxProgress: 30 },
  { icon: '💎', title: 'Platform Master', description: 'Release on 5 platforms', rarity: 'epic', unlocked: false, xp: 2000, progress: 2, maxProgress: 5 },
  { icon: '👑', title: 'Million Players', description: 'Reach 1M concurrent players', rarity: 'legendary', unlocked: false, xp: 10000, progress: 12400, maxProgress: 1000000 },
  { icon: '🎯', title: '100% Test Coverage', description: 'Achieve full test coverage', rarity: 'epic', unlocked: false, xp: 1500, progress: 72, maxProgress: 100 },
  { icon: '🌍', title: 'Global Release', description: 'Release in 10+ regions', rarity: 'rare', unlocked: true, xp: 750, progress: 14, maxProgress: 14 },
];

// ── Main component ───────────────────────────────────────────────────────────
export default function GameDevDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [achievements, setAchievements] = useState(MOCK_ACHIEVEMENTS);
  const [connectors, setConnectors] = useState(PLATFORMS);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [projResp, achResp] = await Promise.all([
          fetch('/api/gamedev/projects', { headers: AuthService.authHeaders() }),
          fetch('/api/gamedev/achievements', { headers: AuthService.authHeaders() }),
        ]);
        if (projResp.ok) setProjects(await projResp.json());
        if (achResp.ok) setAchievements(await achResp.json());
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleConnect = async (platformKey) => {
    try {
      const resp = await fetch(`/api/connectors/${platformKey}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...AuthService.authHeaders() },
      });
      if (resp.ok) {
        setConnectors(prev => ({
          ...prev,
          [platformKey]: { ...prev[platformKey], status: 'connected' },
        }));
      }
    } catch {
      // Show connect modal in production
    }
  };

  const filteredProjects = projects.filter(
    p => typeFilter === 'all' || p.type === typeFilter
  );

  const totalXP = achievements.filter(a => a.unlocked).reduce((s, a) => s + (a.xp || 0), 0);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const tabs = [
    { id: 'projects', label: '📁 Projects' },
    { id: 'achievements', label: '🏆 Achievements' },
    { id: 'connectors', label: '🔌 Connectors' },
  ];

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1e',
      color: '#f1f5f9', fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      padding: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>🎮 {t('gamedev.title')}</h1>
          <p style={{ color: '#475569', margin: '4px 0 0', fontSize: 13 }}>
            Project tracking for games, AR/VR, 3D & coding
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 18 }}>{totalXP.toLocaleString()} XP</div>
            <div style={{ color: '#475569', fontSize: 11 }}>{unlockedCount}/{achievements.length} achievements</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(30,41,59,0.5)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(99,102,241,0.8)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#64748b',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div>
          {/* Type filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {[{ id: 'all', label: 'All', icon: '📂' },
              ...Object.entries(PROJECT_TYPES).map(([id, t]) => ({ id, label: t.label, icon: t.icon }))
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setTypeFilter(id)}
                style={{
                  padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: typeFilter === id ? 'rgba(99,102,241,0.8)' : 'rgba(30,41,59,0.6)',
                  color: typeFilter === id ? '#fff' : '#64748b',
                  fontSize: 12, fontWeight: 500,
                }}
              >{icon} {label}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filteredProjects.map(proj => (
              <ProjectCard key={proj.id} project={proj} onOpen={setSelectedProject} />
            ))}
            {/* Add new project */}
            <div style={{
              background: 'rgba(30,41,59,0.3)', borderRadius: 14, padding: '20px',
              border: '2px dashed rgba(99,102,241,0.3)', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
              gap: 8, minHeight: 180, transition: 'border-color 0.2s',
            }}
              onClick={() => setSelectedProject({ id: 'new', name: '' })}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'}
            >
              <span style={{ fontSize: 28, color: '#475569' }}>+</span>
              <span style={{ color: '#475569', fontSize: 14 }}>New Project</span>
            </div>
          </div>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
            {['common', 'rare', 'epic', 'legendary'].map(rarity => {
              const colors = { common: '#94a3b8', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#f59e0b' };
              const count = achievements.filter(a => a.rarity === rarity && a.unlocked).length;
              const total = achievements.filter(a => a.rarity === rarity).length;
              return (
                <div key={rarity} style={{
                  background: 'rgba(30,41,59,0.7)', borderRadius: 10, padding: '14px',
                  border: `1px solid ${colors[rarity]}22`, textAlign: 'center',
                }}>
                  <div style={{ color: colors[rarity], fontWeight: 700, fontSize: 20, textTransform: 'capitalize' }}>
                    {rarity}
                  </div>
                  <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 22, marginTop: 4 }}>
                    {count}<span style={{ color: '#475569', fontSize: 14 }}>/{total}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {achievements.map((ach, i) => (
              <AchievementCard key={i} achievement={ach} />
            ))}
          </div>
        </div>
      )}

      {/* Connectors Tab */}
      {activeTab === 'connectors' && (
        <div>
          <p style={{ color: '#475569', fontSize: 13, marginBottom: 18 }}>
            Connect your game development platforms to enable real-time build status,
            achievement sync, and analytics. All auth uses OAuth 2.0 via secure server-side flows —
            no tokens stored in the browser.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {Object.entries(connectors).map(([key, plat]) => (
              <ConnectorBadge key={key} platformKey={key} platform={plat} onConnect={handleConnect} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
