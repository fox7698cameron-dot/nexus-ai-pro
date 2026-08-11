/**
 * src/connectors/CloudConnectors.js
 * Nexus AI Pro — Cloud & Dev Platform Connectors
 * Azure, Adobe, AWS, Google Cloud, Slack, Zoom, GitHub, Bitbucket + Redis, Blob
 * All credentials come from server-side env — no keys ever in client code.
 * Date: 2026-08-11
 */

// ─── Connector Registry ───────────────────────────────────────────────────────
export const CLOUD_CONNECTORS = {
  aws:       { name: 'Amazon AWS',    icon: '☁️',  category: 'cloud',   authType: 'oauth2'  },
  azure:     { name: 'Microsoft Azure', icon: '🔷', category: 'cloud',   authType: 'oauth2'  },
  gcp:       { name: 'Google Cloud',  icon: '🌐',  category: 'cloud',   authType: 'oauth2'  },
  adobe:     { name: 'Adobe',         icon: '🔴',  category: 'creative',authType: 'oauth2'  },
  slack:     { name: 'Slack',         icon: '💬',  category: 'comms',   authType: 'oauth2'  },
  zoom:      { name: 'Zoom',          icon: '📹',  category: 'comms',   authType: 'oauth2'  },
  github:    { name: 'GitHub',        icon: '🐙',  category: 'dev',     authType: 'oauth2'  },
  bitbucket: { name: 'Bitbucket',     icon: '🪣',  category: 'dev',     authType: 'oauth2'  },
  redis:     { name: 'Redis',         icon: '🔴',  category: 'data',    authType: 'apikey'  },
  s3:        { name: 'S3 / Blob',     icon: '🗄️',  category: 'data',    authType: 'apikey'  },
  jira:      { name: 'Jira',          icon: '📋',  category: 'pm',      authType: 'oauth2'  },
  notion:    { name: 'Notion',        icon: '📝',  category: 'pm',      authType: 'oauth2'  },
  figma:     { name: 'Figma',         icon: '🎨',  category: 'design',  authType: 'oauth2'  },
};

// ─── Base Cloud API Client ────────────────────────────────────────────────────
class CloudConnectorBase {
  constructor(connectorId) {
    this.id = connectorId;
    this.info = CLOUD_CONNECTORS[connectorId] ?? { name: connectorId };
  }

  async _req(path, method = 'GET', body) {
    const res = await fetch(`/api/connectors/cloud/${this.id}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `${this.info.name} error: ${res.status}`);
    return data;
  }

  async getStatus()     { return this._req('/status'); }
  async disconnect()    { return this._req('/disconnect', 'POST'); }
}

// ─── AWS Connector ────────────────────────────────────────────────────────────
export class AWSConnector extends CloudConnectorBase {
  constructor() { super('aws'); }
  async getS3Buckets()             { return this._req('/s3/buckets'); }
  async listS3Objects(bucket, prefix='') { return this._req(`/s3/${bucket}/objects?prefix=${encodeURIComponent(prefix)}`); }
  async uploadToS3(bucket, key, file) { return this._req(`/s3/${bucket}/upload`, 'POST', { key, size: file.size, name: file.name }); }
  async getLambdaFunctions()       { return this._req('/lambda/functions'); }
  async getRDSInstances()          { return this._req('/rds/instances'); }
  async getCloudWatchMetrics(namespace, metric) { return this._req(`/cloudwatch?namespace=${namespace}&metric=${metric}`); }
  async getCostEstimate()          { return this._req('/cost'); }
}

// ─── Azure Connector ──────────────────────────────────────────────────────────
export class AzureConnector extends CloudConnectorBase {
  constructor() { super('azure'); }
  async getResourceGroups()        { return this._req('/resource-groups'); }
  async getBlobContainers()        { return this._req('/blob/containers'); }
  async uploadBlob(container, name, meta) { return this._req(`/blob/${container}/upload`, 'POST', { name, ...meta }); }
  async getFunctions()             { return this._req('/functions'); }
  async getCosmosDBAccounts()      { return this._req('/cosmosdb'); }
  async getMonitorMetrics(resource){ return this._req(`/monitor?resource=${encodeURIComponent(resource)}`); }
  async getDevOpsProjects()        { return this._req('/devops/projects'); }
}

// ─── Google Cloud Connector ───────────────────────────────────────────────────
export class GCPConnector extends CloudConnectorBase {
  constructor() { super('gcp'); }
  async getProjects()              { return this._req('/projects'); }
  async getStorageBuckets()        { return this._req('/storage/buckets'); }
  async getCloudFunctions()        { return this._req('/functions'); }
  async getFirestoreCollections()  { return this._req('/firestore/collections'); }
  async getBigQueryDatasets()      { return this._req('/bigquery/datasets'); }
  async getMonitoringMetrics()     { return this._req('/monitoring'); }
}

// ─── Adobe Connector ──────────────────────────────────────────────────────────
export class AdobeConnector extends CloudConnectorBase {
  constructor() { super('adobe'); }
  async getCreativeCloudAssets()   { return this._req('/cc/assets'); }
  async getAdobeXDProjects()       { return this._req('/xd/projects'); }
  async getLightroomCatalogs()     { return this._req('/lightroom/catalogs'); }
  async exportAsset(assetId, format){ return this._req(`/cc/assets/${assetId}/export`, 'POST', { format }); }
}

// ─── Slack Connector ──────────────────────────────────────────────────────────
export class SlackConnector extends CloudConnectorBase {
  constructor() { super('slack'); }
  async getWorkspaces()            { return this._req('/workspaces'); }
  async getChannels()              { return this._req('/channels'); }
  async postMessage(channel, text, blocks) { return this._req('/messages', 'POST', { channel, text, blocks }); }
  async getUsers()                 { return this._req('/users'); }
  async createAlert(message, channel = '#alerts') { return this.postMessage(channel, message); }
  /** Post a security alert to Slack */
  async postSecurityAlert(alert) {
    return this.postMessage('#security-alerts', null, [{
      type: 'section',
      text: { type: 'mrkdwn', text: `🚨 *Security Alert*: ${alert.title}\n${alert.description}` },
    }]);
  }
}

// ─── Zoom Connector ───────────────────────────────────────────────────────────
export class ZoomConnector extends CloudConnectorBase {
  constructor() { super('zoom'); }
  async getMeetings()              { return this._req('/meetings'); }
  async createMeeting(data)        { return this._req('/meetings', 'POST', data); }
  async getRecordings()            { return this._req('/recordings'); }
  async getWebinars()              { return this._req('/webinars'); }
  async getParticipants(meetingId) { return this._req(`/meetings/${meetingId}/participants`); }
}

// ─── GitHub Connector ─────────────────────────────────────────────────────────
export class GitHubConnector extends CloudConnectorBase {
  constructor() { super('github'); }
  async getRepos()                 { return this._req('/repos'); }
  async getRepo(owner, repo)       { return this._req(`/repos/${owner}/${repo}`); }
  async getIssues(owner, repo)     { return this._req(`/repos/${owner}/${repo}/issues`); }
  async getPRs(owner, repo)        { return this._req(`/repos/${owner}/${repo}/pulls`); }
  async getActions(owner, repo)    { return this._req(`/repos/${owner}/${repo}/actions`); }
  async getCommits(owner, repo, branch='main') { return this._req(`/repos/${owner}/${repo}/commits?branch=${branch}`); }
  async getContributors(owner, repo){ return this._req(`/repos/${owner}/${repo}/contributors`); }
  async createIssue(owner, repo, data){ return this._req(`/repos/${owner}/${repo}/issues`, 'POST', data); }
  async getOrgs()                  { return this._req('/orgs'); }
  async getOrgRepos(org)           { return this._req(`/orgs/${org}/repos`); }
  async getCodeScanAlerts(owner, repo){ return this._req(`/repos/${owner}/${repo}/code-scanning/alerts`); }
  async getDependabotAlerts(owner, repo){ return this._req(`/repos/${owner}/${repo}/dependabot/alerts`); }
}

// ─── Bitbucket Connector ──────────────────────────────────────────────────────
export class BitbucketConnector extends CloudConnectorBase {
  constructor() { super('bitbucket'); }
  async getWorkspaces()            { return this._req('/workspaces'); }
  async getRepos(workspace)        { return this._req(`/workspaces/${workspace}/repos`); }
  async getPipelines(workspace, repo){ return this._req(`/workspaces/${workspace}/repos/${repo}/pipelines`); }
  async getPRs(workspace, repo)    { return this._req(`/workspaces/${workspace}/repos/${repo}/pullrequests`); }
}

// ─── Redis Client (Server-proxied) ────────────────────────────────────────────
export class RedisClient {
  async get(key)             { return _req('/api/cache/get', 'POST', { key }); }
  async set(key, value, ttl) { return _req('/api/cache/set', 'POST', { key, value, ttl }); }
  async del(key)             { return _req('/api/cache/del', 'POST', { key }); }
  async keys(pattern)        { return _req('/api/cache/keys', 'POST', { pattern }); }
  async ttl(key)             { return _req('/api/cache/ttl', 'POST', { key }); }
  async flush()              { return _req('/api/cache/flush', 'POST'); }
  async ping()               { return _req('/api/cache/ping'); }
}

// ─── Blob Storage Client (Server-proxied) ─────────────────────────────────────
export class BlobStorageClient {
  async upload(file, path, isPublic = false) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    formData.append('public', String(isPublic));
    const res = await fetch('/api/blob/upload', { method: 'POST', credentials: 'include', body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Blob upload failed: ${res.status}`);
    return data;
  }
  async download(path)       { return _req(`/api/blob/download?path=${encodeURIComponent(path)}`); }
  async list(prefix = '')    { return _req(`/api/blob/list?prefix=${encodeURIComponent(prefix)}`); }
  async delete(path)         { return _req(`/api/blob/delete`, 'DELETE', { path }); }
  async getSignedUrl(path, expirySeconds = 3600) {
    return _req('/api/blob/signed-url', 'POST', { path, expirySeconds });
  }
}

// ─── Unified Connector Manager ────────────────────────────────────────────────
export class ConnectorManager {
  constructor() {
    this.aws       = new AWSConnector();
    this.azure     = new AzureConnector();
    this.gcp       = new GCPConnector();
    this.adobe     = new AdobeConnector();
    this.slack     = new SlackConnector();
    this.zoom      = new ZoomConnector();
    this.github    = new GitHubConnector();
    this.bitbucket = new BitbucketConnector();
    this.redis     = new RedisClient();
    this.blob      = new BlobStorageClient();
  }

  /** Get status of all connectors */
  async getAllStatuses() {
    const connectors = ['aws', 'azure', 'gcp', 'adobe', 'slack', 'zoom', 'github', 'bitbucket'];
    const results = {};
    await Promise.allSettled(
      connectors.map(async id => {
        try {
          results[id] = await this[id].getStatus();
        } catch {
          results[id] = { connected: false, error: true };
        }
      })
    );
    return results;
  }

  /** Initiate OAuth flow for a connector */
  async connectOAuth(connectorId) {
    const res = await _req(`/api/connectors/cloud/${connectorId}/auth-url`);
    if (res.authUrl) window.location.href = res.authUrl;
    return res;
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────
async function _req(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}
