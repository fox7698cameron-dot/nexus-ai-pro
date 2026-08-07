/**
 * ProjectTracker.jsx
 * Nexus AI Pro — Real-Time Project Tracker
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under Apache License 2.0
 *
 * Tracks: Coding, Game Development (Unreal/Unity/Godot),
 *         AR/VR/3D projects, achievement & game progress.
 * Connectors: Epic/Unreal, Sony, Microsoft, Ubisoft Connect.
 *
 * Updated: 2026-08-07
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Code, Box, Layers, Rocket, Zap,
  CheckCircle, Clock, Activity, TrendingUp,
  Trophy, Star, Play, Pause, Plus, Trash2,
  GitBranch, Terminal, Cpu, Globe, Users,
  ChevronDown, ChevronRight, Edit3, Save,
  Target, Award, BarChart3, RefreshCw,
} from 'lucide-react';

/* ─── Project Types ──────────────────────────────────────────────────── */
const PROJECT_TYPES = {
  coding:  { label:'Coding',       icon:'💻', color:'#6366f1' },
  game:    { label:'Game Dev',     icon:'🎮', color:'#f97316' },
  ar_vr:   { label:'AR/VR',       icon:'🥽', color:'#8b5cf6' },
  '3d':    { label:'3D Project',   icon:'🎲', color:'#14b8a6' },
  mobile:  { label:'Mobile App',   icon:'📱', color:'#06b6d4' },
  web:     { label:'Web App',      icon:'🌐', color:'#10b981' },
};

/* ─── Game Platform Connectors ───────────────────────────────────────── */
const GAME_CONNECTORS = [
  { id:'unreal',      name:'Unreal Engine',    icon:'⚙️', color:'#1C1C1E', connected:false },
  { id:'epic',        name:'Epic Games Store', icon:'🎮', color:'#2D2D2D', connected:false },
  { id:'sony',        name:'PlayStation',      icon:'🎮', color:'#003791', connected:false },
  { id:'microsoft',   name:'Xbox / MS Store',  icon:'🎯', color:'#107C10', connected:false },
  { id:'ubisoft',     name:'Ubisoft Connect',  icon:'🔷', color:'#0070FF', connected:false },
  { id:'unity',       name:'Unity Engine',     icon:'◼',  color:'#1c1c1c', connected:false },
  { id:'godot',       name:'Godot Engine',     icon:'🤖', color:'#478CBF', connected:false },
  { id:'steam',       name:'Steam',            icon:'🚂', color:'#1B2838', connected:false },
];

/* ─── Progress Ring ──────────────────────────────────────────────────── */
function ProgressRing({ pct, size = 56, stroke = 5, color = '#6366f1' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition:'stroke-dasharray 0.8s ease' }} />
    </svg>
  );
}

/* ─── Achievement Badge ──────────────────────────────────────────────── */
function AchievementBadge({ achievement }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
      background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)',
      borderRadius:10,
    }}>
      <span style={{ fontSize:22 }}>{achievement.icon ?? '🏆'}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#fbbf24' }}>{achievement.name}</div>
        <div style={{ fontSize:11, color:'#9ca3af' }}>{achievement.description}</div>
        {achievement.progress !== undefined && (
          <div style={{ height:3, background:'rgba(255,255,255,0.08)', borderRadius:99, marginTop:4 }}>
            <div style={{
              height:'100%', borderRadius:99, width:`${achievement.progress}%`,
              background:'linear-gradient(90deg, #f59e0b, #fbbf24)',
            }} />
          </div>
        )}
      </div>
      {achievement.unlocked && (
        <CheckCircle size={16} color="#22c55e" style={{ flexShrink:0 }} />
      )}
    </div>
  );
}

/* ─── Project Card ───────────────────────────────────────────────────── */
function ProjectCard({ project, onEdit, onDelete, expanded, onToggle }) {
  const pt = PROJECT_TYPES[project.type] ?? PROJECT_TYPES.coding;
  const statusColor = {
    active:     '#22c55e',
    paused:     '#f59e0b',
    completed:  '#6366f1',
    archived:   '#6b7280',
  }[project.status] ?? '#6b7280';

  return (
    <div style={{
      background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)',
      borderRadius:14, overflow:'hidden',
      borderLeft: `3px solid ${pt.color}`,
    }}>
      {/* Card header */}
      <button onClick={onToggle} style={{
        width:'100%', textAlign:'left', background:'transparent',
        border:'none', cursor:'pointer', padding:'14px 18px',
        display:'flex', alignItems:'center', gap:12,
      }}>
        <span style={{ fontSize:24 }}>{pt.icon}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
            <span style={{ fontSize:15, fontWeight:700, color:'#f9fafb' }}>{project.name}</span>
            <span style={{
              fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99,
              background: statusColor + '22', color: statusColor,
            }}>{project.status?.toUpperCase()}</span>
          </div>
          <div style={{ fontSize:12, color:'#9ca3af' }}>
            {pt.label} · {project.language ?? ''} · Last commit {project.lastCommit ?? 'Today'}
          </div>
        </div>
        {/* Progress ring */}
        <div style={{ position:'relative', width:56, height:56 }}>
          <ProgressRing pct={project.progress ?? 0} color={pt.color} />
          <div style={{
            position:'absolute', inset:0, display:'flex',
            alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:700, color:'#f9fafb',
          }}>
            {project.progress ?? 0}%
          </div>
        </div>
        <ChevronRight size={16} style={{
          color:'#6b7280',
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition:'transform 0.2s',
        }} />
      </button>

      {expanded && (
        <div style={{ padding:'0 18px 18px' }}>
          {/* Stats row */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:16 }}>
            {[
              { label:'Commits',    value: project.commits    ?? 0, icon:GitBranch },
              { label:'Build Time', value: project.buildTime  ?? '—', icon:Clock },
              { label:'Test Coverage', value: `${project.coverage ?? 0}%`, icon:CheckCircle },
              { label:'Issues',     value: project.issues     ?? 0, icon:Activity },
              { label:'Contributors', value: project.contributors ?? 1, icon:Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} style={{
                flex:'1 1 100px', padding:'8px 12px', borderRadius:8,
                background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize:10, color:'#6b7280', display:'flex', alignItems:'center', gap:4 }}>
                  <Icon size={10} /> {label}
                </div>
                <div style={{ fontSize:15, fontWeight:700, color:'#f9fafb', marginTop:2 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Achievements */}
          {project.achievements?.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#fbbf24', marginBottom:8 }}>
                🏆 Achievements ({project.achievements.filter(a => a.unlocked).length}/{project.achievements.length})
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {project.achievements.map((a, i) => (
                  <AchievementBadge key={i} achievement={a} />
                ))}
              </div>
            </div>
          )}

          {/* Platform connections */}
          {project.platforms?.length > 0 && (
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#9ca3af', marginBottom:8 }}>
                Connected Platforms
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {project.platforms.map(pid => {
                  const conn = GAME_CONNECTORS.find(c => c.id === pid);
                  if (!conn) return null;
                  return (
                    <span key={pid} style={{
                      padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600,
                      background: conn.color + '33', color:'#d1d5db',
                      border:'1px solid rgba(255,255,255,0.1)',
                    }}>
                      {conn.icon} {conn.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Connector Setup Panel ──────────────────────────────────────────── */
function ConnectorPanel() {
  const [connectors, setConnectors] = useState(GAME_CONNECTORS);

  const toggle = async (id) => {
    try {
      const resp = await fetch(`/api/connectors/${id}/toggle`, { method:'POST' });
      const data = await resp.json();
      setConnectors(cs => cs.map(c => c.id === id ? { ...c, connected: data.connected } : c));
    } catch {
      setConnectors(cs => cs.map(c => c.id === id ? { ...c, connected: !c.connected } : c));
    }
  };

  return (
    <div style={{ marginTop:24 }}>
      <h3 style={{ fontSize:16, fontWeight:700, color:'#f9fafb', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
        <Layers size={16} color="#6366f1" />
        Platform Connectors
      </h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
        {connectors.map(c => (
          <div key={c.id} style={{
            padding:'12px 14px', borderRadius:10,
            background:'rgba(255,255,255,0.03)',
            border:`1px solid ${c.connected ? '#22c55e44' : 'rgba(255,255,255,0.06)'}`,
            display:'flex', alignItems:'center', gap:10,
          }}>
            <span style={{ fontSize:20 }}>{c.icon}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#f9fafb' }}>{c.name}</div>
              <div style={{ fontSize:10, color: c.connected ? '#22c55e' : '#6b7280' }}>
                {c.connected ? '● Connected' : '○ Disconnected'}
              </div>
            </div>
            <button onClick={() => toggle(c.id)} style={{
              padding:'4px 10px', borderRadius:6, border:'none', fontSize:11, fontWeight:600,
              cursor:'pointer', background: c.connected ? '#ef444422' : '#22c55e22',
              color: c.connected ? '#ef4444' : '#22c55e',
            }}>
              {c.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ProjectTracker ────────────────────────────────────────────── */
export default function ProjectTracker({ className = '' }) {
  const [projects, setProjects]     = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter]         = useState('all');
  const [loading, setLoading]       = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [newProj, setNewProj]       = useState({ name:'', type:'coding', status:'active' });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/projects');
      if (resp.ok) {
        const data = await resp.json();
        setProjects(data.projects ?? MOCK_PROJECTS);
      } else {
        setProjects(MOCK_PROJECTS);
      }
    } catch {
      setProjects(MOCK_PROJECTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const filteredProjects = filter === 'all'
    ? projects
    : projects.filter(p => p.type === filter);

  const addProject = async () => {
    if (!newProj.name.trim()) return;
    try {
      const resp = await fetch('/api/projects', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(newProj),
      });
      const data = resp.ok ? await resp.json() : { project:{ ...newProj, id: Date.now().toString(), progress:0 } };
      setProjects(ps => [data.project, ...ps]);
    } catch {
      setProjects(ps => [{ ...newProj, id: Date.now().toString(), progress:0 }, ...ps]);
    }
    setShowAdd(false);
    setNewProj({ name:'', type:'coding', status:'active' });
  };

  // Aggregate stats
  const activeCount    = projects.filter(p => p.status === 'active').length;
  const avgProgress    = projects.length ? Math.round(projects.reduce((a, p) => a + (p.progress ?? 0), 0) / projects.length) : 0;
  const totalCommits   = projects.reduce((a, p) => a + (p.commits ?? 0), 0);

  return (
    <div className={className} style={{
      fontFamily:"'Inter', system-ui, sans-serif",
      color:'#f9fafb', maxWidth:960, margin:'0 auto', padding:'0 0 40px',
    }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:700, margin:0, display:'flex', alignItems:'center', gap:10 }}>
          <Rocket size={22} color="#6366f1" />
          Project Tracker
        </h2>
        <p style={{ margin:'4px 0 0', color:'#9ca3af', fontSize:14 }}>
          Coding · Game Dev · AR/VR · 3D — real-time progress & achievement tracking
        </p>
      </div>

      {/* Stats bar */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginBottom:24 }}>
        {[
          { label:'Active', value:activeCount,  icon:Play,      color:'#22c55e' },
          { label:'Avg Progress', value:`${avgProgress}%`, icon:TrendingUp, color:'#6366f1' },
          { label:'Total Commits', value:totalCommits, icon:GitBranch, color:'#f97316' },
          { label:'Projects', value:projects.length, icon:Layers, color:'#8b5cf6' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            flex:'1 1 120px', padding:'14px 16px', borderRadius:12,
            background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <Icon size={14} style={{ color }} />
              <span style={{ fontSize:11, color:'#9ca3af' }}>{label}</span>
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:'#f9fafb' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter + Add */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16, alignItems:'center' }}>
        <div style={{ display:'flex', gap:6, flex:1, flexWrap:'wrap' }}>
          {[['all','All'], ...Object.entries(PROJECT_TYPES).map(([k,v]) => [k, v.label])].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)} style={{
              padding:'6px 12px', borderRadius:8, border:'none', fontSize:12, fontWeight:500,
              cursor:'pointer', background: filter === key ? '#6366f1' : 'rgba(255,255,255,0.06)',
              color: filter === key ? '#fff' : '#9ca3af',
            }}>{label}</button>
          ))}
        </div>
        <button onClick={() => setShowAdd(s => !s)} style={{
          display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
          borderRadius:8, border:'none', background:'#6366f1',
          color:'#fff', fontSize:13, fontWeight:500, cursor:'pointer',
        }}>
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{
          padding:16, borderRadius:12, marginBottom:16,
          background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.2)',
        }}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <input
              placeholder="Project name"
              value={newProj.name}
              onChange={e => setNewProj(p => ({ ...p, name: e.target.value }))}
              style={inputStyle}
            />
            <select value={newProj.type} onChange={e => setNewProj(p => ({ ...p, type: e.target.value }))}
              style={inputStyle}>
              {Object.entries(PROJECT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
            <button onClick={addProject} style={{
              padding:'8px 16px', borderRadius:8, border:'none',
              background:'#22c55e', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer',
            }}>Add</button>
            <button onClick={() => setShowAdd(false)} style={{
              padding:'8px 14px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)',
              background:'transparent', color:'#9ca3af', fontSize:13, cursor:'pointer',
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Project list */}
      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'#6b7280' }}>
          <RefreshCw size={24} style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto 8px' }} />
          Loading projects…
        </div>
      ) : filteredProjects.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'#6b7280' }}>
          <Rocket size={32} style={{ display:'block', margin:'0 auto 8px', opacity:0.4 }} />
          No projects yet. Click "New Project" to get started.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filteredProjects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              expanded={expandedId === p.id}
              onToggle={() => setExpandedId(id => id === p.id ? null : p.id)}
            />
          ))}
        </div>
      )}

      <ConnectorPanel />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────── */
const inputStyle = {
  flex:1, minWidth:160, padding:'8px 12px', borderRadius:8,
  border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)',
  color:'#f9fafb', fontSize:13, outline:'none',
};

/* ─── Mock data (demo fallback) ──────────────────────────────────────── */
const MOCK_PROJECTS = [
  {
    id:'1', name:'Nexus AI Pro', type:'coding', language:'JavaScript/React', status:'active',
    progress:72, commits:247, buildTime:'3m 12s', coverage:68, issues:4, contributors:3,
    lastCommit:'2h ago', platforms:[],
    achievements:[
      { name:'First Commit',  icon:'🌱', description:'Made your first commit', unlocked:true },
      { name:'100 Commits',   icon:'💯', description:'Reached 100 commits',    unlocked:true },
      { name:'Test Coverage', icon:'🧪', description:'80%+ test coverage',      unlocked:false, progress:85 },
    ],
  },
  {
    id:'2', name:'Galactic Conquest', type:'game', language:'C++/Unreal', status:'active',
    progress:34, commits:89, buildTime:'12m 44s', coverage:21, issues:12, contributors:2,
    lastCommit:'1d ago', platforms:['unreal','epic','steam'],
    achievements:[
      { name:'Alpha Release', icon:'🎮', description:'Published alpha build',   unlocked:true },
      { name:'1K Wishlists',  icon:'⭐', description:'1,000 wishlists on Steam',unlocked:false, progress:42 },
    ],
  },
  {
    id:'3', name:'AR Navigation SDK', type:'ar_vr', language:'Swift/C++', status:'paused',
    progress:58, commits:134, buildTime:'8m 22s', coverage:54, issues:7, contributors:1,
    lastCommit:'3d ago', platforms:['sony'],
    achievements:[
      { name:'Depth Mapping', icon:'🗺️', description:'Implemented LiDAR depth mapping', unlocked:true },
    ],
  },
];
