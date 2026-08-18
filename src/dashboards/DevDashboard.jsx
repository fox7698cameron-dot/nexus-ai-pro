// src/dashboards/DevDashboard.jsx
// Nexus AI Pro — Developer Dashboard (dev role)
// Date: 2026-08-18

import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  Code, GitBranch, Terminal, Cpu, HardDrive, Activity,
  Play, Pause, RefreshCw, CheckCircle, XCircle, Clock,
  Loader2, Box, Server, Zap, Bug, Package, Globe
} from 'lucide-react';

const ProjectTracker = lazy(() => import('../projects/ProjectTracker.jsx'));

// ─── Build Stat Card ──────────────────────────────────────────────────────────
function BuildCard({ label, value, icon: Icon, status }) {
  const statusColor = { passing: '#10b981', failing: '#ef4444', pending: '#f59e0b', skipped: '#6b7280' }[status] || '#6b7280';
  return (
    <div style={{ background: 'var(--bg-card, #18181b)', border: `1px solid ${statusColor}40`,
      borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <Icon size={16} color={statusColor} />
        {status && (
          <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 9999,
            background: `${statusColor}22`, color: statusColor, textTransform: 'uppercase' }}>{status}</span>
        )}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── CI/CD Pipeline View ──────────────────────────────────────────────────────
function CIPipeline() {
  const stages = [
    { name: 'Lint', duration: '0:12', status: 'passing' },
    { name: 'Type Check', duration: '0:28', status: 'passing' },
    { name: 'Unit Tests', duration: '1:42', status: 'passing' },
    { name: 'Integration', duration: '3:15', status: 'passing' },
    { name: 'Build', duration: '2:08', status: 'passing' },
    { name: 'Deploy Preview', duration: '0:55', status: 'passing' },
  ];

  const StatusIcon = ({ status }) => {
    if (status === 'passing') return <CheckCircle size={14} color="#10b981" />;
    if (status === 'failing') return <XCircle size={14} color="#ef4444" />;
    if (status === 'pending') return <Loader2 size={14} color="#f59e0b" className="spin" />;
    return <Clock size={14} color="#6b7280" />;
  };

  return (
    <div style={{ background: 'var(--bg-card, #18181b)', border: '1px solid var(--border, #27272a)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Play size={14} /> CI/CD Pipeline — main
        </h3>
        <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✓ All passing</span>
      </div>
      <div style={{ display: 'flex', gap: 0, padding: '14px 18px', overflowX: 'auto' }}>
        {stages.map((s, i) => (
          <React.Fragment key={s.name}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 90 }}>
              <StatusIcon status={s.status} />
              <span style={{ fontSize: '0.75rem', color: '#e5e7eb', fontWeight: 500, textAlign: 'center' }}>{s.name}</span>
              <span style={{ fontSize: '0.65rem', color: '#6b7280', fontFamily: 'monospace' }}>{s.duration}</span>
            </div>
            {i < stages.length - 1 && (
              <div style={{ flex: 1, height: 1, background: '#10b98160', alignSelf: 'center', margin: '0 4px', marginBottom: 18 }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Runtime Metrics ──────────────────────────────────────────────────────────
function RuntimeMetrics() {
  const [metrics, setMetrics] = useState({ cpu: 32, mem: 58, rps: 1240, p95: 48 });

  useEffect(() => {
    const t = setInterval(() => setMetrics({
      cpu: Math.floor(20 + Math.random() * 40),
      mem: Math.floor(50 + Math.random() * 20),
      rps: Math.floor(1100 + Math.random() * 400),
      p95: Math.floor(35 + Math.random() * 30),
    }), 3000);
    return () => clearInterval(t);
  }, []);

  const bars = [
    { label: 'CPU', value: metrics.cpu,  color: metrics.cpu > 80 ? '#ef4444' : metrics.cpu > 60 ? '#f59e0b' : '#10b981', unit: '%' },
    { label: 'Memory', value: metrics.mem, color: metrics.mem > 85 ? '#ef4444' : metrics.mem > 70 ? '#f59e0b' : '#3b82f6', unit: '%' },
  ];

  return (
    <div style={{ background: 'var(--bg-card, #18181b)', border: '1px solid var(--border, #27272a)', borderRadius: 12, padding: 18 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Activity size={14} /> Runtime Metrics
      </h3>
      {bars.map(b => (
        <div key={b.label} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8rem', color: '#9ca3af' }}>
            <span>{b.label}</span><span style={{ color: b.color, fontWeight: 600 }}>{b.value}{b.unit}</span>
          </div>
          <div style={{ height: 6, background: '#27272a', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${b.value}%`, background: b.color, borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <div style={{ padding: '8px 12px', background: '#ffffff08', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{metrics.rps.toLocaleString()}</div>
          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>req/s</div>
        </div>
        <div style={{ padding: '8px 12px', background: '#ffffff08', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{metrics.p95}ms</div>
          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>p95 latency</div>
        </div>
      </div>
    </div>
  );
}

// ─── Dependency Audit ─────────────────────────────────────────────────────────
function DependencyAudit() {
  return (
    <div style={{ background: 'var(--bg-card, #18181b)', border: '1px solid var(--border, #27272a)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Package size={14} /> Dependency Audit
        </h3>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 9999,
          background: '#10b98122', color: '#10b981' }}>0 vulnerabilities</span>
      </div>
      <div style={{ padding: '12px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[['Critical', 0, '#ef4444'], ['High', 0, '#f97316'], ['Medium', 0, '#f59e0b'], ['Low', 0, '#10b981']].map(([sev, count, color]) => (
            <div key={sev} style={{ textAlign: 'center', padding: '10px', background: '#ffffff08', borderRadius: 8 }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{count}</div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{sev}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#10b98110', borderRadius: 8,
          border: '1px solid #10b98130', fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle size={14} /> All packages up to date • Last audit: {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dev Dashboard ───────────────────────────────────────────────────────
const TABS = ['overview', 'projects', 'pipeline', 'runtime'];

export default function DevDashboard({ apiBase = '', session }) {
  const [tab, setTab] = useState('overview');

  const buildStats = [
    { label: 'Build Status',    value: '✓ Pass',  icon: CheckCircle, status: 'passing' },
    { label: 'Test Coverage',   value: '84%',     icon: Bug,         status: 'passing' },
    { label: 'Open PRs',        value: '3',       icon: GitBranch,   status: 'pending' },
    { label: 'Deploys Today',   value: '2',       icon: Zap,         status: 'passing' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #09090b)', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid #27272a', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 0 }}>
        <div style={{ padding: '16px 0', marginRight: 24 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, background: 'linear-gradient(135deg,#0891b2,#0d9488)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🛠 Developer Dashboard</span>
        </div>
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '16px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 500, textTransform: 'capitalize',
              color: tab === t ? '#0891b2' : '#6b7280',
              borderBottom: `2px solid ${tab === t ? '#0891b2' : 'transparent'}`,
              transition: 'all 0.15s'
            }}>{t}</button>
          ))}
        </nav>
      </div>

      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {buildStats.map(s => <BuildCard key={s.label} {...s} />)}
            </div>
            <CIPipeline />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <RuntimeMetrics />
              <DependencyAudit />
            </div>
          </div>
        )}
        {tab === 'projects' && (
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}><Loader2 size={24} className="spin" /></div>}>
            <ProjectTracker apiBase={apiBase} />
          </Suspense>
        )}
        {tab === 'pipeline' && <CIPipeline />}
        {tab === 'runtime' && <RuntimeMetrics />}
      </div>
    </div>
  );
}
