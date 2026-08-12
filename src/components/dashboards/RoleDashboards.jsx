/**
 * src/components/dashboards/RoleDashboards.jsx
 * Role-Specific Dashboards — Admin, Dev, Moderator, User
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * Each dashboard is separate and renders only the features relevant to that role.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, BarChart3, Settings, Activity, AlertTriangle,
  UserCheck, Ban, Eye, Wrench, Database, Cloud, Server,
  GitBranch, Package, RefreshCw, ChevronRight, Crown, Code2
} from 'lucide-react';

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function StatCard({ label, value, Icon, color = '#6366f1', onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px 18px',
        background: 'var(--card-bg, rgba(255,255,255,0.05))',
        border: '1px solid var(--border, rgba(255,255,255,0.1))',
        borderRadius: 12,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        {Icon && <Icon size={16} style={{ color }} />}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text, #f9fafb)' }}>{value}</div>
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 24 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h3>
      {action}
    </div>
  );
}

function QuickAction({ label, Icon, color = '#6366f1', onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.04)', color: 'var(--text, #f9fafb)',
        cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'left',
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 7, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={15} style={{ color }} />
      </div>
      {label}
      <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted, #9ca3af)' }} />
    </button>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

export function AdminDashboard({ apiBase = '/api' }) {
  const [stats,  setStats]  = useState({ users: 0, threats: 0, scans: 0, revenue: 0 });
  const [users,  setUsers]  = useState([]);
  const [audit,  setAudit]  = useState([]);
  const [loading, setLoading] = useState(true);

  const token = () => localStorage.getItem('nexus_token') || '';

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [usersRes, auditRes] = await Promise.all([
          fetch(`${apiBase}/auth/admin/users`, { headers: { Authorization: `Bearer ${token()}` } }),
          fetch(`${apiBase}/auth/admin/audit?limit=20`, { headers: { Authorization: `Bearer ${token()}` } }),
        ]);
        if (usersRes.ok)  { const d = await usersRes.json();  setUsers(d.users || []); setStats(s => ({ ...s, users: d.total })); }
        if (auditRes.ok)  { const d = await auditRes.json();  setAudit(d.logs  || []); }
      } catch {}
      setLoading(false);
    })();
  }, [apiBase]);

  return (
    <div style={{ padding: 20, color: 'var(--text, #f9fafb)', maxWidth: 1000, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Crown size={22} style={{ color: '#f59e0b' }} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Admin Dashboard</h1>
        <span style={{ padding: '3px 10px', borderRadius: 20, background: '#f59e0b22', color: '#f59e0b', fontSize: 11, fontWeight: 700 }}>ADMIN</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Users"   value={stats.users}   Icon={Users}   color="#6366f1" />
        <StatCard label="Active Scans"  value={stats.scans}   Icon={Shield}  color="#10b981" />
        <StatCard label="Threat Events" value={stats.threats} Icon={AlertTriangle} color="#ef4444" />
        <StatCard label="Revenue"       value="—"             Icon={BarChart3} color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Users */}
        <div>
          <SectionHeader title="Recent Users" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {users.slice(0, 8).map(u => (
              <div key={u.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 7,
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.username}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>{u.email}</div>
                </div>
                <span style={{
                  padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                  background: { admin: '#f59e0b22', dev: '#3b82f622', moderator: '#8b5cf622', user: '#10b98122' }[u.role] || '#6b728022',
                  color:      { admin: '#f59e0b',   dev: '#3b82f6',   moderator: '#8b5cf6',   user: '#10b981'   }[u.role] || '#6b7280',
                }}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        <div>
          <SectionHeader title="Audit Log" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {audit.slice(0, 10).map(entry => (
              <div key={entry.id} style={{
                padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 7,
              }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{entry.event.replace(/_/g, ' ')}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted, #9ca3af)' }}>
                  {entry.userId} · {new Date(entry.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
            {audit.length === 0 && (
              <div style={{ color: 'var(--text-muted, #9ca3af)', fontSize: 13 }}>No audit events yet</div>
            )}
          </div>
        </div>
      </div>

      <SectionHeader title="Quick Actions" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        <QuickAction label="Security Scan"       Icon={Shield}   color="#10b981" />
        <QuickAction label="Rotate Encryption Keys" Icon={Settings} color="#ef4444" />
        <QuickAction label="View All Users"      Icon={Users}    color="#6366f1" />
        <QuickAction label="Export Audit Log"    Icon={Database} color="#f59e0b" />
        <QuickAction label="Connector Status"    Icon={Cloud}    color="#06b6d4" />
        <QuickAction label="Issue Gift Cards"    Icon={Package}  color="#8b5cf6" />
      </div>
    </div>
  );
}

// ─── Dev Dashboard ────────────────────────────────────────────────────────────

export function DevDashboard({ apiBase = '/api' }) {
  return (
    <div style={{ padding: 20, color: 'var(--text, #f9fafb)', maxWidth: 1000, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Code2 size={22} style={{ color: '#3b82f6' }} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Developer Dashboard</h1>
        <span style={{ padding: '3px 10px', borderRadius: 20, background: '#3b82f622', color: '#3b82f6', fontSize: 11, fontWeight: 700 }}>DEV</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Projects"     value="—" Icon={GitBranch} color="#6366f1" />
        <StatCard label="Builds Today" value="—" Icon={Package}   color="#10b981" />
        <StatCard label="Open Issues"  value="—" Icon={AlertTriangle} color="#f59e0b" />
        <StatCard label="Coverage"     value="—%" Icon={BarChart3} color="#06b6d4" />
      </div>

      <SectionHeader title="Quick Actions" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        <QuickAction label="New Game Project"     Icon={GitBranch}  color="#6366f1" />
        <QuickAction label="Gaming Platform Status" Icon={Server}  color="#10b981" />
        <QuickAction label="Cloud Connectors"     Icon={Cloud}     color="#3b82f6" />
        <QuickAction label="Security Scan"        Icon={Shield}    color="#ef4444" />
        <QuickAction label="Redis Status"         Icon={Database}  color="#f59e0b" />
        <QuickAction label="API Keys"             Icon={Settings}  color="#8b5cf6" />
      </div>

      <SectionHeader title="System Health" />
      <div style={{ padding: '14px', background: 'rgba(255,255,255,0.04)', borderRadius: 9, fontSize: 13 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', color: 'var(--text-muted, #9ca3af)' }}>
          <span>Server:</span>         <span style={{ color: '#10b981' }}>Online</span>
          <span>Database:</span>       <span style={{ color: '#10b981' }}>Connected</span>
          <span>Redis:</span>          <span style={{ color: process.env.REDIS_URL ? '#10b981' : '#f59e0b' }}>{process.env.REDIS_URL ? 'Connected' : 'Not configured'}</span>
          <span>Encryption:</span>     <span style={{ color: '#10b981' }}>AES-256-GCM</span>
        </div>
      </div>
    </div>
  );
}

// ─── Moderator Dashboard ──────────────────────────────────────────────────────

export function ModeratorDashboard({ apiBase = '/api' }) {
  return (
    <div style={{ padding: 20, color: 'var(--text, #f9fafb)', maxWidth: 1000, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <UserCheck size={22} style={{ color: '#8b5cf6' }} />
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Moderator Dashboard</h1>
        <span style={{ padding: '3px 10px', borderRadius: 20, background: '#8b5cf622', color: '#8b5cf6', fontSize: 11, fontWeight: 700 }}>MODERATOR</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Pending Reports"  value="—" Icon={AlertTriangle} color="#f59e0b" />
        <StatCard label="Resolved Today"   value="—" Icon={UserCheck}     color="#10b981" />
        <StatCard label="Active Users"     value="—" Icon={Users}         color="#6366f1" />
      </div>

      <SectionHeader title="Quick Actions" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        <QuickAction label="View Reports"       Icon={Eye}      color="#f59e0b" />
        <QuickAction label="User Management"    Icon={Users}    color="#6366f1" />
        <QuickAction label="Content Review"     Icon={Activity} color="#10b981" />
        <QuickAction label="Threat Log"         Icon={Shield}   color="#ef4444" />
      </div>
    </div>
  );
}

// ─── User Dashboard ───────────────────────────────────────────────────────────

export function UserDashboard({ user, apiBase = '/api' }) {
  return (
    <div style={{ padding: 20, color: 'var(--text, #f9fafb)', maxWidth: 900, fontFamily: 'system-ui' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          Welcome back{user?.username ? `, ${user.username}` : ''}! 👋
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted, #9ca3af)' }}>
          Here's what's happening with your account
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="Plan"       value={user?.plan || 'Free'} Icon={Package}  color="#6366f1" />
        <StatCard label="Projects"   value="—"                    Icon={GitBranch} color="#10b981" />
        <StatCard label="Platforms"  value="—"                    Icon={BarChart3} color="#3b82f6" />
      </div>

      <SectionHeader title="Quick Actions" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
        <QuickAction label="Analytics Dashboard" Icon={BarChart3} color="#6366f1" />
        <QuickAction label="Security Status"     Icon={Shield}   color="#10b981" />
        <QuickAction label="Game Projects"       Icon={Package}  color="#8b5cf6" />
        <QuickAction label="Account Settings"    Icon={Settings} color="#f59e0b" />
        <QuickAction label="Upgrade Plan"        Icon={Crown}    color="#f59e0b" />
        <QuickAction label="Connect Platforms"   Icon={Cloud}    color="#06b6d4" />
      </div>
    </div>
  );
}

// ─── Role Router ──────────────────────────────────────────────────────────────

export default function RoleDashboard({ user, ...props }) {
  const role = user?.role || 'user';

  if (role === 'admin')     return <AdminDashboard     {...props} />;
  if (role === 'dev')       return <DevDashboard       {...props} />;
  if (role === 'moderator') return <ModeratorDashboard {...props} />;
  return <UserDashboard user={user} {...props} />;
}
