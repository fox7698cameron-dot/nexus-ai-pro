/**
 * src/components/analytics/AnalyticsDashboard.jsx
 * Nexus AI Pro — Social Media Analytics Dashboard
 * Labeled: 2026-08-25
 *
 * Real-time analytics for TikTok, Instagram, Facebook, Twitch,
 * Discord, Lemon8, Reddit, and RedGifs.
 * Metrics: views, likes, reach, retention, engagement, watch time.
 * All API calls go through the Nexus backend — no platform tokens
 * are ever sent from the browser.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Platform registry ─────────────────────────────────────────────────────────
const PLATFORMS = [
  { id: 'tiktok',    label: 'TikTok',     emoji: '🎵', color: '#010101',   bg: '#fef3f3' },
  { id: 'instagram', label: 'Instagram',  emoji: '📸', color: '#c13584',   bg: '#fdf0f8' },
  { id: 'facebook',  label: 'Facebook',   emoji: '👥', color: '#1877f2',   bg: '#f0f6ff' },
  { id: 'twitch',    label: 'Twitch',     emoji: '🎮', color: '#9146ff',   bg: '#f4f0ff' },
  { id: 'discord',   label: 'Discord',    emoji: '💬', color: '#5865f2',   bg: '#f0f0ff' },
  { id: 'lemon8',    label: 'Lemon8',     emoji: '🍋', color: '#f7b900',   bg: '#fffbf0' },
  { id: 'reddit',    label: 'Reddit',     emoji: '🤖', color: '#ff4500',   bg: '#fff5f2' },
  { id: 'redgifs',   label: 'RedGifs',    emoji: '🎬', color: '#e60023',   bg: '#fff2f3' }
];

const PERIODS = [
  { value: 7,   label: '7 Days'  },
  { value: 14,  label: '14 Days' },
  { value: 30,  label: '30 Days' },
  { value: 90,  label: '90 Days' }
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtPct(n) {
  if (n === null || n === undefined) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('nexus:accessToken');
  const res   = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Mini sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, width = 120, height = 36, color = '#6366f1' }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
    </svg>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, trend, sparkData, color }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border:     '1px solid var(--border)',
      borderRadius: 12,
      padding:    '16px 20px',
      display:    'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 0
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sub}</span>
      )}
      {sparkData && (
        <Sparkline data={sparkData} color={color || '#6366f1'} />
      )}
      {trend !== undefined && (
        <span style={{ fontSize: 13, color: trend >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

// ── Platform badge ────────────────────────────────────────────────────────────
function PlatformBadge({ platform, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:           8,
        padding:       '8px 14px',
        borderRadius:  8,
        border:        active ? `2px solid ${platform.color}` : '2px solid transparent',
        background:    active ? platform.bg : 'var(--card-bg)',
        cursor:        'pointer',
        fontWeight:    active ? 700 : 500,
        fontSize:      14,
        color:         active ? platform.color : 'var(--text-muted)',
        transition:    'all 0.15s'
      }}
      aria-pressed={active}
    >
      <span aria-hidden="true">{platform.emoji}</span>
      {platform.label}
    </button>
  );
}

// ── Connect account modal ─────────────────────────────────────────────────────
function ConnectModal({ platform, onClose, onConnect }) {
  const [accountId, setAccountId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!accountId.trim()) { setError('Account ID required'); return; }
    setLoading(true);
    setError('');
    try {
      await apiFetch('/analytics/accounts', {
        method: 'POST',
        body: JSON.stringify({ platform: platform.id, accountId: accountId.trim(), displayName: displayName.trim() || accountId.trim() })
      });
      onConnect();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: 16, padding: 32,
        minWidth: 360, maxWidth: '90vw', border: '1px solid var(--border)'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>
          Connect {platform.emoji} {platform.label}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Account / Username / Channel ID
            </label>
            <input
              value={accountId}
              onChange={e => setAccountId(e.target.value)}
              placeholder={`Your ${platform.label} username`}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--input-bg)',
                color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Display Name (optional)
            </label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Custom display name"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--input-bg)',
                color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box'
              }}
            />
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{
              padding: '10px 18px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--text-muted)'
            }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              padding: '10px 18px', borderRadius: 8, border: 'none',
              background: platform.color, color: '#fff', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0]);
  const [period,           setPeriod]           = useState(7);
  const [accounts,         setAccounts]         = useState([]);
  const [metrics,          setMetrics]          = useState(null);
  const [summary,          setSummary]          = useState(null);
  const [realtime,         setRealtime]         = useState(null);
  const [trending,         setTrending]         = useState([]);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState('');
  const [showConnect,      setShowConnect]      = useState(false);
  const realtimeRef = useRef(null);

  // Load connected accounts
  const loadAccounts = useCallback(async () => {
    try {
      const data = await apiFetch('/analytics/accounts');
      setAccounts(data.accounts || []);
    } catch {}
  }, []);

  // Load cross-platform summary
  const loadSummary = useCallback(async () => {
    try {
      const data = await apiFetch(`/analytics/summary?period=${period}`);
      setSummary(data);
    } catch {}
  }, [period]);

  // Load per-platform metrics
  const loadMetrics = useCallback(async () => {
    const account = accounts.find(a => a.platform === selectedPlatform.id);
    if (!account) { setMetrics(null); return; }
    setLoading(true);
    setError('');
    try {
      const [m, t] = await Promise.all([
        apiFetch(`/analytics/${selectedPlatform.id}/${account.accountId}?period=${period}`),
        apiFetch(`/analytics/${selectedPlatform.id}/${account.accountId}/trending?limit=10`)
      ]);
      setMetrics(m);
      setTrending(t.content || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPlatform, accounts, period]);

  // Real-time polling
  const pollRealtime = useCallback(async () => {
    const account = accounts.find(a => a.platform === selectedPlatform.id);
    if (!account) return;
    try {
      const rt = await apiFetch(`/analytics/${selectedPlatform.id}/${account.accountId}/realtime`);
      setRealtime(rt);
    } catch {}
  }, [selectedPlatform, accounts]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadSummary(); }, [loadSummary, accounts]);
  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  // Real-time polling every 10 s
  useEffect(() => {
    pollRealtime();
    realtimeRef.current = setInterval(pollRealtime, 10_000);
    return () => clearInterval(realtimeRef.current);
  }, [pollRealtime]);

  const currentAccount = accounts.find(a => a.platform === selectedPlatform.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '0 4px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📊 Analytics Dashboard</h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Real-time social media metrics across all platforms
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={period}
            onChange={e => setPeriod(Number(e.target.value))}
            style={{
              padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 14
            }}
          >
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Cross-platform summary */}
      {summary && !summary.message && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>
            Cross-Platform Totals
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 12
          }}>
            <MetricCard label="Total Views"     value={fmtNum(summary.totalViews)}      color="#6366f1" />
            <MetricCard label="Total Likes"     value={fmtNum(summary.totalLikes)}      color="#ec4899" />
            <MetricCard label="Total Reach"     value={fmtNum(summary.totalReach)}      color="#f59e0b" />
            <MetricCard label="Total Followers" value={fmtNum(summary.totalFollowers)}  color="#10b981" />
            <MetricCard label="Avg Engagement"  value={`${summary.avgEngagement}%`}     color="#8b5cf6" />
            <MetricCard label="Avg Retention"   value={fmtPct(summary.avgRetention)}   color="#06b6d4" />
          </div>
        </div>
      )}

      {/* Platform selector */}
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: 'var(--text-muted)' }}>
          Platforms
        </h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => (
            <PlatformBadge
              key={p.id}
              platform={p}
              active={selectedPlatform.id === p.id}
              onClick={() => setSelectedPlatform(p)}
            />
          ))}
        </div>
      </div>

      {/* Platform detail */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }} aria-hidden="true">{selectedPlatform.emoji}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedPlatform.label}</h3>
              {currentAccount && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                  @{currentAccount.displayName}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!currentAccount ? (
              <button
                onClick={() => setShowConnect(true)}
                style={{
                  padding: '9px 16px', borderRadius: 8, border: 'none',
                  background: selectedPlatform.color, color: '#fff',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600
                }}
              >
                + Connect Account
              </button>
            ) : (
              <span style={{
                padding: '6px 12px', borderRadius: 20,
                background: '#dcfce7', color: '#15803d', fontSize: 13, fontWeight: 600
              }}>
                ✓ Connected
              </span>
            )}
          </div>
        </div>

        {!currentAccount ? (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            color: 'var(--text-muted)', fontSize: 15
          }}>
            <p style={{ margin: 0, fontSize: 40 }} aria-hidden="true">{selectedPlatform.emoji}</p>
            <p style={{ margin: '12px 0 0' }}>Connect your {selectedPlatform.label} account to view analytics</p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Loading metrics…
          </div>
        ) : error ? (
          <div style={{
            padding: 16, borderRadius: 8, background: '#fef2f2',
            color: '#991b1b', fontSize: 14
          }}>
            {error}
          </div>
        ) : metrics ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Real-time strip */}
            {realtime && (
              <div style={{
                display: 'flex', gap: 12, flexWrap: 'wrap',
                padding: '12px 16px', borderRadius: 10,
                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                color: '#fff'
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, alignSelf: 'center' }}>🔴 LIVE</span>
                {[
                  { label: 'Views',    value: fmtNum(realtime.views)    },
                  { label: 'Likes',    value: fmtNum(realtime.likes)    },
                  { label: 'Comments', value: fmtNum(realtime.comments) },
                  { label: 'Online',   value: fmtNum(realtime.online)   }
                ].map(item => (
                  <div key={item.label} style={{ fontSize: 13, opacity: 0.9 }}>
                    <strong>{item.value}</strong> {item.label}
                  </div>
                ))}
              </div>
            )}

            {/* Metric grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12
            }}>
              <MetricCard
                label="Views"
                value={fmtNum(metrics.totals?.views)}
                sparkData={metrics.daily?.map(d => d.views)}
                color={selectedPlatform.color}
              />
              <MetricCard
                label="Likes"
                value={fmtNum(metrics.totals?.likes)}
                sparkData={metrics.daily?.map(d => d.likes)}
                color="#ec4899"
              />
              <MetricCard
                label="Reach"
                value={fmtNum(metrics.totals?.reach)}
                sparkData={metrics.daily?.map(d => d.reach)}
                color="#f59e0b"
              />
              <MetricCard
                label="Shares"
                value={fmtNum(metrics.totals?.shares)}
                sparkData={metrics.daily?.map(d => d.shares)}
                color="#10b981"
              />
              <MetricCard
                label="Comments"
                value={fmtNum(metrics.totals?.comments)}
                sparkData={metrics.daily?.map(d => d.comments)}
                color="#6366f1"
              />
              <MetricCard
                label="Avg Retention"
                value={fmtPct(metrics.daily?.[0]?.retention)}
                color="#8b5cf6"
              />
              <MetricCard
                label="Engagement"
                value={`${metrics.engagement || 0}%`}
                color="#06b6d4"
              />
              <MetricCard
                label="Followers"
                value={fmtNum(metrics.followers)}
                color="#84cc16"
              />
            </div>

            {/* Trending content */}
            {trending.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600 }}>Top Performing Content</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['#', 'Type', 'Views', 'Likes', 'Retention', 'Published'].map(h => (
                          <th key={h} style={{
                            padding: '8px 12px', textAlign: 'left',
                            color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap'
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trending.map((item, i) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>{item.type}</td>
                          <td style={{ padding: '10px 12px' }}>{fmtNum(item.views)}</td>
                          <td style={{ padding: '10px 12px' }}>{fmtNum(item.likes)}</td>
                          <td style={{ padding: '10px 12px' }}>{fmtPct(item.retention)}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(item.publishedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Connect modal */}
      {showConnect && (
        <ConnectModal
          platform={selectedPlatform}
          onClose={() => setShowConnect(false)}
          onConnect={loadAccounts}
        />
      )}
    </div>
  );
}
