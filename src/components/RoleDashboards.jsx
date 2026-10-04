/**
 * src/components/RoleDashboards.jsx
 * Separate dashboards for Admin, Developer, Moderator, and User roles.
 * Each dashboard shows role-appropriate tools and data.
 * Updated: 2026-10-04
 */
import React, { useState } from 'react';

function StatTile({ icon, label, value, color = '#60a5fa', sub }) {
  return (
    <div style={{ background: '#ffffff06', borderRadius: 10, padding: '14px 16px', border: `1px solid ${color}30` }}>
      <div style={{ display: 'flex', justify: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
          {sub && <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{sub}</div>}
        </div>
        <span style={{ fontSize: 24 }}>{icon}</span>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, color = '#60a5fa', danger }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        borderRadius: 8, border: `1px solid ${danger ? '#ef444430' : `${color}30`}`,
        background: danger ? '#ef444415' : `${color}15`,
        color: danger ? '#f87171' : color,
        cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 13, fontWeight: 500 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      {label}
    </button>
  );
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [users] = useState([
    { id: 1, name: 'Alice 🎮', email: 'alice@ex.com', role: 'user',      status: 'active',  joined: '2026-01-15' },
    { id: 2, name: 'Bob',      email: 'bob@ex.com',   role: 'developer', status: 'active',  joined: '2026-02-10' },
    { id: 3, name: 'Carol',    email: 'carol@ex.com', role: 'moderator', status: 'active',  joined: '2026-03-05' },
    { id: 4, name: 'Dave',     email: 'dave@ex.com',  role: 'user',      status: 'suspended',joined: '2026-04-20' },
  ]);

  const tabs = ['overview', 'users', 'system', 'audit'];
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', padding: 20, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>👑</span>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Admin Dashboard</h1>
          <div style={{ fontSize: 12, color: '#666' }}>Full platform control · Nexus AI Pro</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #222' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding: '8px 14px', background: 'none', border: 'none',
              color: activeTab === t ? '#fff' : '#666', fontWeight: activeTab === t ? 600 : 400,
              fontSize: 13, cursor: 'pointer', borderBottom: activeTab === t ? '2px solid #f87171' : '2px solid transparent' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 20 }}>
            <StatTile icon="👥" label="Total Users"      value="1,247"  color="#60a5fa" sub="+23 this week" />
            <StatTile icon="💰" label="MRR"             value="$8,430" color="#4ade80" sub="+12% MoM" />
            <StatTile icon="🛡️" label="Threats Blocked" value="342"    color="#f87171" sub="last 24h" />
            <StatTile icon="⚡" label="API Calls"       value="94.2K"  color="#f59e0b" sub="today" />
            <StatTile icon="🔒" label="Uptime"          value="99.97%" color="#a78bfa" sub="30-day avg" />
            <StatTile icon="🌍" label="Countries"        value="67"     color="#22d3ee" sub="active users" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#ffffff06', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Quick Actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <ActionButton icon="🔒" label="Force Security Scan" color="#ef4444" />
                <ActionButton icon="📢" label="Broadcast Announcement" color="#f59e0b" />
                <ActionButton icon="🔑" label="Rotate Encryption Keys" color="#a78bfa" />
                <ActionButton icon="📊" label="Export Analytics" color="#60a5fa" />
              </div>
            </div>
            <div style={{ background: '#ffffff06', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Platform Health</div>
              {[
                { label: 'API Server',     status: 'Healthy',   color: '#4ade80' },
                { label: 'Database',       status: 'Healthy',   color: '#4ade80' },
                { label: 'Redis Cache',    status: 'Healthy',   color: '#4ade80' },
                { label: 'Blob Storage',   status: 'Healthy',   color: '#4ade80' },
                { label: 'WebSocket',      status: 'Healthy',   color: '#4ade80' },
                { label: 'Email Service',  status: 'Degraded',  color: '#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #ffffff08' }}>
                  <span style={{ color: '#ccc' }}>{s.label}</span>
                  <span style={{ color: s.color }}>● {s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333' }}>
                  {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: '#666', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #ffffff08' }}>
                    <td style={{ padding: '10px', color: '#fff' }}>{u.name}</td>
                    <td style={{ padding: '10px', color: '#888' }}>{u.email}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4,
                        background: u.role === 'admin' ? '#f8717130' : u.role === 'developer' ? '#a78bfa30' : '#60a5fa30',
                        color: u.role === 'admin' ? '#f87171' : u.role === 'developer' ? '#a78bfa' : '#60a5fa' }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: 11, color: u.status === 'active' ? '#4ade80' : '#f87171' }}>● {u.status}</span>
                    </td>
                    <td style={{ padding: '10px', color: '#666' }}>{u.joined}</td>
                    <td style={{ padding: '10px' }}>
                      <button style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #333', background: 'transparent', color: '#888', cursor: 'pointer', marginRight: 4 }}>Edit</button>
                      <button style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #ef444430', background: '#ef444415', color: '#f87171', cursor: 'pointer' }}>
                        {u.status === 'active' ? 'Suspend' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
          {[
            { label: 'Node.js',        value: 'v22.x' },
            { label: 'React',          value: '18.3.1' },
            { label: 'Express',        value: '4.21.x' },
            { label: 'Socket.IO',      value: '4.8.x' },
            { label: 'Encryption',     value: 'AES-256-GCM' },
            { label: 'Auth',           value: 'JWT + WebAuthn' },
            { label: 'Database',       value: 'PostgreSQL 16' },
            { label: 'Cache',          value: 'Redis 7' },
            { label: 'Platform',       value: 'Linux / Win / macOS' },
            { label: 'Mobile',         value: 'Capacitor + iOS/Android' },
            { label: 'Desktop',        value: 'Electron' },
            { label: 'CDN',            value: 'Cloudflare' },
          ].map(s => (
            <div key={s.label} style={{ background: '#ffffff06', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'audit' && (
        <div style={{ fontSize: 12 }}>
          {[
            { time: '16:32:14', user: 'system',  event: 'SECURITY_SCAN',       level: 'info' },
            { time: '16:30:01', user: 'dave',    event: 'LOGIN_FAILED',         level: 'warn' },
            { time: '16:28:45', user: 'alice',   event: 'PASSWORD_CHANGED',     level: 'info' },
            { time: '16:25:10', user: 'system',  event: 'THREAT_BLOCKED',       level: 'crit' },
            { time: '16:20:33', user: 'carol',   event: 'USER_SUSPENDED',       level: 'warn' },
            { time: '16:15:02', user: 'bob',     event: 'API_KEY_CREATED',      level: 'info' },
          ].map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #ffffff08', alignItems: 'center' }}>
              <span style={{ color: '#555', fontFamily: 'monospace', flexShrink: 0 }}>{e.time}</span>
              <span style={{ color: e.level === 'crit' ? '#f87171' : e.level === 'warn' ? '#f59e0b' : '#4ade80', fontSize: 10, padding: '1px 5px', background: `${e.level === 'crit' ? '#f87171' : e.level === 'warn' ? '#f59e0b' : '#4ade80'}20`, borderRadius: 3 }}>
                {e.level.toUpperCase()}
              </span>
              <span style={{ color: '#a78bfa', flexShrink: 0 }}>{e.user}</span>
              <span style={{ color: '#ccc' }}>{e.event}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DEVELOPER DASHBOARD
// ============================================================
export function DeveloperDashboard() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', padding: 20, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>💻</span>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Developer Dashboard</h1>
          <div style={{ fontSize: 12, color: '#666' }}>API keys, webhooks, integrations</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 20 }}>
        <StatTile icon="🔑" label="API Keys"    value="3"     color="#a78bfa" />
        <StatTile icon="📡" label="API Calls"   value="47.2K" color="#60a5fa" sub="today" />
        <StatTile icon="⚡" label="Webhooks"    value="5"     color="#f59e0b" />
        <StatTile icon="🐛" label="Open Issues" value="12"    color="#f87171" />
      </div>
      <div style={{ background: '#ffffff06', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>API Keys</div>
        {['sk_live_•••••••••••••abc1', 'sk_test_•••••••••••••def2'].map(k => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 10px', background: '#ffffff06', borderRadius: 6, marginBottom: 6, fontFamily: 'monospace', fontSize: 12 }}>
            <span style={{ color: '#ccc' }}>{k}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #333', background: 'transparent', color: '#888', cursor: 'pointer' }}>Copy</button>
              <button style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid #ef444430', background: '#ef444415', color: '#f87171', cursor: 'pointer' }}>Revoke</button>
            </div>
          </div>
        ))}
        <button style={{ fontSize: 12, padding: '7px 12px', borderRadius: 6, border: 'none', background: '#a78bfa', color: '#fff', cursor: 'pointer', marginTop: 4 }}>+ New API Key</button>
      </div>
      <div style={{ background: '#ffffff06', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Integrations</div>
        {[
          { name: 'GitHub',     icon: '🐙', connected: true  },
          { name: 'Azure',      icon: '☁️',  connected: false },
          { name: 'AWS',        icon: '🔶', connected: true  },
          { name: 'Slack',      icon: '💬', connected: true  },
          { name: 'Bitbucket',  icon: '🪣', connected: false },
          { name: 'Zoom',       icon: '📹', connected: false },
          { name: 'Google',     icon: '🔵', connected: true  },
          { name: 'Adobe',      icon: '🅰️',  connected: false },
        ].map(i => (
          <div key={i.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #ffffff08' }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <span>{i.icon}</span><span style={{ color: '#ccc' }}>{i.name}</span>
            </span>
            <span style={{ fontSize: 11, color: i.connected ? '#4ade80' : '#555' }}>
              {i.connected ? '✓ Connected' : 'Connect'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MODERATOR DASHBOARD
// ============================================================
export function ModeratorDashboard() {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', padding: 20, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 28 }}>🛡️</span>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Moderator Dashboard</h1>
          <div style={{ fontSize: 12, color: '#666' }}>Content moderation, reports, users</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 20 }}>
        <StatTile icon="📋" label="Pending Reports" value="14"  color="#f87171" />
        <StatTile icon="✅" label="Resolved Today"  value="31"  color="#4ade80" />
        <StatTile icon="🚫" label="Banned Today"    value="2"   color="#f59e0b" />
        <StatTile icon="⚠️" label="Flagged Content" value="8"   color="#a78bfa" />
      </div>
      <div style={{ background: '#ffffff06', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Pending Reports</div>
        {[
          { id: 1, user: 'anon_42', content: 'Spam / phishing link in chat', severity: 'high',   time: '10 min ago' },
          { id: 2, user: 'user_99', content: 'Inappropriate username',        severity: 'medium', time: '25 min ago' },
          { id: 3, user: 'bot_x',  content: 'Automated abuse pattern',       severity: 'high',   time: '1 hr ago'   },
        ].map(r => (
          <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #ffffff08' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{r.content}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>by {r.user} · {r.time}</div>
            </div>
            <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4,
              background: r.severity === 'high' ? '#ef444430' : '#f59e0b30',
              color: r.severity === 'high' ? '#f87171' : '#fcd34d' }}>
              {r.severity.toUpperCase()}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: 'none', background: '#4ade80', color: '#000', cursor: 'pointer' }}>Dismiss</button>
              <button style={{ fontSize: 11, padding: '4px 8px', borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer' }}>Ban</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// USER DASHBOARD
// ============================================================
export function UserDashboard({ user }) {
  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', padding: 20, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, background: '#ffffff06', borderRadius: 12, padding: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          {user?.avatar ?? '👤'}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.name ?? 'User'}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{user?.plan ?? 'Free'} plan · Member since {user?.joined ?? 'today'}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 20 }}>
        <StatTile icon="💬" label="Chats"         value="234"  color="#60a5fa" />
        <StatTile icon="⭐" label="Saved"          value="18"   color="#f59e0b" />
        <StatTile icon="📁" label="Files"          value="7"    color="#a78bfa" />
        <StatTile icon="🎮" label="Projects"       value="3"    color="#4ade80" />
      </div>
      <div style={{ background: '#ffffff06', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Recent Activity</div>
        {[
          { icon: '💬', label: 'Chat with Claude 4 Opus', time: '5 min ago'  },
          { icon: '📁', label: 'Uploaded project.zip',    time: '2 hr ago'   },
          { icon: '🎮', label: 'Updated Nexus Arena',     time: '1 day ago'  },
          { icon: '🔒', label: 'Password changed',        time: '3 days ago' },
        ].map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #ffffff08' }}>
            <span style={{ fontSize: 18 }}>{a.icon}</span>
            <span style={{ flex: 1, fontSize: 13, color: '#ccc' }}>{a.label}</span>
            <span style={{ fontSize: 11, color: '#555' }}>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default { AdminDashboard, DeveloperDashboard, ModeratorDashboard, UserDashboard };
