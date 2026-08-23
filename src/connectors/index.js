/**
 * src/connectors/index.js
 * Platform connector registry — Azure, Adobe, AWS, Google, Slack, Zoom,
 * GitHub, Bitbucket, Redis, Blob Storage, plus game platform connectors.
 * All secrets/tokens come from server-side env vars — never hard-coded.
 * Created: 2026-08-23
 */

// ── Connector definitions ─────────────────────────────────────────────────────
export const CONNECTORS = [
  // Cloud providers
  { id: 'azure',     name: 'Azure',          icon: '🔷', category: 'cloud',    apiBase: '/api/connectors/azure',     docs: 'https://learn.microsoft.com/azure/' },
  { id: 'aws',       name: 'AWS',            icon: '☁️', category: 'cloud',    apiBase: '/api/connectors/aws',       docs: 'https://docs.aws.amazon.com/' },
  { id: 'gcp',       name: 'Google Cloud',   icon: '🌐', category: 'cloud',    apiBase: '/api/connectors/gcp',       docs: 'https://cloud.google.com/docs' },
  // Dev tools
  { id: 'github',    name: 'GitHub',         icon: '🐙', category: 'devtools', apiBase: '/api/connectors/github',    docs: 'https://docs.github.com' },
  { id: 'bitbucket', name: 'Bitbucket',      icon: '🪣', category: 'devtools', apiBase: '/api/connectors/bitbucket', docs: 'https://support.atlassian.com/bitbucket-cloud/' },
  // Collaboration
  { id: 'slack',     name: 'Slack',          icon: '💬', category: 'collab',   apiBase: '/api/connectors/slack',     docs: 'https://api.slack.com' },
  { id: 'zoom',      name: 'Zoom',           icon: '📹', category: 'collab',   apiBase: '/api/connectors/zoom',      docs: 'https://developers.zoom.us' },
  // Creative
  { id: 'adobe',     name: 'Adobe Creative', icon: '🎨', category: 'creative', apiBase: '/api/connectors/adobe',     docs: 'https://developer.adobe.com' },
  // Storage / Cache
  { id: 'redis',     name: 'Redis',          icon: '📦', category: 'storage',  apiBase: '/api/connectors/redis',     docs: 'https://redis.io/docs' },
  { id: 'blob',      name: 'Blob Storage',   icon: '🗄️', category: 'storage',  apiBase: '/api/connectors/blob',      docs: 'https://azure.microsoft.com/blob-storage' },
  { id: 's3',        name: 'AWS S3',         icon: '🪣', category: 'storage',  apiBase: '/api/connectors/s3',        docs: 'https://docs.aws.amazon.com/s3/' },
  // Game platforms
  { id: 'unreal',    name: 'Unreal Engine',  icon: '🎮', category: 'game',     apiBase: '/api/connectors/unreal',    docs: 'https://dev.epicgames.com/documentation/unreal-engine' },
  { id: 'epic',      name: 'Epic Games',     icon: '🎯', category: 'game',     apiBase: '/api/connectors/epic',      docs: 'https://dev.epicgames.com' },
  { id: 'sony',      name: 'PlayStation',    icon: '🎮', category: 'game',     apiBase: '/api/connectors/sony',      docs: 'https://partners.playstation.net' },
  { id: 'xbox',      name: 'Xbox / XDK',     icon: '🟢', category: 'game',     apiBase: '/api/connectors/xbox',      docs: 'https://developer.microsoft.com/games' },
  { id: 'ubisoft',   name: 'Ubisoft Connect',icon: '🔵', category: 'game',     apiBase: '/api/connectors/ubisoft',   docs: 'https://developers.ubisoft.com' },
  { id: 'steam',     name: 'Steam (Valve)',   icon: '♨️', category: 'game',     apiBase: '/api/connectors/steam',     docs: 'https://partner.steamgames.com/doc' },
];

/**
 * ConnectorClient — wraps fetch calls to a connector's server-side proxy.
 * All OAuth tokens and API keys are kept server-side; the client never sees them.
 */
export class ConnectorClient {
  /**
   * @param {string} connectorId   - ID from CONNECTORS registry
   */
  constructor(connectorId) {
    const def = CONNECTORS.find((c) => c.id === connectorId);
    if (!def) throw new Error(`Unknown connector: ${connectorId}`);
    this.def     = def;
    this.apiBase = def.apiBase;
  }

  /**
   * Check connection health.
   * @returns {Promise<{connected: boolean, latency: number, error?: string}>}
   */
  async ping() {
    const t0 = performance.now();
    try {
      const res = await fetch(`${this.apiBase}/ping`, { method: 'GET', credentials: 'include' });
      const data = await res.json();
      return { connected: res.ok && data.ok, latency: Math.round(performance.now() - t0) };
    } catch (err) {
      return { connected: false, latency: 0, error: err.message };
    }
  }

  /**
   * List available resources (repos, channels, buckets, etc.)
   * @param {object} [params]
   * @returns {Promise<any[]>}
   */
  async listResources(params = {}) {
    const qs  = new URLSearchParams(params).toString();
    const res = await fetch(`${this.apiBase}/resources${qs ? '?' + qs : ''}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`[${this.def.name}] listResources failed: ${res.status}`);
    return res.json();
  }

  /**
   * Trigger a sync operation.
   * @param {object} payload
   * @returns {Promise<{jobId: string, status: string}>}
   */
  async sync(payload = {}) {
    const res = await fetch(`${this.apiBase}/sync`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`[${this.def.name}] sync failed: ${res.status}`);
    return res.json();
  }

  /**
   * Start the OAuth flow for this connector (redirects to server-managed OAuth).
   */
  startOAuth() {
    const returnUrl = encodeURIComponent(window.location.href);
    window.location.href = `${this.apiBase}/oauth/start?return=${returnUrl}`;
  }

  /**
   * Disconnect / revoke access.
   */
  async disconnect() {
    const res = await fetch(`${this.apiBase}/disconnect`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) throw new Error(`[${this.def.name}] disconnect failed: ${res.status}`);
    return res.json();
  }
}

/**
 * Batch-ping all connectors and return their health status.
 */
export async function pingAllConnectors(connectorIds = CONNECTORS.map((c) => c.id)) {
  const results = await Promise.allSettled(
    connectorIds.map(async (id) => {
      const client = new ConnectorClient(id);
      const health = await client.ping();
      return { id, ...health };
    })
  );

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return { id: connectorIds[i], connected: false, latency: 0, error: r.reason?.message };
  });
}

/**
 * Get connector definition by ID.
 */
export function getConnector(id) {
  return CONNECTORS.find((c) => c.id === id) || null;
}

/**
 * Group connectors by category.
 */
export function groupConnectorsByCategory() {
  return CONNECTORS.reduce((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});
}
