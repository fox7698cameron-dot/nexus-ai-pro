/**
 * GameTrackingDashboard.jsx
 * Real-time project tracking for game dev, coding, AR/VR/3D projects
 * Connectors: Unreal/Epic, Sony, Microsoft, Ubisoft
 * Updated: 2026-07-21
 */
import React, { useState, useEffect, useCallback } from 'react';

const PROJECT_TYPES = [
  { id: 'game', label: 'Game Dev', emoji: '🎮' },
  { id: 'arvr', label: 'AR/VR/3D', emoji: '🥽' },
  { id: 'app', label: 'App Dev', emoji: '📱' },
  { id: 'coding', label: 'Coding', emoji: '💻' },
];

const ENGINE_OPTIONS = [
  { id: 'unreal', name: 'Unreal Engine 5', connector: 'unreal', emoji: '⚡' },
  { id: 'unity', name: 'Unity 6', connector: null, emoji: '🎮' },
  { id: 'godot', name: 'Godot 4', connector: null, emoji: '🟢' },
  { id: 'custom', name: 'Custom / Other', connector: null, emoji: '🔧' },
];

const CONNECTORS = [
  { id: 'epic', name: 'Epic Games', emoji: '🟣', envKey: 'EPIC_CLIENT_ID' },
  { id: 'sony', name: 'PlayStation', emoji: '🔵', envKey: 'SONY_API_KEY' },
  { id: 'microsoft', name: 'Xbox / Microsoft', emoji: '🟢', envKey: 'MS_XBOX_CLIENT_ID' },
  { id: 'ubisoft', name: 'Ubisoft Connect', emoji: '🔷', envKey: 'UBISOFT_API_KEY' },
  { id: 'steam', name: 'Steam', emoji: '🖤', envKey: 'STEAM_API_KEY' },
  { id: 'gog', name: 'GOG Galaxy', emoji: '⚫', envKey: 'GOG_API_KEY' },
];

function ProgressBar({ value = 0, color = '#3b82f6' }) {
  return (
    <div style={{ background: 'var(--border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, value)}%`, background: color, height: '100%', transition: 'width 0.4s' }} />
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    active: { bg: '#dcfce7', color: '#16a34a', label: 'Active' },
    paused: { bg: '#fef9c3', color: '#a16207', label: 'Paused' },
    completed: { bg: '#dbeafe', color: '#1d4ed8', label: 'Completed' },
    planning: { bg: '#f3e8ff', color: '#7e22ce', label: 'Planning' },
  };
  const s = map[status] || map.active;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function ProjectCard({ project, onSelect, selected }) {
  return (
    <div
      onClick={() => onSelect(project)}
      style={{
        background: 'var(--card-bg)', border: `2px solid ${selected ? '#3b82f6' : 'var(--border)'}`,
        borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'all 0.2s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{project.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {PROJECT_TYPES.find(t => t.id === project.type)?.emoji} {project.engine || project.type}
          </div>
        </div>
        <StatusPill status={project.status} />
      </div>
      <ProgressBar value={project.progress} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
        <span>{project.progress}% complete</span>
        <span>{project.tasks?.filter(t => t.done).length || 0}/{project.tasks?.length || 0} tasks</span>
      </div>
      {project.connectors?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          {project.connectors.map(c => {
            const conn = CONNECTORS.find(x => x.id === c);
            return conn ? (
              <span key={c} style={{ fontSize: 16 }} title={conn.name}>{conn.emoji}</span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function CreateProjectModal({ onClose, onCreated, token }) {
  const [form, setForm] = useState({ name: '', type: 'game', engine: '', connectors: [], platform: [] });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const toggleConnector = (id) => {
    setForm(f => ({
      ...f,
      connectors: f.connectors.includes(id) ? f.connectors.filter(c => c !== id) : [...f.connectors, id]
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setErr('Project name is required');
    setSaving(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed to create project');
      const project = await res.json();
      onCreated(project);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000066', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: 28, width: 480, maxWidth: '95vw',
        maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>New Project</h3>

        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Project Name</label>
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="My Awesome Game"
          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--card-bg)', color: 'var(--text)', fontSize: 14, boxSizing: 'border-box', marginBottom: 14 }}
        />

        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Type</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {PROJECT_TYPES.map(t => (
            <button key={t.id} onClick={() => setForm(f => ({ ...f, type: t.id }))}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer',
                background: form.type === t.id ? '#3b82f6' : 'var(--card-bg)',
                color: form.type === t.id ? '#fff' : 'var(--text)', fontSize: 13
              }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Engine</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {ENGINE_OPTIONS.map(e => (
            <button key={e.id} onClick={() => setForm(f => ({ ...f, engine: e.name }))}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer',
                background: form.engine === e.name ? '#7c3aed' : 'var(--card-bg)',
                color: form.engine === e.name ? '#fff' : 'var(--text)', fontSize: 13
              }}>
              {e.emoji} {e.name}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Platform Connectors</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {CONNECTORS.map(c => (
            <button key={c.id} onClick={() => toggleConnector(c.id)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer',
                background: form.connectors.includes(c.id) ? '#0f172a' : 'var(--card-bg)',
                color: form.connectors.includes(c.id) ? '#fff' : 'var(--text)', fontSize: 13
              }}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>

        {err && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer',
              background: 'var(--card-bg)', color: 'var(--text)', fontSize: 14 }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AchievementToast({ achievement }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, background: '#fef9c3', border: '1px solid #fde047',
      borderRadius: 12, padding: '14px 20px', zIndex: 1000, boxShadow: '0 4px 24px #0002',
      display: 'flex', alignItems: 'center', gap: 12, maxWidth: 320
    }}>
      <span style={{ fontSize: 28 }}>{achievement.icon || '🏆'}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#92400e' }}>Achievement Unlocked!</div>
        <div style={{ fontSize: 13, color: '#78350f', marginTop: 2 }}>{achievement.name}</div>
      </div>
    </div>
  );
}

export default function GameTrackingDashboard({ authToken }) {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newAchievement, setNewAchievement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  }), [authToken]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      setProjects(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const fetchAchievements = useCallback(async () => {
    try {
      const res = await fetch('/api/achievements', { headers: authHeaders() });
      if (!res.ok) return;
      setAchievements(await res.json());
    } catch (_e) { /* silently ignore achievement fetch errors */ }
  }, [authHeaders]);

  useEffect(() => {
    fetchProjects();
    fetchAchievements();
  }, [fetchProjects, fetchAchievements]);

  const handleProjectCreated = (project) => {
    setProjects(p => [project, ...p]);
    if (projects.length === 0) {
      const achievement = { name: 'First Project Created', icon: '🚀' };
      setNewAchievement(achievement);
      setTimeout(() => setNewAchievement(null), 4000);
    }
  };

  const updateProgress = async (projectId, progress) => {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ progress })
    });
    if (!res.ok) return;
    const updated = await res.json();
    setProjects(p => p.map(proj => proj.id === projectId ? updated : proj));
    if (selected?.id === projectId) setSelected(updated);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif', color: 'var(--text, #111)' }}>
      <style>{`
        :root { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
        @media (prefers-color-scheme: dark) {
          :root { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; }
        }
        :root[data-theme="dark"] { --card-bg: #1e1e2e; --border: #374151; --text: #f3f4f6; --text-muted: #9ca3af; }
        :root[data-theme="light"] { --card-bg: #fff; --border: #e5e7eb; --text: #111; --text-muted: #6b7280; }
      `}</style>

      {newAchievement && <AchievementToast achievement={newAchievement} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>🎮 Project Tracker</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Game dev · AR/VR/3D · Coding projects — real-time tracking
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 14 }}>
          + New Project
        </button>
      </div>

      {/* Connectors Info */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 14,
        marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 4 }}>Platform connectors:</span>
        {CONNECTORS.map(c => (
          <span key={c.id} title={`${c.name} — configure ${c.envKey}`}
            style={{ fontSize: 22, cursor: 'help' }}>{c.emoji}</span>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
          Configure via environment variables — no hardcoded keys
        </span>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', borderRadius: 8, padding: '10px 14px', color: '#dc2626',
          marginBottom: 16, fontSize: 13, border: '1px solid #fca5a5' }}>
          {error} — {authToken ? 'API error' : 'Sign in to view your projects'}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading projects...</div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No projects yet</div>
          <div style={{ fontSize: 14, marginBottom: 20 }}>Create your first project to start tracking</div>
          <button onClick={() => setShowCreate(true)}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 14 }}>
            Create First Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} selected={selected?.id === p.id} onSelect={setSelected} />
          ))}
        </div>
      )}

      {/* Selected Project Detail */}
      {selected && (
        <div style={{ marginTop: 24, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>{selected.name}</h3>
            <button onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)' }}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, fontSize: 13 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> {selected.type}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Engine:</span> {selected.engine || '—'}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <StatusPill status={selected.status} /></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Created:</span> {new Date(selected.createdAt).toLocaleDateString()}</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Progress</span>
              <span style={{ fontWeight: 700 }}>{selected.progress}%</span>
            </div>
            <ProgressBar value={selected.progress} color="#3b82f6" />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[0, 25, 50, 75, 100].map(v => (
              <button key={v}
                onClick={() => updateProgress(selected.id, v)}
                style={{
                  padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer',
                  background: selected.progress === v ? '#3b82f6' : 'var(--card-bg)',
                  color: selected.progress === v ? '#fff' : 'var(--text)', fontSize: 13
                }}>
                {v}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div style={{ marginTop: 24, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 16 }}>🏆 Achievements ({achievements.length})</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {achievements.map(a => (
              <div key={a.id} title={a.name}
                style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, padding: '8px 14px',
                  fontSize: 13, fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>{a.icon || '🏆'}</span>
                {a.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={handleProjectCreated}
          token={authToken}
        />
      )}
    </div>
  );
}
