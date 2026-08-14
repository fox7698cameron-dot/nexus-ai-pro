/**
 * GameDevDashboard.jsx
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Real-time Project Tracking Dashboard for:
 *   - Game Development (2D, 3D, AR, VR, Mixed Reality)
 *   - AR/VR/3D Projects
 *   - Coding Projects (web, mobile, desktop, backend)
 *   - Platform Connectors: Unreal/Epic, Sony, Microsoft, Ubisoft
 *   - Achievement & Game Progress Tracking
 * Updated: 2026-08-14
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Gamepad2, Rocket, Code, Box, Layers, Globe, Trophy,
  Activity, GitBranch, Play, Pause, CheckCircle2, Clock,
  Plus, Settings, ExternalLink, Wifi, Cpu, BarChart3,
  TrendingUp, Star, Zap, RefreshCw, ChevronDown, Users,
  Terminal, Bug, Wrench, Monitor, Smartphone, Server,
  Video, Camera, Headphones, Eye, Shield, Download
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const PROJECT_TYPES = {
  'game-2d':       { label: '2D Game',         icon: '🎮', color: '#6366f1' },
  'game-3d':       { label: '3D Game',         icon: '🎯', color: '#8b5cf6' },
  'ar':            { label: 'AR',               icon: '📱', color: '#22c55e' },
  'vr':            { label: 'VR',               icon: '🥽', color: '#06b6d4' },
  'mixed-reality': { label: 'Mixed Reality',   icon: '🌐', color: '#f59e0b' },
  'web':           { label: 'Web App',          icon: '🌍', color: '#3b82f6' },
  'mobile':        { label: 'Mobile App',      icon: '📲', color: '#ec4899' },
  'desktop':       { label: 'Desktop App',     icon: '🖥️',  color: '#64748b' },
  'backend':       { label: 'Backend / API',   icon: '⚙️',  color: '#f97316' },
  'ai':            { label: 'AI Project',       icon: '🤖', color: '#a855f7' },
  'library':       { label: 'Library / SDK',   icon: '📦', color: '#0ea5e9' },
  'cli':           { label: 'CLI Tool',         icon: '💻', color: '#84cc16' },
};

const GAME_ENGINES = {
  unreal:   { name: 'Unreal Engine', icon: '🎮', color: '#0070f3', provider: 'Epic Games' },
  unity:    { name: 'Unity',         icon: '🎯', color: '#000000', provider: 'Unity Technologies' },
  godot:    { name: 'Godot',         icon: '🔵', color: '#478cbf', provider: 'Godot Foundation' },
  threejs:  { name: 'Three.js',      icon: '🌐', color: '#049ef4', provider: 'Open Source' },
  babylonjs:{ name: 'Babylon.js',    icon: '🌀', color: '#e0684b', provider: 'Microsoft' },
  arkit:    { name: 'ARKit',         icon: '📱', color: '#0a84ff', provider: 'Apple' },
  arcore:   { name: 'ARCore',        icon: '🤖', color: '#4285f4', provider: 'Google' },
  openxr:   { name: 'OpenXR',        icon: '🥽', color: '#ff6600', provider: 'Khronos Group' },
  webxr:    { name: 'WebXR',         icon: '🌐', color: '#ff4500', provider: 'W3C' },
};

const PLATFORM_CONNECTORS = {
  unreal:    { name: 'Unreal / Epic Games', icon: '🎮', color: '#0070f3', features: ['Source access', 'Marketplace', 'Dev programs'] },
  sony:      { name: 'PlayStation / Sony',  icon: '🎮', color: '#003791', features: ['PS5 SDK', 'PSN', 'Dev portal'] },
  microsoft: { name: 'Xbox / Microsoft',    icon: '🟢', color: '#107c10', features: ['Xbox SDK', 'Game Pass', 'PlayFab'] },
  ubisoft:   { name: 'Ubisoft Connect',    icon: '🎮', color: '#007aff', features: ['Achievements', 'Store', 'Social'] },
  steam:     { name: 'Steam / Valve',       icon: '💨', color: '#1b2838', features: ['Steamworks', 'Workshop', 'Cloud'] },
  nintendo:  { name: 'Nintendo',            icon: '🎮', color: '#e4000f', features: ['Dev portal', 'eShop', 'Online'] },
};

const RARITY_COLORS = {
  common:    '#94a3b8',
  uncommon:  '#22c55e',
  rare:      '#3b82f6',
  epic:      '#8b5cf6',
  legendary: '#f59e0b',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDuration = (ms) => {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h ? `${h}h ${m}m` : `${m}m`;
};

const pctColor = (p) => p >= 75 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444';

// ─── Demo Data Generator ──────────────────────────────────────────────────────
const DEMO_PROJECTS = [
  { id: '1', name: 'Nexus Realms', type: 'game-3d', engine: 'unreal', description: 'Open-world RPG with procedural generation', platforms: ['pc', 'ps5', 'xbox'], status: 'active', progress: 68, commits: 1247, builds: 89, tests: 342, coverage: 74, createdAt: Date.now() - 120 * 86400000, updatedAt: Date.now() - 3600000, milestones: [{ name: 'Alpha', done: true }, { name: 'Beta', done: false }, { name: 'Gold', done: false }] },
  { id: '2', name: 'PortalVR Experience', type: 'vr', engine: 'openxr', description: 'Immersive VR puzzle experience', platforms: ['oculus', 'steamvr', 'psvr2'], status: 'active', progress: 41, commits: 523, builds: 34, tests: 120, coverage: 58, createdAt: Date.now() - 60 * 86400000, updatedAt: Date.now() - 7200000, milestones: [{ name: 'Prototype', done: true }, { name: 'Demo', done: false }] },
  { id: '3', name: 'AR City Builder', type: 'ar', engine: 'arkit', description: 'Augmented reality city building game', platforms: ['ios', 'android'], status: 'active', progress: 22, commits: 189, builds: 12, tests: 67, coverage: 42, createdAt: Date.now() - 30 * 86400000, updatedAt: Date.now() - 86400000, milestones: [{ name: 'Concept', done: true }] },
  { id: '4', name: 'Nexus AI Pro API', type: 'backend', engine: null, description: 'Core backend API and services', platforms: ['cloud', 'linux', 'docker'], status: 'active', progress: 85, commits: 2843, builds: 213, tests: 891, coverage: 82, createdAt: Date.now() - 200 * 86400000, updatedAt: Date.now() - 1800000, milestones: [{ name: 'v1.0', done: true }, { name: 'v2.0', done: true }, { name: 'v3.0', done: false }] },
];

const DEMO_ACHIEVEMENTS = [
  { id: 'a1', name: 'First Blood', description: 'Land your first bug report', platform: 'unreal', game: 'Nexus Realms', icon: '⚔️', rarity: 'common', points: 10, unlockedAt: Date.now() - 86400000 * 5 },
  { id: 'a2', name: 'Master Builder', description: 'Complete 100 builds', platform: 'steam', game: 'Nexus Realms', icon: '🏗️', rarity: 'rare', points: 50, unlockedAt: Date.now() - 86400000 * 2 },
  { id: 'a3', name: 'VR Pioneer', description: 'First VR project shipped', platform: 'sony', game: 'PortalVR', icon: '🥽', rarity: 'epic', points: 100, unlockedAt: Date.now() - 86400000 },
  { id: 'a4', name: 'Code Ninja', description: 'Reach 80%+ test coverage', platform: 'microsoft', game: 'Nexus AI Pro API', icon: '🥷', rarity: 'legendary', points: 200, unlockedAt: Date.now() - 3600000 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function ProgressBar({ value, color }) {
  return (
    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color || pctColor(value), borderRadius: 3, transition: 'width 0.5s' }} />
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 12px', background: `${color}15`, borderRadius: 8 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, opacity: 0.6 }}>{label}</div>
    </div>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  const pt = PROJECT_TYPES[project.type] || PROJECT_TYPES['web'];
  const age = Math.floor((Date.now() - project.createdAt) / 86400000);
  return (
    <div
      onClick={() => onSelect(project)}
      style={{
        background: selected ? `${pt.color}18` : 'var(--card-bg)',
        border: `1px solid ${selected ? pt.color : 'var(--border)'}`,
        borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.15s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{pt.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{project.name}</div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>{pt.label} · {age}d old</div>
          </div>
        </div>
        <span style={{ fontSize: 11, background: `${pt.color}20`, color: pt.color, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
          {project.status}
        </span>
      </div>
      {project.description && <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 10 }}>{project.description}</div>}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.6, marginBottom: 4 }}>
          <span>Progress</span><span style={{ fontWeight: 600, color: pctColor(project.progress) }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <StatPill label="Commits" value={project.commits} color="#6366f1" />
        <StatPill label="Builds" value={project.builds} color="#22c55e" />
        <StatPill label="Coverage" value={`${project.coverage}%`} color={pctColor(project.coverage)} />
      </div>
    </div>
  );
}

function AchievementCard({ achievement }) {
  const rColor = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
  return (
    <div style={{ background: `${rColor}10`, border: `1px solid ${rColor}40`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 28, flexShrink: 0 }}>{achievement.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{achievement.name}</div>
        <div style={{ fontSize: 11, opacity: 0.6 }}>{achievement.description}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, background: `${rColor}20`, color: rColor, padding: '1px 7px', borderRadius: 8, fontWeight: 600 }}>{achievement.rarity}</span>
          <span style={{ fontSize: 10, opacity: 0.5 }}>{achievement.game}</span>
          <span style={{ fontSize: 10, opacity: 0.5 }}>{PLATFORM_CONNECTORS[achievement.platform]?.name || achievement.platform}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: rColor }}>+{achievement.points}</div>
        <div style={{ fontSize: 10, opacity: 0.5 }}>pts</div>
      </div>
    </div>
  );
}

function ConnectorCard({ id, connector, connected, onConnect }) {
  return (
    <div style={{ background: 'var(--card-bg)', border: `1px solid ${connected ? connector.color : 'var(--border)'}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>{connector.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{connector.name}</div>
          </div>
        </div>
        <button
          onClick={() => onConnect(id)}
          style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: connected ? '#22c55e' : connector.color, color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
        >
          {connected ? '✓ Connected' : 'Connect'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {connector.features?.map(f => (
          <span key={f} style={{ fontSize: 10, background: 'var(--border)', padding: '2px 8px', borderRadius: 8, opacity: 0.7 }}>{f}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GameDevDashboard() {
  const [projects] = useState(DEMO_PROJECTS);
  const [selectedProject, setSelectedProject] = useState(DEMO_PROJECTS[0]);
  const [achievements] = useState(DEMO_ACHIEVEMENTS);
  const [connectedPlatforms, setConnectedPlatforms] = useState({ steam: true });
  const [activeTab, setActiveTab] = useState('projects');
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [liveStats, setLiveStats] = useState({});
  const intervalRef = useRef(null);

  // Real-time simulation
  useEffect(() => {
    if (realtimeActive) {
      intervalRef.current = setInterval(() => {
        setLiveStats(prev => ({
          ...prev,
          activeBuilds: Math.floor(Math.random() * 3),
          ciRuns: (prev.ciRuns || 0) + (Math.random() > 0.7 ? 1 : 0),
          onlineDevs: Math.floor(Math.random() * 8) + 1,
        }));
      }, 2000);
    }
    return () => clearInterval(intervalRef.current);
  }, [realtimeActive]);

  const connectPlatform = (id) => {
    setConnectedPlatforms(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalCommits = projects.reduce((s, p) => s + p.commits, 0);
  const avgCoverage = Math.round(projects.reduce((s, p) => s + p.coverage, 0) / projects.length);
  const achievementPts = achievements.reduce((s, a) => s + a.points, 0);

  const styles = {
    container: { padding: 24, color: 'var(--text)', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
    title: { fontSize: 24, fontWeight: 700, margin: 0 },
    btn: (active, color) => ({
      padding: '6px 14px', borderRadius: 8, border: `1px solid ${active ? color || 'var(--accent)' : 'var(--border)'}`,
      background: active ? color || 'var(--accent)' : 'var(--card-bg)', color: 'var(--text)',
      cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, display: 'flex', alignItems: 'center', gap: 5
    }),
    tabs: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 8 },
    tab: (active) => ({ padding: '6px 16px', borderRadius: '8px 8px 0 0', border: 'none', background: active ? 'var(--card-bg)' : 'transparent', color: 'var(--text)', opacity: active ? 1 : 0.5, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400 }),
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 20 },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 },
    card: { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 },
    cardTitle: { fontSize: 14, fontWeight: 600, opacity: 0.7, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 },
  };

  return (
    <div style={styles.container}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🎮 Game Dev & Project Tracker</h1>
          <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
            {projects.length} projects · {totalCommits.toLocaleString()} commits · {achievementPts} achievement pts
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setRealtimeActive(v => !v)} style={styles.btn(realtimeActive, '#22c55e')}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: realtimeActive ? '#22c55e' : '#888', animation: realtimeActive ? 'pulse 1.5s infinite' : 'none' }} />
            {realtimeActive ? 'Live' : 'Real-time'}
          </button>
          <button style={styles.btn(false)}><Plus size={13} /> New Project</button>
        </div>
      </div>

      {/* Real-time KPIs */}
      {realtimeActive && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Active Builds', value: liveStats.activeBuilds ?? 0, color: '#f59e0b' },
            { label: 'CI Runs', value: liveStats.ciRuns ?? 0, color: '#6366f1' },
            { label: 'Online Devs', value: liveStats.onlineDevs ?? 0, color: '#22c55e' },
          ].map(item => (
            <div key={item.label} style={{ background: `${item.color}15`, border: `1px solid ${item.color}40`, borderRadius: 10, padding: '8px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Global Stats */}
      <div style={styles.grid3}>
        {[
          { label: 'Projects', value: projects.length, icon: Box, color: '#6366f1' },
          { label: 'Total Commits', value: totalCommits.toLocaleString(), icon: GitBranch, color: '#8b5cf6' },
          { label: 'Avg Coverage', value: `${avgCoverage}%`, icon: BarChart3, color: avgCoverage >= 70 ? '#22c55e' : '#f59e0b' },
          { label: 'Achievements', value: achievements.length, icon: Trophy, color: '#f59e0b' },
          { label: 'Achievement Pts', value: achievementPts, icon: Star, color: '#ec4899' },
          { label: 'Platforms', value: Object.keys(connectedPlatforms).filter(k => connectedPlatforms[k]).length + '/' + Object.keys(PLATFORM_CONNECTORS).length, icon: Globe, color: '#3b82f6' },
        ].map(item => (
          <div key={item.label} style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <item.icon size={18} color={item.color} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{item.value}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {[
          ['projects', 'Projects'],
          ['detail', 'Project Detail'],
          ['engines', 'Engines & Engines'],
          ['platforms', 'Platform Connectors'],
          ['achievements', 'Achievements'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={styles.tab(activeTab === id)}>{label}</button>
        ))}
      </div>

      {/* PROJECTS TAB */}
      {activeTab === 'projects' && (
        <div style={styles.grid2}>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onSelect={(proj) => { setSelectedProject(proj); setActiveTab('detail'); }} selected={selectedProject?.id === p.id} />
          ))}
        </div>
      )}

      {/* DETAIL TAB */}
      {activeTab === 'detail' && selectedProject && (() => {
        const pt = PROJECT_TYPES[selectedProject.type] || PROJECT_TYPES['web'];
        const engine = selectedProject.engine ? GAME_ENGINES[selectedProject.engine] : null;
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 32 }}>{pt.icon}</span>
              <div>
                <h2 style={{ margin: 0, fontSize: 20 }}>{selectedProject.name}</h2>
                <div style={{ fontSize: 13, opacity: 0.6 }}>{pt.label} {engine ? `· ${engine.name}` : ''}</div>
              </div>
              <span style={{ marginLeft: 'auto', background: `${pt.color}20`, color: pt.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{selectedProject.status}</span>
            </div>

            <div style={styles.grid3}>
              <div style={styles.card}>
                <div style={styles.cardTitle}><TrendingUp size={14} />Progress</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: pctColor(selectedProject.progress), marginBottom: 8 }}>{selectedProject.progress}%</div>
                <ProgressBar value={selectedProject.progress} />
              </div>
              <div style={styles.card}>
                <div style={styles.cardTitle}><GitBranch size={14} />Code Stats</div>
                {[
                  ['Commits', selectedProject.commits, '#6366f1'],
                  ['Builds', selectedProject.builds, '#22c55e'],
                  ['Tests', selectedProject.tests, '#3b82f6'],
                  ['Coverage', `${selectedProject.coverage}%`, pctColor(selectedProject.coverage)],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ opacity: 0.6 }}>{label}</span>
                    <span style={{ fontWeight: 700, color }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={styles.card}>
                <div style={styles.cardTitle}><CheckCircle2 size={14} />Milestones</div>
                {selectedProject.milestones?.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    {m.done ? <CheckCircle2 size={14} color="#22c55e" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border)' }} />}
                    <span style={{ flex: 1, opacity: m.done ? 0.6 : 1, textDecoration: m.done ? 'line-through' : 'none' }}>{m.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Platforms */}
            {selectedProject.platforms?.length > 0 && (
              <div style={styles.card}>
                <div style={styles.cardTitle}><Monitor size={14} />Target Platforms</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedProject.platforms.map(p => (
                    <span key={p} style={{ background: 'var(--border)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                      {p === 'pc' ? '🖥️ PC' : p === 'ps5' ? '🎮 PS5' : p === 'xbox' ? '🟢 Xbox' : p === 'ios' ? '📱 iOS' : p === 'android' ? '🤖 Android' : p === 'oculus' ? '🥽 Oculus' : p === 'steamvr' ? '💨 SteamVR' : p === 'psvr2' ? '🎮 PSVR2' : p === 'linux' ? '🐧 Linux' : p === 'docker' ? '🐳 Docker' : p === 'cloud' ? '☁️ Cloud' : p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ENGINES TAB */}
      {activeTab === 'engines' && (
        <div style={styles.grid2}>
          {Object.entries(GAME_ENGINES).map(([key, eng]) => (
            <div key={key} style={{ ...styles.card, borderLeft: `3px solid ${eng.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{eng.icon}</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{eng.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>{eng.provider}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {projects.filter(p => p.engine === key).length} projects using this engine
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PLATFORMS TAB */}
      {activeTab === 'platforms' && (
        <div style={styles.grid2}>
          {Object.entries(PLATFORM_CONNECTORS).map(([id, connector]) => (
            <ConnectorCard key={id} id={id} connector={connector} connected={!!connectedPlatforms[id]} onConnect={connectPlatform} />
          ))}
        </div>
      )}

      {/* ACHIEVEMENTS TAB */}
      {activeTab === 'achievements' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {Object.entries(RARITY_COLORS).map(([rarity, color]) => {
              const count = achievements.filter(a => a.rarity === rarity).length;
              return (
                <div key={rarity} style={{ background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600, color }}>
                  {rarity}: {count}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {achievements.map(a => <AchievementCard key={a.id} achievement={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}
