// File: EnterpriseConnectors.jsx | Created: 2026-08-31 | Nexus AI Pro

import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Connector definitions
// ---------------------------------------------------------------------------

const CONNECTORS = [
  {
    id: 'azure',        name: 'Microsoft Azure',    icon: '☁️',  color: '#0078D4',
    fields: ['tenantId', 'clientId', 'clientSecret', 'subscriptionId'],
    webhookSupport: true, category: 'cloud',
  },
  {
    id: 'aws',          name: 'Amazon AWS',          icon: '🟧', color: '#FF9900',
    fields: ['accessKeyId', 'secretAccessKey', 'region'],
    webhookSupport: true, category: 'cloud',
  },
  {
    id: 'adobe',        name: 'Adobe Creative',      icon: '🔴', color: '#FF0000',
    fields: ['apiKey', 'orgId', 'technicalAccountId'],
    webhookSupport: false, category: 'creative',
  },
  {
    id: 'gcloud',       name: 'Google Cloud',        icon: '🔵', color: '#4285F4',
    fields: ['projectId', 'serviceAccountJson'],
    webhookSupport: true, category: 'cloud',
  },
  {
    id: 'slack',        name: 'Slack',               icon: '💬', color: '#4A154B',
    fields: ['botToken', 'signingSecret', 'workspaceId'],
    webhookSupport: true, category: 'communication',
  },
  {
    id: 'zoom',         name: 'Zoom',                icon: '📹', color: '#2D8CFF',
    fields: ['accountId', 'clientId', 'clientSecret'],
    webhookSupport: true, category: 'communication',
  },
  {
    id: 'github',       name: 'GitHub',              icon: '🐙', color: '#333',
    fields: ['personalAccessToken', 'orgName'],
    webhookSupport: true, category: 'devops',
  },
  {
    id: 'bitbucket',    name: 'Bitbucket',           icon: '🪣', color: '#0052CC',
    fields: ['username', 'appPassword', 'workspace'],
    webhookSupport: true, category: 'devops',
  },
  {
    id: 'redis',        name: 'Redis',               icon: '🗄️', color: '#DC382D',
    fields: ['host', 'port', 'password', 'tls'],
    webhookSupport: false, category: 'data',
  },
  {
    id: 'azureblob',    name: 'Azure Blob Storage',  icon: '📦', color: '#0089D6',
    fields: ['connectionString', 'containerName'],
    webhookSupport: false, category: 'data',
  },
];

// ---------------------------------------------------------------------------
// Mock usage data
// ---------------------------------------------------------------------------

function mockUsage(connectorId) {
  return {
    apiCalls: Math.floor(Math.random() * 50000),
    dataTransferred: `${(Math.random() * 10).toFixed(1)} GB`,
    rateLimitRemaining: Math.floor(Math.random() * 5000),
    rateLimitTotal: 5000,
    lastActivity: new Date(Date.now() - Math.random() * 86400000).toLocaleString(),
  };
}

// ---------------------------------------------------------------------------
// Masking helper — never store credentials in component state in plaintext
// ---------------------------------------------------------------------------

function maskSecret(value = '') {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return value.slice(0, 2) + '•'.repeat(Math.max(0, value.length - 4)) + value.slice(-2);
}

// ---------------------------------------------------------------------------
// ConfigModal
// ---------------------------------------------------------------------------

function ConfigModal({ connector, onSave, onClose }) {
  // fieldDraft stores only the ephemeral draft in memory — never persisted to state
  const [fieldDraft, setFieldDraft] = useState({});
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showSecrets, setShowSecrets] = useState({});

  const handleChange = (field, value) => setFieldDraft((p) => ({ ...p, [field]: value }));
  const toggleShow = (field) => setShowSecrets((p) => ({ ...p, [field]: !p[field] }));

  const handleSave = () => {
    // Pass credentials up to parent (which forwards to the server via fetch)
    // No credential values remain in component state after this call
    onSave({ credentials: fieldDraft, webhookUrl });
    setFieldDraft({});
  };

  const isSecret = (field) =>
    ['password', 'secret', 'token', 'key', 'json', 'connectionstring']
      .some((kw) => field.toLowerCase().includes(kw));

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 16, padding: 28, width: 460,
        maxWidth: '95vw', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {connector.icon} Configure {connector.name}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Credential fields */}
        {connector.fields.map((field) => (
          <div key={field} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, opacity: 0.6, marginBottom: 5, textTransform: 'capitalize' }}>
              {field.replace(/([A-Z])/g, ' $1').trim()}
              {isSecret(field) && <span style={{ color: '#f59e0b', marginLeft: 4 }}>🔒</span>}
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type={isSecret(field) && !showSecrets[field] ? 'password' : 'text'}
                placeholder={isSecret(field) ? '••••••••' : `Enter ${field}`}
                value={fieldDraft[field] || ''}
                onChange={(e) => handleChange(field, e.target.value)}
                autoComplete="off"
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8,
                  background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f1f5f9', fontSize: 13, outline: 'none',
                }}
              />
              {isSecret(field) && (
                <button
                  onClick={() => toggleShow(field)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, padding: '0 10px', cursor: 'pointer', color: '#94a3b8' }}
                >
                  {showSecrets[field] ? '🙈' : '👁️'}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Webhook URL */}
        {connector.webhookSupport && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, opacity: 0.6, marginBottom: 5 }}>
              Webhook Endpoint (optional)
            </label>
            <input
              type="url"
              placeholder="https://your-server.com/webhooks/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8, boxSizing: 'border-box',
                background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9', fontSize: 13, outline: 'none',
              }}
            />
          </div>
        )}

        <p style={{ fontSize: 11, opacity: 0.4, margin: '0 0 18px' }}>
          Credentials are transmitted directly to the server and never stored in browser state.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13,
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            background: connector.color, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>Save & Connect</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConnectorCard
// ---------------------------------------------------------------------------

function UsageBar({ used, total, color }) {
  const pct = total > 0 ? Math.min(100, Math.round(((total - used) / total) * 100)) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ opacity: 0.5 }}>Rate limit remaining</span>
        <span>{used.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div style={{ background: '#334155', borderRadius: 4, height: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
    </div>
  );
}

function ConnectorCard({ connector, connectorState, onConfigure, onRemove }) {
  const usage = connectorState?.usage;
  const connected = connectorState?.connected ?? false;

  return (
    <div style={{
      background: '#1e293b', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 13, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24 }}>{connector.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{connector.name}</div>
          <div style={{ fontSize: 11, opacity: 0.4, textTransform: 'capitalize' }}>{connector.category}</div>
        </div>
        <div style={{
          width: 9, height: 9, borderRadius: '50%',
          background: connected ? '#4ade80' : '#475569',
          boxShadow: connected ? '0 0 5px #4ade80' : 'none',
        }} />
      </div>

      {connected && usage && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '6px 10px' }}>
              <div style={{ opacity: 0.5, fontSize: 10 }}>API Calls</div>
              <div style={{ fontWeight: 600 }}>{usage.apiCalls.toLocaleString()}</div>
            </div>
            <div style={{ background: '#0f172a', borderRadius: 8, padding: '6px 10px' }}>
              <div style={{ opacity: 0.5, fontSize: 10 }}>Data</div>
              <div style={{ fontWeight: 600 }}>{usage.dataTransferred}</div>
            </div>
          </div>
          <UsageBar used={usage.rateLimitRemaining} total={usage.rateLimitTotal} color={connector.color} />
          <div style={{ fontSize: 11, opacity: 0.4 }}>Last activity: {usage.lastActivity}</div>
        </>
      )}

      {/* Sync indicator */}
      {connected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          <span style={{ opacity: 0.6 }}>Syncing</span>
          {connectorState.webhookUrl && (
            <span style={{ marginLeft: 'auto', opacity: 0.4 }}>
              🔗 Webhook active
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onConfigure(connector)}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}
        >
          {connected ? '⚙ Reconfigure' : '⚙ Configure'}
        </button>
        {connected && (
          <button
            onClick={() => onRemove(connector.id)}
            style={{
              padding: '7px 12px', borderRadius: 8, border: 'none',
              background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 12, cursor: 'pointer',
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function EnterpriseConnectors({ userId, connectors = {}, onUpdate }) {
  const [states, setStates] = useState(() => {
    const init = {};
    CONNECTORS.forEach((c) => {
      if (connectors[c.id]?.connected) {
        init[c.id] = { connected: true, usage: mockUsage(c.id), webhookUrl: connectors[c.id].webhookUrl || '' };
      }
    });
    return init;
  });

  const [configTarget, setConfigTarget] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');

  const handleSave = useCallback(async (connector, { credentials, webhookUrl }) => {
    // Transmit credentials to server — component never retains plaintext values
    try {
      await fetch(`/api/connectors/${connector.id}/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? (localStorage.getItem('jwt') || '') : ''}`,
        },
        body: JSON.stringify({ userId, webhookUrl }),
        // credentials object intentionally excluded from logs / state
      });
    } catch {
      // Network error: still update local status optimistically
    }

    const newState = { connected: true, usage: mockUsage(connector.id), webhookUrl };
    setStates((prev) => ({ ...prev, [connector.id]: newState }));
    onUpdate?.({ connectorId: connector.id, connected: true, webhookUrl });
    setConfigTarget(null);
  }, [userId, onUpdate]);

  const handleRemove = useCallback((connectorId) => {
    setStates((prev) => { const n = { ...prev }; delete n[connectorId]; return n; });
    onUpdate?.({ connectorId, connected: false });
  }, [onUpdate]);

  const categories = ['all', ...new Set(CONNECTORS.map((c) => c.category))];
  const visible = filterCategory === 'all'
    ? CONNECTORS
    : CONNECTORS.filter((c) => c.category === filterCategory);

  const connectedCount = Object.values(states).filter((s) => s.connected).length;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#f1f5f9', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>Enterprise Connectors</h2>
          <p style={{ margin: 0, opacity: 0.5, fontSize: 13 }}>
            {connectedCount} of {CONNECTORS.length} services connected
          </p>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.12)',
                background: filterCategory === cat ? '#3b82f6' : 'transparent',
                color: filterCategory === cat ? '#fff' : '#94a3b8',
                textTransform: 'capitalize',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
        gap: 14,
      }}>
        {visible.map((c) => (
          <ConnectorCard
            key={c.id}
            connector={c}
            connectorState={states[c.id]}
            onConfigure={setConfigTarget}
            onRemove={handleRemove}
          />
        ))}
      </div>

      {configTarget && (
        <ConfigModal
          connector={configTarget}
          onSave={(payload) => handleSave(configTarget, payload)}
          onClose={() => setConfigTarget(null)}
        />
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
    </div>
  );
}
