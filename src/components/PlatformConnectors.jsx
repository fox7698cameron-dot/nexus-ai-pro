// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File created: 2026-08-06

import React, { useState, useRef } from 'react';
import { Cloud, Database, GitBranch, Server, HardDrive, CheckCircle, XCircle, Plus, X, Plug } from 'lucide-react';

const CONNECTORS = [
  // Cloud
  { id: 'azure',     name: 'Microsoft Azure',     icon: '☁️', category: 'cloud',   desc: 'Azure services, Blob Storage, AD, Functions',  fields: [{ key: 'tenantId', label: 'Tenant ID' }, { key: 'clientId', label: 'Client ID' }] },
  { id: 'aws',       name: 'Amazon AWS',           icon: '🟠', category: 'cloud',   desc: 'S3, Lambda, EC2, CloudWatch, IAM',             fields: [{ key: 'region', label: 'Region' }, { key: 'bucket', label: 'S3 Bucket' }] },
  { id: 'gcp',       name: 'Google Cloud',         icon: '🔵', category: 'cloud',   desc: 'GCS, BigQuery, Cloud Functions, Firebase',     fields: [{ key: 'projectId', label: 'Project ID' }, { key: 'region', label: 'Region' }] },
  { id: 'adobe',     name: 'Adobe Creative Cloud', icon: '🔴', category: 'cloud',   desc: 'Creative Suite APIs, Stock, PDF Tools',         fields: [{ key: 'clientId', label: 'Client ID' }] },
  // Dev Tools
  { id: 'github',    name: 'GitHub',               icon: '🐙', category: 'devtools', desc: 'Repos, Actions, Issues, Pull Requests',        fields: [{ key: 'org', label: 'Organization / User' }] },
  { id: 'bitbucket', name: 'Bitbucket',            icon: '🔷', category: 'devtools', desc: 'Repos, Pipelines, Workspaces',                 fields: [{ key: 'workspace', label: 'Workspace' }] },
  // Storage
  { id: 'redis',     name: 'Redis',                icon: '🔴', category: 'storage',  desc: 'In-memory cache, pub/sub, session store',      fields: [{ key: 'host', label: 'Host' }, { key: 'port', label: 'Port', placeholder: '6379' }] },
  { id: 'blob',      name: 'Azure Blob Storage',   icon: '🗄️', category: 'storage',  desc: 'Object storage, CDN origin, backup',           fields: [{ key: 'container', label: 'Container Name' }, { key: 'region', label: 'Region' }] },
  // Communication
  { id: 'slack',     name: 'Slack',                icon: '💬', category: 'comms',    desc: 'Notifications, channels, slash commands',      fields: [{ key: 'workspace', label: 'Workspace' }] },
  { id: 'zoom',      name: 'Zoom',                 icon: '📹', category: 'comms',    desc: 'Meetings, webinars, recordings',               fields: [{ key: 'accountId', label: 'Account ID' }] },
];

const CATEGORIES = [
  { id: 'cloud',    label: 'Cloud',       icon: <Cloud size={15} /> },
  { id: 'devtools', label: 'Dev Tools',   icon: <GitBranch size={15} /> },
  { id: 'storage',  label: 'Storage',     icon: <Database size={15} /> },
  { id: 'comms',    label: 'Communication', icon: <Server size={15} /> },
];

const STYLE = `
.pc-wrap{background:var(--an-bg,#0f172a);color:var(--an-text,#e2e8f0);min-height:100vh;font-family:system-ui,sans-serif;padding:1rem;}
.pc-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:.5rem;}
.pc-title{font-size:1.4rem;font-weight:700;display:flex;align-items:center;gap:.5rem;}
.pc-tabs{display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap;}
.pc-tab{padding:.4rem .9rem;border-radius:.5rem;cursor:pointer;border:1px solid #334155;background:#1e293b;color:#e2e8f0;font-size:.8rem;display:flex;align-items:center;gap:.4rem;}
.pc-tab.active{background:#3b82f6;color:#fff;border-color:#3b82f6;}
.pc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem;}
.pc-card{background:#1e293b;border:1px solid #334155;border-radius:.75rem;padding:1rem;}
.pc-card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;}
.pc-card-info{display:flex;align-items:center;gap:.75rem;}
.pc-icon{font-size:1.6rem;}
.pc-name{font-weight:700;font-size:.9rem;}
.pc-desc{font-size:.75rem;color:#94a3b8;margin:.1rem 0;}
.pc-status{display:flex;align-items:center;gap:.3rem;font-size:.75rem;font-weight:600;}
.pc-status.connected{color:#22c55e;}
.pc-status.disconnected{color:#64748b;}
.pc-status.error{color:#ef4444;}
.pc-btn{display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .7rem;border-radius:.5rem;border:none;cursor:pointer;font-size:.78rem;font-weight:600;}
.pc-btn-connect{background:#3b82f622;color:#3b82f6;border:1px solid #3b82f6;}
.pc-btn-disconnect{background:#ef444422;color:#ef4444;border:1px solid #ef4444;}
.pc-field{margin:.5rem 0;}
.pc-label{font-size:.72rem;color:#94a3b8;display:block;margin-bottom:.2rem;}
.pc-input{width:100%;padding:.4rem .6rem;background:#0f172a;border:1px solid #334155;border-radius:.4rem;color:#e2e8f0;font-size:.82rem;box-sizing:border-box;}
.pc-input:focus{border-color:#3b82f6;outline:none;}
.pc-synced{font-size:.7rem;color:#64748b;margin-top:.3rem;}
.pc-badge{background:#3b82f622;color:#3b82f6;padding:.1rem .4rem;border-radius:9999px;font-size:.7rem;}
.pc-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:9999;}
.pc-modal{background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:1.5rem;width:min(380px,90vw);}
.pc-webhook-row{display:flex;align-items:center;justify-content:space-between;padding:.4rem;font-size:.78rem;background:#0f172a;border-radius:.4rem;margin:.3rem 0;}
`;

export function PlatformConnectors() {
  const [activeTab, setActiveTab] = useState('cloud');
  const [connectors, setConnectors] = useState(
    Object.fromEntries(CONNECTORS.map(c => [c.id, { status: 'disconnected', config: {} }]))
  );
  const [activeModal, setActiveModal] = useState(null);
  const [webhooks, setWebhooks] = useState({});
  const [newWebhook, setNewWebhook] = useState('');
  const styleInjected = useRef(false);

  if (!styleInjected.current) {
    const s = document.createElement('style');
    s.textContent = STYLE;
    document.head.appendChild(s);
    styleInjected.current = true;
  }

  const connect = async (connector) => {
    setConnectors(prev => ({ ...prev, [connector.id]: { ...prev[connector.id], status: 'connecting' } }));
    // Simulate OAuth authorization flow — in production, open OAuth popup
    await new Promise(r => setTimeout(r, 1500));
    setConnectors(prev => ({
      ...prev,
      [connector.id]: {
        ...prev[connector.id],
        status: 'connected',
        connectedAt: new Date().toLocaleString(),
        repoCount: connector.id === 'github' || connector.id === 'bitbucket' ? Math.floor(Math.random() * 40) + 1 : undefined,
        latency: connector.id === 'redis' ? `${Math.floor(Math.random() * 5) + 1}ms` : undefined,
      }
    }));
    setActiveModal(null);
  };

  const disconnect = (id) => {
    setConnectors(prev => ({ ...prev, [id]: { status: 'disconnected', config: {} } }));
  };

  const updateConfig = (id, key, val) => {
    setConnectors(prev => ({ ...prev, [id]: { ...prev[id], config: { ...prev[id].config, [key]: val } } }));
  };

  const addWebhook = (connectorId) => {
    if (!newWebhook.trim()) return;
    setWebhooks(w => ({ ...w, [connectorId]: [...(w[connectorId] || []), newWebhook.trim()] }));
    setNewWebhook('');
  };

  const removeWebhook = (connectorId, url) => {
    setWebhooks(w => ({ ...w, [connectorId]: (w[connectorId] || []).filter(u => u !== url) }));
  };

  const tabConnectors = CONNECTORS.filter(c => c.category === activeTab);

  return (
    <div className="pc-wrap">
      <div className="pc-header">
        <div className="pc-title"><Plug size={22} color="#3b82f6" /> Platform Connectors</div>
        <span style={{ fontSize: '.8rem', color: '#94a3b8' }}>
          {Object.values(connectors).filter(c => c.status === 'connected').length} / {CONNECTORS.length} connected
        </span>
      </div>

      <div className="pc-tabs">
        {CATEGORIES.map(cat => (
          <button key={cat.id} className={`pc-tab${activeTab === cat.id ? ' active' : ''}`} onClick={() => setActiveTab(cat.id)}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      <div className="pc-grid">
        {tabConnectors.map(connector => {
          const state = connectors[connector.id];
          return (
            <div key={connector.id} className="pc-card">
              <div className="pc-card-header">
                <div className="pc-card-info">
                  <span className="pc-icon">{connector.icon}</span>
                  <div>
                    <div className="pc-name">{connector.name}</div>
                    <div className="pc-desc">{connector.desc}</div>
                    {state.connectedAt && <div className="pc-synced">Last synced: {state.connectedAt}</div>}
                    {state.repoCount != null && <span className="pc-badge">{state.repoCount} repos</span>}
                    {state.latency && <span className="pc-badge">Ping: {state.latency}</span>}
                  </div>
                </div>
                <div>
                  <div className={`pc-status${state.status === 'connected' ? ' connected' : state.status === 'error' ? ' error' : ' disconnected'}`}>
                    {state.status === 'connected' ? <><CheckCircle size={13} /> Connected</> : state.status === 'connecting' ? '⏳ Connecting…' : <><XCircle size={13} /> Off</>}
                  </div>
                </div>
              </div>

              {/* Config fields (only when disconnected) */}
              {state.status !== 'connected' && connector.fields.map(f => (
                <div key={f.key} className="pc-field">
                  <label className="pc-label">{f.label}</label>
                  <input className="pc-input" placeholder={f.placeholder || f.label}
                    value={state.config[f.key] || ''} onChange={e => updateConfig(connector.id, f.key, e.target.value)} />
                </div>
              ))}

              {/* Webhooks (only when connected) */}
              {state.status === 'connected' && (
                <div style={{ marginTop: '.5rem' }}>
                  <div style={{ fontSize: '.72rem', color: '#94a3b8', marginBottom: '.3rem', fontWeight: 700 }}>WEBHOOKS</div>
                  {(webhooks[connector.id] || []).map(url => (
                    <div key={url} className="pc-webhook-row">
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>{url}</span>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }} onClick={() => removeWebhook(connector.id, url)}><X size={13} /></button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '.3rem', marginTop: '.3rem' }}>
                    <input className="pc-input" placeholder="https://your-endpoint.com/hook" value={newWebhook} onChange={e => setNewWebhook(e.target.value)} style={{ flex: 1 }} />
                    <button className="pc-btn pc-btn-connect" onClick={() => addWebhook(connector.id)}><Plus size={12} /></button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
                {state.status === 'connected'
                  ? <button className="pc-btn pc-btn-disconnect" onClick={() => disconnect(connector.id)}><XCircle size={13} /> Disconnect</button>
                  : <button className="pc-btn pc-btn-connect" onClick={() => setActiveModal(connector)} disabled={state.status === 'connecting'}>
                      <Plug size={13} /> {state.status === 'connecting' ? 'Connecting…' : 'Connect'}
                    </button>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Auth Modal */}
      {activeModal && (
        <div className="pc-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="pc-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <strong>{activeModal.icon} Connect {activeModal.name}</strong>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setActiveModal(null)}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Clicking "Authorize" will open {activeModal.name}'s OAuth flow in your browser.
              No credentials are stored in this application — only the issued access token (via your environment variables).
            </p>
            <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
              <button className="pc-btn" style={{ background: '#334155', color: '#e2e8f0' }} onClick={() => setActiveModal(null)}>Cancel</button>
              <button className="pc-btn pc-btn-connect" onClick={() => connect(activeModal)}>
                <CheckCircle size={14} /> Authorize & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlatformConnectors;
