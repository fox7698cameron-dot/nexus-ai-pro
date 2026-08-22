/**
 * filename: ARVRDashboard.jsx
 * purpose:  AR/VR/3D project tracking dashboard with real-time performance metrics,
 *           XR device targeting, scene complexity monitoring, and 3D pipeline status.
 * date:     2026-08-22
 * copyright: Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *            Licensed under the Apache-2.0 License.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const XR_DEVICES = [
  { id: 'quest3',   name: 'Meta Quest 3',       icon: '🥽', targetFps: 90,  resolution: '2064×2208', renderMode: 'standalone' },
  { id: 'apvp',    name: 'Apple Vision Pro',    icon: '🍎', targetFps: 90,  resolution: '3660×3200', renderMode: 'mixed-reality' },
  { id: 'psvr2',   name: 'PlayStation VR2',     icon: '🎮', targetFps: 90,  resolution: '2000×2040', renderMode: 'tethered' },
  { id: 'holo2',   name: 'HoloLens 2',          icon: '🔷', targetFps: 60,  resolution: '1440×936',  renderMode: 'holographic' },
  { id: 'steamvr', name: 'SteamVR',             icon: '🌫️', targetFps: 90,  resolution: '2880×1700', renderMode: 'tethered' },
];

const TOOLS_3D = ['Blender', 'Unreal Engine 5', 'Unity 2025', 'Cinema 4D', 'Maya', 'Houdini'];

const MOCK_PROJECTS = [
  {
    id: 'xr1',
    name: 'ShadowCraft VR',
    type: 'VR',
    tool: 'Unreal Engine 5',
    targetDevices: ['quest3', 'psvr2', 'steamvr'],
    status: 'active',
    progress: 45,
    metrics: { fps: 87, latency: 14, gpuMs: 9.8, drawCalls: 312, triangles: 1_820_000, textureMem: 1.8 },
    polygons: 1_820_000,
    lods: [{ level: 'LOD0', polys: 1_820_000, status: 'done' }, { level: 'LOD1', polys: 640_000, status: 'done' }, { level: 'LOD2', polys: 180_000, status: 'generating' }],
    textureAtlas: { total: 24, completed: 22 },
    lastUpdated: '2026-08-22T09:00:00Z',
  },
  {
    id: 'xr2',
    name: 'HoloCity AR',
    type: 'AR',
    tool: 'Unity 2025',
    targetDevices: ['holo2', 'apvp'],
    status: 'active',
    progress: 60,
    metrics: { fps: 59, latency: 18, gpuMs: 14.2, drawCalls: 180, triangles: 560_000, textureMem: 0.9 },
    polygons: 560_000,
    lods: [{ level: 'LOD0', polys: 560_000, status: 'done' }, { level: 'LOD1', polys: 180_000, status: 'done' }],
    textureAtlas: { total: 12, completed: 12 },
    lastUpdated: '2026-08-22T06:00:00Z',
  },
  {
    id: '3d1',
    name: 'Nexus Cinematic',
    type: '3D Film',
    tool: 'Blender',
    targetDevices: [],
    status: 'review',
    progress: 90,
    metrics: { fps: 24, latency: null, gpuMs: 82, drawCalls: 2800, triangles: 12_000_000, textureMem: 8.4 },
    polygons: 12_000_000,
    lods: [],
    textureAtlas: { total: 48, completed: 48 },
    lastUpdated: '2026-08-21T20:00:00Z',
  },
];

const MOCK_ALERTS = [
  { id: 'al1', project: 'ShadowCraft VR', severity: 'warning', message: 'FPS dropped below 90 threshold on Meta Quest 3 (87 fps)', time: '2026-08-22T08:55:00Z' },
  { id: 'al2', project: 'ShadowCraft VR', severity: 'critical', message: 'LOD2 generation stalled — shader compilation blocking pipeline', time: '2026-08-22T08:40:00Z' },
  { id: 'al3', project: 'HoloCity AR', severity: 'info', message: 'Texture atlas 100% complete — ready for cert submission', time: '2026-08-22T07:10:00Z' },
];

const MOCK_SESSIONS = [
  { id: 's1', project: 'ShadowCraft VR', device: 'Meta Quest 3', duration: '1h 22m', avgFps: 89, users: 1, date: '2026-08-22' },
  { id: 's2', project: 'ShadowCraft VR', device: 'PSVR2',        duration: '0h 48m', avgFps: 90, users: 1, date: '2026-08-22' },
  { id: 's3', project: 'HoloCity AR',    device: 'HoloLens 2',   duration: '2h 05m', avgFps: 59, users: 3, date: '2026-08-21' },
  { id: 's4', project: 'HoloCity AR',    device: 'Apple Vision Pro', duration: '1h 10m', avgFps: 90, users: 1, date: '2026-08-21' },
];

const TABS = ['Overview', 'Projects', 'Performance', 'Scene', 'Sessions', 'Alerts'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function severityColor(s) {
  return { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' }[s] ?? '#6b7280';
}

function fpsColor(fps, target) {
  if (fps >= target) return '#22c55e';
  if (fps >= target * 0.9) return '#f59e0b';
  return '#ef4444';
}

// ---------------------------------------------------------------------------
// Shared UI atoms
// ---------------------------------------------------------------------------

function ProgressBar({ value, color = '#3b82f6', height = 8 }) {
  return (
    <div style={{ background: 'var(--bar-bg)', borderRadius: height, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: height, transition: 'width 0.5s ease' }} />
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}22`, color, border: `1px solid ${color}44` }}>
      {label.toUpperCase()}
    </span>
  );
}

function StatCard({ icon, label, value, sub, color = '#3b82f6' }) {
  return (
    <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: '16px 20px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function GaugeBar({ label, value, max, unit, color, warn }) {
  const pct = Math.min(100, (value / max) * 100);
  const barColor = warn && value >= warn ? '#f59e0b' : color;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontWeight: 700, color: barColor }}>{value}{unit}</span>
      </div>
      <ProgressBar value={pct} color={barColor} height={6} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Overview
// ---------------------------------------------------------------------------

function OverviewTab({ projects, alerts }) {
  const totalXr = projects.filter(p => p.type === 'VR' || p.type === 'AR').length;
  const total3d = projects.filter(p => p.type === '3D Film').length;
  const avgFps = Math.round(projects.filter(p => p.metrics.fps && p.type !== '3D Film').reduce((s, p) => s + p.metrics.fps, 0) / (totalXr || 1));
  const critical = alerts.filter(a => a.severity === 'critical').length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <StatCard icon="🥽" label="XR Projects" value={totalXr} color="#a855f7" />
        <StatCard icon="🎬" label="3D Projects" value={total3d} color="#3b82f6" />
        <StatCard icon="⚡" label="Avg XR FPS" value={avgFps} color={avgFps >= 88 ? '#22c55e' : '#f59e0b'} sub="Target: 90 fps" />
        <StatCard icon="🚨" label="Critical Alerts" value={critical} color={critical > 0 ? '#ef4444' : '#22c55e'} />
      </div>

      {/* Project cards summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        {projects.map(p => {
          const targetDev = XR_DEVICES.filter(d => p.targetDevices.includes(d.id));
          const fps = p.metrics.fps;
          const targetFps = targetDev.length ? targetDev[0].targetFps : 90;
          return (
            <div key={p.id} style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.type} · {p.tool}</div>
                </div>
                <Badge label={p.status} color={p.status === 'active' ? '#3b82f6' : '#a855f7'} />
              </div>

              {p.type !== '3D Film' && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: fpsColor(fps, targetFps) }}>{fps}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>FPS</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: p.metrics.latency <= 20 ? '#22c55e' : '#f59e0b' }}>{p.metrics.latency}ms</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Latency</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#3b82f6' }}>{p.metrics.drawCalls}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Draw Calls</div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Progress</span>
                  <span style={{ fontWeight: 700 }}>{p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} color={p.progress >= 75 ? '#22c55e' : '#f59e0b'} />
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {targetDev.map(d => (
                  <span key={d.id} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'var(--pill-bg)', color: 'var(--text-muted)' }}>{d.icon} {d.name}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Latest alerts */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600 }}>Latest Alerts</h3>
        {alerts.slice(0, 3).map(a => (
          <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid var(--divider)' }}>
            <span style={{ color: severityColor(a.severity), fontSize: 16, flexShrink: 0 }}>
              {a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '🟡' : 'ℹ️'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{a.message}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{a.project} · {timeAgo(a.time)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Projects
// ---------------------------------------------------------------------------

function ProjectsTab({ projects }) {
  const [selectedType, setSelectedType] = useState('All');
  const types = ['All', 'VR', 'AR', '3D Film'];

  const filtered = selectedType === 'All' ? projects : projects.filter(p => p.type === selectedType);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {types.map(t => (
          <button key={t} onClick={() => setSelectedType(t)} style={{ padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: selectedType === t ? '#a855f7' : 'var(--pill-bg)', color: selectedType === t ? '#fff' : 'var(--text-muted)' }}>
            {t}
          </button>
        ))}
      </div>

      {filtered.map(p => {
        const targetDev = XR_DEVICES.filter(d => p.targetDevices.includes(d.id));
        return (
          <div key={p.id} style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{p.type} · {p.tool}</div>
              </div>
              <Badge label={p.status} color={p.status === 'active' ? '#3b82f6' : '#a855f7'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'FPS', val: p.metrics.fps ?? 'N/A', color: p.metrics.fps ? fpsColor(p.metrics.fps, targetDev[0]?.targetFps ?? 90) : '#6b7280' },
                { label: 'Latency', val: p.metrics.latency != null ? `${p.metrics.latency}ms` : 'N/A', color: '#3b82f6' },
                { label: 'GPU', val: `${p.metrics.gpuMs}ms`, color: p.metrics.gpuMs < 11 ? '#22c55e' : '#f59e0b' },
                { label: 'Draw Calls', val: p.metrics.drawCalls, color: '#a855f7' },
                { label: 'Triangles', val: fmtNum(p.metrics.triangles), color: '#f59e0b' },
                { label: 'Tex Mem', val: `${p.metrics.textureMem}GB`, color: '#3b82f6' },
              ].map(m => (
                <div key={m.label} style={{ background: 'var(--code-bg)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{m.val}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* LOD progress */}
            {p.lods.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>LOD Pipeline</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {p.lods.map(l => (
                    <div key={l.level} style={{ flex: 1, background: 'var(--code-bg)', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{l.level}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{fmtNum(l.polys)} polys</div>
                      <Badge label={l.status} color={l.status === 'done' ? '#22c55e' : '#f59e0b'} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Texture atlas */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Texture Atlas ({p.textureAtlas.completed}/{p.textureAtlas.total})</span>
                <span style={{ fontWeight: 700 }}>{Math.round((p.textureAtlas.completed / p.textureAtlas.total) * 100)}%</span>
              </div>
              <ProgressBar value={(p.textureAtlas.completed / p.textureAtlas.total) * 100} color="#3b82f6" />
            </div>

            {/* Target devices */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {targetDev.map(d => (
                <div key={d.id} style={{ background: 'var(--pill-bg)', borderRadius: 8, padding: '6px 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>{d.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{d.targetFps} fps target · {d.resolution}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Performance
// ---------------------------------------------------------------------------

function PerformanceTab({ projects }) {
  const xrProjects = projects.filter(p => p.type !== '3D Film');

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {xrProjects.map(p => {
          const targetDev = XR_DEVICES.find(d => p.targetDevices.includes(d.id));
          const targetFps = targetDev?.targetFps ?? 90;
          return (
            <div key={p.id} style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{p.type} · {targetDev?.name ?? 'Multi-device'}</div>

              {/* FPS gauge */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Frame Rate</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: fpsColor(p.metrics.fps, targetFps) }}>{p.metrics.fps} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-muted)' }}>/ {targetFps} fps</span></span>
                </div>
                <ProgressBar value={(p.metrics.fps / targetFps) * 100} color={fpsColor(p.metrics.fps, targetFps)} height={10} />
              </div>

              <GaugeBar label="Motion-to-Photon Latency" value={p.metrics.latency} max={50} unit="ms" color="#22c55e" warn={20} />
              <GaugeBar label="GPU Frame Time" value={p.metrics.gpuMs} max={20} unit="ms" color="#3b82f6" warn={11.1} />
              <GaugeBar label="Draw Calls" value={p.metrics.drawCalls} max={500} unit="" color="#a855f7" warn={350} />
              <GaugeBar label="Texture Memory" value={p.metrics.textureMem} max={6} unit=" GB" color="#f59e0b" warn={4} />
            </div>
          );
        })}
      </div>

      {/* Device target table */}
      <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 20, marginTop: 20, overflow: 'auto' }}>
        <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600 }}>XR Device Targets</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--divider)' }}>
              {['Device', 'Type', 'Target FPS', 'Resolution', 'Render Mode'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {XR_DEVICES.map(d => (
              <tr key={d.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                <td style={{ padding: '10px 14px' }}><span style={{ marginRight: 8 }}>{d.icon}</span>{d.name}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>XR</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#22c55e' }}>{d.targetFps} fps</td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11 }}>{d.resolution}</td>
                <td style={{ padding: '10px 14px' }}><Badge label={d.renderMode} color="#3b82f6" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Scene
// ---------------------------------------------------------------------------

function SceneTab({ projects }) {
  return (
    <div>
      {projects.map(p => (
        <div key={p.id} style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>{p.tool} · {p.type}</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
            {[
              { label: 'Total Triangles', value: fmtNum(p.metrics.triangles), icon: '△', color: '#f59e0b' },
              { label: 'Draw Calls', value: p.metrics.drawCalls, icon: '🎨', color: '#a855f7' },
              { label: 'Texture Mem', value: `${p.metrics.textureMem} GB`, icon: '🖼️', color: '#3b82f6' },
              { label: 'LOD Levels', value: p.lods.length || 'N/A', icon: '🔢', color: '#22c55e' },
            ].map(m => (
              <div key={m.label} style={{ background: 'var(--code-bg)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* LOD breakdown */}
          {p.lods.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>LOD Generation Progress</div>
              {p.lods.map((l, i) => (
                <div key={l.level} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ flex: '0 0 50px', fontSize: 12, fontWeight: 600 }}>{l.level}</span>
                  <span style={{ flex: '0 0 80px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{fmtNum(l.polys)}</span>
                  <div style={{ flex: 1 }}><ProgressBar value={(1 - i * 0.35) * 100} color={l.status === 'done' ? '#22c55e' : '#f59e0b'} height={6} /></div>
                  <Badge label={l.status} color={l.status === 'done' ? '#22c55e' : '#f59e0b'} />
                </div>
              ))}
            </div>
          )}

          {/* Texture atlas */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Texture Atlas Progress</span>
              <span style={{ fontWeight: 700 }}>{p.textureAtlas.completed} / {p.textureAtlas.total} sheets</span>
            </div>
            <ProgressBar value={(p.textureAtlas.completed / p.textureAtlas.total) * 100} color="#3b82f6" height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Sessions
// ---------------------------------------------------------------------------

function SessionsTab({ sessions }) {
  return (
    <div>
      <div style={{ background: 'var(--card-bg)', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--divider)' }}>
              {['Project', 'Device', 'Duration', 'Avg FPS', 'Users', 'Date'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => {
              const dev = XR_DEVICES.find(d => d.name === s.device || d.id === s.device);
              const targetFps = dev?.targetFps ?? 90;
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{s.project}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{dev ? `${dev.icon} ` : ''}{s.device}</td>
                  <td style={{ padding: '12px 16px' }}>{s.duration}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: fpsColor(s.avgFps, targetFps) }}>{s.avgFps} fps</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{s.users}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: 11 }}>{s.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Analytics summary */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 20 }}>
        <StatCard icon="🥽" label="Total Sessions" value={sessions.length} color="#a855f7" />
        <StatCard icon="⏱️" label="Total Users" value={sessions.reduce((s, x) => s + x.users, 0)} color="#3b82f6" />
        <StatCard icon="⚡" label="Avg FPS" value={Math.round(sessions.reduce((s, x) => s + x.avgFps, 0) / sessions.length)} color="#22c55e" sub="across all sessions" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Alerts
// ---------------------------------------------------------------------------

function AlertsTab({ alerts }) {
  return (
    <div>
      {alerts.map(a => (
        <div key={a.id} style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 20, marginBottom: 12, borderLeft: `4px solid ${severityColor(a.severity)}` }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>
              {a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '🟡' : 'ℹ️'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Badge label={a.severity} color={severityColor(a.severity)} />
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{timeAgo(a.time)}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 8, lineHeight: 1.5 }}>{a.message}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Project: {a.project}</div>
            </div>
          </div>
        </div>
      ))}
      {alerts.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No active alerts</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ARVRDashboard = () => {
  const [activeTab, setActiveTab] = useState('Overview');
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [sessions] = useState(MOCK_SESSIONS);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  // ---- Socket.IO for real-time perf updates ----
  useEffect(() => {
    import('socket.io-client').then(({ io }) => {
      const socket = io(window.location.origin, { path: '/socket.io', transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', () => setSocketConnected(true));
      socket.on('disconnect', () => setSocketConnected(false));

      socket.on('arvr:metrics-update', (data) => {
        setProjects(prev => prev.map(p => p.id === data.id ? { ...p, metrics: { ...p.metrics, ...data.metrics } } : p));
      });

      socket.on('arvr:alert', (alert) => {
        setAlerts(prev => [alert, ...prev].slice(0, 50));
      });
    }).catch(() => { /* socket.io not available — silent no-op */ });

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  return (
    <div style={{ '--card-bg': 'var(--arvr-card, #1a1d2e)', '--bar-bg': 'var(--arvr-bar, #252840)', '--pill-bg': 'var(--arvr-pill, #252840)', '--divider': 'var(--arvr-div, #2a2d45)', '--text-muted': 'var(--arvr-muted, #94a3b8)', '--text-dim': 'var(--arvr-dim, #64748b)', '--code-bg': 'var(--arvr-code, #12142b)', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: 'var(--arvr-fg, #e2e8f0)', background: 'var(--arvr-bg, #0d0f1f)', paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--divider)', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🥽 AR/VR/3D Dashboard</h1>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>Nexus AI Pro — Immersive & 3D Project Hub</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: socketConnected ? '#22c55e' : '#6b7280', marginRight: 4, boxShadow: socketConnected ? '0 0 6px #22c55e' : 'none' }} />
          {socketConnected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--card-bg)', borderBottom: '1px solid var(--divider)', padding: '0 28px', display: 'flex', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: activeTab === tab ? 700 : 500, fontSize: 13, color: activeTab === tab ? '#a855f7' : 'var(--text-muted)', borderBottom: activeTab === tab ? '2px solid #a855f7' : '2px solid transparent', whiteSpace: 'nowrap' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 28px', maxWidth: 1280, margin: '0 auto' }}>
        {activeTab === 'Overview'     && <OverviewTab projects={projects} alerts={alerts} />}
        {activeTab === 'Projects'     && <ProjectsTab projects={projects} />}
        {activeTab === 'Performance'  && <PerformanceTab projects={projects} />}
        {activeTab === 'Scene'        && <SceneTab projects={projects} />}
        {activeTab === 'Sessions'     && <SessionsTab sessions={sessions} />}
        {activeTab === 'Alerts'       && <AlertsTab alerts={alerts} />}
      </div>
    </div>
  );
};

export default ARVRDashboard;
