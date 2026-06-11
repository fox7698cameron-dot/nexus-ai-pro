// src/integrations/dev/index.js
// Developer tool connectors — GitHub, Bitbucket, Slack, Zoom, Azure, AWS, GCP, Adobe
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import { encrypt, decrypt } from '../../services/crypto.service.js';

// ─── GitHub ────────────────────────────────────────────────────────────────
export class GitHubConnector {
  getAuthUrl(redirectUri, state) {
    const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
    if (!clientId) throw new Error('GITHUB_OAUTH_CLIENT_ID not configured');
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,read:user,read:org&state=${state}`;
  }

  async exchangeCode(code) {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.GITHUB_OAUTH_CLIENT_ID, client_secret: process.env.GITHUB_OAUTH_CLIENT_SECRET, code }),
    });
    if (!res.ok) throw new Error(`GitHub token exchange failed: ${res.status}`);
    const data = await res.json();
    return { accessTokenEnc: encrypt(data.access_token), scope: data.scope };
  }

  async getUser(accessTokenEnc) {
    const token = decrypt(accessTokenEnc);
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'NexusAIPro/3.0' },
    });
    if (!res.ok) throw new Error(`GitHub user fetch failed: ${res.status}`);
    return res.json();
  }

  async getRepoStats(accessTokenEnc, owner, repo) {
    const token = decrypt(accessTokenEnc);
    const [repoData, commits, issues] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'NexusAIPro/3.0' } }).then(r => r.json()),
      fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'NexusAIPro/3.0' } }).then(r => r.json()),
      fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=1`, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'NexusAIPro/3.0' } }).then(r => r.json()),
    ]);
    return { repo: repoData, recentCommit: commits[0], openIssueCount: repoData.open_issues_count };
  }

  // GitHub webhook signature verification (no exponential backoff — fail fast)
  static verifyWebhook(payload, signature, secret) {
    const { createHmac, timingSafeEqual } = await import('crypto');
    const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}

// ─── Bitbucket ────────────────────────────────────────────────────────────
export class BitbucketConnector {
  getAuthUrl(redirectUri, state) {
    const clientId = process.env.BITBUCKET_CLIENT_ID;
    if (!clientId) throw new Error('BITBUCKET_CLIENT_ID not configured');
    return `https://bitbucket.org/site/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  async exchangeCode(code, redirectUri) {
    const credentials = Buffer.from(`${process.env.BITBUCKET_CLIENT_ID}:${process.env.BITBUCKET_CLIENT_SECRET}`).toString('base64');
    const res = await fetch('https://bitbucket.org/site/oauth2/access_token', {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`Bitbucket token exchange failed: ${res.status}`);
    const data = await res.json();
    return { accessTokenEnc: encrypt(data.access_token), refreshTokenEnc: encrypt(data.refresh_token) };
  }
}

// ─── Slack ────────────────────────────────────────────────────────────────
export class SlackConnector {
  getAuthUrl(redirectUri, state) {
    const clientId = process.env.SLACK_CLIENT_ID;
    if (!clientId) throw new Error('SLACK_CLIENT_ID not configured');
    const scopes = 'channels:read,chat:write,users:read,team:read';
    return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  async exchangeCode(code, redirectUri) {
    const res = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: process.env.SLACK_CLIENT_ID, client_secret: process.env.SLACK_CLIENT_SECRET, code, redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`Slack token exchange failed: ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(`Slack error: ${data.error}`);
    return { accessTokenEnc: encrypt(data.access_token), teamId: data.team?.id, teamName: data.team?.name };
  }

  async postMessage(accessTokenEnc, channel, text, blocks = null) {
    const token = decrypt(accessTokenEnc);
    const body = { channel, text };
    if (blocks) body.blocks = blocks;
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Slack message failed: ${res.status}`);
    return res.json();
  }

  static verifySignature(body, timestamp, signature, signingSecret) {
    const { createHmac, timingSafeEqual } = crypto;
    if (Math.abs(Date.now() / 1000 - timestamp) > 300) throw new Error('Stale Slack request');
    const baseString = `v0:${timestamp}:${body}`;
    const expected = 'v0=' + createHmac('sha256', signingSecret).update(baseString).digest('hex');
    if (expected.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }
}

// ─── Zoom ─────────────────────────────────────────────────────────────────
export class ZoomConnector {
  getAuthUrl(redirectUri, state) {
    const clientId = process.env.ZOOM_CLIENT_ID;
    if (!clientId) throw new Error('ZOOM_CLIENT_ID not configured');
    return `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  async exchangeCode(code, redirectUri) {
    const credentials = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString('base64');
    const res = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    });
    if (!res.ok) throw new Error(`Zoom token exchange failed: ${res.status}`);
    const data = await res.json();
    return { accessTokenEnc: encrypt(data.access_token), refreshTokenEnc: encrypt(data.refresh_token) };
  }

  async getMeetingMetrics(accessTokenEnc, meetingId) {
    const token = decrypt(accessTokenEnc);
    const res = await fetch(`https://api.zoom.us/v2/metrics/meetings/${meetingId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Zoom meeting metrics failed: ${res.status}`);
    return res.json();
  }
}

export const githubConnector = new GitHubConnector();
export const bitbucketConnector = new BitbucketConnector();
export const slackConnector = new SlackConnector();
export const zoomConnector = new ZoomConnector();
