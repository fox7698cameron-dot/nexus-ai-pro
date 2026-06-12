// src/connectors/cloud-connectors.js
// 2026-06-12 | Nexus AI Pro Cloud Connectors
// Azure · Adobe · AWS · Google · Slack · Zoom · GitHub · Bitbucket
// All credentials sourced from environment variables — never hardcoded.

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { BlobServiceClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

// ---- connector registry ----------------------------------------------

export const CONNECTORS = Object.freeze({
  aws:       { name: 'Amazon Web Services', envKey: 'AWS_ACCESS_KEY_ID',         icon: 'Cloud' },
  azure:     { name: 'Microsoft Azure',     envKey: 'AZURE_STORAGE_CONNECTION',  icon: 'CloudLightning' },
  google:    { name: 'Google Cloud',        envKey: 'GOOGLE_API_KEY',            icon: 'Globe' },
  slack:     { name: 'Slack',              envKey: 'SLACK_WEBHOOK_URL',          icon: 'MessageSquare' },
  zoom:      { name: 'Zoom',               envKey: 'ZOOM_API_KEY',               icon: 'Video' },
  github:    { name: 'GitHub',             envKey: 'GITHUB_TOKEN',               icon: 'Github' },
  bitbucket: { name: 'Bitbucket',          envKey: 'BITBUCKET_TOKEN',            icon: 'GitBranch' },
  adobe:     { name: 'Adobe Creative Cloud',envKey: 'ADOBE_API_KEY',            icon: 'Paintbrush' }
});

function isConfigured(key) { return !!process.env[CONNECTORS[key]?.envKey]; }

// ---- AWS S3 Blob Storage --------------------------------------------

function getS3() {
  if (!process.env.AWS_ACCESS_KEY_ID) throw new Error('AWS_ACCESS_KEY_ID not set');
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

export const BlobStorage = {
  async upload(key, buffer, contentType = 'application/octet-stream') {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) throw new Error('AWS_S3_BUCKET not set');
    await getS3().send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }));
    return { key, bucket, url: `https://${bucket}.s3.amazonaws.com/${key}` };
  },

  async download(key) {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) throw new Error('AWS_S3_BUCKET not set');
    const resp = await getS3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks = [];
    for await (const chunk of resp.Body) chunks.push(chunk);
    return Buffer.concat(chunks);
  },

  async list(prefix = '') {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) throw new Error('AWS_S3_BUCKET not set');
    const resp = await getS3().send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
    return (resp.Contents || []).map(o => ({ key: o.Key, size: o.Size, lastModified: o.LastModified }));
  }
};

// ---- Azure Blob Storage ---------------------------------------------

export const AzureStorage = {
  async upload(containerName, blobName, buffer, contentType = 'application/octet-stream') {
    const conn = process.env.AZURE_STORAGE_CONNECTION;
    if (!conn) throw new Error('AZURE_STORAGE_CONNECTION not set');
    const client = BlobServiceClient.fromConnectionString(conn);
    const container = client.getContainerClient(containerName);
    await container.createIfNotExists();
    const blob = container.getBlockBlobClient(blobName);
    await blob.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });
    return { url: blob.url };
  }
};

// ---- Slack notifications --------------------------------------------

export async function sendSlackNotification(text, blocks) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { error: 'SLACK_WEBHOOK_URL not set', sent: false };
  const body = blocks ? { text, blocks } : { text };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { sent: resp.ok, status: resp.status };
}

// ---- GitHub API proxy -----------------------------------------------

export const GitHubConnector = {
  async getRepo(owner, repo) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return { error: 'GITHUB_TOKEN not set' };
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    });
    return resp.json();
  },

  async listIssues(owner, repo, state = 'open') {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return { error: 'GITHUB_TOKEN not set' };
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=${state}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    });
    return resp.json();
  },

  async getWorkflowRuns(owner, repo) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return { error: 'GITHUB_TOKEN not set' };
    const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=10`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    });
    return resp.json();
  }
};

// ---- Bitbucket API proxy --------------------------------------------

export const BitbucketConnector = {
  async getRepo(workspace, slug) {
    const token = process.env.BITBUCKET_TOKEN;
    if (!token) return { error: 'BITBUCKET_TOKEN not set' };
    const resp = await fetch(`https://api.bitbucket.org/2.0/repositories/${workspace}/${slug}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return resp.json();
  }
};

// ---- Zoom meeting proxy ---------------------------------------------

export const ZoomConnector = {
  async createMeeting(topic, startTime) {
    const apiKey = process.env.ZOOM_API_KEY;
    const accountId = process.env.ZOOM_ACCOUNT_ID;
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;
    if (!apiKey && !clientId) return { error: 'Zoom credentials not set (ZOOM_API_KEY or ZOOM_CLIENT_ID/SECRET)' };

    // Server-to-Server OAuth token
    const tokenResp = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    const { access_token } = await tokenResp.json();

    const resp = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, type: 2, start_time: startTime, duration: 60, settings: { host_video: true } })
    });
    return resp.json();
  }
};

// ---- Adobe Creative Cloud proxy -------------------------------------

export const AdobeConnector = {
  async getAssets(projectId) {
    const key = process.env.ADOBE_API_KEY;
    if (!key) return { error: 'ADOBE_API_KEY not set' };
    const resp = await fetch(`https://cc-api-storage-prod.adobe.io/v2/assets?project_id=${projectId}`, {
      headers: { 'x-api-key': key, Authorization: `Bearer ${process.env.ADOBE_ACCESS_TOKEN}` }
    });
    return resp.json();
  }
};

// ---- Status check for UI -----------------------------------------

export function getConnectorStatus() {
  return Object.entries(CONNECTORS).map(([key, cfg]) => ({
    key, name: cfg.name, icon: cfg.icon,
    connected: isConfigured(key),
    envKey: cfg.envKey
  }));
}
