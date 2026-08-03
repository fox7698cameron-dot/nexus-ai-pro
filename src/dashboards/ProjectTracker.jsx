/**
 * ProjectTracker — Real-time project management for coding, game dev, AR/VR/3D
 * Includes connectors for Unreal, Epic, Sony, Microsoft, Ubisoft
 * Achievement & game progress tracking
 * @date 2026-08-03
 */
import { useState, useEffect, useCallback } from 'react';

const PROJECT_TYPES = {
  coding:     { label: 'Software Dev',  icon: '💻', color: '#3b82f6' },
  game:       { label: 'Game Dev',      icon: '🎮', color: '#6366f1' },
  ar:         { label: 'Augmented Reality', icon: '🥽', color: '#10b981' },
  vr:         { label: 'Virtual Reality',   icon: '🌐', color: '#8b5cf6' },
  '3d':       { label: '3D / Animation',    icon: '🎨', color: '#f59e0b' },
  mobile:     { label: 'Mobile App',        icon: '📱', color: '#ec4899' }
};

const GAME_CONNECTORS = [
  { id: 'unreal',    name: 'Unreal Engine',        icon: '🔵', vendor: 'Epic Games' },
  { id: 'epic',      name: 'Epic Games Store',      icon: '🛒', vendor: 'Epic Games' },
  { id: 'sony',      name: 'PlayStation Network',   icon: '🎮', vendor: 'Sony' },
  { id: 'microsoft', name: 'Xbox Live / PlayFab',   icon: '🟩', vendor: 'Microsoft' },
  { id: 'ubisoft',   name: 'Ubisoft Connect',       icon: '🔶', vendor: 'Ubisoft' }
];

const CLOUD_CONNECTORS = [
  { id: 'github',     name: 'GitHub',        icon: '🐙' },
  { id: 'bitbucket',  name: 'Bitbucket',     icon: '🪣' },
  { id: 'azure',      name: 'Azure DevOps',  icon: '🔷' },
  { id: 'aws',        name: 'AWS',           icon: '☁️' },
  { id: 'gcp',        name: 'Google Cloud',  icon: '🌤️' },
  { id: 'slack',      name: 'Slack',         icon: '💬' },
  { id: 'zoom',       name: 'Zoom',          icon: '📹' }
];

const STATUS_COLOR = { active: '#10b981', paused: '#f59e0b', completed: '#3b82f6', cancelled: '#ef4444' };

function ProgressBar({ value, color = '#6366f1', label }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 3 }}>
          <span>{label}</span><span style={{ color }}>{value}%</span>
        </div>
      )}
      <div style={{ height: 6, background: '#0f172a', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

function ProjectCard({ project, onSelect, onDelete, selected }) {
  const cfg = PROJECT_TYPES[project.type] || PROJECT_TYPES.coding;
  return (
    <div
      onClick={() => onSelect(project)}
      style={{
        background: selected ? `${cfg.color}18` : '#1e293b',
        border: `1.5px solid ${selected ? cfg.color : '#334155'}`,
        borderRadius: 12, padding: 18, cursor: 'pointer',
        transition: 'all 0.15s', position: 'relative'
      }}
    >
      <button
        onClick={e => { e.stopPropagation(); onDelete(project.id); }}
        style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none',
          color: '#475569', cursor: 'pointer', fontSize: 16 }}
      >×</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{cfg.icon}</span>
        <div>
          <div style={{ color: '#f1f5f9', fontWeight: 700 }}>{project.name}</div>
          <div style={{ color: '#64748b', fontSize: 12 }}>{cfg.label}</div>
        </div>
        <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
          background: `${STATUS_COLOR[project.status]}22`, color: STATUS_COLOR[project.status] }}>
          {project.status}
        </span>
      </div>
      <ProgressBar value={project.progress} color={cfg.color} label="Progress" />
      {project.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
          {project.tags.map(tag => (
            <span key={tag} style={{ padding: '2px 8px', background: '#0f172a', borderRadius: 12, fontSize: 10, color: '#64748b' }}>{tag}</span>
          ))}
        </div>
      )}
      {project.engine && (
        <div style={{ color: '#64748b', fontSize: 11, marginTop: 8 }}>Engine: <span style={{ color: '#94a3b8' }}>{project.engine}</span></div>
      )}
    </div>
  );
}

function AchievementPanel({ projectId }) {
  const [platform, setPlatform] = useState('playstation');
  const [achievements, setAchievements] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAchievements = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const token = sessionStorage.getItem('nexus_access_token');
      const res = await fetch(`/api/achievements/${platform}/${projectId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) setAchievements(await res.json());
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [projectId, platform]);

  useEffect(() => { fetchAchievements(); }, [fetchAchievements]);

  return (
    <div style={{ background: '#0f172a', borderRadius: 10, padding: 16, marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>🏆 Game Progress & Achievements</span>
        <select value={platform} onChange={e => setPlatform(e.target.value)}
          style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
          <option value="playstation">PlayStation</option>
          <option value="xbox">Xbox</option>
          <option value="epic">Epic Games</option>
          <option value="ubisoft">Ubisoft</option>
        </select>
      </div>
      {loading && <div style={{ color: '#64748b', fontSize: 13 }}>Loading achievements...</div>}
      {achievements && !loading && (
        <>
          <ProgressBar value={Math.round((achievements.unlocked / achievements.total) * 100)} color="#f59e0b" label={`${achievements.unlocked}/${achievements.total} Unlocked`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
            {achievements.achievements.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: a.unlockedAt ? 1 : 0.45 }}>
                <span>{a.unlockedAt ? '🏅' : '🔒'}</span>
                <span style={{ color: a.unlockedAt ? '#f1f5f9' : '#64748b', fontSize: 13 }}>{a.name}</span>
                {a.unlockedAt && <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: 11 }}>{new Date(a.unlockedAt).toLocaleDateString()}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ConnectorGrid({ connectors, onConnect }) {
  const [cloudStatus, setCloudStatus] = useState({});

  useEffect(() => {
    async function fetchStatus() {
      try {
        const token = sessionStorage.getItem('nexus_access_token');
        const res = await fetch('/api/connectors/cloud', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (res.ok) {
          const data = await res.json();
          const status = {};
          (data.connectors || []).forEach(c => { status[c.id] = c.status; });
          setCloudStatus(status);
        }
      } catch { /* ignore */ }
    }
    fetchStatus();
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
      {connectors.map(c => (
        <div key={c.id} style={{ background: '#0f172a', borderRadius: 8, padding: 12, textAlign: 'center', border: '1px solid #334155' }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
          <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{c.name}</div>
          {c.vendor && <div style={{ color: '#475569', fontSize: 10, marginBottom: 8 }}>{c.vendor}</div>}
          <div style={{ marginBottom: 8 }}>
            <span style={{
              fontSize: 10, padding: '2px 6px', borderRadius: 10,
              background: cloudStatus[c.id] === 'configured' ? '#10b98122' : '#334155',
              color: cloudStatus[c.id] === 'configured' ? '#10b981' : '#64748b'
            }}>
              {cloudStatus[c.id] || 'not configured'}
            </span>
          </div>
          <button
            onClick={() => onConnect(c.id)}
            style={{ padding: '4px 10px', borderRadius: 6, background: '#6366f1', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}
          >Connect</button>
        </div>
      ))}
    </div>
  );
}

function NewProjectModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', type: 'coding', description: '', engine: '', tags: '', status: 'active', progress: 0 });
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  function handleSave() {
    if (!form.name) return;
    onSave({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean), progress: Number(form.progress) });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000a', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: 28, width: 420, border: '1px solid #334155', maxHeight: '80vh', overflowY: 'auto' }}>
        <h3 style={{ color: '#f1f5f9', margin: '0 0 20px' }}>New Project</h3>
        {[
          { key: 'name', label: 'Project Name', placeholder: 'My Game / App / Experience' },
          { key: 'engine', label: 'Engine / Framework', placeholder: 'Unreal 5, Unity, React, etc.' },
          { key: 'description', label: 'Description', placeholder: 'Brief overview...' },
          { key: 'tags', label: 'Tags (comma separated)', placeholder: 'fps, multiplayer, mobile' }
        ].map(({ key, label, placeholder }) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</label>
            <input value={form[key]} onChange={set(key)} placeholder={placeholder}
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
        ))}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Project Type</label>
          <select value={form.type} onChange={set('type')} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13 }}>
            {Object.entries(PROJECT_TYPES).map(([key, { label, icon }]) => (
              <option key={key} value={key}>{icon} {label}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Progress ({form.progress}%)</label>
          <input type="range" min={0} max={100} value={form.progress} onChange={set('progress')} style={{ width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleSave} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: '#6366f1', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Create</button>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: '#334155', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectTracker() {
  const [projects, setProjects] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [error, setError] = useState('');

  const headers = useCallback(() => {
    const token = sessionStorage.getItem('nexus_access_token');
    return { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' };
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  async function createProject(form) {
    try {
      const res = await fetch('/api/projects', { method: 'POST', headers: headers(), body: JSON.stringify(form) });
      if (res.ok) { await fetchProjects(); setShowNew(false); }
    } catch (e) { setError(e.message); }
  }

  async function deleteProject(id) {
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: headers() });
      if (selected?.id === id) setSelected(null);
      await fetchProjects();
    } catch (e) { setError(e.message); }
  }

  async function updateProgress(id, progress) {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ progress: Number(progress) })
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects(ps => ps.map(p => p.id === id ? updated : p));
        if (selected?.id === id) setSelected(updated);
      }
    } catch { /* ignore */ }
  }

  async function connectPlatform(platform, type) {
    try {
      const endpoint = type === 'game' ? '/api/connectors/game/connect' : '/api/analytics/social/connect';
      await fetch(endpoint, { method: 'POST', headers: headers(), body: JSON.stringify({ connector: platform, platform }) });
    } catch { /* ignore */ }
  }

  const tabs = [
    { id: 'projects',   label: '📁 Projects' },
    { id: 'connectors', label: '🔌 Connectors' },
    { id: 'achievements', label: '🏆 Achievements' }
  ];

  return (
    <div style={{ color: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      {showNew && <NewProjectModal onSave={createProject} onClose={() => setShowNew(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>🚀 Project Tracker</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>Coding · Game Dev · AR/VR · 3D</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ padding: '8px 18px', borderRadius: 8, background: '#6366f1', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          + New Project
        </button>
      </div>

      {error && (
        <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${activeTab === tab.id ? '#6366f1' : '#334155'}`,
            background: activeTab === tab.id ? '#6366f133' : 'transparent',
            color: activeTab === tab.id ? '#818cf8' : '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600
          }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === 'projects' && (
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
          <div>
            {loading && <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Loading projects...</div>}
            {!loading && projects.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                No projects yet — create one to get started
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {projects.map(p => (
                <ProjectCard key={p.id} project={p} selected={selected?.id === p.id} onSelect={setSelected} onDelete={deleteProject} />
              ))}
            </div>
          </div>

          {selected && (
            <div style={{ background: '#1e293b', borderRadius: 14, padding: 24, border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, color: '#f1f5f9' }}>{selected.name}</h3>
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{PROJECT_TYPES[selected.type]?.label}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 20 }}>×</button>
              </div>

              {selected.description && (
                <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>{selected.description}</p>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 6 }}>Progress ({selected.progress}%)</div>
                <input type="range" min={0} max={100} value={selected.progress}
                  onChange={e => updateProgress(selected.id, e.target.value)}
                  style={{ width: '100%' }} />
                <ProgressBar value={selected.progress} color={PROJECT_TYPES[selected.type]?.color} />
              </div>

              {selected.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {selected.tags.map(t => (
                    <span key={t} style={{ padding: '2px 10px', background: '#0f172a', borderRadius: 12, fontSize: 11, color: '#64748b' }}>{t}</span>
                  ))}
                </div>
              )}

              {(selected.type === 'game' || selected.type === 'vr' || selected.type === 'ar') && (
                <AchievementPanel projectId={selected.id} />
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'connectors' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: '#1e293b', borderRadius: 14, padding: 20, border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>🎮 Game Engine Connectors</h3>
            <ConnectorGrid connectors={GAME_CONNECTORS} onConnect={id => connectPlatform(id, 'game')} />
          </div>
          <div style={{ background: '#1e293b', borderRadius: 14, padding: 20, border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>☁️ Cloud & Dev Tool Connectors</h3>
            <ConnectorGrid connectors={CLOUD_CONNECTORS} onConnect={id => connectPlatform(id, 'cloud')} />
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div style={{ background: '#1e293b', borderRadius: 14, padding: 20, border: '1px solid #334155' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>🏆 Cross-Platform Achievement Tracking</h3>
          {projects.filter(p => ['game', 'vr', 'ar'].includes(p.type)).map(p => (
            <div key={p.id} style={{ marginBottom: 24 }}>
              <div style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: 8 }}>
                {PROJECT_TYPES[p.type]?.icon} {p.name}
              </div>
              <AchievementPanel projectId={p.id} />
            </div>
          ))}
          {projects.filter(p => ['game', 'vr', 'ar'].includes(p.type)).length === 0 && (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>
              Create a Game, VR, or AR project to track achievements
            </div>
          )}
        </div>
      )}
    </div>
  );
}
