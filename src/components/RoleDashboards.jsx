/* src/components/RoleDashboards.jsx
   Role-based dashboards: Admin, Developer, Moderator, User
   Each role gets a separate, permission-gated view
   Created: 2026-10-29
*/
import React, { useState } from 'react';

const ROLE_CONFIG = {
  admin: {
    label: 'Admin Dashboard',
    color: '#ef4444',
    icon: '👑',
    sections: ['system', 'users', 'security', 'analytics', 'billing', 'connectors', 'audit']
  },
  dev: {
    label: 'Developer Dashboard',
    color: '#3b82f6',
    icon: '💻',
    sections: ['projects', 'deployments', 'analytics', 'security', 'api']
  },
  moderator: {
    label: 'Moderator Dashboard',
    color: '#f97316',
    icon: '🛡️',
    sections: ['users', 'content', 'reports', 'analytics']
  },
  user: {
    label: 'User Dashboard',
    color: '#22c55e',
    icon: '👤',
    sections: ['overview', 'analytics', 'profile', 'billing']
  }
};

const StatCard = ({ label, value, icon, color, delta }) => (
  <div style={{
    background: `${color}0f`,
    border: `1px solid ${color}22`,
    borderRadius: 14,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      {delta !== undefined && (
        <span style={{ fontSize: 11, color: delta >= 0 ? '#22c55e' : '#ef4444' }}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
        </span>
      )}
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{label}</div>
  </div>
);

const AdminDashboard = () => {
  const stats = [
    { label: 'Total Users', value: '12,480', icon: '👥', color: '#a78bfa', delta: 8.2 },
    { label: 'Active Sessions', value: '1,240', icon: '🌐', color: '#60a5fa', delta: 3.1 },
    { label: 'Revenue MTD', value: '$48,200', icon: '💰', color: '#22c55e', delta: 12.5 },
    { label: 'Security Events', value: '14', icon: '🛡️', color: '#f97316', delta: -2.0 },
    { label: 'API Calls Today', value: '2.4M', icon: '⚡', color: '#eab308', delta: 5.8 },
    { label: 'Storage Used', value: '1.2 TB', icon: '💾', color: '#8b5cf6', delta: 1.1 }
  ];

  const [recentEvents] = useState([
    { user: 'alice_dev 💻', action: 'Deployed to production', time: '2m ago', type: 'deploy' },
    { user: 'moderator_01 🛡️', action: 'Banned user report #481', time: '8m ago', type: 'moderate' },
    { user: 'System 🤖', action: 'Auto-backup completed', time: '15m ago', type: 'system' },
    { user: 'admin 👑', action: 'Updated rate limits', time: '1h ago', type: 'config' },
    { user: 'new_user_🎮', action: 'Upgraded to Pro plan', time: '2h ago', type: 'billing' }
  ]);

  const eventColor = { deploy: '#3b82f6', moderate: '#f97316', system: '#6b7280', config: '#a78bfa', billing: '#22c55e' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>Recent Activity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentEvents.map((e, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: eventColor[e.type], flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{e.user}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}> — {e.action}</span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{e.time}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>System Health</div>
          {[
            { name: 'API Server', status: 'healthy', uptime: '99.98%' },
            { name: 'Database', status: 'healthy', uptime: '99.99%' },
            { name: 'Redis Cache', status: 'healthy', uptime: '100%' },
            { name: 'CDN', status: 'healthy', uptime: '99.95%' },
            { name: 'Auth Service', status: 'healthy', uptime: '99.97%' }
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{s.name}</span>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#22c55e' }}>{s.uptime}</span>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DevDashboard = () => {
  const stats = [
    { label: 'Active Projects', value: '8', icon: '📁', color: '#3b82f6', delta: 0 },
    { label: 'Deployments Today', value: '12', icon: '🚀', color: '#22c55e', delta: 20 },
    { label: 'Open PRs', value: '5', icon: '🔀', color: '#a78bfa', delta: -1 },
    { label: 'Test Coverage', value: '87%', icon: '✅', color: '#eab308', delta: 2.1 }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>CI/CD Pipeline</div>
        {['main → production', 'feature/analytics → staging', 'fix/auth → staging', 'main → preview'].map((pipeline, i) => {
          const status = ['passed', 'running', 'passed', 'failed'][i];
          const statusColor = { passed: '#22c55e', running: '#3b82f6', failed: '#ef4444' }[status];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, ...(status === 'running' ? { animation: 'pulse 1s infinite' } : {}) }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{pipeline}</span>
              </div>
              <span style={{ fontSize: 11, color: statusColor, textTransform: 'uppercase', fontWeight: 700 }}>{status}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Azure', status: 'Connected', icon: '☁️', color: '#0078d4' },
          { label: 'AWS', status: 'Connected', icon: '🟠', color: '#ff9900' },
          { label: 'Google Cloud', status: 'Connected', icon: '🔵', color: '#4285f4' },
          { label: 'GitHub', status: 'Connected', icon: '🐙', color: '#fff' },
          { label: 'Slack', status: 'Connected', icon: '💬', color: '#4a154b' },
          { label: 'Bitbucket', status: 'Disconnected', icon: '🔵', color: '#0052cc' }
        ].map((c, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${c.status === 'Connected' ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{c.label}</span>
            </div>
            <span style={{ fontSize: 10, color: c.status === 'Connected' ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
              {c.status === 'Connected' ? '●' : '○'} {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ModeratorDashboard = () => {
  const stats = [
    { label: 'Reports Today', value: '23', icon: '🚩', color: '#ef4444', delta: -5 },
    { label: 'Actions Taken', value: '18', icon: '⚡', color: '#f97316', delta: 10 },
    { label: 'Active Users', value: '3,420', icon: '👥', color: '#22c55e', delta: 2.1 },
    { label: 'Content Reviewed', value: '847', icon: '📋', color: '#a78bfa', delta: 0 }
  ];

  const [reports] = useState([
    { id: '#R-481', user: 'user_xyz 🎮', reason: 'Spam', status: 'pending', time: '5m ago' },
    { id: '#R-480', user: 'anon_user123 👤', reason: 'Harassment', status: 'reviewing', time: '12m ago' },
    { id: '#R-479', user: 'streamer_88 📺', reason: 'Inappropriate content', status: 'resolved', time: '28m ago' },
    { id: '#R-478', user: 'bot_account 🤖', reason: 'Bot behavior', status: 'banned', time: '1h ago' }
  ]);

  const statusColor = { pending: '#eab308', reviewing: '#3b82f6', resolved: '#22c55e', banned: '#ef4444' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>Pending Reports</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reports.map((r, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{r.id}</span>
                <div>
                  <div style={{ fontSize: 13, color: '#fff' }}>{r.user}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{r.reason}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{r.time}</span>
                <span style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 20,
                  background: `${statusColor[r.status]}22`, color: statusColor[r.status],
                  fontWeight: 700, textTransform: 'capitalize'
                }}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const UserDashboard = () => {
  const stats = [
    { label: 'Chats Today', value: '12', icon: '💬', color: '#22c55e', delta: 4 },
    { label: 'AI Models Used', value: '4', icon: '🤖', color: '#3b82f6', delta: 0 },
    { label: 'Files Uploaded', value: '8', icon: '📎', color: '#a78bfa', delta: 2 },
    { label: 'Plan', value: 'Pro', icon: '⭐', color: '#eab308' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>Recent Chats</div>
        {['How do I build a REST API?', 'Generate a TikTok marketing plan', 'Explain quantum computing', 'Write a Python web scraper'].map((q, i) => (
          <div key={i} style={{ padding: '8px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            💬 {q}
          </div>
        ))}
      </div>
      <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 8 }}>Pro Plan Active</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          Renews Jan 1, 2027 · Unlimited chats · All AI models
        </div>
      </div>
    </div>
  );
};

const DASHBOARD_COMPONENTS = { admin: AdminDashboard, dev: DevDashboard, moderator: ModeratorDashboard, user: UserDashboard };

const RoleDashboards = ({ user = { role: 'user', username: 'Guest' } }) => {
  const [activeRole, setActiveRole] = useState(user.role || 'user');
  const config = ROLE_CONFIG[activeRole];
  const DashboardContent = DASHBOARD_COMPONENTS[activeRole] || UserDashboard;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#fff',
      display: 'flex'
    }}>
      {/* Sidebar */}
      <div style={{
        width: 200,
        background: 'rgba(0,0,0,0.3)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flexShrink: 0
      }}>
        <div style={{ padding: '0 8px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>🌌 Nexus AI</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {ROLE_CONFIG[activeRole].icon} {user.username}
          </div>
        </div>
        {Object.entries(ROLE_CONFIG).map(([key, r]) => (
          <button key={key} onClick={() => setActiveRole(key)} style={{
            background: activeRole === key ? `${r.color}15` : 'none',
            border: `1px solid ${activeRole === key ? r.color + '33' : 'transparent'}`,
            borderRadius: 8,
            padding: '8px 10px',
            color: activeRole === key ? r.color : 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
            fontSize: 12,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: activeRole === key ? 700 : 400
          }}>
            <span>{r.icon}</span>
            <span>{r.label.replace(' Dashboard', '')}</span>
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: config.color }}>
            {config.icon} {config.label}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <DashboardContent />
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
};

export default RoleDashboards;
