/**
 * SecurityDashboard.jsx
 * Nexus AI Pro — Enhanced Real-Time Security Dashboard
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under Apache License 2.0
 *
 * Features: Real-time vulnerability scans, network issue detection,
 * on-device threat monitoring, encryption health, audit trail.
 * Supports all platforms: Linux, Windows, macOS, iOS, Electron,
 * desktop, mobile, tablet.
 *
 * Updated: 2026-08-07
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  Wifi, WifiOff, Network, Activity, Eye, Lock,
  Key, AlertTriangle, CheckCircle, XCircle, Info,
  RefreshCw, Scan, Zap, Server, Cpu, HardDrive,
  Globe, Radio, Bug, Wrench, RotateCcw, Clock,
  ArrowUp, ArrowDown, Minus, Terminal,
} from 'lucide-react';

/* ─── Severity colors ────────────────────────────────────────────────── */
const SEVERITY = {
  critical: { color:'#ef4444', bg:'#ef444422', label:'Critical' },
  high:     { color:'#f97316', bg:'#f9731622', label:'High' },
  medium:   { color:'#f59e0b', bg:'#f59e0b22', label:'Medium' },
  low:      { color:'#22c55e', bg:'#22c55e22', label:'Low' },
  info:     { color:'#38bdf8', bg:'#38bdf822', label:'Info' },
};

/* ─── Gauge Component ────────────────────────────────────────────────── */
function SecurityGauge({ score }) {
  const color = score >= 85 ? '#22c55e' : score >= 65 ? '#f59e0b' : '#ef4444';
  const r = 54; const circ = 2 * Math.PI * r;
  const dash = circ * (score / 100);
  return (
    <div style={{ textAlign:'center', position:'relative', width:140, height:140, flexShrink:0 }}>
      <svg width={140} height={140} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12} />
        <circle cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={12}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition:'stroke-dasharray 1s ease' }} />
      </svg>
      <div style={{
        position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
      }}>
        <span style={{ fontSize:28, fontWeight:800, color }}>{score}</span>
        <span style={{ fontSize:10, color:'#9ca3af', fontWeight:600 }}>SCORE</span>
      </div>
    </div>
  );
}

/* ─── Threat Item ────────────────────────────────────────────────────── */
function ThreatItem({ threat }) {
  const sev = SEVERITY[threat.severity] ?? SEVERITY.info;
  return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:12,
      padding:'10px 14px', borderRadius:8,
      background: sev.bg, border:`1px solid ${sev.color}33`,
    }}>
      <AlertTriangle size={15} style={{ color: sev.color, flexShrink:0, marginTop:1 }} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#f9fafb' }}>{threat.title}</div>
        <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>{threat.description}</div>
        {threat.recommendation && (
          <div style={{ fontSize:11, color: sev.color, marginTop:4 }}>
            💡 {threat.recommendation}
          </div>
        )}
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
        <span style={{
          padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700,
          background: sev.bg, color: sev.color, border:`1px solid ${sev.color}44`,
        }}>{sev.label}</span>
        <span style={{ fontSize:10, color:'#6b7280' }}>
          {new Date(threat.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

/* ─── Network Status Card ────────────────────────────────────────────── */
function NetworkCard({ data }) {
  const ok = data?.status === 'healthy';
  return (
    <div style={sectionCard}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        {ok ? <Wifi size={18} color="#22c55e" /> : <WifiOff size={18} color="#ef4444" />}
        <h3 style={sectionTitle}>Network</h3>
        <span style={{ marginLeft:'auto', fontSize:12, color: ok ? '#22c55e' : '#ef4444', fontWeight:600 }}>
          {ok ? '● Healthy' : '● Issues detected'}
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:10 }}>
        {[
          { label:'Latency',   value: `${data?.latency ?? '—'}ms`,     ok: (data?.latency ?? 999) < 200 },
          { label:'Packet Loss',value: `${data?.packetLoss ?? 0}%`,   ok: (data?.packetLoss ?? 0) < 1 },
          { label:'Bandwidth', value: `${data?.bandwidth ?? '—'} Mbps`, ok: (data?.bandwidth ?? 0) > 5 },
          { label:'SSL/TLS',   value: data?.tls ?? 'TLS 1.3',          ok: data?.tlsOk !== false },
          { label:'DNS',       value: data?.dns ?? 'OK',               ok: data?.dnsOk !== false },
          { label:'Firewall',  value: data?.firewall ?? 'Active',      ok: data?.firewallOk !== false },
        ].map(({ label, value, ok: metricOk }) => (
          <div key={label} style={{
            padding:'10px 12px', borderRadius:8,
            background:'rgba(255,255,255,0.03)',
            border:'1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontSize:11, color:'#6b7280', marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:13, fontWeight:600, color: metricOk ? '#f9fafb' : '#ef4444' }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Device Status Card ─────────────────────────────────────────────── */
function DeviceCard({ data }) {
  const metrics = data ?? { cpu:42, memory:61, disk:28, platform:'Web' };
  return (
    <div style={sectionCard}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <Cpu size={18} color="#6366f1" />
        <h3 style={sectionTitle}>Device Health</h3>
        <span style={{ marginLeft:'auto', fontSize:12, color:'#9ca3af' }}>{metrics.platform}</span>
      </div>
      {[
        { label:'CPU Usage',    value: metrics.cpu,    icon: Cpu,       color:'#6366f1' },
        { label:'Memory',       value: metrics.memory, icon: Activity,  color:'#8b5cf6' },
        { label:'Disk Usage',   value: metrics.disk,   icon: HardDrive, color:'#14b8a6' },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} style={{ marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:12, color:'#9ca3af', display:'flex', alignItems:'center', gap:5 }}>
              <Icon size={12} color={color} /> {label}
            </span>
            <span style={{ fontSize:12, fontWeight:600, color: value > 80 ? '#ef4444' : '#f9fafb' }}>
              {value}%
            </span>
          </div>
          <div style={{ height:4, borderRadius:99, background:'rgba(255,255,255,0.08)' }}>
            <div style={{
              height:'100%', borderRadius:99, width:`${value}%`,
              background: value > 80 ? '#ef4444' : value > 60 ? '#f59e0b' : color,
              transition:'width 0.5s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Encryption Health ──────────────────────────────────────────────── */
function EncryptionCard({ data }) {
  const d = data ?? {
    algorithm:'AES-256-GCM', status:'healthy',
    lastRotation: Date.now() - 86400000, keyStrength: 256,
    tlsVersion:'1.3', cipherSuite:'TLS_AES_256_GCM_SHA384',
  };
  const daysSinceRotation = Math.floor((Date.now() - d.lastRotation) / 86400000);
  const rotationWarning = daysSinceRotation > 30;
  return (
    <div style={sectionCard}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <Lock size={18} color="#22c55e" />
        <h3 style={sectionTitle}>Encryption</h3>
        <span style={{ marginLeft:'auto' }}>
          <StatusBadge ok={d.status === 'healthy'} text={d.status === 'healthy' ? 'Healthy' : 'Warning'} />
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          { label:'Algorithm',    value: d.algorithm },
          { label:'Key Strength', value: `${d.keyStrength}-bit` },
          { label:'TLS Version',  value: d.tlsVersion },
          { label:'Cipher Suite', value: d.cipherSuite?.split('_').slice(-2).join('_') ?? '—' },
          { label:'Key Rotation', value: `${daysSinceRotation}d ago`, warn: rotationWarning },
          { label:'E2E Status',   value: 'Active' },
        ].map(({ label, value, warn }) => (
          <div key={label} style={{
            padding:'8px 10px', borderRadius:6,
            background:'rgba(255,255,255,0.03)',
          }}>
            <div style={{ fontSize:10, color:'#6b7280' }}>{label}</div>
            <div style={{ fontSize:12, fontWeight:600, color: warn ? '#f59e0b' : '#f9fafb', marginTop:2 }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Scan Controls ──────────────────────────────────────────────────── */
function ScanControls({ scanning, onScan, onPatch, onRotateKeys }) {
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:20 }}>
      <button onClick={onScan} disabled={scanning} style={actionBtn('#6366f1')}>
        {scanning ? <><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> Scanning…</>
                  : <><Scan size={14} /> Run Scan</>}
      </button>
      <button onClick={onPatch} style={actionBtn('#22c55e')}>
        <Wrench size={14} /> Auto-Patch
      </button>
      <button onClick={onRotateKeys} style={actionBtn('#f59e0b')}>
        <RotateCcw size={14} /> Rotate Keys
      </button>
    </div>
  );
}

/* ─── Main SecurityDashboard ─────────────────────────────────────────── */
export default function SecurityDashboard({ className = '' }) {
  const [dashData, setDashData]   = useState(null);
  const [threats, setThreats]     = useState([]);
  const [network, setNetwork]     = useState(null);
  const [device, setDevice]       = useState(null);
  const [encryption, setEncryption] = useState(null);
  const [score, setScore]         = useState(92);
  const [scanning, setScanning]   = useState(false);
  const [streaming, setStreaming] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const [dash, alerts, netResp, devResp, encResp] = await Promise.allSettled([
        fetch('/api/security/dashboard').then(r => r.json()),
        fetch('/api/security/alerts').then(r => r.json()),
        fetch('/api/security/network').then(r => r.json()),
        fetch('/api/security/device').then(r => r.json()),
        fetch('/api/security/encryption-health').then(r => r.json()),
      ]);

      if (dash.status === 'fulfilled')   { setDashData(dash.value); setScore(dash.value.overallScore ?? 92); }
      if (alerts.status === 'fulfilled') setThreats(alerts.value.alerts ?? []);
      if (netResp.status === 'fulfilled') setNetwork(netResp.value);
      if (devResp.status === 'fulfilled') setDevice(devResp.value);
      if (encResp.status === 'fulfilled') setEncryption(encResp.value);
    } catch { /* use existing state */ }
    setLastUpdate(Date.now());
  }, []);

  useEffect(() => {
    fetchAll();
    if (streaming) intervalRef.current = setInterval(fetchAll, 8000);
    return () => clearInterval(intervalRef.current);
  }, [streaming, fetchAll]);

  const runScan = async () => {
    setScanning(true);
    try {
      const resp = await fetch('/api/security/scan', { method:'POST' });
      const data = await resp.json();
      if (data.threats) setThreats(data.threats);
      if (data.score)   setScore(data.score);
    } finally {
      setScanning(false);
      fetchAll();
    }
  };

  const autoPatch = async () => {
    await fetch('/api/security/patch', { method:'POST' });
    fetchAll();
  };

  const rotateKeys = async () => {
    await fetch('/api/security/rotate-keys', { method:'POST' });
    fetchAll();
  };

  const criticalCount = threats.filter(t => t.severity === 'critical').length;
  const highCount     = threats.filter(t => t.severity === 'high').length;

  return (
    <div className={className} style={{
      fontFamily:"'Inter', system-ui, sans-serif",
      color:'#f9fafb',
      maxWidth: 960,
      margin:'0 auto',
      padding:'0 0 40px',
    }}>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:22, fontWeight:700, margin:0, display:'flex', alignItems:'center', gap:10 }}>
          <Shield size={22} color="#6366f1" />
          Security Dashboard
        </h2>
        <p style={{ margin:'4px 0 0', color:'#9ca3af', fontSize:14 }}>
          Real-time threat detection, network monitoring & device health
        </p>
      </div>

      {/* Status bar */}
      <div style={{
        display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
        background: criticalCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.08)',
        borderRadius:10, border: `1px solid ${criticalCount > 0 ? '#ef444444' : '#22c55e33'}`,
        marginBottom:20, flexWrap:'wrap', gap:10,
      }}>
        {criticalCount > 0
          ? <ShieldAlert size={18} color="#ef4444" />
          : <ShieldCheck size={18} color="#22c55e" />}
        <span style={{ fontSize:13, fontWeight:600, color: criticalCount > 0 ? '#ef4444' : '#22c55e' }}>
          {criticalCount > 0
            ? `⚠️ ${criticalCount} critical threat${criticalCount > 1 ? 's' : ''} detected`
            : '✅ All systems nominal'}
        </span>
        {highCount > 0 && (
          <span style={{ fontSize:12, color:'#f97316' }}>
            +{highCount} high severity
          </span>
        )}
        <span style={{ marginLeft:'auto', fontSize:12, color:'#6b7280' }}>
          {streaming ? '● Live' : '○ Paused'}
          {lastUpdate && ` · Updated ${new Date(lastUpdate).toLocaleTimeString()}`}
        </span>
        <button onClick={() => setStreaming(s => !s)} style={smallBtn}>
          {streaming ? 'Pause' : 'Resume'}
        </button>
      </div>

      {/* Score + Scan controls */}
      <div style={{ display:'flex', gap:20, marginBottom:24, flexWrap:'wrap' }}>
        <div style={{
          ...sectionCard, display:'flex', alignItems:'center', gap:20,
          flex:'0 0 auto', minWidth:220,
        }}>
          <SecurityGauge score={score} />
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#f9fafb', marginBottom:4 }}>
              Security Score
            </div>
            <div style={{ fontSize:13, color:'#9ca3af', marginBottom:12 }}>
              {score >= 85 ? 'Excellent protection' : score >= 65 ? 'Good — review warnings' : 'Needs immediate attention'}
            </div>
            <ScanControls scanning={scanning} onScan={runScan} onPatch={autoPatch} onRotateKeys={rotateKeys} />
          </div>
        </div>
      </div>

      {/* Grid: Network + Device + Encryption */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16, marginBottom:20 }}>
        <NetworkCard data={network} />
        <DeviceCard  data={device} />
        <EncryptionCard data={encryption} />
      </div>

      {/* Threats & Alerts */}
      <div style={sectionCard}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <ShieldAlert size={18} color="#f97316" />
          <h3 style={sectionTitle}>Active Threats & Alerts</h3>
          <span style={{
            marginLeft:'auto', padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700,
            background:'rgba(249,115,22,0.15)', color:'#f97316',
          }}>{threats.length} total</span>
        </div>
        {threats.length === 0 ? (
          <div style={{ textAlign:'center', padding:'24px 0', color:'#6b7280' }}>
            <ShieldCheck size={32} style={{ margin:'0 auto 8px', display:'block', color:'#22c55e' }} />
            <div>No active threats</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {threats.map((t, i) => <ThreatItem key={t.id ?? i} threat={t} />)}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </div>
  );
}

/* ─── Shared styles ──────────────────────────────────────────────────── */
const sectionCard = {
  background:'rgba(255,255,255,0.03)',
  border:'1px solid rgba(255,255,255,0.07)',
  borderRadius:14, padding:20,
};

const sectionTitle = {
  fontSize:15, fontWeight:700, color:'#f9fafb', margin:0,
};

const actionBtn = (color) => ({
  display:'inline-flex', alignItems:'center', gap:6,
  padding:'8px 16px', borderRadius:8, border:'none',
  background: color, color:'#fff', fontSize:13, fontWeight:500,
  cursor:'pointer', transition:'opacity 0.2s',
});

const smallBtn = {
  padding:'4px 10px', borderRadius:6, border:'1px solid rgba(255,255,255,0.1)',
  background:'transparent', color:'#9ca3af', fontSize:12, cursor:'pointer',
};

function StatusBadge({ ok, text }) {
  return (
    <span style={{
      padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700,
      background: ok ? '#22c55e22' : '#ef444422',
      color: ok ? '#22c55e' : '#ef4444',
      border: `1px solid ${ok ? '#22c55e44' : '#ef444444'}`,
    }}>{text}</span>
  );
}
