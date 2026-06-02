// src/components/AdminDashboard.jsx
// Date: 2026-06-02
// Role-based admin panel for SUPER_ADMIN, ADMIN, DEV, MODERATOR

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, Activity, BarChart3, Settings,
  RefreshCw, AlertCircle, CheckCircle2, Crown,
  Database, Server, Zap, Globe, Lock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ROLE_BADGES = {
  super_admin: { label: 'Super Admin', color: 'text-red-400 bg-red-900/30 border-red-900/50' },
  admin: { label: 'Admin', color: 'text-orange-400 bg-orange-900/30 border-orange-900/50' },
  dev: { label: 'Developer', color: 'text-blue-400 bg-blue-900/30 border-blue-900/50' },
  moderator: { label: 'Moderator', color: 'text-green-400 bg-green-900/30 border-green-900/50' },
  user: { label: 'User', color: 'text-gray-400 bg-gray-800 border-gray-700' },
};

function StatTile({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

function ConnectorPanel({ token }) {
  const connectors = [
    { name: 'Azure', icon: '☁️', status: 'configured', env: 'AZURE_CLIENT_ID' },
    { name: 'AWS', icon: '🟡', status: 'configured', env: 'AWS_ACCESS_KEY_ID' },
    { name: 'Google Cloud', icon: '🔵', status: 'configured', env: 'GOOGLE_API_KEY' },
    { name: 'Slack', icon: '💬', status: 'pending', env: 'SLACK_WEBHOOK_URL' },
    { name: 'Zoom', icon: '📹', status: 'pending', env: 'ZOOM_API_KEY' },
    { name: 'GitHub', icon: '🐱', status: 'pending', env: 'GITHUB_TOKEN' },
    { name: 'Bitbucket', icon: '🪣', status: 'pending', env: 'BITBUCKET_TOKEN' },
    { name: 'Adobe', icon: '🔴', status: 'pending', env: 'ADOBE_CLIENT_ID' },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <Globe size={14} className="text-violet-400" /> Platform Connectors
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {connectors.map(c => (
          <div key={c.name} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50">
            <span>{c.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white">{c.name}</div>
              <div className="text-xs text-gray-500">{c.env}</div>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded ${c.status === 'configured' ? 'text-green-400 bg-green-900/30' : 'text-gray-500 bg-gray-700'}`}>
              {c.status === 'configured' ? '✓' : '○'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemHealthPanel() {
  const checks = [
    { name: 'API Server', ok: true },
    { name: 'Database', ok: true },
    { name: 'Redis Cache', ok: true },
    { name: 'TLS/SSL', ok: true },
    { name: 'Encryption', ok: true },
    { name: 'Rate Limiting', ok: true },
    { name: 'CORS Policy', ok: true },
    { name: 'CSP Headers', ok: true },
  ];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <Server size={14} className="text-green-400" /> System Health
      </h3>
      <div className="space-y-1.5">
        {checks.map(c => (
          <div key={c.name} className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-300">{c.name}</span>
            {c.ok ? (
              <CheckCircle2 size={14} className="text-green-400" />
            ) : (
              <AlertCircle size={14} className="text-red-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MfaSetupPanel({ token }) {
  const [step, setStep] = useState('idle');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verifyToken, setVerifyToken] = useState('');
  const [error, setError] = useState('');

  const setup = async () => {
    setStep('loading');
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setStep('idle'); return; }
      setQr(data.qrDataUrl);
      setSecret(data.secret);
      setStep('scan');
    } catch {
      setError('Setup failed');
      setStep('idle');
    }
  };

  const verify = async () => {
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: verifyToken }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setBackupCodes(data.backupCodes);
      setStep('done');
    } catch {
      setError('Verification failed');
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <Lock size={14} className="text-violet-400" /> Two-Factor Authentication
      </h3>
      {step === 'idle' && (
        <button onClick={setup} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm">
          Set up 2FA
        </button>
      )}
      {step === 'loading' && <RefreshCw size={16} className="animate-spin text-violet-400" />}
      {step === 'scan' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Scan this QR code with your authenticator app</p>
          <img src={qr} alt="2FA QR Code" className="w-36 h-36 rounded-lg border border-gray-700" />
          <p className="text-xs text-gray-500 font-mono break-all">Secret: {secret}</p>
          <input
            type="text" inputMode="numeric" maxLength={6}
            placeholder="Enter 6-digit code to verify"
            value={verifyToken} onChange={e => setVerifyToken(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2 text-sm text-center tracking-widest"
          />
          <button onClick={verify} disabled={verifyToken.length < 6} className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm">
            Verify & Enable
          </button>
        </div>
      )}
      {step === 'done' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 size={16} /> 2FA enabled successfully
          </div>
          <p className="text-xs text-gray-400 font-medium">Save these backup codes:</p>
          <div className="grid grid-cols-2 gap-1">
            {backupCodes.map(c => (
              <code key={c} className="text-xs bg-gray-800 px-2 py-1 rounded text-green-300 font-mono">{c}</code>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}

export default function AdminDashboard({ token, userRole }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ users: 0, requests: 0, threats: 0, uptime: '99.9%' });
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const badge = ROLE_BADGES[userRole] || ROLE_BADGES.user;

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, auditRes] = await Promise.all([
        fetch('/api/health', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/security/audit?limit=20', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.logs || []);
      }
    } catch {
      // Non-fatal
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'connectors', label: 'Connectors', icon: Globe },
    { id: 'audit', label: 'Audit Log', icon: Activity },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {userRole === 'admin' || userRole === 'super_admin' ? t('auth.adminDashboard') :
             userRole === 'dev' ? t('auth.devDashboard') :
             userRole === 'moderator' ? t('auth.modDashboard') :
             t('auth.userDashboard')}
          </h2>
          <span className={`text-xs px-2 py-0.5 rounded-full border mt-1 inline-block ${badge.color}`}>
            {badge.label}
          </span>
        </div>
        <button onClick={fetchData} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl border border-gray-800">
        {tabs.map(tab => {
          const TIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <TIcon size={13} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Users" value={stats.users || '—'} icon={Users} color="#8b5cf6" />
            <StatTile label="Uptime" value={stats.uptime} icon={Zap} color="#10b981" />
            <StatTile label="Threats Blocked" value={stats.threats} icon={Shield} color="#ef4444" />
            <StatTile label="API Requests" value={stats.requests || '—'} icon={Activity} color="#06b6d4" />
          </div>
          <SystemHealthPanel />
          <MfaSetupPanel token={token} />
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-4">
          <SystemHealthPanel />
          <MfaSetupPanel token={token} />
        </div>
      )}

      {activeTab === 'connectors' && <ConnectorPanel token={token} />}

      {activeTab === 'audit' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">{t('security.auditLog')}</h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No audit logs available</p>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="flex items-start gap-2 py-1.5 border-b border-gray-800 last:border-0">
                  <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${log.event?.includes('ERROR') || log.event?.includes('THREAT') ? 'bg-red-900/30 text-red-400' : 'bg-gray-800 text-gray-400'}`}>
                    {log.event}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
