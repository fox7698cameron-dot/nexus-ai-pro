/* src/components/GameDevDashboard.jsx
   Game Development & Project Tracking Dashboard
   Connectors: Unreal/Epic, Sony, Microsoft, Ubisoft Connect
   AR/VR/3D project tracking
   Created: 2026-10-29
*/
import React, { useState, useEffect, useCallback } from 'react';

const ENGINE_CONNECTORS = {
  unreal: { name: 'Unreal Engine', icon: '🎮', color: '#0f0f0f', accent: '#0070cc', company: 'Epic Games', connected: false },
  unity: { name: 'Unity', icon: '⚙️', color: '#222c37', accent: '#00b4d8', company: 'Unity Technologies', connected: false },
  godot: { name: 'Godot', icon: '🤖', color: '#478cbf', accent: '#ffffff', company: 'Open Source', connected: false },
  cry: { name: 'CryEngine', icon: '🧊', color: '#1a1a2e', accent: '#00cfff', company: 'Crytek', connected: false }
};

const PLATFORM_CONNECTORS = {
  epic: { name: 'Epic Games Store', icon: '🏆', color: '#2d2d2d', accent: '#0078f2', connected: false },
  sony: { name: 'PlayStation Network', icon: '🎯', color: '#003791', accent: '#00a3e0', connected: false },
  microsoft: { name: 'Xbox / Game Pass', icon: '🟩', color: '#107c10', accent: '#52b043', connected: false },
  ubisoft: { name: 'Ubisoft Connect', icon: '🔷', color: '#0d6efd', accent: '#4dabf7', connected: false },
  steam: { name: 'Steam', icon: '💨', color: '#1b2838', accent: '#66c0f4', connected: false },
  nintendo: { name: 'Nintendo eShop', icon: '🔴', color: '#e4000f', accent: '#ff6b6b', connected: false }
};

const PROJECT_TYPES = ['Game Development', 'AR/VR Experience', '3D Animation', 'Mixed Reality', 'Metaverse', 'Simulation'];

const MILESTONE_STATUS = {
  completed: { color: '#22c55e', icon: '✓' },
  inprogress: { color: '#3b82f6', icon: '◉' },
  pending: { color: 'rgba(255,255,255,0.3)', icon: '○' },
  blocked: { color: '#ef4444', icon: '✗' }
};

function generateProject(id) {
  const types = PROJECT_TYPES;
  const names = ['Nexus Realms', 'Shadow Protocol', 'Quantum Arena', 'Neon Frontier', 'Crystal Depths', 'Void Runner'];
  const engines = Object.keys(ENGINE_CONNECTORS);
  return {
    id,
    name: names[id % names.length],
    type: types[Math.floor(Math.random() * types.length)],
    engine: engines[Math.floor(Math.random() * engines.length)],
    progress: Math.floor(Math.random() * 80 + 10),
    team: Math.floor(Math.random() * 12 + 2),
    builds: Math.floor(Math.random() * 200 + 10),
    bugs: Math.floor(Math.random() * 50),
    lastBuild: new Date(Date.now() - Math.random() * 86400000 * 3).toLocaleDateString(),
    platforms: ['PC', 'PS5', 'Xbox', 'Switch'].filter(() => Math.random() > 0.4),
    milestones: [
      { name: 'Pre-production', status: 'completed' },
      { name: 'Alpha Build', status: Math.random() > 0.3 ? 'completed' : 'inprogress' },
      { name: 'Beta Testing', status: Math.random() > 0.5 ? 'inprogress' : 'pending' },
      { name: 'Gold Master', status: 'pending' },
      { name: 'Launch', status: 'pending' }
    ],
    achievements: Math.floor(Math.random() * 50 + 5),
    codeLines: Math.floor(Math.random() * 500000 + 50000),
    assets: Math.floor(Math.random() * 5000 + 200)
  };
}

const ProgressBar = ({ value, color = '#3b82f6', height = 6 }) => (
  <div style={{ height, background: 'rgba(255,255,255,0.08)', borderRadius: height, overflow: 'hidden' }}>
    <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: height, transition: 'width 0.5s ease' }} />
  </div>
);

const MilestoneTimeline = ({ milestones }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
    {milestones.map((m, i) => {
      const s = MILESTONE_STATUS[m.status];
      return (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: `${s.color}22`,
              border: `2px solid ${s.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: s.color, fontWeight: 700
            }}>{s.icon}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: 60 }}>{m.name}</div>
          </div>
          {i < milestones.length - 1 && (
            <div style={{ height: 2, flex: 1, background: milestones[i + 1].status === 'pending' ? 'rgba(255,255,255,0.1)' : s.color, minWidth: 16 }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

const ConnectorCard = ({ id, connector, onToggle }) => (
  <div style={{
    background: connector.connected ? `${connector.accent}15` : 'rgba(255,255,255,0.03)',
    border: `1px solid ${connector.connected ? connector.accent + '44' : 'rgba(255,255,255,0.08)'}`,
    borderRadius: 12,
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 20 }}>{connector.icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{connector.name}</div>
        {connector.company && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{connector.company}</div>}
      </div>
    </div>
    <button
      onClick={() => onToggle(id)}
      style={{
        background: connector.connected ? connector.accent : 'rgba(255,255,255,0.08)',
        border: 'none',
        borderRadius: 20,
        padding: '4px 14px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0
      }}
    >
      {connector.connected ? '● Connected' : 'Connect'}
    </button>
  </div>
);

const ProjectCard = ({ project, isSelected, onSelect }) => {
  const engine = ENGINE_CONNECTORS[project.engine];
  const progressColor = project.progress >= 75 ? '#22c55e' : project.progress >= 40 ? '#3b82f6' : '#eab308';
  return (
    <div
      onClick={() => onSelect(project.id)}
      style={{
        background: isSelected ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isSelected ? '#a78bfa' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 14,
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{project.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{project.type} · {engine?.name || project.engine}</div>
        </div>
        <span style={{
          fontSize: 10,
          padding: '3px 8px',
          borderRadius: 20,
          background: `${progressColor}22`,
          color: progressColor,
          fontWeight: 700
        }}>{project.progress}%</span>
      </div>
      <ProgressBar value={project.progress} color={progressColor} />
      <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
        <span>👥 {project.team}</span>
        <span>🐛 {project.bugs} bugs</span>
        <span>🏗️ {project.builds} builds</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
        {project.platforms.map(p => (
          <span key={p} style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)'
          }}>{p}</span>
        ))}
      </div>
    </div>
  );
};

const AchievementTracker = ({ project }) => {
  const [achievements] = useState(() => Array.from({ length: Math.min(project.achievements, 8) }, (_, i) => ({
    id: i,
    name: ['First Blood', 'Speed Demon', 'Completionist', 'Social Butterfly', 'Explorer', 'Warrior', 'Builder', 'Legend'][i],
    icon: ['⚔️', '⚡', '🏆', '💬', '🗺️', '🛡️', '🔨', '👑'][i],
    unlocked: Math.random() > 0.4,
    progress: Math.floor(Math.random() * 100)
  })));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {achievements.map(a => (
        <div key={a.id} style={{
          background: a.unlocked ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${a.unlocked ? '#eab30844' : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 10,
          padding: '8px 12px',
          textAlign: 'center',
          opacity: a.unlocked ? 1 : 0.5,
          minWidth: 80
        }}>
          <div style={{ fontSize: 20 }}>{a.icon}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{a.name}</div>
          {!a.unlocked && <ProgressBar value={a.progress} color="#eab308" height={3} />}
        </div>
      ))}
    </div>
  );
};

const GameDevDashboard = () => {
  const [projects, setProjects] = useState(() => Array.from({ length: 4 }, (_, i) => generateProject(i)));
  const [selectedProject, setSelectedProject] = useState(0);
  const [engineConnectors, setEngineConnectors] = useState(ENGINE_CONNECTORS);
  const [platformConnectors, setPlatformConnectors] = useState(PLATFORM_CONNECTORS);
  const [activeTab, setActiveTab] = useState('projects');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectType, setNewProjectType] = useState(PROJECT_TYPES[0]);

  const toggleEngineConnector = useCallback((id) => {
    setEngineConnectors(prev => ({ ...prev, [id]: { ...prev[id], connected: !prev[id].connected } }));
  }, []);

  const togglePlatformConnector = useCallback((id) => {
    setPlatformConnectors(prev => ({ ...prev, [id]: { ...prev[id], connected: !prev[id].connected } }));
  }, []);

  const createProject = useCallback(() => {
    if (!newProjectName.trim()) return;
    const newProj = { ...generateProject(projects.length), name: newProjectName, type: newProjectType };
    setProjects(prev => [...prev, newProj]);
    setSelectedProject(projects.length);
    setShowNewProject(false);
    setNewProjectName('');
  }, [newProjectName, newProjectType, projects.length]);

  const project = projects[selectedProject];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0d0d1a 0%, #1a0d2e 50%, #0d1a0d 100%)',
      padding: 24,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#fff'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>🎮 Game Dev Tracker</h1>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              Multi-platform project tracking · AR/VR/3D · Achievement systems
            </p>
          </div>
          <button onClick={() => setShowNewProject(true)} style={{
            background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
            border: 'none', borderRadius: 10, padding: '10px 20px',
            color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13
          }}>+ New Project</button>
        </div>

        {/* New project modal */}
        {showNewProject && (
          <div style={{
            background: 'rgba(0,0,0,0.8)', position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div style={{
              background: '#1a1a2e', border: '1px solid rgba(167,139,250,0.3)',
              borderRadius: 16, padding: 24, width: 400, display: 'flex', flexDirection: 'column', gap: 16
            }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>New Project</h3>
              <input
                placeholder="Project name"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14 }}
              />
              <select
                value={newProjectType}
                onChange={e => setNewProjectType(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14 }}
              >
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowNewProject(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, color: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button onClick={createProject} style={{ flex: 1, background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', border: 'none', borderRadius: 8, padding: 10, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Create</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
          {['projects', 'connectors', 'achievements', 'analytics'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: 'none', border: 'none',
              borderBottom: activeTab === t ? '2px solid #a78bfa' : '2px solid transparent',
              padding: '8px 16px',
              color: activeTab === t ? '#a78bfa' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', fontSize: 13, fontWeight: activeTab === t ? 700 : 400,
              textTransform: 'capitalize', marginBottom: -1
            }}>{t}</button>
          ))}
        </div>

        {activeTab === 'projects' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {projects.map((p, i) => (
                <ProjectCard key={p.id} project={p} isSelected={selectedProject === i} onSelect={() => setSelectedProject(i)} />
              ))}
            </div>
            {project && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{project.name}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>{project.type}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                    {[
                      { label: 'Code Lines', value: (project.codeLines / 1000).toFixed(0) + 'K', icon: '📝' },
                      { label: 'Assets', value: project.assets, icon: '🎨' },
                      { label: 'Builds', value: project.builds, icon: '🏗️' },
                      { label: 'Achievements', value: project.achievements, icon: '🏆' }
                    ].map(s => (
                      <div key={s.label} style={{
                        background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px', textAlign: 'center'
                      }}>
                        <div style={{ fontSize: 20 }}>{s.icon}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
                    Development Milestones
                  </div>
                  <MilestoneTimeline milestones={project.milestones} />
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
                    Achievement Tracker
                  </div>
                  <AchievementTracker project={project} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'connectors' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
                Game Engines
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(engineConnectors).map(([id, c]) => (
                  <ConnectorCard key={id} id={id} connector={c} onToggle={toggleEngineConnector} />
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
                Platform Stores & Services
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(platformConnectors).map(([id, c]) => (
                  <ConnectorCard key={id} id={id} connector={c} onToggle={togglePlatformConnector} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {projects.map(p => (
              <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{p.name} – {p.achievements} Achievements</div>
                <AchievementTracker project={p} />
              </div>
            ))}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Total Projects', value: projects.length, icon: '📁', color: '#a78bfa' },
              { label: 'Total Code Lines', value: `${(projects.reduce((a, p) => a + p.codeLines, 0) / 1000).toFixed(0)}K`, icon: '💻', color: '#60a5fa' },
              { label: 'Total Builds', value: projects.reduce((a, p) => a + p.builds, 0), icon: '🏗️', color: '#22c55e' },
              { label: 'Open Bugs', value: projects.reduce((a, p) => a + p.bugs, 0), icon: '🐛', color: '#ef4444' },
              { label: 'Total Assets', value: projects.reduce((a, p) => a + p.assets, 0).toLocaleString(), icon: '🎨', color: '#f97316' },
              { label: 'Team Members', value: projects.reduce((a, p) => a + p.team, 0), icon: '👥', color: '#eab308' }
            ].map(s => (
              <div key={s.label} style={{
                background: `${s.color}10`,
                border: `1px solid ${s.color}22`,
                borderRadius: 14,
                padding: '20px 24px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 28 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: '8px 0 4px' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameDevDashboard;
