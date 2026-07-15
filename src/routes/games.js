/**
 * src/routes/games.js
 * Nexus AI Pro — Game Dev Tracking Routes
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * GET    /api/games             — list tracked games
 * POST   /api/games             — create game entry
 * GET    /api/games/:id         — game detail + metrics + achievements
 * PUT    /api/games/:id         — update game data
 * DELETE /api/games/:id         — remove game
 * POST   /api/games/:id/achievement — toggle achievement
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from './auth.js';

const router = Router();

const VALID_ENGINES    = ['unreal5', 'unity6', 'godot4', 'custom'];
const VALID_PUBLISHERS = ['epic', 'playstation', 'xbox', 'ubisoft', 'steam', 'indie'];

const gameStore = new Map(); // userId -> [game]

function getUserGames(userId) {
  if (!gameStore.has(userId)) gameStore.set(userId, []);
  return gameStore.get(userId);
}

function defaultAchievements(genre) {
  const list = [
    { id: uuidv4(), name: 'First Build',        description: 'Compile and run for the first time',    points: 10,  unlocked: true,  progress: 100, maxProgress: 100 },
    { id: uuidv4(), name: 'Alpha Milestone',     description: 'Reach playable alpha state',             points: 50,  unlocked: true,  progress: 100, maxProgress: 100 },
    { id: uuidv4(), name: 'Beta Launch',         description: 'Ship to beta testers',                   points: 100, unlocked: false, progress: 60,  maxProgress: 100 },
    { id: uuidv4(), name: 'First 1K Players',   description: '1,000 concurrent players',               points: 250, unlocked: false, progress: 40,  maxProgress: 100 },
    { id: uuidv4(), name: 'Launch Day',          description: 'Official public release',                points: 500, unlocked: false, progress: 0,   maxProgress: 100 },
  ];
  return list;
}

// ─── GET /api/games ───────────────────────────────────────────────────────────

router.get('/', requireAuth, (req, res) => {
  res.json({ games: getUserGames(req.user.sub) });
});

// ─── POST /api/games ──────────────────────────────────────────────────────────

router.post('/', requireAuth, (req, res) => {
  const { title, engine = 'unreal5', publisher = 'indie', genre = 'action', description = '' } = req.body ?? {};
  if (!title?.trim()) return res.status(400).json({ error: 'Title required' });

  const game = {
    id:           uuidv4(),
    userId:       req.user.sub,
    title:        title.trim(),
    engine:       VALID_ENGINES.includes(engine) ? engine : 'custom',
    publisher:    VALID_PUBLISHERS.includes(publisher) ? publisher : 'indie',
    genre,
    description:  description.trim(),
    metrics: {
      activePlayers:   0,
      totalDownloads:  0,
      revenue:         0,
      rating:          0,
      avgSessionMin:   0,
      retentionD7:     0,
      peakPlayers:     0,
      totalPlaytime:   0,
    },
    achievements: defaultAchievements(genre),
    buildVersion: '0.1.0',
    status:       'development',
    platforms:    [],
    createdAt:    Date.now(),
    updatedAt:    Date.now(),
  };

  getUserGames(req.user.sub).unshift(game);
  res.status(201).json({ game });
});

// ─── GET /api/games/:id ───────────────────────────────────────────────────────

router.get('/:id', requireAuth, (req, res) => {
  const game = getUserGames(req.user.sub).find(g => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
});

// ─── PUT /api/games/:id ───────────────────────────────────────────────────────

router.put('/:id', requireAuth, (req, res) => {
  const list = getUserGames(req.user.sub);
  const idx = list.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Game not found' });

  const { metrics, buildVersion, status, platforms, description } = req.body ?? {};
  const game = { ...list[idx], updatedAt: Date.now() };
  if (metrics)      game.metrics      = { ...game.metrics, ...metrics };
  if (buildVersion) game.buildVersion = buildVersion;
  if (status)       game.status       = status;
  if (platforms)    game.platforms    = platforms;
  if (description != null) game.description = description;
  list[idx] = game;
  res.json({ game });
});

// ─── DELETE /api/games/:id ────────────────────────────────────────────────────

router.delete('/:id', requireAuth, (req, res) => {
  const list = getUserGames(req.user.sub);
  const idx = list.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Game not found' });
  list.splice(idx, 1);
  res.json({ success: true });
});

// ─── POST /api/games/:id/achievement ─────────────────────────────────────────

router.post('/:id/achievement', requireAuth, (req, res) => {
  const game = getUserGames(req.user.sub).find(g => g.id === req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const { achievementId, progress } = req.body ?? {};
  const ach = game.achievements.find(a => a.id === achievementId);
  if (!ach) return res.status(404).json({ error: 'Achievement not found' });

  if (typeof progress === 'number') {
    ach.progress = Math.min(Math.max(0, progress), ach.maxProgress);
    ach.unlocked = ach.progress >= ach.maxProgress;
  }
  game.updatedAt = Date.now();
  res.json({ achievement: ach });
});

export default router;
