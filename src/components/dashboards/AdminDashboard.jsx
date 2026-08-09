/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Admin Dashboard — Full system control, user management, security oversight
 * Separate from Dev, Moderator, and User dashboards
 * Date: 2026-08-09
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { Shield, Users, Activity, Settings, Server, AlertTriangle, BarChart3 } from 'lucide-react';

const s = {
  container: { padding: '24px', maxWidth: '1400px', margin: '0 auto' },
  header: { marginBottom: '28px' },
  title: { fontSize: '1.6rem', fontWeight: '800', color: '#fff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' },
  subtitle: { color: '#6b7280', fontSize: '0.9rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' },
  card: (color) => ({
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${color}33`,
    borderLeft: `3px solid ${color}`,
    borderRadius: '12px',
    padding: '20px 22px',
  }),
  cardIcon: { marginBottom: '12px' },
  cardLabel: { fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  cardValue: { fontSize: '2rem', fontWeight: '700', color: '#fff' },
  cardSub: { fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' },
  section: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { textAlign: 'left', padding: '10px 12px', color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  td: { padding: '12px', color: '#e5e7eb', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  roleBadge: (role) => {
    const colors = { admin: '#ef4444', dev: '#8b5cf6', moderator: '#f59e0b', user: '#6b7280' };
    const color = colors[role] ?? '#6b7280';
    return { padding: '2px 8px', background: `${color}20`, border: `1px solid ${color}44`, color, borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' };
  },
};

const MOCK_USERS = [
  { id: '1', username: 'admin_fox', email: 'admin@nexus.ai', role: 'admin', status: 'active', lastLogin: '2026-08-09T10:30:00Z' },
  { id: '2', username: 'dev_alice', email: 'alice@nexus.ai', role: 'dev', status: 'active', lastLogin: '2026-08-09T09:15:00Z' },
  { id: '3', username: 'mod_bob', email: 'bob@nexus.ai', role: 'moderator', status: 'active', lastLogin: '2026-08-08T22:45:00Z' },
  { id: '4', username: 'user_carol', email: 'carol@nexus.ai', role: 'user', status: 'active', lastLogin: '2026-08-09T11:00:00Z' },
];

export default function AdminDashboard() {
  const { user, authFetch } = useAuth();
  const [securityStatus, setSecurityStatus] = useState(null);

  useEffect(() => {
    authFetch('/api/security/status').then(r => r.ok && r.json()).then(d => d && setSecurityStatus(d));
  }, [authFetch]);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>
          <Shield size={24} color="#ef4444" />
          Admin Dashboard
        </div>
        <div style={s.subtitle}>
          Full system access — Welcome, {user?.displayName ?? user?.username} 👑
        </div>
      </div>

      {/* Stats row */}
      <div style={s.grid}>
        <div style={s.card('#667eea')}>
          <div style={s.cardIcon}><Users size={20} color="#667eea" /></div>
          <div style={s.cardLabel}>Total Users</div>
          <div style={s.cardValue}>1,247</div>
          <div style={s.cardSub}>+12 this week</div>
        </div>
        <div style={s.card('#22c55e')}>
          <div style={s.cardIcon}><Activity size={20} color="#22c55e" /></div>
          <div style={s.cardLabel}>Active Sessions</div>
          <div style={s.cardValue}>84</div>
          <div style={s.cardSub}>Right now</div>
        </div>
        <div style={s.card('#ef4444')}>
          <div style={s.cardIcon}><AlertTriangle size={20} color="#ef4444" /></div>
          <div style={s.cardLabel}>Security Alerts</div>
          <div style={s.cardValue}>0</div>
          <div style={s.cardSub}>All clear</div>
        </div>
        <div style={s.card('#f59e0b')}>
          <div style={s.cardIcon}><Server size={20} color="#f59e0b" /></div>
          <div style={s.cardLabel}>Server Uptime</div>
          <div style={s.cardValue}>{securityStatus?.uptimeFormatted ?? '—'}</div>
          <div style={s.cardSub}>{securityStatus?.os?.platform ?? '—'}</div>
        </div>
        <div style={s.card('#8b5cf6')}>
          <div style={s.cardIcon}><BarChart3 size={20} color="#8b5cf6" /></div>
          <div style={s.cardLabel}>API Requests</div>
          <div style={s.cardValue}>48.2K</div>
          <div style={s.cardSub}>Last 24h</div>
        </div>
      </div>

      {/* User Management */}
      <div style={s.section}>
        <div style={s.sectionTitle}><Users size={18} color="#667eea" /> User Management</div>
        <table style={s.table}>
          <thead>
            <tr>
              {['Username', 'Email', 'Role', 'Status', 'Last Login'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK_USERS.map(u => (
              <tr key={u.id}>
                <td style={s.td}>{u.username}</td>
                <td style={{ ...s.td, color: '#9ca3af' }}>{u.email}</td>
                <td style={s.td}><span style={s.roleBadge(u.role)}>{u.role}</span></td>
                <td style={{ ...s.td, color: u.status === 'active' ? '#22c55e' : '#ef4444' }}>{u.status}</td>
                <td style={{ ...s.td, color: '#9ca3af' }}>{new Date(u.lastLogin).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* System Info */}
      {securityStatus && (
        <div style={s.section}>
          <div style={s.sectionTitle}><Server size={18} color="#a78bfa" /> System Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {[
              { label: 'OS', value: `${securityStatus.os?.platform} ${securityStatus.os?.arch}` },
              { label: 'Node.js', value: securityStatus.nodeVersion },
              { label: 'CPU Cores', value: securityStatus.os?.cpus },
              { label: 'Heap Used', value: `${securityStatus.memoryMB?.heapUsed}MB` },
              { label: 'Free Memory', value: `${securityStatus.os?.freeMemMB}MB` },
              { label: 'Encryption', value: securityStatus.encryptionAlgorithm },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '0.9rem', color: '#e5e7eb', fontWeight: '500' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
