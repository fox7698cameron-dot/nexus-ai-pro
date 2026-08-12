/**
 * src/components/dashboards/GameDevTracker.jsx
 * Real-Time Game Development Project Tracker
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * Tracks: Game builds, platform certification, achievement progress,
 *         milestones, and integrations with Epic/Unreal, Sony, Microsoft, Ubisoft
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Trophy, Star, Target, Clock, CheckCircle,
  XCircle, AlertCircle, Plus, RefreshCw, BarChart3,
  Rocket, Server, Cpu, Globe, Zap, Package, GitBranch
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENGINES = [
  { id: 'unreal5', name: 'Unreal Engine 5',    icon: '🎮', color: '#0070f3' },
  { id: 'unreal4', name: 'Unreal Engine 4',    icon: '🎮', color: '#0070c0' },
  { id: 'unity',   name: 'Unity',              icon: '⚡', color: '#00c4ff' },
  { id: 'godot',   name: 'Godot',              icon: '🤖', color: '#478cbf' },
  { id: 'custom',  name: 'Custom Engine',      icon: '🔧', color: '#6366f1' },
];

const PLATFORMS_GAME = [
  { id: 'pc',      name: 'PC / Steam',       icon: '🖥️' },
  { id: 'ps5',     name: 'PlayStation 5',    icon: '🎯' },
  { id: 'xbox',    name: 'Xbox Series X|S',  icon: '🟢' },
  { id: 'switch',  name: 'Nintendo Switch',  icon: '🕹️' },
  { id: 'ios',     name: 'iOS',              icon: '📱' },
  { id: 'android', name: 'Android',          icon: '🤖' },
  { id: 'vr_quest', name: 'Meta Quest',      icon: '🥽' },
];

const BUILD_STATUS_CONFIG = {
  queued:       { color: '#6b7280', label: 'Queued',           Icon: Clock      },
  building:     { color: '#f59e0b', label: 'Building',         Icon: Zap        },
  success:      { color: '#10b981', label: 'Success',          Icon: CheckCircle },
  failed:       { color: '#ef4444', label: 'Failed',           Icon: XCircle    },
  cert_pending: { color: '#6366f1', label: 'Cert Review',      Icon: AlertCircle },
  released:     { color: '#10b981', label: 'Released',         Icon: Rocket      },
};

function getBuildStatus(status) {
  return BUILD_STATUS_CONFIG[status] || BUILD_STATUS_CONFIG.queued;
}

// ─── BuildCard ────────────────────────────────────────────────────────────────

function BuildCard({ build }) {
  const { color, label, Icon } = getBuildStatus(build.status);
  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--card-bg, rgba(255,255,255,0.04))',
      border: `1px solid ${color}44`,
      borderRadius: 9,
      display: 'flex', gap: 10, alignItems: 'center',
    }}>
      <Icon size={16} style={{ color, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>v{build.version} · {build.platform}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', marginTop: 2 }}>
          {build.engine && `${build.engine} · `}{new Date(build.createdAt).toLocaleString()}
        </div>
      </div>
      <span style={{ padding: '3px 8px', borderRadius: 4, background: `${color}22`, color, fontSize: 11, fontWeight: 600 }}>
        {label}
      </span>
    </div>
  );
}

// ─── AchievementRow ───────────────────────────────────────────────────────────

function AchievementRow({ achievement }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px',
      background: achievement.unlocked ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
      borderRadius: 7,
      opacity: achievement.unlocked ? 1 : 0.5,
    }}>
      <span style={{ fontSize: 20 }}>{achievement.icon || '🏆'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{achievement.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>{achievement.description}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{achievement.points || 0} pts</div>
        {achievement.unlocked && (
          <div style={{ fontSize: 10, color: '#10b981' }}>✅ Unlocked</div>
        )}
      </div>
    </div>
  );
}

// ─── New Project Modal ────────────────────────────────────────────────────────

function NewProjectForm({ onSubmit, onCancel }) {
  const [name,      setName]      = useState('');
  const [type,      setType]      = useState('game');
  const [engine,    setEngine]    = useState('unreal5');
  const [platforms, setPlatforms] = useState([]);

  const togglePlatform = (id) => {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg, #1a1a2e)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 16, padding: 28, width: '100%', maxWidth: 460,
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>New Game Project</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            placeholder="Project name" value={name} onChange={e => setName(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'var(--text, #f9fafb)', fontSize: 14 }}
          />

          <select
            value={engine} onChange={e => setEngine(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'var(--text, #f9fafb)' }}
          >
            {ENGINES.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          <div>
            <label style={{ fontSize: 13, color: 'var(--text-muted, #9ca3af)', marginBottom: 8, display: 'block' }}>Target Platforms</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PLATFORMS_GAME.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlatform(p.id)}
                  style={{
                    padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: platforms.includes(p.id) ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)',
                    color: 'var(--text, #f9fafb)', fontSize: 12,
                  }}
                >
                  {p.icon} {p.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onCancel} style={{ padding: '9px 18px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.15)', background: 'none', color: 'var(--text, #f9fafb)', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={() => name && onSubmit({ name, type, engine, platforms })}
              disabled={!name}
              style={{ padding: '9px 18px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
            >
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GameDevTracker({ apiBase = '/api' }) {
  const [projects,    setProjects]    = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [builds,      setBuilds]      = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [showNew,     setShowNew]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('overview');

  const token = () => localStorage.getItem('nexus_token') || '';

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${apiBase}/projects?type=game`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = res.ok ? await res.json() : { projects: [] };
      setProjects(data.projects || []);
      if (data.projects?.[0]) setSelected(data.projects[0]);
    } catch {
      // Demo data
      const demo = [{
        id: 'demo-1', name: 'Quantum Rift',
        type: 'game', status: 'in_progress',
        engine: 'unreal5', platforms: ['pc', 'ps5', 'xbox'],
        stats: { commits: 234, openIssues: 12, closedIssues: 45, coverage: 78, buildStatus: 'success' },
        gameDetails: {
          genre: 'Action RPG',
          targetPlatforms: ['pc', 'ps5'],
          achievements: [
            { id: '1', name: 'First Steps',    description: 'Complete the tutorial',    icon: '🎯', points: 10, unlocked: true  },
            { id: '2', name: 'Explorer',        description: 'Discover 10 new areas',    icon: '🗺️', points: 25, unlocked: true  },
            { id: '3', name: 'Slayer',          description: 'Defeat 100 enemies',       icon: '⚔️', points: 50, unlocked: false },
            { id: '4', name: 'Completionist',   description: 'Find all hidden items',    icon: '🏆', points: 100, unlocked: false },
          ],
          builds: [
            { buildId: 'b1', version: '0.1.0', platform: 'pc',  status: 'success',  engine: 'unreal5', createdAt: new Date(Date.now() - 86400000).toISOString() },
            { buildId: 'b2', version: '0.1.1', platform: 'ps5', status: 'building', engine: 'unreal5', createdAt: new Date().toISOString() },
            { buildId: 'b3', version: '0.0.9', platform: 'pc',  status: 'failed',   engine: 'unreal5', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
          ],
        },
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }];
      setProjects(demo);
      setSelected(demo[0]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selected) {
      setBuilds(selected.gameDetails?.builds || []);
      setAchievements(selected.gameDetails?.achievements || []);
    }
  }, [selected]);

  const createProject = useCallback(async (data) => {
    try {
      const res = await fetch(`${apiBase}/projects`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body:   JSON.stringify({ ...data, gameDetails: { genre: '', targetPlatforms: data.platforms } }),
      });
      if (res.ok) {
        setShowNew(false);
        fetchProjects();
      }
    } catch {}
    setShowNew(false);
  }, [apiBase, fetchProjects]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const buildSuccessCount = builds.filter(b => b.status === 'success').length;

  const stat = selected?.stats || {};

  const tabs = ['overview', 'builds', 'achievements'];

  if (loading) {
    return (
      <div style={{ padding: 20, color: 'var(--text, #f9fafb)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <RefreshCw size={18} className="animate-spin" /> Loading projects...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, color: 'var(--text, #f9fafb)', fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 1000 }}>
      {showNew && <NewProjectForm onSubmit={createProject} onCancel={() => setShowNew(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Gamepad2 size={24} style={{ color: '#6366f1' }} />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Game Dev Tracker</h1>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          <Plus size={14} /> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted, #9ca3af)' }}>
          <Gamepad2 size={40} style={{ marginBottom: 14, opacity: 0.4 }} />
          <p>No game projects yet. Create your first!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
          {/* Project List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>Projects</h3>
            {projects.map(p => {
              const eng = ENGINES.find(e => e.id === p.engine);
              return (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  style={{
                    padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                    background:  selected?.id === p.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                    border:      `2px solid ${selected?.id === p.id ? '#6366f1' : 'transparent'}`,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)', marginTop: 2 }}>
                    {eng?.icon} {eng?.name || p.engine}
                  </div>
                  <span style={{
                    display: 'inline-block', marginTop: 4, padding: '2px 7px', borderRadius: 4,
                    background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 10, fontWeight: 600,
                  }}>
                    {p.status?.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Detail */}
          {selected && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selected.name}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted, #9ca3af)' }}>
                  {selected.platforms?.map(p => PLATFORMS_GAME.find(x => x.id === p)?.icon).join(' ')} · {selected.gameDetails?.genre || 'Unspecified genre'}
                </p>
              </div>

              {/* Stat tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
                {[
                  { label: 'Commits',          value: stat.commits       || 0, Icon: GitBranch   },
                  { label: 'Open Issues',      value: stat.openIssues    || 0, Icon: AlertCircle  },
                  { label: 'Closed Issues',    value: stat.closedIssues  || 0, Icon: CheckCircle  },
                  { label: 'Coverage',         value: `${stat.coverage   || 0}%`, Icon: BarChart3 },
                  { label: 'Achievements',     value: `${unlockedCount}/${achievements.length}`, Icon: Trophy },
                  { label: 'Successful Builds', value: buildSuccessCount, Icon: Package },
                ].map(({ label, value, Icon }) => (
                  <div key={label} style={{
                    padding: '12px 14px',
                    background: 'var(--card-bg, rgba(255,255,255,0.05))',
                    border:     '1px solid var(--border, rgba(255,255,255,0.1))',
                    borderRadius: 9,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Icon size={12} style={{ color: '#6366f1' }} />
                      <span style={{ fontSize: 10, color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase' }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {tabs.map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: '7px 12px', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer',
                    background: activeTab === tab ? 'rgba(99,102,241,0.2)' : 'transparent',
                    borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                    color: activeTab === tab ? '#818cf8' : 'var(--text-muted, #9ca3af)',
                    fontSize: 12, fontWeight: activeTab === tab ? 600 : 400, textTransform: 'capitalize',
                  }}>
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <div style={{ fontSize: 14, color: 'var(--text-muted, #9ca3af)', lineHeight: 1.8 }}>
                  <p><strong style={{ color: 'var(--text, #f9fafb)' }}>Engine:</strong> {ENGINES.find(e => e.id === selected.engine)?.name || selected.engine}</p>
                  <p><strong style={{ color: 'var(--text, #f9fafb)' }}>Platforms:</strong> {(selected.platforms || []).map(p => PLATFORMS_GAME.find(x => x.id === p)?.name).join(', ') || 'None'}</p>
                  <p><strong style={{ color: 'var(--text, #f9fafb)' }}>Status:</strong> {selected.status}</p>
                  <p><strong style={{ color: 'var(--text, #f9fafb)' }}>Last Updated:</strong> {new Date(selected.updatedAt).toLocaleString()}</p>
                  {selected.repoUrl && <p><strong style={{ color: 'var(--text, #f9fafb)' }}>Repository:</strong> <a href={selected.repoUrl} target="_blank" rel="noopener" style={{ color: '#818cf8' }}>{selected.repoUrl}</a></p>}
                </div>
              )}

              {activeTab === 'builds' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {builds.length === 0
                    ? <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: 13 }}>No builds yet</div>
                    : builds.map((b, i) => <BuildCard key={b.buildId || i} build={b} />)
                  }
                </div>
              )}

              {activeTab === 'achievements' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {achievements.length === 0
                    ? <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: 13 }}>No achievements defined</div>
                    : achievements.map(a => <AchievementRow key={a.id} achievement={a} />)
                  }
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
