// Created: 2026-07-28
import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud, Github, MessageSquare, Video, Database,
  Globe, Link, CheckCircle, XCircle, RefreshCw,
  ChevronRight, AlertCircle, Zap, Server
} from 'lucide-react';

const CONNECTOR_META = {
  azure:     { name: 'Azure',        icon: Cloud,           color: 'text-blue-400',   desc: 'Microsoft Azure cloud services' },
  aws:       { name: 'AWS',          icon: Server,          color: 'text-orange-400', desc: 'Amazon Web Services' },
  google:    { name: 'Google Cloud', icon: Cloud,           color: 'text-yellow-400', desc: 'Google Cloud Platform' },
  adobe:     { name: 'Adobe',        icon: Globe,           color: 'text-red-400',    desc: 'Adobe Creative Cloud' },
  slack:     { name: 'Slack',        icon: MessageSquare,   color: 'text-purple-400', desc: 'Team communication' },
  zoom:      { name: 'Zoom',         icon: Video,           color: 'text-blue-300',   desc: 'Video conferencing' },
  github:    { name: 'GitHub',       icon: Github,          color: 'text-gray-300',   desc: 'Code repository & CI/CD' },
  bitbucket: { name: 'Bitbucket',    icon: Link,            color: 'text-blue-500',   desc: 'Atlassian code hosting' },
  redis:     { name: 'Redis',        icon: Database,        color: 'text-red-500',    desc: 'In-memory data store' },
  stripe:    { name: 'Stripe',       icon: Zap,             color: 'text-green-400',  desc: 'Payment processing' },
};

function StatusBadge({ status }) {
  if (status === 'connected') return <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12}/> Connected</span>;
  if (status === 'not_configured') return <span className="flex items-center gap-1 text-xs text-gray-500"><XCircle size={12}/> Not configured</span>;
  return <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle size={12}/> Error</span>;
}

function ConnectorCard({ name, status, onTest }) {
  const meta = CONNECTOR_META[name] || { name, icon: Globe, color: 'text-gray-400', desc: '' };
  const Icon = meta.icon;
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    await onTest(name);
    setTesting(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center">
            <Icon size={18} className={meta.color}/>
          </div>
          <div>
            <p className="text-white font-medium text-sm">{meta.name}</p>
            <p className="text-gray-500 text-xs">{meta.desc}</p>
          </div>
        </div>
        <StatusBadge status={status}/>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600">Configure via .env</p>
        <button
          onClick={handleTest}
          disabled={testing}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50"
        >
          {testing ? <RefreshCw size={10} className="animate-spin"/> : <ChevronRight size={10}/>}
          {testing ? 'Testing...' : 'Test'}
        </button>
      </div>
    </div>
  );
}

export default function ConnectorsDashboard() {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/connectors/status');
      if (res.ok) setStatuses(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStatuses(); }, [fetchStatuses]);

  const testConnector = async (name) => {
    try {
      const res = await fetch(`/api/connectors/${name}/test`, { method: 'POST' });
      const data = await res.json();
      setStatuses(s => ({ ...s, [name]: data.connected ? 'connected' : (data.error?.includes('Missing') ? 'not_configured' : 'error') }));
    } catch {
      setStatuses(s => ({ ...s, [name]: 'error' }));
    }
  };

  const connected = Object.values(statuses).filter(s => s === 'connected').length;
  const total = Object.keys(statuses).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Platform Connectors</h1>
            <p className="text-gray-400 text-sm">{connected} of {total} connected</p>
          </div>
          <button onClick={fetchStatuses} disabled={loading} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array(10).fill(0).map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse h-24"/>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(CONNECTOR_META).map(name => (
              <ConnectorCard key={name} name={name} status={statuses[name] || 'not_configured'} onTest={testConnector}/>
            ))}
          </div>
        )}

        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400 mb-2 flex items-center gap-2"><AlertCircle size={14}/> Configuration</p>
          <p className="text-xs text-gray-500">All connector credentials are read from environment variables. Copy <code className="text-cyan-400">.env.example</code> to <code className="text-cyan-400">.env</code> and add your credentials. No API keys are ever stored in the codebase.</p>
        </div>
      </div>
    </div>
  );
}
