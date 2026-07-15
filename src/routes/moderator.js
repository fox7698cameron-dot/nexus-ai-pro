/**
 * src/routes/moderator.js
 * Nexus AI Pro — Moderator Routes
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * All routes require role='moderator' or 'admin'.
 *
 * GET /api/moderator/reports          — list content reports
 * PUT /api/moderator/reports/:id      — action a report (dismiss/warn/suspend)
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireRole, users } from './auth.js';

const router = Router();

router.use(requireAuth, requireRole('moderator', 'admin'));

// ─── In-memory report store ───────────────────────────────────────────────────

const reports = new Map(); // reportId -> report

// Seed demo reports
const DEMO_REPORTS = [
  { type: 'spam',          content: 'Buy cheap followers now! Click here: …',                         reportedBy: 'user_alice' },
  { type: 'harassment',    content: 'Stop posting here or I will find you.',                           reportedBy: 'user_bob'   },
  { type: 'inappropriate', content: 'Content contained explicit material not suitable for all ages.', reportedBy: 'user_carol' },
  { type: 'abuse',         content: 'Multiple accounts created to evade ban.',                        reportedBy: 'system'     },
  { type: 'other',         content: 'User repeatedly violating community guidelines.',                reportedBy: 'user_dave'  },
];

for (const r of DEMO_REPORTS) {
  const id = uuidv4();
  reports.set(id, { id, ...r, status: 'pending', createdAt: Date.now() - Math.floor(Math.random() * 86_400_000) });
}

// ─── GET /api/moderator/reports ───────────────────────────────────────────────

router.get('/reports', (req, res) => {
  const { status } = req.query;
  let list = [...reports.values()].sort((a, b) => b.createdAt - a.createdAt);
  if (status && status !== 'all') list = list.filter(r => r.status === status);
  res.json({ reports: list });
});

// ─── PUT /api/moderator/reports/:id ──────────────────────────────────────────

router.put('/reports/:id', (req, res) => {
  const report = reports.get(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  const { action, note } = req.body ?? {};
  const VALID_ACTIONS = ['dismiss', 'warn', 'suspend'];
  if (!VALID_ACTIONS.includes(action)) return res.status(400).json({ error: 'Invalid action' });

  report.status    = action === 'dismiss' ? 'dismissed' : 'actioned';
  report.action    = action;
  report.note      = note ?? '';
  report.actionedBy   = req.user.sub;
  report.actionedAt   = Date.now();

  // For warn/suspend actions, mark the target user appropriately
  // In production: integrate with users store to set warn/suspend flags
  reports.set(report.id, report);
  res.json({ report });
});

export default router;
