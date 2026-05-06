// src/integrations/cloudConnectors.js
// Nexus AI Pro — Cloud & Service Integration Connectors
// Azure · Adobe · AWS · Google · Slack · Zoom · GitHub · Bitbucket · Redis · Blob Storage
// All API keys loaded from environment — never hardcoded
// Updated: 2026-05-06

// ── Connector registry ────────────────────────────────────────────────────────
export const CONNECTORS = {
  azure:     { label: 'Microsoft Azure',  icon: '☁️',  category: 'cloud',     envKey: 'AZURE_CONNECTION_STRING' },
  adobe:     { label: 'Adobe',            icon: '🎨',  category: 'creative',  envKey: 'ADOBE_CLIENT_ID' },
  aws:       { label: 'Amazon AWS',       icon: '🔶',  category: 'cloud',     envKey: 'AWS_ACCESS_KEY_ID' },
  google:    { label: 'Google Cloud',     icon: '🔵',  category: 'cloud',     envKey: 'GOOGLE_API_KEY' },
  slack:     { label: 'Slack',            icon: '💬',  category: 'comms',     envKey: 'SLACK_BOT_TOKEN' },
  zoom:      { label: 'Zoom',             icon: '🎥',  category: 'comms',     envKey: 'ZOOM_API_KEY' },
  github:    { label: 'GitHub',           icon: '🐙',  category: 'dev',       envKey: 'GITHUB_TOKEN' },
  bitbucket: { label: 'Bitbucket',        icon: '🪣',  category: 'dev',       envKey: 'BITBUCKET_TOKEN' },
  redis:     { label: 'Redis',            icon: '🔴',  category: 'data',      envKey: 'REDIS_URL' },
  s3:        { label: 'S3 / Blob',        icon: '📦',  category: 'storage',   envKey: 'AWS_S3_BUCKET' },
};

// ── Base connector class ──────────────────────────────────────────────────────
class BaseConnector {
  constructor(name) {
    this.name    = name;
    this.meta    = CONNECTORS[name] || {};
    this.healthy = false;
  }

  // Override in subclass
  async healthCheck() { return false; }

  async connect() {
    this.healthy = await this.healthCheck();
    return this.healthy;
  }
}

// ── Azure (via server-side proxy — client never holds connection string) ──────
export class AzureConnector extends BaseConnector {
  constructor() { super('azure'); }

  async healthCheck() {
    try {
      const res = await fetch('/api/integrations/azure/health');
      return res.ok;
    } catch { return false; }
  }

  async uploadBlob(containerName, blobName, data) {
    const res = await fetch('/api/integrations/azure/blob/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ containerName, blobName, data }),
    });
    if (!res.ok) throw new Error(`Azure blob upload failed: ${res.status}`);
    return res.json();
  }

  async listBlobs(containerName) {
    const res = await fetch(`/api/integrations/azure/blob/list?container=${encodeURIComponent(containerName)}`);
    if (!res.ok) throw new Error(`Azure list blobs failed: ${res.status}`);
    return res.json();
  }
}

// ── AWS S3 (via server-side proxy) ────────────────────────────────────────────
export class AWSConnector extends BaseConnector {
  constructor() { super('aws'); }

  async healthCheck() {
    try {
      const res = await fetch('/api/integrations/aws/health');
      return res.ok;
    } catch { return false; }
  }

  async uploadObject(key, body, contentType = 'application/octet-stream') {
    const res = await fetch('/api/integrations/aws/s3/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, body, contentType }),
    });
    if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
    return res.json();
  }

  async getPresignedUrl(key, expiresIn = 3600) {
    const res = await fetch(`/api/integrations/aws/s3/presign?key=${encodeURIComponent(key)}&expires=${expiresIn}`);
    if (!res.ok) throw new Error(`Presign failed: ${res.status}`);
    return res.json();
  }
}

// ── Google Cloud ──────────────────────────────────────────────────────────────
export class GoogleConnector extends BaseConnector {
  constructor() { super('google'); }

  async healthCheck() {
    try {
      const res = await fetch('/api/integrations/google/health');
      return res.ok;
    } catch { return false; }
  }

  async translate(text, targetLang) {
    const res = await fetch('/api/integrations/google/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!res.ok) throw new Error(`Translation failed: ${res.status}`);
    return res.json();
  }

  async analyzeText(text) {
    const res = await fetch('/api/integrations/google/nlp/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`NLP analysis failed: ${res.status}`);
    return res.json();
  }
}

// ── Slack ─────────────────────────────────────────────────────────────────────
export class SlackConnector extends BaseConnector {
  constructor() { super('slack'); }

  async healthCheck() {
    try {
      const res = await fetch('/api/integrations/slack/health');
      return res.ok;
    } catch { return false; }
  }

  async sendMessage(channel, text, blocks = []) {
    const res = await fetch('/api/integrations/slack/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, text, blocks }),
    });
    if (!res.ok) throw new Error(`Slack send failed: ${res.status}`);
    return res.json();
  }

  async sendAlert(message, severity = 'info') {
    const emoji = { critical: '🚨', high: '⚠️', medium: '⚡', low: 'ℹ️', info: '💬' }[severity] || '💬';
    return this.sendMessage(
      '#nexus-alerts',
      `${emoji} *Nexus AI Pro Alert*\n${message}`,
      []
    );
  }
}

// ── Zoom ──────────────────────────────────────────────────────────────────────
export class ZoomConnector extends BaseConnector {
  constructor() { super('zoom'); }

  async healthCheck() {
    try {
      const res = await fetch('/api/integrations/zoom/health');
      return res.ok;
    } catch { return false; }
  }

  async createMeeting(topic, durationMinutes = 60) {
    const res = await fetch('/api/integrations/zoom/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, duration: durationMinutes, type: 2 }),
    });
    if (!res.ok) throw new Error(`Zoom create meeting failed: ${res.status}`);
    return res.json();
  }

  async listMeetings() {
    const res = await fetch('/api/integrations/zoom/meetings');
    if (!res.ok) throw new Error(`Zoom list meetings failed: ${res.status}`);
    return res.json();
  }
}

// ── GitHub ────────────────────────────────────────────────────────────────────
export class GitHubConnector extends BaseConnector {
  constructor() { super('github'); }

  async healthCheck() {
    try {
      const res = await fetch('/api/integrations/github/health');
      return res.ok;
    } catch { return false; }
  }

  async listRepos(org) {
    const res = await fetch(`/api/integrations/github/repos?org=${encodeURIComponent(org || '')}`);
    if (!res.ok) throw new Error(`GitHub list repos failed: ${res.status}`);
    return res.json();
  }

  async getCommits(owner, repo, limit = 20) {
    const res = await fetch(`/api/integrations/github/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&limit=${limit}`);
    if (!res.ok) throw new Error(`GitHub commits failed: ${res.status}`);
    return res.json();
  }

  async createIssue(owner, repo, title, body) {
    const res = await fetch('/api/integrations/github/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner, repo, title, body }),
    });
    if (!res.ok) throw new Error(`GitHub create issue failed: ${res.status}`);
    return res.json();
  }
}

// ── Bitbucket ─────────────────────────────────────────────────────────────────
export class BitbucketConnector extends BaseConnector {
  constructor() { super('bitbucket'); }

  async healthCheck() {
    try {
      const res = await fetch('/api/integrations/bitbucket/health');
      return res.ok;
    } catch { return false; }
  }

  async listRepositories(workspace) {
    const res = await fetch(`/api/integrations/bitbucket/repos?workspace=${encodeURIComponent(workspace || '')}`);
    if (!res.ok) throw new Error(`Bitbucket list repos failed: ${res.status}`);
    return res.json();
  }

  async createPullRequest(workspace, repo, title, sourceBranch, destBranch = 'main') {
    const res = await fetch('/api/integrations/bitbucket/pullrequests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace, repo, title, sourceBranch, destBranch }),
    });
    if (!res.ok) throw new Error(`Bitbucket PR failed: ${res.status}`);
    return res.json();
  }
}

// ── Adobe ─────────────────────────────────────────────────────────────────────
export class AdobeConnector extends BaseConnector {
  constructor() { super('adobe'); }

  async healthCheck() {
    try {
      const res = await fetch('/api/integrations/adobe/health');
      return res.ok;
    } catch { return false; }
  }

  async generateArt(prompt, style = 'photorealistic') {
    const res = await fetch('/api/integrations/adobe/firefly/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, style }),
    });
    if (!res.ok) throw new Error(`Adobe Firefly generate failed: ${res.status}`);
    return res.json();
  }
}

// ── Redis (client-side status check only — actual Redis is server-side) ───────
export class RedisConnector extends BaseConnector {
  constructor() { super('redis'); }

  async healthCheck() {
    try {
      const res = await fetch('/api/integrations/redis/health');
      return res.ok;
    } catch { return false; }
  }

  async getStats() {
    const res = await fetch('/api/integrations/redis/stats');
    if (!res.ok) throw new Error(`Redis stats failed: ${res.status}`);
    return res.json();
  }

  async flushCache(pattern = '*') {
    const res = await fetch('/api/integrations/redis/flush', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern }),
    });
    if (!res.ok) throw new Error(`Redis flush failed: ${res.status}`);
    return res.json();
  }
}

// ── Integration manager ───────────────────────────────────────────────────────
class IntegrationManager {
  constructor() {
    this._instances = {
      azure:     new AzureConnector(),
      aws:       new AWSConnector(),
      google:    new GoogleConnector(),
      slack:     new SlackConnector(),
      zoom:      new ZoomConnector(),
      github:    new GitHubConnector(),
      bitbucket: new BitbucketConnector(),
      adobe:     new AdobeConnector(),
      redis:     new RedisConnector(),
    };
    this._status = {};
  }

  get(name) { return this._instances[name]; }

  async checkAll() {
    const results = await Promise.allSettled(
      Object.entries(this._instances).map(async ([name, conn]) => {
        const ok = await conn.healthCheck();
        conn.healthy = ok;
        return [name, ok];
      })
    );
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        const [name, ok] = r.value;
        this._status[name] = { ok, checkedAt: Date.now() };
      }
    });
    return this._status;
  }

  getStatus() { return this._status; }
}

export const integrations = new IntegrationManager();
export default integrations;
