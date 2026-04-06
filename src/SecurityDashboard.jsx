/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Real-time Security Dashboard
 * Works on Web, Electron, iOS, and Android (via Capacitor)
 * Uses WebSocket for live threat feed and network metrics.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { securityService } from './security-service.js';

const POLL_INTERVAL = 30000;
const SCORE_HIGH = 80;
const SCORE_MED = 60;

function scoreColor(s) {
  if (s >= SCORE_HIGH) return '#16b981';
  if (s >= SCORE_MED) return '#f59e0b';
  return '#ef4444';
}

function severityColor(sev) {
  switch ((sev || '').toLowerCase()) {
    case 'critical': return '#dc2626';
    case 'high':     return '#ef4444';
    case 'medium':   return '#f59e0b';
    case 'low':      return '#3b82f6';
    default:         return '#6b7280';
  }
}

function statusColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'blocked':   return '#16b981';
    case 'prevented': return '#3b82f6';
    case 'detected':  return '#f59e0b';
    default:          return '#6b7280';
  }
}

function fmt(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function relTime(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div style={{
      background: '#111',
      border: '1px solid #2a2a2a',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      ...style
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px 0' }}>
      {children}
    </h3>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{
      padding: '3px 8px',
      background: `${color}22`,
      color,
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }}>
      {label}
    </span>
  );
}

function ScoreRing({ score }) {
  const c = scoreColor(score);
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#222" strokeWidth="10" />
      <circle
        cx="55" cy="55" r={r} fill="none"
        stroke={c} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text x="55" y="51" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="700">{score}</text>
      <text x="55" y="67" textAnchor="middle" fill="#666" fontSize="10">/100</text>
    </svg>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: '22px', fontWeight: '700', color: color || '#fff' }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{label}</div>
      {sub && <div style={{ fontSize: '10px', color: '#555', marginTop: '1px' }}>{sub}</div>}
    </div>
  );
}

function LiveDot({ active }) {
  return (
    <span style={{
      display: 'inline-block',
      width: '8px', height: '8px',
      borderRadius: '50%',
      background: active ? '#16b981' : '#555',
      marginRight: '6px',
      boxShadow: active ? '0 0 6px #16b981' : 'none',
      animation: active ? 'pulse 1.5s infinite' : 'none'
    }} />
  );
}

// ─── main component ───────────────────────────────────────────────────────────

const SecurityDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [network, setNetwork] = useState(null);
  const [threatFeed, setThreatFeed] = useState([]);
  const [malwareFeed, setMalwareFeed] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const socketRef = useRef(null);
  const pollRef = useRef(null);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await securityService.getDashboard();
      setDashboard(data);
      if (data.network) setNetwork(data.network);
      if (data.threats) {
        setThreatFeed(prev => {
          const combined = [...data.threats, ...prev];
          const seen = new Set();
          return combined.filter(t => {
            const key = `${t.timestamp}-${t.type}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).slice(0, 50);
        });
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // WebSocket for real-time events
  useEffect(() => {
    loadDashboard();
    pollRef.current = setInterval(loadDashboard, POLL_INTERVAL);

    // Connect Socket.io for real-time updates
    try {
      const { io } = window;
      if (io) {
        const socket = io({ transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
          setWsConnected(true);
          socket.emit('security:subscribe');
        });

        socket.on('disconnect', () => setWsConnected(false));

        socket.on('security:network', (metrics) => setNetwork(metrics));

        socket.on('security:threat', (event) => {
          setThreatFeed(prev => [{
            type: event.threats?.[0]?.type || 'UNKNOWN',
            severity: event.threats?.[0]?.severity || 'medium',
            status: event.blocked ? 'blocked' : 'detected',
            ip: event.ip,
            timestamp: event.timestamp
          }, ...prev].slice(0, 50));
        });

        socket.on('security:malware', (event) => {
          setMalwareFeed(prev => [event, ...prev].slice(0, 20));
        });

        return () => {
          socket.emit('security:unsubscribe');
          socket.disconnect();
          clearInterval(pollRef.current);
        };
      }
    } catch (_) {}

    return () => clearInterval(pollRef.current);
  }, [loadDashboard]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const data = await securityService.runScan();
      setDashboard(prev => ({ ...prev, ...data }));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePatch = async (vulnId) => {
    try {
      const result = await securityService.patchVulnerability(vulnId);
      if (result.success) {
        setDashboard(prev => ({
          ...prev,
          vulnerabilities: (prev.vulnerabilities || []).map(v =>
            v.id === vulnId ? { ...v, status: 'patched' } : v
          ),
          overallScore: Math.min(100, (prev.overallScore || 0) + 3)
        }));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const tabs = ['overview', 'network', 'threats', 'malware', 'audit'];

  if (!dashboard) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#555' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚙</div>
          <div style={{ fontSize: '13px' }}>Initializing security dashboard...</div>
        </div>
      </div>
    );
  }

  const score = dashboard.overallScore || 0;
  const vulns = dashboard.vulnerabilities || [];
  const audit = dashboard.recentActivity || [];

  return (
    <div style={{ color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '14px', maxWidth: '900px' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Security Dashboard</h2>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
            <LiveDot active={wsConnected} />
            {wsConnected ? 'Live — real-time updates active' : 'Polling every 30s'}
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          style={{
            padding: '8px 16px',
            background: isScanning ? '#333' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: isScanning ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: '600'
          }}
        >
          {isScanning ? '⟳ Scanning…' : '⚡ Run Scan'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: '#2a0a0a', border: '1px solid #7f1d1d', borderRadius: '8px', color: '#fca5a5', fontSize: '12px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '0' }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '8px 14px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t ? '2px solid #3b82f6' : '2px solid transparent',
              color: activeTab === t ? '#3b82f6' : '#666',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === t ? '600' : '400',
              textTransform: 'capitalize'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <ScoreRing score={score} />
              <div style={{ flex: 1, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <StatBox label="Encryption" value="AES-256-GCM" color="#16b981" />
                <StatBox label="Threats Blocked" value={dashboard.threatsBlocked || 0} color="#ef4444" />
                <StatBox label="Patches Applied" value={dashboard.patchesApplied || 0} color="#3b82f6" />
                <StatBox label="Audit Events" value={dashboard.auditLogSize || 0} />
              </div>
            </div>
          </Card>

          <SectionTitle>Vulnerabilities ({vulns.length})</SectionTitle>
          {vulns.length === 0 && (
            <Card><div style={{ color: '#16b981', fontSize: '13px' }}>✓ No vulnerabilities detected</div></Card>
          )}
          {vulns.map(vuln => (
            <Card key={vuln.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '600', fontSize: '13px' }}>{vuln.name}</span>
                    <Badge label={vuln.severity} color={severityColor(vuln.severity)} />
                    {vuln.source === 'npm-audit' && <Badge label="npm" color="#8b5cf6" />}
                    {vuln.cvss && <Badge label={`CVSS ${vuln.cvss}`} color={severityColor(vuln.severity)} />}
                  </div>
                  <div style={{ fontSize: '12px', color: '#777' }}>{vuln.description}</div>
                  {vuln.url && (
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                      <a href={vuln.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>{vuln.url}</a>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <Badge label={vuln.status} color={vuln.status === 'patched' ? '#16b981' : statusColor(vuln.status)} />
                  {vuln.status !== 'patched' && (
                    <button
                      onClick={() => handlePatch(vuln.id)}
                      style={{ padding: '5px 10px', background: '#16b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
                    >
                      Apply Patch
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* ── NETWORK TAB ── */}
      {activeTab === 'network' && (
        <>
          <Card>
            <SectionTitle>Network Metrics <LiveDot active={wsConnected} /></SectionTitle>
            {!network
              ? <div style={{ color: '#555', fontSize: '13px' }}>No network data yet</div>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                  <StatBox label="Total Requests" value={network.totalRequests?.toLocaleString()} />
                  <StatBox label="Blocked" value={network.blockedRequests} color="#ef4444" />
                  <StatBox label="Unique IPs" value={network.uniqueIPs} />
                  <StatBox label="Avg Req/s" value={network.avgRequestsPerSecond} color="#3b82f6" />
                  <StatBox label="Bytes In" value={fmt(network.bytesIn)} />
                  <StatBox label="Bytes Out" value={fmt(network.bytesOut)} />
                  <StatBox label="Uptime" value={`${Math.floor(network.uptime / 3600)}h ${Math.floor((network.uptime % 3600) / 60)}m`} />
                  <StatBox label="Heap Used" value={fmt(network.memUsage?.heapUsed || 0)} />
                  <StatBox label="CPU Load 1m" value={(network.cpuLoad?.[0] || 0).toFixed(2)} />
                </div>
              )
            }
          </Card>

          <Card>
            <SectionTitle>HTTP Status Codes</SectionTitle>
            {!network?.statusCounts || Object.keys(network.statusCounts).length === 0
              ? <div style={{ color: '#555', fontSize: '13px' }}>No requests logged yet</div>
              : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {Object.entries(network.statusCounts).sort().map(([code, count]) => (
                    <div key={code} style={{ textAlign: 'center', minWidth: '60px' }}>
                      <div style={{
                        fontSize: '18px', fontWeight: '700',
                        color: code.startsWith('2') ? '#16b981' : code.startsWith('4') ? '#f59e0b' : code.startsWith('5') ? '#ef4444' : '#aaa'
                      }}>
                        {count}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666' }}>{code}</div>
                    </div>
                  ))}
                </div>
              )
            }
          </Card>
        </>
      )}

      {/* ── THREATS TAB ── */}
      {activeTab === 'threats' && (
        <>
          <Card style={{ marginBottom: '16px' }}>
            <SectionTitle>Live Threat Feed <LiveDot active={wsConnected} /></SectionTitle>
            <div style={{ fontSize: '12px', color: '#555' }}>
              {threatFeed.length === 0 ? 'No threats detected' : `${threatFeed.length} events (last 50 shown)`}
            </div>
          </Card>
          {threatFeed.length === 0 && (
            <Card><div style={{ color: '#16b981', fontSize: '13px' }}>✓ No threats in feed</div></Card>
          )}
          {threatFeed.map((t, i) => (
            <Card key={`${t.timestamp}-${i}`} style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: '600', fontSize: '13px' }}>{t.type}</span>
                    {t.severity && <Badge label={t.severity} color={severityColor(t.severity)} />}
                  </div>
                  {t.ip && <div style={{ fontSize: '11px', color: '#555' }}>IP: {t.ip}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <Badge label={t.status || 'detected'} color={statusColor(t.status)} />
                  <span style={{ fontSize: '11px', color: '#555' }}>{relTime(t.timestamp)}</span>
                </div>
              </div>
            </Card>
          ))}
        </>
      )}

      {/* ── MALWARE TAB ── */}
      {activeTab === 'malware' && (
        <>
          <Card>
            <SectionTitle>File Scan Results <LiveDot active={wsConnected} /></SectionTitle>
            <div style={{ fontSize: '12px', color: '#555' }}>
              Files are scanned for known signatures, high entropy, and suspicious patterns on upload.
            </div>
          </Card>
          {malwareFeed.length === 0 && (
            <Card><div style={{ color: '#16b981', fontSize: '13px' }}>✓ No malware detected in uploads</div></Card>
          )}
          {malwareFeed.map((scan, i) => (
            <Card key={`${scan.filename}-${i}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>{scan.filename}</div>
                  <div style={{ fontSize: '11px', color: '#555' }}>{fmt(scan.size || 0)} · {relTime(scan.scannedAt)}</div>
                </div>
                <Badge label={scan.clean ? 'clean' : 'flagged'} color={scan.clean ? '#16b981' : '#ef4444'} />
              </div>
              {(scan.findings || []).map((f, fi) => (
                <div key={fi} style={{ padding: '6px 10px', background: '#1a1a1a', borderRadius: '6px', marginTop: '6px', fontSize: '12px' }}>
                  <Badge label={f.severity} color={severityColor(f.severity)} />
                  <span style={{ color: '#ddd', marginLeft: '8px' }}>{f.name}</span>
                  {f.entropy && <span style={{ color: '#777', marginLeft: '6px' }}>entropy: {f.entropy}</span>}
                </div>
              ))}
            </Card>
          ))}
        </>
      )}

      {/* ── AUDIT LOG TAB ── */}
      {activeTab === 'audit' && (
        <>
          <Card>
            <SectionTitle>Audit Log (last 20 events)</SectionTitle>
            {audit.length === 0 && <div style={{ color: '#555', fontSize: '13px' }}>No audit events yet</div>}
            {audit.map((entry, i) => (
              <div key={entry.id || i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < audit.length - 1 ? '1px solid #1a1a1a' : 'none',
                gap: '8px', flexWrap: 'wrap'
              }}>
                <div>
                  <span style={{ fontWeight: '600', fontSize: '12px', color: entry.event?.includes('ERROR') || entry.event?.includes('THREAT') ? '#ef4444' : '#ddd' }}>
                    {entry.event}
                  </span>
                  {entry.details?.path && (
                    <span style={{ fontSize: '11px', color: '#555', marginLeft: '6px' }}>{entry.details.path}</span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: '#555', whiteSpace: 'nowrap' }}>{relTime(entry.timestamp)}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {/* Encryption footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#0a0a0a', borderRadius: '8px', marginTop: '4px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16b981', display: 'inline-block' }} />
        <span style={{ fontSize: '12px', color: '#666' }}>
          AES-256-GCM active · ECDH P2P key exchange available · PBKDF2 100k iterations
        </span>
      </div>
    </div>
  );
};

export default SecurityDashboard;
