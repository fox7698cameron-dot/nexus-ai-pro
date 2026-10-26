// src/components/ProjectTracker.jsx
// 2026-10-26 - Real-time project tracking: coding, game dev, AR/VR/3D
import React, { useState, useEffect, useCallback } from 'react';

const t = (key, fallback) =>
  (typeof window !== 'undefined' && window.i18n?.t?.(key)) || fallback || key;

const STATUS_COLORS = {
  active: '#10b981',
  in_progress: '#3b82f6',
  complete: '#8b5cf6',
  archived: '#6b7280'
};

const TYPE_ICONS = {
  coding: '💻',
  game: '🎮',
  ar_vr: '🥽',
  '3d': '🎲',
  mobile: '📱',
  desktop: '🖥️',
  web: '🌐'
};

const INTEGRATION_LIST = [
  { key: 'unreal', name: 'Unreal Engine', icon: '🔵', vendor: 'Epic Games' },
  { key: 'epicgames', name: 'Epic Games Store', icon: '⚡', vendor: 'Epic Games' },
  { key: 'playstation', name: 'PlayStation Network', icon: '🎮', vendor: 'Sony' },
  { key: 'xbox', name: 'Xbox / Microsoft', icon: '🟩', vendor: 'Microsoft' },
  { key: 'ubisoft', name: 'Ubisoft Connect', icon: '🦝', vendor: 'Ubisoft' },
  { key: 'steam', name: 'Steam', icon: '♨️', vendor: 'Valve' },
  { key: 'github', name: 'GitHub', icon: '🐙', vendor: 'GitHub' },
  { key: 'bitbucket', name: 'Bitbucket', icon: '🪣', vendor: 'Atlassian' }
];

const ACHIEVEMENT_ICONS = { unlocked: '🏆', locked: '🔒' };

function ProgressBar({ value, color = '#3b82f6', height = 8 }) {
  return (
    <div style={{ background: 'var(--bg-4, #1e293b)', borderRadius: height / 2, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function AchievementCard({ achievement }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: 'var(--bg-3, #1e2a3a)',
      borderRadius: 8,
      border: `1px solid ${achievement.unlocked ? '#8b5cf6' : 'var(--border, #334155)'}`,
      opacity: achievement.unlocked ? 1 : 0.55
    }}>
      <span style={{ fontSize: 24 }}>{achievement.unlocked ? ACHIEVEMENT_ICONS.unlocked : ACHIEVEMENT_ICONS.locked}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-1, #f1f5f9)', fontSize: '0.9rem' }}>{achievement.name}</div>
        <div style={{ color: 'var(--text-3, #64748b)', fontSize: '0.78rem', marginTop: 2 }}>{achievement.description}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem' }}>{achievement.xp} XP</div>
        {achievement.unlocked && achievement.unlockedAt && (
          <div style={{ color: '#10b981', fontSize: '0.7rem' }}>{t('unlocked', 'Unlocked')}</div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, onEdit, onDelete }) {
  const icon = TYPE_ICONS[project.type] || '📁';
  const color = STATUS_COLORS[project.status] || '#6b7280';
  return (
    <div style={{
      background: 'var(--bg-2, #111827)',
      borderRadius: 12,
      padding: 16,
      border: '1px solid var(--border, #1e293b)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-1, #f1f5f9)', fontSize: '1rem' }}>{project.name}</div>
          <div style={{ color: 'var(--text-3, #64748b)', fontSize: '0.78rem', marginTop: 2 }}>{project.description}</div>
        </div>
        <div style={{ padding: '3px 10px', borderRadius: 20, background: color + '22', color, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
          {project.status}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {project.language && (
          <span style={{ padding: '2px 8px', background: '#1e40af44', color: '#93c5fd', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600 }}>{project.language}</span>
        )}
        {project.engine && (
          <span style={{ padding: '2px 8px', background: '#7c3aed44', color: '#c4b5fd', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600 }}>{project.engine}</span>
        )}
        {(project.targetPlatforms || []).map(p => (
          <span key={p} style={{ padding: '2px 8px', background: '#0f766e44', color: '#5eead4', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600 }}>{p}</span>
        ))}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>{t('progress', 'Progress')}</span>
          <span style={{ color: 'var(--text-2)', fontSize: '0.78rem', fontWeight: 600 }}>{project.progress || 0}%</span>
        </div>
        <ProgressBar value={project.progress || 0} color={color} />
      </div>

      {project.metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <MetricMini label={t('coverage', 'Coverage')} value={`${project.metrics.testCoverage || 0}%`} />
          <MetricMini label={t('commits', 'Commits')} value={project.metrics.commits || 0} />
          <MetricMini label={t('build', 'Build')} value={project.metrics.buildStatus || 'N/A'} color={project.metrics.buildStatus === 'passing' ? '#10b981' : project.metrics.buildStatus === 'failing' ? '#ef4444' : '#f59e0b'} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button onClick={() => onEdit && onEdit(project)} style={{ flex: 1, padding: '7px 0', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-2)', fontSize: '0.82rem', cursor: 'pointer' }}>
          {t('edit', 'Edit')}
        </button>
        <button onClick={() => onDelete && onDelete(project.id)} style={{ padding: '7px 12px', background: '#ef444422', border: '1px solid #ef4444', borderRadius: 7, color: '#ef4444', fontSize: '0.82rem', cursor: 'pointer' }}>
          {t('delete', 'Delete')}
        </button>
      </div>
    </div>
  );
}

function MetricMini({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', background: 'var(--bg-3)', borderRadius: 6, padding: '6px 4px' }}>
      <div style={{ color: color || 'var(--text-1)', fontWeight: 700, fontSize: '0.85rem' }}>{value}</div>
      <div style={{ color: 'var(--text-3)', fontSize: '0.7rem', marginTop: 2 }}>{label}</div>
    </div>
  );
}

const NEW_PROJECT_DEFAULTS = { name: '', type: 'coding', description: '', language: '', engine: '', targetPlatforms: [], status: 'active', progress: 0 };

export default function ProjectTracker() {
  const [projects, setProjects] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState(NEW_PROJECT_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, achRes, intRes] = await Promise.all([
        fetch('/api/projects', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
        fetch(`/api/achievements/me`, { credentials: 'include' }).then(r => r.ok ? r.json() : MOCK_ACHIEVEMENTS),
        fetch('/api/integrations', { credentials: 'include' }).then(r => r.ok ? r.json() : INTEGRATION_LIST.map(i => ({ ...i, connected: false })))
      ]);
      setProjects(projRes);
      setAchievements(Array.isArray(achRes) ? achRes : achRes.achievements || MOCK_ACHIEVEMENTS);
      setIntegrations(intRes);
    } catch (e) {
      setError(e.message);
      setProjects(MOCK_PROJECTS);
      setAchievements(MOCK_ACHIEVEMENTS);
      setIntegrations(INTEGRATION_LIST.map(i => ({ ...i, connected: false })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newProject)
      });
      const created = await res.json();
      if (res.ok) {
        setProjects(prev => [...prev, created]);
        setShowCreateModal(false);
        setNewProject(NEW_PROJECT_DEFAULTS);
      }
    } catch {
      setProjects(prev => [...prev, { ...newProject, id: Date.now().toString(), createdAt: Date.now(), metrics: {} }]);
      setShowCreateModal(false);
      setNewProject(NEW_PROJECT_DEFAULTS);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE', credentials: 'include' });
    } catch { /* continue */ }
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleConnect = async (key) => {
    try {
      await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform: key })
      });
      setIntegrations(prev => prev.map(i => i.key === key ? { ...i, connected: true, connectedAt: Date.now() } : i));
    } catch {
      setIntegrations(prev => prev.map(i => i.key === key ? { ...i, connected: true } : i));
    }
  };

  const filteredProjects = projects.filter(p => activeTab === 'all' || p.type === activeTab || (activeTab === 'ar_vr' && (p.type === 'ar_vr' || p.type === '3d')));

  const tabs = [
    { key: 'all', label: `${t('all', 'All')} (${projects.length})` },
    { key: 'coding', label: '💻 Coding' },
    { key: 'game', label: '🎮 Game Dev' },
    { key: 'ar_vr', label: '🥽 AR/VR/3D' }
  ];

  const totalXP = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + (a.xp || 0), 0);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: 'var(--text-1, #f1f5f9)', padding: '20px 16px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        .pt-tabs { display: flex; gap: 4px; background: var(--bg-2, #111827); padding: 4px; border-radius: 10px; overflow-x: auto; }
        .pt-tab { padding: 8px 14px; border-radius: 7px; border: none; cursor: pointer; font-size: 0.85rem; font-weight: 500; white-space: nowrap; transition: all 0.2s; background: transparent; color: var(--text-3, #64748b); }
        .pt-tab.active { background: var(--accent, #3b82f6); color: #fff; }
        .pt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        .int-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
        .ach-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
        @media (max-width: 640px) { .pt-grid, .int-grid, .ach-grid { grid-template-columns: 1fr; } }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
        .modal { background: var(--bg-1, #0f172a); border: 1px solid var(--border, #1e293b); border-radius: 16px; padding: 24px; width: 100%; max-width: 480px; }
        .form-field { margin-bottom: 14px; }
        .form-label { display: block; color: var(--text-2, #94a3b8); font-size: 0.82rem; margin-bottom: 5px; }
        .form-input { width: 100%; padding: 9px 12px; background: var(--bg-3, #1e293b); border: 1px solid var(--border, #334155); border-radius: 7px; color: var(--text-1, #f1f5f9); font-size: 0.9rem; box-sizing: border-box; }
        .form-select { width: 100%; padding: 9px 12px; background: var(--bg-3, #1e293b); border: 1px solid var(--border, #334155); border-radius: 7px; color: var(--text-1, #f1f5f9); font-size: 0.9rem; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>🚀 {t('projectTracker', 'Project Tracker')}</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: '0.88rem' }}>{t('realtimeTracking', 'Real-time project tracking across all platforms')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ padding: '6px 14px', background: '#f59e0b22', color: '#f59e0b', borderRadius: 20, fontSize: '0.82rem', fontWeight: 700 }}>
            ⭐ {totalXP} XP
          </div>
          <button onClick={() => setShowCreateModal(true)} style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
            + {t('newProject', 'New Project')}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 12, background: '#ef444422', border: '1px solid #ef4444', borderRadius: 8, color: '#fca5a5', marginBottom: 16, fontSize: '0.85rem' }}>
          ⚠️ {t('apiUnavailable', 'Using demo data — API unavailable')}
        </div>
      )}

      {/* Tabs */}
      <div className="pt-tabs" style={{ marginBottom: 20 }}>
        {tabs.map(tab => (
          <button key={tab.key} className={`pt-tab${activeTab === tab.key ? ' active' : ''}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
        <button className={`pt-tab${activeTab === 'integrations' ? ' active' : ''}`} onClick={() => setActiveTab('integrations')}>
          🔌 {t('integrations', 'Integrations')} ({integrations.filter(i => i.connected).length}/{integrations.length})
        </button>
        <button className={`pt-tab${activeTab === 'achievements' ? ' active' : ''}`} onClick={() => setActiveTab('achievements')}>
          🏆 {t('achievements', 'Achievements')} ({achievements.filter(a => a.unlocked).length}/{achievements.length})
        </button>
      </div>

      {/* Projects */}
      {activeTab !== 'integrations' && activeTab !== 'achievements' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>⏳ {t('loading', 'Loading projects...')}</div>
          ) : filteredProjects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
              <div>{t('noProjects', 'No projects yet')}</div>
              <button onClick={() => setShowCreateModal(true)} style={{ marginTop: 16, padding: '9px 20px', background: 'var(--accent, #3b82f6)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>
                {t('createFirst', 'Create your first project')}
              </button>
            </div>
          ) : (
            <div className="pt-grid">
              {filteredProjects.map(p => (
                <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Integrations */}
      {activeTab === 'integrations' && (
        <div>
          <h2 style={{ marginTop: 0, fontSize: '1.1rem', color: 'var(--text-2)' }}>🔌 {t('gameDevConnectors', 'Game Dev & Platform Connectors')}</h2>
          <div className="int-grid">
            {integrations.map(integration => (
              <div key={integration.key} style={{
                background: 'var(--bg-2)', borderRadius: 12, padding: 16,
                border: `1px solid ${integration.connected ? '#10b98144' : 'var(--border)'}`,
                display: 'flex', flexDirection: 'column', gap: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{integration.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)' }}>{integration.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{integration.vendor}</div>
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: integration.connected ? '#10b981' : '#6b7280', flexShrink: 0 }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: integration.connected ? '#10b981' : 'var(--text-3)' }}>
                  {integration.connected ? `✅ ${t('connected', 'Connected')}` : `⚫ ${t('notConnected', 'Not connected')}`}
                </div>
                <button
                  onClick={() => integration.connected ? null : handleConnect(integration.key)}
                  style={{
                    padding: '7px 0', width: '100%',
                    background: integration.connected ? 'var(--bg-4, #1e293b)' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    border: integration.connected ? '1px solid var(--border)' : 'none',
                    borderRadius: 7, color: integration.connected ? 'var(--text-3)' : '#fff',
                    fontSize: '0.82rem', fontWeight: 600, cursor: integration.connected ? 'default' : 'pointer'
                  }}
                >
                  {integration.connected ? t('connected', 'Connected') : t('connect', 'Connect')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {activeTab === 'achievements' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-2)' }}>🏆 {t('achievements', 'Achievements')}</h2>
            <div style={{ padding: '6px 14px', background: '#f59e0b22', color: '#f59e0b', borderRadius: 20, fontSize: '0.88rem', fontWeight: 700 }}>
              Total XP: {totalXP}
            </div>
          </div>
          <ProgressBar value={(achievements.filter(a => a.unlocked).length / achievements.length) * 100} color="#f59e0b" height={12} />
          <div style={{ textAlign: 'right', color: 'var(--text-3)', fontSize: '0.78rem', marginTop: 4, marginBottom: 16 }}>
            {achievements.filter(a => a.unlocked).length}/{achievements.length} {t('unlocked', 'unlocked')}
          </div>
          <div className="ach-grid">
            {achievements.map(a => <AchievementCard key={a.id} achievement={a} />)}
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateModal(false)}>
          <div className="modal">
            <h2 style={{ margin: '0 0 20px', fontSize: '1.2rem' }}>+ {t('createProject', 'Create New Project')}</h2>
            <div className="form-field">
              <label className="form-label">{t('projectName', 'Project Name')} *</label>
              <input className="form-input" value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} placeholder="My Awesome Project" />
            </div>
            <div className="form-field">
              <label className="form-label">{t('type', 'Type')} *</label>
              <select className="form-select" value={newProject.type} onChange={e => setNewProject(p => ({ ...p, type: e.target.value }))}>
                <option value="coding">💻 Coding</option>
                <option value="game">🎮 Game Development</option>
                <option value="ar_vr">🥽 AR/VR</option>
                <option value="3d">🎲 3D Project</option>
                <option value="mobile">📱 Mobile App</option>
                <option value="desktop">🖥️ Desktop App</option>
                <option value="web">🌐 Web App</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">{t('description', 'Description')}</label>
              <input className="form-input" value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} placeholder="Short description..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-field">
                <label className="form-label">{t('language', 'Language/Stack')}</label>
                <input className="form-input" value={newProject.language} onChange={e => setNewProject(p => ({ ...p, language: e.target.value }))} placeholder="C++, Swift, JS..." />
              </div>
              <div className="form-field">
                <label className="form-label">{t('engine', 'Engine/Framework')}</label>
                <input className="form-input" value={newProject.engine} onChange={e => setNewProject(p => ({ ...p, engine: e.target.value }))} placeholder="Unreal, Unity, React..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: 10, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer' }}>
                {t('cancel', 'Cancel')}
              </button>
              <button onClick={handleCreate} disabled={!newProject.name} style={{ flex: 2, padding: 10, background: newProject.name ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#334155', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: newProject.name ? 'pointer' : 'not-allowed' }}>
                {t('create', 'Create Project')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MOCK_PROJECTS = [
  { id: '1', name: 'Nexus Game Engine', type: 'game', description: 'AAA-quality C++ game engine', language: 'C++', engine: 'Custom', targetPlatforms: ['Windows', 'PS5', 'Xbox'], status: 'active', progress: 45, metrics: { testCoverage: 72, commits: 234, buildStatus: 'passing' } },
  { id: '2', name: 'AR Commerce App', type: 'ar_vr', description: 'Augmented reality shopping experience', language: 'Swift', engine: 'ARKit', targetPlatforms: ['iOS', 'visionOS'], status: 'in_progress', progress: 68, metrics: { testCoverage: 55, commits: 87, buildStatus: 'passing' } },
  { id: '3', name: '3D Portfolio Site', type: '3d', description: 'WebGL 3D portfolio with Three.js', language: 'TypeScript', engine: 'Three.js', targetPlatforms: ['Web', 'Mobile'], status: 'in_progress', progress: 90, metrics: { testCoverage: 41, commits: 156, buildStatus: 'passing' } },
  { id: '4', name: 'Nexus AI Pro', type: 'coding', description: 'Multi-model AI platform', language: 'JavaScript', engine: 'React + Node', targetPlatforms: ['Web', 'Desktop', 'Mobile'], status: 'active', progress: 78, metrics: { testCoverage: 68, commits: 512, buildStatus: 'passing' } }
];

const MOCK_ACHIEVEMENTS = [
  { id: 'first_project', name: 'First Project', description: 'Create your first project', xp: 100, unlocked: true, unlockedAt: Date.now() - 86400000 * 30 },
  { id: 'code_warrior', name: 'Code Warrior', description: 'Write 10,000 lines of code', xp: 500, unlocked: true, unlockedAt: Date.now() - 86400000 * 15 },
  { id: 'game_dev', name: 'Game Developer', description: 'Complete a game project', xp: 1000, unlocked: false },
  { id: 'vr_pioneer', name: 'VR Pioneer', description: 'Ship an AR/VR experience', xp: 1500, unlocked: false },
  { id: 'speed_run', name: 'Speed Run', description: 'Complete a project in under 30 days', xp: 750, unlocked: false },
  { id: 'team_player', name: 'Team Player', description: 'Collaborate on 5 projects', xp: 600, unlocked: false }
];
