// ================================================
// NEXUS AI PRO - Cloud & Tool Connector Service
// File: src/services/connectorService.js
// Updated: 2026-07-01
// Connectors: Azure, Adobe, AWS, Google, Slack,
//             Zoom, GitHub, Bitbucket, Epic/Unreal,
//             Sony PSN, Xbox, Ubisoft Connect, Steam
// All credentials sourced exclusively from env vars
// ================================================

// Connector registry — enumerated to prevent injection
export const CONNECTORS = Object.freeze({
  // Cloud platforms
  AZURE: 'azure',
  AWS: 'aws',
  GOOGLE_CLOUD: 'google_cloud',
  // Creative
  ADOBE: 'adobe',
  // Productivity
  SLACK: 'slack',
  ZOOM: 'zoom',
  GITHUB: 'github',
  BITBUCKET: 'bitbucket',
  // Gaming
  EPIC_GAMES: 'epic_games',
  PLAYSTATION: 'playstation',
  XBOX: 'xbox',
  UBISOFT: 'ubisoft',
  STEAM: 'steam',
});

// ── Azure ─────────────────────────────────────────────────────────────────

export async function testAzureConnection() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) return { connected: false, error: 'Azure credentials not configured' };
  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://management.azure.com/.default',
      }),
    }
  );
  return { connected: res.ok, statusCode: res.status };
}

export async function uploadToAzureBlob(containerName, blobName, data) {
  const { BlobServiceClient } = await import('@azure/storage-blob');
  const account = process.env.AZURE_STORAGE_ACCOUNT;
  const key = process.env.AZURE_STORAGE_KEY;
  if (!account || !key) throw new Error('Azure Storage credentials not configured');
  const connStr = `DefaultEndpointsProtocol=https;AccountName=${account};AccountKey=${key};EndpointSuffix=core.windows.net`;
  const client = BlobServiceClient.fromConnectionString(connStr);
  const container = client.getContainerClient(containerName);
  const blob = container.getBlockBlobClient(blobName);
  await blob.upload(data, Buffer.byteLength(data));
  return { url: blob.url };
}

// ── AWS S3 ────────────────────────────────────────────────────────────────

export async function uploadToS3(bucket, key, data, contentType = 'application/octet-stream') {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: contentType }));
  return { bucket, key, url: `https://${bucket}.s3.amazonaws.com/${key}` };
}

export async function getS3PresignedUrl(bucket, key, expiresIn = 3600) {
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

// ── Slack ─────────────────────────────────────────────────────────────────

export async function sendSlackMessage(channel, text, blocks = null) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN not configured');
  const { WebClient } = await import('@slack/web-api');
  const client = new WebClient(token);
  return client.chat.postMessage({ channel, text, ...(blocks ? { blocks } : {}) });
}

export async function listSlackChannels() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN not configured');
  const { WebClient } = await import('@slack/web-api');
  const client = new WebClient(token);
  const result = await client.conversations.list({ limit: 100 });
  return result.channels?.map(c => ({ id: c.id, name: c.name, isPrivate: c.is_private })) ?? [];
}

// ── GitHub ────────────────────────────────────────────────────────────────

export async function getGitHubRepos(username) {
  const token = process.env.GITHUB_TOKEN;
  const headers = { 'User-Agent': 'NexusAIPro/2.0', ...(token ? { Authorization: `token ${token}` } : {}) };
  const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=50`, { headers });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const repos = await res.json();
  return repos.map(r => ({
    id: r.id, name: r.name, fullName: r.full_name,
    private: r.private, stars: r.stargazers_count,
    forks: r.forks_count, language: r.language,
    updatedAt: r.updated_at,
  }));
}

export async function getGitHubCommits(owner, repo, since) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not configured');
  const { Octokit } = await import('@octokit/rest');
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.repos.listCommits({ owner, repo, since, per_page: 100 });
  return data.map(c => ({ sha: c.sha, message: c.commit.message, author: c.commit.author, date: c.commit.author.date }));
}

// ── Zoom ──────────────────────────────────────────────────────────────────

export async function createZoomMeeting({ topic, startTime, duration = 60 }) {
  const apiKey = process.env.ZOOM_API_KEY;
  const apiSecret = process.env.ZOOM_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error('Zoom credentials not configured');
  // Generate JWT for Zoom Server-to-Server OAuth
  const { default: jwt } = await import('jsonwebtoken');
  const token = jwt.sign({ iss: apiKey, exp: Math.floor(Date.now() / 1000) + 60 }, apiSecret);
  const res = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, type: 2, start_time: startTime, duration }),
  });
  if (!res.ok) throw new Error(`Zoom API error: ${res.status}`);
  return res.json();
}

// ── Bitbucket ─────────────────────────────────────────────────────────────

export async function getBitbucketRepos() {
  const username = process.env.BITBUCKET_USERNAME;
  const password = process.env.BITBUCKET_APP_PASSWORD;
  if (!username || !password) throw new Error('Bitbucket credentials not configured');
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const res = await fetch(`https://api.bitbucket.org/2.0/repositories/${username}?pagelen=50`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Bitbucket API error: ${res.status}`);
  const data = await res.json();
  return data.values?.map(r => ({ slug: r.slug, name: r.name, isPrivate: r.is_private, updatedOn: r.updated_on })) ?? [];
}

// ── Epic Games / Unreal Engine ────────────────────────────────────────────

export async function getEpicAuthToken() {
  const clientId = process.env.EPIC_CLIENT_ID;
  const clientSecret = process.env.EPIC_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Epic Games credentials not configured');
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://api.epicgames.dev/epic/oauth/v2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&deployment_id=',
  });
  if (!res.ok) throw new Error(`Epic Games auth error: ${res.status}`);
  return res.json();
}

// ── PlayStation Network ───────────────────────────────────────────────────

export async function getPSNProfile(accessToken, accountId = 'me') {
  if (!accessToken) throw new Error('PSN access token required');
  const res = await fetch(`https://m.np.playstation.com/api/userProfile/v1/internal/users/${accountId}/profiles`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`PSN API error: ${res.status}`);
  return res.json();
}

// ── Xbox / Microsoft ──────────────────────────────────────────────────────

export async function getXboxProfile(accessToken) {
  if (!accessToken) throw new Error('Xbox access token required');
  const res = await fetch('https://profile.xboxlive.com/users/me/profile/settings?settings=Gamertag,GameDisplayName,GameScore', {
    headers: { Authorization: `XBL3.0 x=${accessToken}`, 'x-xbl-contract-version': '3', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Xbox API error: ${res.status}`);
  return res.json();
}

// ── Ubisoft Connect ───────────────────────────────────────────────────────

export async function getUbisoftAuthToken() {
  const clientId = process.env.UBISOFT_CLIENT_ID;
  const clientSecret = process.env.UBISOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Ubisoft credentials not configured');
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://public-ubiservices.ubi.com/v3/profiles/sessions', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', 'Ubi-AppId': clientId },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Ubisoft auth error: ${res.status}`);
  return res.json();
}

// ── Steam ─────────────────────────────────────────────────────────────────

export async function getSteamPlayerSummary(steamId) {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error('STEAM_API_KEY not configured');
  const res = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  const data = await res.json();
  return data?.response?.players?.[0] ?? null;
}

export async function getSteamAchievements(steamId, appId) {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error('STEAM_API_KEY not configured');
  const res = await fetch(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${apiKey}&steamid=${steamId}&appid=${appId}`);
  if (!res.ok) throw new Error(`Steam API error: ${res.status}`);
  const data = await res.json();
  return data?.playerstats?.achievements ?? [];
}

// ── Connector status check ────────────────────────────────────────────────

export async function checkConnectorStatus(connector) {
  const checks = {
    [CONNECTORS.AZURE]: testAzureConnection,
    [CONNECTORS.SLACK]: async () => {
      const token = process.env.SLACK_BOT_TOKEN;
      return { connected: !!token };
    },
    [CONNECTORS.GITHUB]: async () => {
      const token = process.env.GITHUB_TOKEN;
      return { connected: !!token };
    },
    [CONNECTORS.EPIC_GAMES]: async () => {
      const id = process.env.EPIC_CLIENT_ID;
      return { connected: !!id };
    },
  };
  const check = checks[connector];
  if (!check) return { connected: false, error: 'Unknown connector' };
  return check().catch(err => ({ connected: false, error: err.message }));
}
