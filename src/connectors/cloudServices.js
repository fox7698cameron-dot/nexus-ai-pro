// src/connectors/cloudServices.js
// Nexus AI Pro - Cloud & Service Integrations
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

// Service type enumeration
export const SERVICE_TYPE = Object.freeze({
  AZURE: 'azure',
  AWS: 'aws',
  GOOGLE: 'google',
  ADOBE: 'adobe',
  SLACK: 'slack',
  ZOOM: 'zoom',
  GITHUB: 'github',
  BITBUCKET: 'bitbucket',
});

// ─── Base connector ────────────────────────────────────────────────────────────
class BaseConnector {
  constructor(name) {
    this.name = name;
  }
  _requireEnv(key) {
    const val = process.env[key];
    if (!val) throw new Error(`${this.name}: ${key} environment variable not set`);
    return val;
  }
}

// ─── Azure ─────────────────────────────────────────────────────────────────────
export class AzureConnector extends BaseConnector {
  constructor() { super('Azure'); }

  async listResourceGroups() {
    const token = process.env.AZURE_ACCESS_TOKEN;
    const subId = process.env.AZURE_SUBSCRIPTION_ID;
    if (!token || !subId) throw new Error('Azure credentials not configured');
    const res = await fetch(
      `https://management.azure.com/subscriptions/${subId}/resourcegroups?api-version=2021-04-01`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.json();
  }

  async getDevOpsProjects() {
    const token = process.env.AZURE_DEVOPS_PAT;
    const org = process.env.AZURE_DEVOPS_ORG;
    if (!token || !org) throw new Error('Azure DevOps credentials not configured');
    const auth = Buffer.from(`:${token}`).toString('base64');
    const res = await fetch(
      `https://dev.azure.com/${org}/_apis/projects?api-version=7.0`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    return res.json();
  }
}

// ─── AWS ───────────────────────────────────────────────────────────────────────
export class AWSConnector extends BaseConnector {
  constructor() { super('AWS'); }

  async listS3Buckets() {
    // AWS SDK interactions require AWS SDK — return config info only if keys present
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const region = process.env.AWS_REGION || 'us-east-1';
    if (!accessKey) throw new Error('AWS credentials not configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)');
    return { configured: true, region, message: 'Use AWS SDK for full S3 operations' };
  }

  async getCodePipelineStatus(pipelineName) {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    if (!accessKey) throw new Error('AWS credentials not configured');
    return { pipelineName, status: 'connected', message: 'Use AWS SDK for pipeline status' };
  }
}

// ─── Google ────────────────────────────────────────────────────────────────────
export class GoogleConnector extends BaseConnector {
  constructor() { super('Google'); }

  async listGCPProjects() {
    const token = process.env.GOOGLE_ACCESS_TOKEN;
    if (!token) throw new Error('GOOGLE_ACCESS_TOKEN not configured');
    const res = await fetch(
      'https://cloudresourcemanager.googleapis.com/v1/projects',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.json();
  }

  async getDriveFiles() {
    const token = process.env.GOOGLE_ACCESS_TOKEN;
    if (!token) throw new Error('GOOGLE_ACCESS_TOKEN not configured');
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/files?pageSize=20',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.json();
  }
}

// ─── Adobe ─────────────────────────────────────────────────────────────────────
export class AdobeConnector extends BaseConnector {
  constructor() { super('Adobe'); }

  async getOrganization() {
    const token = process.env.ADOBE_ACCESS_TOKEN;
    const orgId = process.env.ADOBE_ORG_ID;
    if (!token || !orgId) throw new Error('Adobe credentials not configured');
    const res = await fetch(
      `https://ims-na1.adobelogin.com/ims/organizations/${orgId}`,
      { headers: { Authorization: `Bearer ${token}`, 'x-api-key': process.env.ADOBE_CLIENT_ID } }
    );
    return res.json();
  }

  async listCreativeCloudAssets() {
    const token = process.env.ADOBE_ACCESS_TOKEN;
    if (!token) throw new Error('Adobe credentials not configured');
    const res = await fetch(
      'https://cc-api-storage.adobe.io/assets',
      { headers: { Authorization: `Bearer ${token}`, 'x-api-key': process.env.ADOBE_CLIENT_ID } }
    );
    return res.json();
  }
}

// ─── Slack ─────────────────────────────────────────────────────────────────────
export class SlackConnector extends BaseConnector {
  constructor() { super('Slack'); }

  async sendMessage(channelId, text) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) throw new Error('SLACK_BOT_TOKEN not configured');
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel: channelId, text }),
    });
    return res.json();
  }

  async listChannels() {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) throw new Error('SLACK_BOT_TOKEN not configured');
    const res = await fetch('https://slack.com/api/conversations.list', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  }

  async listUsers() {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) throw new Error('SLACK_BOT_TOKEN not configured');
    const res = await fetch('https://slack.com/api/users.list', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  }
}

// ─── Zoom ──────────────────────────────────────────────────────────────────────
export class ZoomConnector extends BaseConnector {
  constructor() { super('Zoom'); }

  async _getToken() {
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    if (!accountId || !clientId || !clientSecret) {
      throw new Error('Zoom credentials not configured (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET)');
    }
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
      method: 'POST',
      headers: { Authorization: `Basic ${creds}` },
    });
    const data = await res.json();
    return data.access_token;
  }

  async createMeeting({ topic, duration = 60, timezone = 'UTC' }) {
    const token = await this._getToken();
    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, type: 2, duration, timezone, settings: { host_video: true } }),
    });
    return res.json();
  }

  async listMeetings() {
    const token = await this._getToken();
    const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  }
}

// ─── GitHub ────────────────────────────────────────────────────────────────────
export class GitHubConnector extends BaseConnector {
  constructor() { super('GitHub'); }

  async _headers() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN not configured');
    return { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' };
  }

  async getRepos(owner) {
    const res = await fetch(`https://api.github.com/users/${owner}/repos?per_page=30`, {
      headers: await this._headers(),
    });
    return res.json();
  }

  async getRepoStats(owner, repo) {
    const headers = await this._headers();
    const [repoData, commits, issues, pulls] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }).then(r => r.json()),
      fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers }).then(r => r.json()),
      fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=10`, { headers }).then(r => r.json()),
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=5`, { headers }).then(r => r.json()),
    ]);
    return { repo: repoData, recentCommits: commits, openIssues: issues, openPRs: pulls };
  }

  async getWorkflowRuns(owner, repo) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=10`, {
      headers: await this._headers(),
    });
    return res.json();
  }
}

// ─── Bitbucket ─────────────────────────────────────────────────────────────────
export class BitbucketConnector extends BaseConnector {
  constructor() { super('Bitbucket'); }

  async _headers() {
    const token = process.env.BITBUCKET_ACCESS_TOKEN;
    if (!token) throw new Error('BITBUCKET_ACCESS_TOKEN not configured');
    return { Authorization: `Bearer ${token}` };
  }

  async getWorkspaceRepos(workspace) {
    const res = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspace}`, {
      headers: await this._headers(),
    });
    return res.json();
  }

  async getPipelines(workspace, repo) {
    const res = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}/pipelines?sort=-created_on&pagelen=10`,
      { headers: await this._headers() }
    );
    return res.json();
  }
}

// ─── Connector registry ────────────────────────────────────────────────────────
export class CloudConnectorRegistry {
  constructor() {
    this.azure = new AzureConnector();
    this.aws = new AWSConnector();
    this.google = new GoogleConnector();
    this.adobe = new AdobeConnector();
    this.slack = new SlackConnector();
    this.zoom = new ZoomConnector();
    this.github = new GitHubConnector();
    this.bitbucket = new BitbucketConnector();
  }

  getConnector(service) {
    const map = {
      [SERVICE_TYPE.AZURE]: this.azure,
      [SERVICE_TYPE.AWS]: this.aws,
      [SERVICE_TYPE.GOOGLE]: this.google,
      [SERVICE_TYPE.ADOBE]: this.adobe,
      [SERVICE_TYPE.SLACK]: this.slack,
      [SERVICE_TYPE.ZOOM]: this.zoom,
      [SERVICE_TYPE.GITHUB]: this.github,
      [SERVICE_TYPE.BITBUCKET]: this.bitbucket,
    };
    const connector = map[service];
    if (!connector) throw new Error(`Unknown service: ${service}`);
    return connector;
  }
}
