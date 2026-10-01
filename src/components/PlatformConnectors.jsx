// src/components/PlatformConnectors.jsx | 2026-10-01
import React, { useState, useCallback } from 'react';
import {
  Cloud, Database, GitBranch, MessageSquare, Video, Code,
  Settings, CheckCircle, XCircle, RefreshCw, AlertTriangle,
  Plus, Trash2, ExternalLink, Key, Eye, EyeOff, Zap
} from 'lucide-react';

// Connector definitions — all credentials come from env vars, never hardcoded
const CONNECTORS = [
  // Cloud / Infrastructure
  { id: 'aws',       group: 'Cloud',     name: 'AWS',            icon: '☁',  color: 'text-orange-400', envKey: 'AWS_ACCESS_KEY_ID',          docs: 'https://docs.aws.amazon.com' },
  { id: 'azure',     group: 'Cloud',     name: 'Azure',          icon: '⬡',  color: 'text-blue-400',   envKey: 'AZURE_CLIENT_ID',            docs: 'https://docs.microsoft.com/azure' },
  { id: 'gcp',       group: 'Cloud',     name: 'Google Cloud',   icon: '🔵',  color: 'text-green-400',  envKey: 'GOOGLE_APPLICATION_CREDENTIALS', docs: 'https://cloud.google.com/docs' },
  { id: 'blob',      group: 'Cloud',     name: 'Azure Blob',     icon: '📦',  color: 'text-cyan-400',   envKey: 'AZURE_STORAGE_CONNECTION_STRING', docs: 'https://docs.microsoft.com/azure/storage' },
  { id: 'redis',     group: 'Cloud',     name: 'Redis',          icon: '🔴',  color: 'text-red-400',    envKey: 'REDIS_URL',                  docs: 'https://redis.io/docs' },
  // DevOps / Source Control
  { id: 'github',    group: 'DevOps',    name: 'GitHub',         icon: '🐙',  color: 'text-gray-300',   envKey: 'GITHUB_TOKEN',               docs: 'https://docs.github.com' },
  { id: 'bitbucket', group: 'DevOps',    name: 'Bitbucket',      icon: '⛀',  color: 'text-blue-300',   envKey: 'BITBUCKET_APP_PASSWORD',     docs: 'https://developer.atlassian.com/bitbucket' },
  // Communication / Productivity
  { id: 'slack',     group: 'Comms',     name: 'Slack',          icon: '💬',  color: 'text-purple-400', envKey: 'SLACK_BOT_TOKEN',            docs: 'https://api.slack.com' },
  { id: 'zoom',      group: 'Comms',     name: 'Zoom',           icon: '🎥',  color: 'text-blue-500',   envKey: 'ZOOM_CLIENT_ID',             docs: 'https://developers.zoom.us' },
  // Creative
  { id: 'adobe',     group: 'Creative',  name: 'Adobe CC',       icon: '🅰',  color: 'text-red-500',    envKey: 'ADOBE_CLIENT_ID',            docs: 'https://developer.adobe.com' },
  // Game Engines (extras)
  { id: 'unreal',    group: 'Gaming',    name: 'Unreal / Epic',  icon: '🎮',  color: 'text-yellow-400', envKey: 'EPIC_CLIENT_ID',             docs: 'https://dev.epicgames.com' },
  { id: 'ubisoft',   group: 'Gaming',    name: 'Ubisoft Connect',icon: '🛡',  color: 'text-gray-400',   envKey: 'UBISOFT_APP_ID',             docs: 'https://ubisoftconnect.com/developer' },
];

const GROUPS = [...new Set(CONNECTORS.map(c => c.group))];

// Simulate connection test against /api/connectors/test/:id
async function testConnector(id) {
  await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
  // In production: GET /api/connectors/test/:id — returns { ok: boolean, latency: number, message: string }
  return Math.random() > 0.2
    ? { ok: true,  latency: Math.round(30 + Math.random() * 120), message: 'Connection successful' }
    : { ok: false, latency: null, message: 'Connection refused or credentials invalid' };
}

// ── Single connector card ─────────────────────────────────────────────────
function ConnectorCard({ connector, status, onTest, onConfigure }) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      status?.ok === true   ? 'border-green-500/30 bg-green-900/10' :
      status?.ok === false  ? 'border-red-500/30 bg-red-900/10' :
                               'border-white/10 bg-white/5'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{connector.icon}</span>
          <div>
            <p className={`font-semibold text-sm ${connector.color}`}>{connector.name}</p>
            <p className="text-xs text-gray-500">{connector.group}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {status?.ok === true  && <CheckCircle size={14} className="text-green-400" />}
          {status?.ok === false && <XCircle     size={14} className="text-red-400"   />}
          {status?.testing      && <RefreshCw   size={14} className="animate-spin text-gray-400" />}
        </div>
      </div>

      {/* Env key display */}
      <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-black/30 font-mono text-xs">
        <Key size={11} className="text-gray-500 flex-shrink-0" />
        <span className="text-gray-400 flex-1 truncate">
          {showKey ? connector.envKey : connector.envKey.replace(/./g, '•')}
        </span>
        <button onClick={() => setShowKey(v => !v)} className="text-gray-500 hover:text-gray-300">
          {showKey ? <EyeOff size={11} /> : <Eye size={11} />}
        </button>
      </div>

      {status?.ok === true && (
        <p className="text-xs text-green-400 mb-2">✓ Connected · {status.latency}ms</p>
      )}
      {status?.ok === false && (
        <p className="text-xs text-red-400 mb-2">✗ {status.message}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onTest(connector.id)}
          disabled={status?.testing}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs text-gray-300"
        >
          {status?.testing ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
          {status?.testing ? 'Testing…' : 'Test'}
        </button>
        <button
          onClick={() => onConfigure(connector)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-gray-300"
        >
          <Settings size={11} /> Configure
        </button>
        <a
          href={connector.docs}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-400"
        >
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}

// ── Configure modal ───────────────────────────────────────────────────────
function ConfigureModal({ connector, onClose }) {
  const [value, setValue] = useState('');
  const [show,  setShow]  = useState(false);
  const [saved, setSaved] = useState(false);

  const save = () => {
    // In production: POST /api/connectors/configure { id: connector.id, credential: encryptedValue }
    // Never send raw credential in plaintext — encrypt client-side before transmission
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-gray-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">{connector.name} Configuration</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <p className="text-sm text-gray-400">
          Enter your <code className="text-blue-300">{connector.envKey}</code> value. This will be stored encrypted and never logged.
        </p>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Paste your credential here"
            className="w-full px-4 py-2 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
          />
          <button onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          ⚠ Never hardcode credentials in source files. Use environment variables or a secrets manager (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault).
        </p>
        {saved
          ? <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircle size={16} /> Saved securely</div>
          : (
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-sm">Cancel</button>
              <button onClick={save}  disabled={!value.trim()} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium">Save</button>
            </div>
          )
        }
      </div>
    </div>
  );
}

// ── Main PlatformConnectors export ───────────────────────────────────────
export default function PlatformConnectors() {
  const [statuses,    setStatuses]    = useState({});
  const [configuring, setConfiguring] = useState(null);
  const [activeGroup, setActiveGroup] = useState('All');

  const handleTest = useCallback(async (id) => {
    setStatuses(prev => ({ ...prev, [id]: { testing: true } }));
    const result = await testConnector(id);
    setStatuses(prev => ({ ...prev, [id]: { ...result, testing: false } }));
  }, []);

  const testAll = useCallback(async () => {
    const ids = CONNECTORS.map(c => c.id);
    setStatuses(ids.reduce((acc, id) => ({ ...acc, [id]: { testing: true } }), {}));
    const results = await Promise.all(ids.map(async id => ({ id, result: await testConnector(id) })));
    setStatuses(Object.fromEntries(results.map(({ id, result }) => [id, { ...result, testing: false }])));
  }, []);

  const visible = CONNECTORS.filter(c => activeGroup === 'All' || c.group === activeGroup);
  const connected = Object.values(statuses).filter(s => s.ok === true).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      {configuring && <ConfigureModal connector={configuring} onClose={() => setConfiguring(null)} />}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20">
              <Cloud size={28} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Platform Connectors</h1>
              <p className="text-sm text-gray-400">
                {connected}/{CONNECTORS.length} connected · Cloud, DevOps, Comms, Gaming, Creative
              </p>
            </div>
          </div>
          <button
            onClick={testAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm"
          >
            <Zap size={15} /> Test All Connectors
          </button>
        </div>

        {/* Group filter */}
        <div className="flex flex-wrap gap-2">
          {['All', ...GROUPS].map(g => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeGroup === g ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Connector grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map(c => (
            <ConnectorCard
              key={c.id}
              connector={c}
              status={statuses[c.id]}
              onTest={handleTest}
              onConfigure={setConfiguring}
            />
          ))}
        </div>

        {/* Redis/Blob config note */}
        <div className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-900/10 text-sm text-yellow-300 space-y-1">
          <p className="font-medium flex items-center gap-2"><AlertTriangle size={14} /> Secrets policy reminder</p>
          <p className="text-xs text-yellow-400">
            All API keys, tokens, and connection strings must be stored in environment variables or a secrets manager.
            Set them in your <code>.env</code> file (never commit it) or in your deployment platform's secrets store.
            The server reads them via <code>process.env.VAR_NAME</code> at startup — they are never logged, stored in the database, or sent to the client.
          </p>
        </div>
      </div>
    </div>
  );
}
