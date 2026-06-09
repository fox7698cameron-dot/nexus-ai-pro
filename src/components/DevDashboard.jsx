// src/components/DevDashboard.jsx
// Nexus AI Pro — Developer Dashboard (API Keys, Connectors, Integrations, Build Status)
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import React, { useState, useEffect, useCallback } from 'react';
import {
  Code, GitBranch, Terminal, Package, Cpu, Server,
  CheckCircle, AlertTriangle, RefreshCw, Copy, Eye,
  EyeOff, Plus, Trash2, Globe, Zap, Activity, Database
} from 'lucide-react';

function apiHeaders() {
  const token = localStorage.getItem('nexus:accessToken');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
}

function ConnectorStatus({ service, status }) {
  const icons = {
    azure: '☁️', adobe: '🅰️', aws: '🔶', google: '🔵',
    slack: '💬', zoom: '📹', github: '🐙', bitbucket: '🔵',
    redis: '🔴', blob: '📦',
  };

  return (
    <div className={`border rounded-xl p-4 transition-all ${status.connected ? 'border-green-700 bg-green-900/10' : 'border-gray-700 bg-gray-900'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icons[service] || '🔗'}</span>
          <span className="text-white text-sm font-medium capitalize">{service}</span>
        </div>
        <div className={`w-2 h-2 rounded-full ${status.connected ? 'bg-green-400' : 'bg-gray-600'}`} />
      </div>
      <div className="space-y-1 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          {status.connected ? <CheckCircle size={12} className="text-green-400" /> : <AlertTriangle size={12} className="text-yellow-400" />}
          {status.connected ? 'Connected' : 'Not connected'}
        </div>
        {status.envConfigured && (
          <div className="flex items-center gap-1 text-blue-400">
            <CheckCircle size={12} /> Env configured
          </div>
        )}
      </div>
    </div>
  );
}

export default function DevDashboard() {
  const [connectors, setConnectors] = useState([]);
  const [health,     setHealth]     = useState(null);
  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('connectors');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [connResp, healthResp, projResp] = await Promise.all([
        fetch('/api/connectors',   { headers: apiHeaders() }),
        fetch('/api/health',       { headers: apiHeaders() }),
        fetch('/api/projects?limit=5', { headers: apiHeaders() }),
      ]);
      if (connResp.ok)   setConnectors((await connResp.json()).connectors || []);
      if (healthResp.ok) setHealth(await healthResp.json());
      if (projResp.ok)   setProjects((await projResp.json()).projects || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const connectService = async (service) => {
    const resp = await fetch(`/api/connectors/${service}/connect`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ note: 'Connected from Dev Dashboard' }),
    });
    if (resp.ok) fetchAll();
  };

  const disconnectService = async (service) => {
    await fetch(`/api/connectors/${service}/disconnect`, { method: 'DELETE', headers: apiHeaders() });
    fetchAll();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Code size={28} className="text-blue-400" />
            Dev Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">API integrations, connectors & build tools</p>
        </div>
        <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm hover:bg-gray-600 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg w-fit mb-6">
        {['connectors', 'projects', 'api-explorer', 'system'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all whitespace-nowrap ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Connectors */}
      {tab === 'connectors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {connectors.map(c => (
              <div key={c.service} className="space-y-2">
                <ConnectorStatus service={c.service} status={c} />
                <div className="flex gap-1">
                  {c.connected ? (
                    <button
                      onClick={() => disconnectService(c.service)}
                      className="flex-1 py-1.5 border border-red-700 text-red-400 rounded-lg text-xs hover:bg-red-900/20 transition-colors"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => connectService(c.service)}
                      className="flex-1 py-1.5 bg-blue-700 text-white rounded-lg text-xs hover:bg-blue-600 transition-colors"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 border border-blue-700/50 rounded-xl p-4">
            <h3 className="text-blue-400 text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle size={14} /> Environment Variables Required
            </h3>
            <p className="text-gray-400 text-xs mb-2">Configure these in your <code className="text-blue-300">.env</code> file to enable full API access:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
              {[
                'AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET',
                'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET',
                'GOOGLE_CLOUD_PROJECT', 'GOOGLE_API_KEY',
                'SLACK_WEBHOOK_URL', 'SLACK_TEAM_ID',
                'ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET',
                'GITHUB_TOKEN', 'GITHUB_ORG',
                'BITBUCKET_WORKSPACE', 'BITBUCKET_TOKEN',
                'REDIS_URL',
                'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
                'SENDGRID_API_KEY', 'ADOBE_CLIENT_ID',
              ].map(v => (
                <code key={v} className="text-xs text-green-300 bg-gray-800 px-2 py-0.5 rounded font-mono">{v}</code>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent projects */}
      {tab === 'projects' && (
        <div className="space-y-3">
          {projects.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
                <GitBranch size={18} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{p.name}</p>
                <p className="text-gray-400 text-xs capitalize">{p.type} · {p.status}</p>
              </div>
              <div className="text-right">
                <p className="text-blue-400 text-sm font-bold">{p.progress ?? 0}%</p>
                <p className="text-gray-600 text-xs">progress</p>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="text-center py-8 text-gray-500">No projects found — create one in Projects</div>
          )}
        </div>
      )}

      {/* API Explorer */}
      {tab === 'api-explorer' && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h2 className="text-white font-medium mb-4">Available API Endpoints</h2>
            {[
              { method: 'GET',    path: '/api/health',                         description: 'Server health check'                  },
              { method: 'POST',   path: '/api/auth/register',                  description: 'Register new user'                    },
              { method: 'POST',   path: '/api/auth/login',                     description: 'Login with credentials'               },
              { method: 'GET',    path: '/api/analytics/overview',             description: 'Social media analytics overview'      },
              { method: 'GET',    path: '/api/analytics/platform/:platform',   description: 'Platform-specific metrics'            },
              { method: 'GET',    path: '/api/analytics/realtime',             description: 'Real-time snapshot'                   },
              { method: 'GET',    path: '/api/projects',                       description: 'List your projects'                   },
              { method: 'POST',   path: '/api/projects',                       description: 'Create new project'                   },
              { method: 'GET',    path: '/api/games/status',                   description: 'Game platform connection status'      },
              { method: 'GET',    path: '/api/games/achievements/:platform',   description: 'Game achievements'                    },
              { method: 'GET',    path: '/api/subscriptions/plans',            description: 'Available subscription plans'        },
              { method: 'POST',   path: '/api/subscriptions/checkout',         description: 'Create Stripe checkout session'       },
              { method: 'GET',    path: '/api/connectors',                     description: 'Service connector statuses'           },
              { method: 'GET',    path: '/api/security/dashboard',             description: 'Security dashboard data'             },
              { method: 'POST',   path: '/api/security/scan',                  description: 'Run security scan'                   },
            ].map(({ method, path, description }) => (
              <div key={`${method}:${path}`} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                  method === 'GET'    ? 'bg-blue-900/30 text-blue-400' :
                  method === 'POST'   ? 'bg-green-900/30 text-green-400' :
                  method === 'PUT'    ? 'bg-yellow-900/30 text-yellow-400' :
                  'bg-red-900/30 text-red-400'
                }`}>{method}</span>
                <code className="text-gray-300 text-xs font-mono flex-1">{path}</code>
                <span className="text-gray-500 text-xs hidden md:block">{description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System */}
      {tab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {health && (
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <h2 className="text-white font-medium mb-3 flex items-center gap-2">
                <Activity size={16} className="text-green-400" /> Runtime
              </h2>
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Status',     value: health.status        },
                  { label: 'Algorithm',  value: health.security?.algorithm          },
                  { label: 'Audit Logs', value: health.security?.auditLogSize ?? 0  },
                  { label: 'Threats',    value: health.security?.threatsBlocked ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-white font-mono text-xs">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h2 className="text-white font-medium mb-3 flex items-center gap-2">
              <Terminal size={16} className="text-blue-400" /> Stack
            </h2>
            <div className="space-y-1 text-xs text-gray-400">
              {[
                'React 18 + Vite + Tailwind CSS',
                'Node.js + Express + Socket.io',
                'PostgreSQL + Redis (optional)',
                'AES-256-GCM + bcrypt (cost 12)',
                'JWT access + refresh tokens',
                'Capacitor (iOS/Android)',
                'Electron (Windows/macOS/Linux)',
                'Flutter (native mobile)',
                'Docker + docker-compose',
              ].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-blue-400 rounded-full" />
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
