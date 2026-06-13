// ================================================
// NEXUS AI PRO - Projects & Game Tracking API
// Updated: 2026-06-13
// ------------------------------------------------
// Project types: coding | game | ar_vr | 3d | mobile | web | desktop
// Game platforms: Epic Games, PlayStation, Xbox,
//                 Ubisoft Connect, Steam, Nintendo, GOG
// Real-time: via Socket.IO
// ================================================

import { Router } from 'express';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = Router();
router.use(requireAuth);

// ── In-memory stores ──────────────────────────────
const projectStore     = new Map(); // userId -> [project]
const milestoneStore   = new Map(); // projectId -> [milestone]
const commitStore      = new Map(); // projectId -> [commit]
const gamePlatforms    = new Map(); // userId -> [gamePlatformAccount]
const gameLibrary      = new Map(); // accountId -> [game]
const achievementStore = new Map(); // accountId -> [achievement]

// Real-time IO ref
let ioRef = null;
export function setIO(io) { ioRef = io; }

function broadcast(userId, event, data) {
  if (ioRef) ioRef.to(`user:${userId}`).emit(event, data);
}

// ── Project helpers ───────────────────────────────
function getUserProjects(userId) { return projectStore.get(userId) || []; }

function findProject(userId, projectId) {
  return getUserProjects(userId).find(p => p.id === projectId) || null;
}

function saveProjects(userId, projects) { projectStore.set(userId, projects); }

// ── Game platform schemas ─────────────────────────
const GAME_PLATFORMS = {
  epic:        { name: 'Epic Games Store',    baseUrl: 'https://store.epicgames.com',    sdkPlugin: 'EOS_SDK' },
  playstation: { name: 'PlayStation Network', baseUrl: 'https://www.playstation.com',    sdkPlugin: 'PS5_SDK' },
  xbox:        { name: 'Xbox / Microsoft',    baseUrl: 'https://www.xbox.com',           sdkPlugin: 'GDK' },
  ubisoft:     { name: 'Ubisoft Connect',     baseUrl: 'https://connect.ubisoft.com',    sdkPlugin: 'Ubisoft_SDK' },
  steam:       { name: 'Steam',               baseUrl: 'https://store.steampowered.com', sdkPlugin: 'SteamWorks_SDK' },
  nintendo:    { name: 'Nintendo eShop',      baseUrl: 'https://www.nintendo.com',       sdkPlugin: 'Nintendo_SDK' },
  gog:         { name: 'GOG',                 baseUrl: 'https://www.gog.com',            sdkPlugin: 'GOG_Galaxy_SDK' },
};

// Unreal Engine connector config
const UNREAL_CONNECTOR = {
  sdkVersion: '5.4',
  pluginPath: 'Plugins/NexusAIPlugin',
  requiredModules: ['HTTP','WebSockets','Json','OnlineSubsystem'],
  cppHeader: 'NexusAIPlugin.h',
};

// ── Routes: Projects ──────────────────────────────

// GET /api/projects
router.get('/', (req, res) => {
  const { type, status } = req.query;
  let projects = getUserProjects(req.user.sub);
  if (type)   projects = projects.filter(p => p.type === type);
  if (status) projects = projects.filter(p => p.status === status);
  res.json({ projects, total: projects.length });
});

// POST /api/projects
router.post('/', (req, res) => {
  const { name, description, type, engine, platform, repoUrl, tags } = req.body;

  const validTypes = ['coding','game','ar_vr','3d','mobile','web','desktop','other'];
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Project name required' });
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ error: 'Valid project type required', validTypes });
  }

  const project = {
    id: uuidv4(),
    userId: req.user.sub,
    name: name.trim(),
    description: description || '',
    type,
    engine: engine || null,
    platform: platform || null,
    repoUrl: repoUrl || null,
    status: 'active',
    progress: 0,
    collaborators: [],
    tags: tags || [],
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const projects = getUserProjects(req.user.sub);
  projects.push(project);
  saveProjects(req.user.sub, projects);
  broadcast(req.user.sub, 'project:created', project);

  res.status(201).json({ project });
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const project = findProject(req.user.sub, req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const milestones = milestoneStore.get(project.id) || [];
  const recentCommits = (commitStore.get(project.id) || []).slice(-10);

  res.json({ project, milestones, recentCommits });
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const projects = getUserProjects(req.user.sub);
  const idx = projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found' });

  const { name, description, status, progress, engine, platform, repoUrl, tags, metadata } = req.body;
  const updated = {
    ...projects[idx],
    name:        name        !== undefined ? name        : projects[idx].name,
    description: description !== undefined ? description : projects[idx].description,
    status:      status      !== undefined ? status      : projects[idx].status,
    progress:    progress    !== undefined ? Math.max(0, Math.min(100, Number(progress))) : projects[idx].progress,
    engine:      engine      !== undefined ? engine      : projects[idx].engine,
    platform:    platform    !== undefined ? platform    : projects[idx].platform,
    repoUrl:     repoUrl     !== undefined ? repoUrl     : projects[idx].repoUrl,
    tags:        tags        !== undefined ? tags        : projects[idx].tags,
    metadata:    metadata    !== undefined ? { ...projects[idx].metadata, ...metadata } : projects[idx].metadata,
    updatedAt: new Date().toISOString(),
  };

  projects[idx] = updated;
  saveProjects(req.user.sub, projects);
  broadcast(req.user.sub, 'project:updated', updated);

  res.json({ project: updated });
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  let projects = getUserProjects(req.user.sub);
  const before = projects.length;
  projects = projects.filter(p => p.id !== req.params.id);
  saveProjects(req.user.sub, projects);
  res.json({ removed: before - projects.length });
});

// ── Routes: Milestones ────────────────────────────

// GET /api/projects/:id/milestones
router.get('/:id/milestones', (req, res) => {
  if (!findProject(req.user.sub, req.params.id)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json({ milestones: milestoneStore.get(req.params.id) || [] });
});

// POST /api/projects/:id/milestones
router.post('/:id/milestones', (req, res) => {
  if (!findProject(req.user.sub, req.params.id)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const { name, description, dueDate } = req.body;
  if (!name) return res.status(400).json({ error: 'Milestone name required' });

  const milestone = {
    id: uuidv4(),
    projectId: req.params.id,
    name,
    description: description || '',
    dueDate: dueDate || null,
    completedAt: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const arr = milestoneStore.get(req.params.id) || [];
  arr.push(milestone);
  milestoneStore.set(req.params.id, arr);
  broadcast(req.user.sub, 'milestone:created', milestone);

  res.status(201).json({ milestone });
});

// PUT /api/projects/:id/milestones/:milestoneId
router.put('/:id/milestones/:milestoneId', (req, res) => {
  const arr = milestoneStore.get(req.params.id) || [];
  const idx = arr.findIndex(m => m.id === req.params.milestoneId);
  if (idx === -1) return res.status(404).json({ error: 'Milestone not found' });

  arr[idx] = { ...arr[idx], ...req.body };
  if (req.body.status === 'completed' && !arr[idx].completedAt) {
    arr[idx].completedAt = new Date().toISOString();
  }
  milestoneStore.set(req.params.id, arr);
  broadcast(req.user.sub, 'milestone:updated', arr[idx]);

  res.json({ milestone: arr[idx] });
});

// ── Routes: Commit tracking ───────────────────────

// POST /api/projects/:id/commits
router.post('/:id/commits', (req, res) => {
  if (!findProject(req.user.sub, req.params.id)) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const { commitHash, message, author, additions = 0, deletions = 0, filesChanged = 0 } = req.body;

  const commit = {
    id: uuidv4(),
    projectId: req.params.id,
    commitHash: commitHash || crypto.randomBytes(20).toString('hex'),
    message: message || 'No commit message',
    author: author || req.user.sub,
    additions: Number(additions),
    deletions: Number(deletions),
    filesChanged: Number(filesChanged),
    committedAt: new Date().toISOString(),
  };

  const arr = commitStore.get(req.params.id) || [];
  arr.push(commit);
  if (arr.length > 1000) arr.splice(0, arr.length - 1000);
  commitStore.set(req.params.id, arr);
  broadcast(req.user.sub, 'commit:pushed', commit);

  res.status(201).json({ commit });
});

// GET /api/projects/:id/commits
router.get('/:id/commits', (req, res) => {
  const { limit = 50 } = req.query;
  res.json({ commits: (commitStore.get(req.params.id) || []).slice(-parseInt(limit)) });
});

// ── Routes: Stats ─────────────────────────────────

// GET /api/projects/stats/overview
router.get('/stats/overview', (req, res) => {
  const projects = getUserProjects(req.user.sub);
  const byType   = {};
  const byStatus = {};

  for (const p of projects) {
    byType[p.type]     = (byType[p.type]     || 0) + 1;
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  }

  const allCommits = projects.flatMap(p => commitStore.get(p.id) || []);
  const totalAdditions = allCommits.reduce((s, c) => s + c.additions, 0);
  const totalDeletions = allCommits.reduce((s, c) => s + c.deletions, 0);

  res.json({
    total: projects.length,
    byType,
    byStatus,
    avgProgress: projects.length
      ? (projects.reduce((s, p) => s + p.progress, 0) / projects.length).toFixed(1)
      : 0,
    commits: { total: allCommits.length, additions: totalAdditions, deletions: totalDeletions },
  });
});

// ── Game Platform Routes ──────────────────────────

// GET /api/projects/game/platforms
router.get('/game/platforms', (req, res) => {
  res.json({ platforms: Object.entries(GAME_PLATFORMS).map(([id, p]) => ({ id, ...p })) });
});

// GET /api/projects/game/accounts  — connected game platform accounts
router.get('/game/accounts', (req, res) => {
  res.json({ accounts: gamePlatforms.get(req.user.sub) || [] });
});

// POST /api/projects/game/accounts  — connect game platform
router.post('/game/accounts', (req, res) => {
  const { platform, platformUid, username } = req.body;
  if (!platform || !GAME_PLATFORMS[platform]) {
    return res.status(400).json({ error: 'Invalid platform', valid: Object.keys(GAME_PLATFORMS) });
  }
  if (!platformUid) return res.status(400).json({ error: 'platformUid required' });

  const accounts = gamePlatforms.get(req.user.sub) || [];
  if (accounts.find(a => a.platform === platform && a.platformUid === platformUid)) {
    return res.status(409).json({ error: 'Platform account already connected' });
  }

  const account = {
    id: uuidv4(),
    userId: req.user.sub,
    platform,
    platformUid,
    username: username || platformUid,
    connected: true,
    createdAt: new Date().toISOString(),
    metadata: {},
  };
  accounts.push(account);
  gamePlatforms.set(req.user.sub, accounts);

  res.status(201).json({ account, platformDetails: GAME_PLATFORMS[platform] });
});

// GET /api/projects/game/library  — game library across all platforms
router.get('/game/library', (req, res) => {
  const accounts = gamePlatforms.get(req.user.sub) || [];
  const library = accounts.flatMap(account => gameLibrary.get(account.id) || []);
  res.json({ library, total: library.length });
});

// POST /api/projects/game/library  — add game to library
router.post('/game/library', (req, res) => {
  const { accountId, gameId, title, playtimeMinutes, lastPlayed, coverUrl } = req.body;

  const accounts = gamePlatforms.get(req.user.sub) || [];
  if (!accounts.find(a => a.id === accountId)) {
    return res.status(404).json({ error: 'Game account not found' });
  }

  const game = {
    id: uuidv4(),
    accountId,
    gameId,
    title,
    playtimeMinutes: Number(playtimeMinutes) || 0,
    lastPlayed: lastPlayed || null,
    coverUrl: coverUrl || null,
    addedAt: new Date().toISOString(),
  };

  const lib = gameLibrary.get(accountId) || [];
  lib.push(game);
  gameLibrary.set(accountId, lib);

  res.status(201).json({ game });
});

// GET /api/projects/game/achievements  — all achievements
router.get('/game/achievements', (req, res) => {
  const { platform, gameId, unlocked } = req.query;
  const accounts = gamePlatforms.get(req.user.sub) || [];
  let achievements = accounts.flatMap(account => achievementStore.get(account.id) || []);

  if (platform) achievements = achievements.filter(a => {
    const acc = accounts.find(ac => ac.id === a.accountId);
    return acc && acc.platform === platform;
  });
  if (gameId)   achievements = achievements.filter(a => a.gameId === gameId);
  if (unlocked !== undefined) achievements = achievements.filter(a => String(a.unlocked) === unlocked);

  const stats = {
    total:    achievements.length,
    unlocked: achievements.filter(a => a.unlocked).length,
    locked:   achievements.filter(a => !a.unlocked).length,
    totalPoints: achievements.filter(a => a.unlocked).reduce((s, a) => s + (a.points || 0), 0),
  };

  res.json({ achievements, stats });
});

// POST /api/projects/game/achievements  — upsert achievement
router.post('/game/achievements', (req, res) => {
  const { accountId, gameId, achievementId, achievementName, description, points, unlocked, iconUrl, rarity } = req.body;

  const accounts = gamePlatforms.get(req.user.sub) || [];
  if (!accounts.find(a => a.id === accountId)) {
    return res.status(404).json({ error: 'Game account not found' });
  }

  const arr = achievementStore.get(accountId) || [];
  const existing = arr.findIndex(a => a.gameId === gameId && a.achievementId === achievementId);

  const achievement = {
    id: existing >= 0 ? arr[existing].id : uuidv4(),
    accountId,
    gameId,
    achievementId,
    achievementName: achievementName || achievementId,
    description: description || '',
    iconUrl: iconUrl || null,
    points: Number(points) || 0,
    rarity: rarity || 'common',
    unlocked: Boolean(unlocked),
    unlockedAt: unlocked ? new Date().toISOString() : null,
  };

  if (existing >= 0) arr[existing] = achievement;
  else arr.push(achievement);
  achievementStore.set(accountId, arr);

  broadcast(req.user.sub, 'achievement:unlocked', achievement);
  res.status(201).json({ achievement });
});

// GET /api/projects/game/unreal-connector  — Unreal Engine integration info
router.get('/game/unreal-connector', (req, res) => {
  res.json({
    connector: UNREAL_CONNECTOR,
    instructions: [
      'Copy Plugins/NexusAIPlugin folder into your UE project',
      'Add "NexusAI" to PublicDependencyModuleNames in your .Build.cs',
      '#include "NexusAIPlugin.h" in your GameMode or GameInstance',
      'Call ANexusAIBridge::Connect(ApiKey, ProjectId) in BeginPlay',
      'Use ANexusAIBridge::TrackEvent(EventName, MetadataJson) for telemetry',
    ],
    cppSnippet: `
// In YourGameMode.cpp
#include "NexusAIPlugin.h"

void AYourGameMode::BeginPlay()
{
    Super::BeginPlay();
    UNexusAISubsystem* NexusAI = GetGameInstance()->GetSubsystem<UNexusAISubsystem>();
    NexusAI->Initialize(TEXT("YOUR_API_KEY"), TEXT("YOUR_PROJECT_ID"));
    NexusAI->TrackEvent(TEXT("game_start"), TEXT("{\\"level\\": \\"MainMenu\\"}"));
}
    `.trim(),
  });
});

export default router;
