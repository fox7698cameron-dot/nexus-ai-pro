// nexus-ai-pro/src/services/project.service.js | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Project tracking: web, mobile, game, AR/VR, 3D — connectors for Unreal, Epic, Sony, MS, Ubisoft

import crypto from 'crypto';

// ── Platform connector registry ────────────────────────────────
export const CONNECTORS = Object.freeze({
  unreal: {
    label: 'Unreal Engine',
    category: 'engine',
    icon: '🎮',
    authType: 'api_key',
    envKey: 'UNREAL_API_KEY',
    apiBase: 'https://api.unrealengine.com/v1',
  },
  epic_games: {
    label: 'Epic Games Store',
    category: 'store',
    icon: '🛒',
    authType: 'oauth',
    envKey: 'EPIC_CLIENT_ID',
    apiBase: 'https://api.epicgames.dev/epic/egs/v1',
  },
  sony_psn: {
    label: 'PlayStation Network',
    category: 'platform',
    icon: '🎮',
    authType: 'oauth',
    envKey: 'SONY_PSN_CLIENT_ID',
    apiBase: 'https://m.np.playstation.com/api/trophy/v1',
  },
  xbox_live: {
    label: 'Xbox Live / Microsoft',
    category: 'platform',
    icon: '🎮',
    authType: 'oauth',
    envKey: 'XBOX_CLIENT_ID',
    apiBase: 'https://xbl.io/api/v2',
  },
  ubisoft: {
    label: 'Ubisoft Connect',
    category: 'platform',
    icon: '🕹️',
    authType: 'oauth',
    envKey: 'UBISOFT_CLIENT_ID',
    apiBase: 'https://public-ubiservices.ubi.com/v3',
  },
  steam: {
    label: 'Steam',
    category: 'store',
    icon: '♨️',
    authType: 'api_key',
    envKey: 'STEAM_API_KEY',
    apiBase: 'https://api.steampowered.com',
  },
  github: {
    label: 'GitHub',
    category: 'vcs',
    icon: '🐙',
    authType: 'token',
    envKey: 'GITHUB_TOKEN',
    apiBase: 'https://api.github.com',
  },
  gitlab: {
    label: 'GitLab',
    category: 'vcs',
    icon: '🦊',
    authType: 'token',
    envKey: 'GITLAB_TOKEN',
    apiBase: 'https://gitlab.com/api/v4',
  },
  bitbucket: {
    label: 'Bitbucket',
    category: 'vcs',
    icon: '🪣',
    authType: 'oauth',
    envKey: 'BITBUCKET_CLIENT_ID',
    apiBase: 'https://api.bitbucket.org/2.0',
  },
  unity: {
    label: 'Unity',
    category: 'engine',
    icon: '⚙️',
    authType: 'api_key',
    envKey: 'UNITY_API_KEY',
    apiBase: 'https://services.api.unity.com',
  },
  godot: {
    label: 'Godot Engine',
    category: 'engine',
    icon: '👾',
    authType: 'none',
    envKey: null,
    apiBase: null,
  },
});

// ── Encrypt/decrypt connector credentials ─────────────────────
const CREDS_ALGORITHM = 'aes-256-gcm';

function getCredsKey() {
  const secret = process.env.CONNECTOR_CREDS_SECRET;
  if (!secret) throw new Error('CONNECTOR_CREDS_SECRET env var is required');
  return Buffer.from(secret, 'hex').slice(0, 32);
}

export function encryptConnectorCreds(creds) {
  const key = getCredsKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(CREDS_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(creds), 'utf8'), cipher.final()]);
  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  });
}

export function decryptConnectorCreds(stored) {
  const key = getCredsKey();
  const { iv, data, tag } = JSON.parse(stored);
  const decipher = crypto.createDecipheriv(CREDS_ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

// ── Connector API calls ────────────────────────────────────────
async function connectorGet(connector, path, token) {
  const config = CONNECTORS[connector];
  if (!config?.apiBase) return { note: `${connector} has no remote API` };

  const headers = { 'Content-Type': 'application/json' };
  if (config.authType === 'api_key') headers['X-Api-Key'] = token;
  else if (config.authType === 'token') headers['Authorization'] = `token ${token}`;
  else headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${config.apiBase}${path}`, { headers });
  if (!res.ok) throw new Error(`${connector} API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// ── GitHub project sync ───────────────────────────────────────
export async function syncGitHubProject(token, owner, repo) {
  const [repoData, commits, issues, prs] = await Promise.all([
    connectorGet('github', `/repos/${owner}/${repo}`, token),
    connectorGet('github', `/repos/${owner}/${repo}/commits?per_page=10`, token),
    connectorGet('github', `/repos/${owner}/${repo}/issues?state=open&per_page=20`, token),
    connectorGet('github', `/repos/${owner}/${repo}/pulls?state=open&per_page=20`, token),
  ]);
  return {
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    openIssues: repoData.open_issues_count,
    language: repoData.language,
    recentCommits: commits.slice(0, 5).map(c => ({
      sha: c.sha.slice(0, 7),
      message: c.commit.message.split('\n')[0],
      author: c.commit.author.name,
      date: c.commit.author.date,
    })),
    openPRs: prs.length,
    openIssuesList: issues.slice(0, 10).map(i => ({ number: i.number, title: i.title, labels: i.labels.map(l => l.name) })),
  };
}

// ── Steam achievements ────────────────────────────────────────
export async function fetchSteamAchievements(appId, steamId) {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error('STEAM_API_KEY env var is required');
  const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?appid=${appId}&steamid=${steamId}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Steam API ${res.status}`);
  const data = await res.json();
  return data.playerstats?.achievements ?? [];
}

// ── Project progress calculation ──────────────────────────────
export function calcProjectProgress({ totalTasks, completedTasks, totalMilestones, completedMilestones }) {
  if (totalTasks === 0 && totalMilestones === 0) return 0;
  const taskWeight = 0.6;
  const milestoneWeight = 0.4;
  const taskPct = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const milestonePct = totalMilestones > 0 ? completedMilestones / totalMilestones : 0;
  return Math.round((taskPct * taskWeight + milestonePct * milestoneWeight) * 100);
}

// ── AR/VR/3D project metadata helpers ────────────────────────
export const AR_VR_ENGINES = Object.freeze([
  { id: 'unreal', label: 'Unreal Engine 5', xr: true },
  { id: 'unity', label: 'Unity XR Toolkit', xr: true },
  { id: 'godot_xr', label: 'Godot XR Tools', xr: true },
  { id: 'webxr', label: 'WebXR / Three.js', xr: true },
  { id: 'blender', label: 'Blender 3D', xr: false },
  { id: 'maya', label: 'Autodesk Maya', xr: false },
  { id: 'cinema4d', label: 'Cinema 4D', xr: false },
]);

export const GAME_PLATFORMS = Object.freeze([
  { id: 'ps5', label: 'PlayStation 5', connector: 'sony_psn' },
  { id: 'ps4', label: 'PlayStation 4', connector: 'sony_psn' },
  { id: 'xbox_series', label: 'Xbox Series X|S', connector: 'xbox_live' },
  { id: 'xbox_one', label: 'Xbox One', connector: 'xbox_live' },
  { id: 'pc_steam', label: 'PC (Steam)', connector: 'steam' },
  { id: 'pc_epic', label: 'PC (Epic Games)', connector: 'epic_games' },
  { id: 'pc_ubisoft', label: 'PC (Ubisoft Connect)', connector: 'ubisoft' },
  { id: 'nintendo_switch', label: 'Nintendo Switch', connector: null },
  { id: 'mobile_ios', label: 'iOS (App Store)', connector: null },
  { id: 'mobile_android', label: 'Android (Play Store)', connector: null },
]);

export function getConnectorList() {
  return Object.entries(CONNECTORS).map(([id, cfg]) => ({
    id,
    label: cfg.label,
    category: cfg.category,
    icon: cfg.icon,
    requiresAuth: cfg.authType !== 'none',
  }));
}
