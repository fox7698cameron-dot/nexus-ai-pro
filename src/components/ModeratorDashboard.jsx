/**
 * src/components/ModeratorDashboard.jsx
 * Nexus AI Pro — Moderator Dashboard
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Moderator role: content review queue, user reports, action log,
 * ban/warn actions. Read-only access to user list (no role changes).
 */

import React, { useState, useEffect } from 'react';
import AuthService from '../auth/AuthService.js';
import { formatDate } from '../i18n/index.js';

function getHeaders() {
  const token = AuthService.getToken();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { ...getHeaders(), ...(opts.headers ?? {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

const REPORT_TYPES = {
  spam:        { label: 'Spam',           color: '#f59e0b', icon: '📧' },
  harassment:  { label: 'Harassment',     color: '#ef4444', icon: '⚠️' },
  inappropriate:{ label: 'Inappropriate', color: '#dc2626', icon: '🚫' },
  abuse:       { label: 'Abuse',          color: '#7c3aed', icon: '🛑' },
  other:       { label: 'Other',          color: '#6b7280', icon: '❓' },
};

function ReportCard({ report, onAction }) {
  const rt = REPORT_TYPES[report.type] ?? REPORT_TYPES.other;
  return (
    <div style={{
      background: '#12121f', border: `1px solid ${rt.color}40`, borderRadius: 12, padding: '16px', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{rt.icon}</span>
          <div>
            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{rt.label}</div>
            <div style={{ color: '#555', fontSize: 11 }}>Reported by {report.reportedBy} · {formatDate(report.createdAt)}</div>
          </div>
        </div>
        <span style={{
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
          background: `${rt.color}20`, color: rt.color,
        }}>
          {report.status?.toUpperCase() ?? 'PENDING'}
        </span>
      </div>
      {report.content && (
        <div style={{
          background: '#0f0f1a', border: '1px solid #2d2d44', borderRadius: 8,
          padding: '10px 12px', fontSize: 13, color: '#888', marginBottom: 12,
          fontFamily: 'monospace', wordBreak: 'break-word',
        }}>
          {report.content.slice(0, 200)}{report.content.length > 200 ? '…' : ''}
        </div>
      )}
      {report.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onAction(report.id, 'dismiss')} style={{
            flex: 1, padding: '7px', background: '#1a1a2e', color: '#888',
            border: '1px solid #2d2d44', borderRadius: 6, cursor: 'pointer', fontSize: 12,
          }}>
            Dismiss
          </button>
          <button onClick={() => onAction(report.id, 'warn')} style={{
            flex: 1, padding: '7px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>
            Warn User
          </button>
          <button onClick={() => onAction(report.id, 'suspend')} style={{
            flex: 1, padding: '7px', background: 'rgba(239,68,68,0.15)', color: '#ef4444',
            border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>
            Suspend
          </button>
        </div>
      )}
    </div>
  );
}

export default function ModeratorDashboard() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter]   = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/moderator/reports')
      .then(d => setReports(d.reports ?? []))
      .catch(err => console.error('Load reports failed:', err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleAction(reportId, action) {
    await apiFetch(`/api/moderator/reports/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    });
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: action === 'dismiss' ? 'dismissed' : 'actioned' } : r));
  }

  if (!AuthService.isModerator()) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>🚫 Moderator access required</div>;
  }

  const filtered = reports.filter(r => filter === 'all' || r.status === filter);
  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Moderator Dashboard
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'inline-block', padding: '3px 10px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
            MODERATOR
          </div>
          {pendingCount > 0 && (
            <div style={{ padding: '3px 10px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
              {pendingCount} PENDING
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {['pending', 'actioned', 'dismissed', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 14px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: filter === f ? '#3b82f6' : '#1f1f2e', color: filter === f ? '#fff' : '#888',
            textTransform: 'capitalize',
          }}>
            {f} {f === 'pending' && pendingCount > 0 ? `(${pendingCount})` : ''}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>Loading reports…</div>}

      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: 60, border: '2px dashed #2d2d44', borderRadius: 14, color: '#555',
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
          <div>No reports in this queue</div>
        </div>
      )}

      {!loading && filtered.map(r => (
        <ReportCard key={r.id} report={r} onAction={handleAction} />
      ))}
    </div>
  );
}
