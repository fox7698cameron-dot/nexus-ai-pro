// Copyright © 2025-2026 Cameron Fox. All rights reserved. | Apache-2.0
// Created: 2025-01-15 | Updated: 2026-05-10

import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, auditLog } from './middleware.js';
import { db } from './database.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('moderator', 'admin'));

// ── Reports queue ──────────────────────────────────────────────
router.get('/reports', async (req, res) => {
  try {
    const keys = await db.keys('report:*');
    const raws = await Promise.all(keys.map(k => db.get(k)));
    const reports = raws.filter(Boolean).map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);
    const sorted = reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ reports: sorted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const reportSchema = z.object({
  reportedUserId: z.string().uuid(),
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'other']),
  contentPreview: z.string().max(200).optional()
});

router.post('/reports', async (req, res) => {
  try {
    const data = reportSchema.parse(req.body);
    const { v4: uuidv4 } = await import('uuid');
    const report = {
      id: uuidv4(),
      reporterId: req.user.id,
      ...data,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await db.set(`report:${report.id}`, JSON.stringify(report), 30 * 24 * 3600);
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const reportActionSchema = z.object({
  action: z.enum(['dismiss', 'warn', 'escalate'])
});

router.put('/reports/:id', auditLog('MOD_REPORT_ACTION'), async (req, res) => {
  try {
    const { action } = reportActionSchema.parse(req.body);
    const raw = await db.get(`report:${req.params.id}`);
    if (!raw) return res.status(404).json({ error: 'Report not found' });

    const report = JSON.parse(raw);
    report.status = action === 'escalate' ? 'escalated' : action === 'warn' ? 'warned' : 'dismissed';
    report.resolvedBy = req.user.id;
    report.resolvedAt = new Date().toISOString();

    await db.set(`report:${req.params.id}`, JSON.stringify(report));
    res.json({ success: true, report });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ── Warnings ────────────────────────────────────────────────────
const warnSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(1).max(500)
});

router.get('/warnings', async (_req, res) => {
  try {
    const keys = await db.keys('warning:*');
    const raws = await Promise.all(keys.map(k => db.get(k)));
    const warnings = raws.filter(Boolean).map(w => { try { return JSON.parse(w); } catch { return null; } }).filter(Boolean);
    res.json({ warnings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/warnings', auditLog('MOD_WARNING_ISSUED'), async (req, res) => {
  try {
    const data = warnSchema.parse(req.body);
    const { v4: uuidv4 } = await import('uuid');
    const warning = { id: uuidv4(), ...data, issuedBy: req.user.id, issuedAt: new Date().toISOString(), active: true };
    await db.set(`warning:${warning.id}`, JSON.stringify(warning), 90 * 24 * 3600);
    res.status(201).json(warning);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/warnings/:id', auditLog('MOD_WARNING_REVOKED'), async (req, res) => {
  try {
    const raw = await db.get(`warning:${req.params.id}`);
    if (!raw) return res.status(404).json({ error: 'Warning not found' });
    const warning = JSON.parse(raw);
    warning.active = false;
    warning.revokedBy = req.user.id;
    warning.revokedAt = new Date().toISOString();
    await db.set(`warning:${req.params.id}`, JSON.stringify(warning));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Moderation stats ─────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const reportKeys = await db.keys('report:*');
    const today = new Date().toDateString();
    const raws = await Promise.all(reportKeys.map(k => db.get(k)));
    const all = raws.filter(Boolean).map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(Boolean);

    const resolvedToday = all.filter(r =>
      r.resolvedAt && new Date(r.resolvedAt).toDateString() === today
    ).length;

    const escalated = all.filter(r => r.status === 'escalated').length;
    const pending = all.filter(r => r.status === 'pending').length;

    res.json({ totalReports: all.length, resolvedToday, escalated, pending });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
