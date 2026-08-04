/**
 * @file projects.js
 * @description Express router for general project tracking covering coding,
 *   AR, VR, 3D, and game projects. Provides full CRUD, task management,
 *   health metrics, milestones, Gantt timeline data, and an SSE realtime
 *   stream. Input is validated with Zod schemas.
 * @created 2026-08-04
 * @copyright Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * @license Apache-2.0
 *
 * STORAGE NOTE:
 *   Map objects are used as in-memory stores. In production, replace each
 *   Map with a Redis hash or a Postgres/MongoDB model to gain persistence
 *   and horizontal scaling.
 */

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const ProjectTypeEnum = z.enum(['coding', 'ar', 'vr', '3d', 'game']);
const ProjectStatusEnum = z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']);
const TaskStatusEnum = z.enum(['todo', 'in_progress', 'done', 'blocked']);
const PriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

/**
 * Schema for creating a project.
 * @type {z.ZodObject}
 */
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(120),
  type: ProjectTypeEnum,
  description: z.string().max(2000).optional().default(''),
  techStack: z.array(z.string()).optional().default([]),
  status: ProjectStatusEnum.optional().default('planning'),
  startDate: z.string().datetime({ offset: true }).optional(),
  targetDate: z.string().datetime({ offset: true }).optional(),
  tags: z.array(z.string()).optional().default([]),
});

/**
 * Schema for updating a project (all fields optional).
 * @type {z.ZodObject}
 */
export const UpdateProjectSchema = CreateProjectSchema.partial();

/**
 * Schema for creating a task.
 * @type {z.ZodObject}
 */
export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  status: TaskStatusEnum.optional().default('todo'),
  priority: PriorityEnum.optional().default('medium'),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  estimatedHours: z.number().nonnegative().optional(),
  tags: z.array(z.string()).optional().default([]),
});

/**
 * Schema for updating a task.
 * @type {z.ZodObject}
 */
export const UpdateTaskSchema = CreateTaskSchema.partial();

/**
 * Schema for creating a milestone.
 * @type {z.ZodObject}
 */
export const CreateMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  dueDate: z.string().datetime({ offset: true }).optional(),
  targetPercentage: z.number().min(0).max(100).optional().default(100),
});

// ---------------------------------------------------------------------------
// In-memory stores (swap for Redis/DB in production)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Project
 * @property {string}   id
 * @property {string}   name
 * @property {string}   type           - 'coding'|'ar'|'vr'|'3d'|'game'
 * @property {string}   description
 * @property {string[]} techStack
 * @property {string}   status         - 'planning'|'active'|'paused'|'completed'|'cancelled'
 * @property {string[]} tags
 * @property {string|null} startDate
 * @property {string|null} targetDate
 * @property {Milestone[]} milestones
 * @property {number}   createdAt
 * @property {number}   updatedAt
 */

/**
 * @typedef {Object} Task
 * @property {string}  id
 * @property {string}  projectId
 * @property {string}  title
 * @property {string}  description
 * @property {string}  status         - 'todo'|'in_progress'|'done'|'blocked'
 * @property {string}  priority       - 'low'|'medium'|'high'|'critical'
 * @property {string|null} assigneeId
 * @property {string|null} dueDate
 * @property {number|null} estimatedHours
 * @property {string[]} tags
 * @property {number}  createdAt
 * @property {number}  updatedAt
 * @property {number|null} completedAt
 */

/**
 * @typedef {Object} Milestone
 * @property {string}  id
 * @property {string}  projectId
 * @property {string}  title
 * @property {string}  description
 * @property {string|null} dueDate
 * @property {number}  targetPercentage
 * @property {boolean} reached
 * @property {number|null} reachedAt
 * @property {number}  createdAt
 */

/** @type {Map<string, Project>} id -> project */
const projects = new Map();

/** @type {Map<string, Task[]>}  projectId -> tasks */
const tasks = new Map();

/** @type {Set<import('http').ServerResponse>} Active SSE clients */
const sseClients = new Set();

// ---------------------------------------------------------------------------
// Validation middleware factory
// ---------------------------------------------------------------------------

/**
 * Returns an Express middleware that parses req.body against a Zod schema.
 * On failure, responds 400 with structured error details.
 * @param {z.ZodSchema} schema
 * @returns {import('express').RequestHandler}
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: 'Validation failed.',
        details: result.error.flatten(),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

/**
 * Sends an SSE event to a single response stream.
 * @param {import('http').ServerResponse} res
 * @param {string} event
 * @param {object} data
 */
function sendSSEEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Broadcasts an SSE event to all connected clients.
 * @param {string} event
 * @param {object} data
 */
function broadcastSSE(event, data) {
  for (const client of sseClients) {
    try {
      sendSSEEvent(client, event, data);
    } catch {
      sseClients.delete(client);
    }
  }
}

// ---------------------------------------------------------------------------
// Socket.io emitter helper
// ---------------------------------------------------------------------------

/**
 * Emits a socket.io event if io is attached to the router.
 * @param {Router} router
 * @param {string} event
 * @param {object} payload
 */
function emitSocketEvent(router, event, payload) {
  if (router.io) {
    router.io.emit(event, payload);
  }
}

// ---------------------------------------------------------------------------
// Metric computation helpers
// ---------------------------------------------------------------------------

/**
 * Computes project health metrics from its task list.
 * @param {string} projectId
 * @returns {Object}
 */
function computeProjectMetrics(projectId) {
  const projectTasks = tasks.get(projectId) ?? [];
  const total = projectTasks.length;
  const done = projectTasks.filter((t) => t.status === 'done').length;
  const blocked = projectTasks.filter((t) => t.status === 'blocked').length;
  const inProgress = projectTasks.filter((t) => t.status === 'in_progress').length;
  const todo = projectTasks.filter((t) => t.status === 'todo').length;

  const completionPct = total === 0 ? 0 : parseFloat(((done / total) * 100).toFixed(1));

  // Velocity: tasks completed in the last 7 days
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentlyCompleted = projectTasks.filter(
    (t) => t.status === 'done' && t.completedAt && t.completedAt >= oneWeekAgo
  ).length;

  // Estimated hours remaining
  const hoursRemaining = projectTasks
    .filter((t) => t.status !== 'done')
    .reduce((acc, t) => acc + (t.estimatedHours ?? 0), 0);

  return {
    total,
    done,
    blocked,
    inProgress,
    todo,
    completionPct,
    velocity: recentlyCompleted, // tasks/week
    hoursRemaining,
    health: blocked > 0 ? 'at_risk' : completionPct >= 80 ? 'good' : 'on_track',
  };
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

/**
 * Creates and returns the projects Express router.
 * @returns {Router}
 */
export function createProjectsRouter() {
  const router = Router();

  // =========================================================================
  // PROJECTS CRUD
  // =========================================================================

  // GET /projects - list all projects
  router.get('/projects', (req, res) => {
    const { status, type } = req.query;
    let list = [...projects.values()];

    if (status) list = list.filter((p) => p.status === status);
    if (type) list = list.filter((p) => p.type === type);

    res.json({ ok: true, data: list });
  });

  // GET /projects/type/:type - filter projects by type
  router.get('/projects/type/:type', (req, res) => {
    const validType = ProjectTypeEnum.safeParse(req.params.type);
    if (!validType.success) {
      return res.status(400).json({
        ok: false,
        error: `type must be one of: ${ProjectTypeEnum.options.join(', ')}`,
      });
    }
    const list = [...projects.values()].filter((p) => p.type === validType.data);
    res.json({ ok: true, data: list });
  });

  // POST /projects - create project
  router.post('/projects', validate(CreateProjectSchema), (req, res) => {
    const body = req.validatedBody;

    /** @type {Project} */
    const project = {
      id: uuidv4(),
      name: body.name,
      type: body.type,
      description: body.description,
      techStack: body.techStack,
      status: body.status,
      tags: body.tags,
      startDate: body.startDate ?? null,
      targetDate: body.targetDate ?? null,
      milestones: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    projects.set(project.id, project);
    tasks.set(project.id, []);

    const event = { event: 'project_created', projectId: project.id, name: project.name };
    broadcastSSE('project:updated', event);
    emitSocketEvent(router, 'project:updated', event);

    res.status(201).json({ ok: true, data: project });
  });

  // GET /projects/:id - get project by ID
  router.get('/projects/:id', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ ok: false, error: 'Project not found.' });
    res.json({ ok: true, data: project });
  });

  // PUT /projects/:id - update project
  router.put('/projects/:id', validate(UpdateProjectSchema), (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ ok: false, error: 'Project not found.' });

    const body = req.validatedBody;
    Object.assign(project, body, { updatedAt: Date.now() });
    projects.set(project.id, project);

    const event = { event: 'project_updated', projectId: project.id };
    broadcastSSE('project:updated', event);
    emitSocketEvent(router, 'project:updated', event);

    res.json({ ok: true, data: project });
  });

  // DELETE /projects/:id - remove project
  router.delete('/projects/:id', (req, res) => {
    if (!projects.has(req.params.id)) {
      return res.status(404).json({ ok: false, error: 'Project not found.' });
    }
    projects.delete(req.params.id);
    tasks.delete(req.params.id);
    res.json({ ok: true, data: { deleted: req.params.id } });
  });

  // =========================================================================
  // TASKS
  // =========================================================================

  // GET /projects/:id/tasks - list tasks for a project
  router.get('/projects/:id/tasks', (req, res) => {
    if (!projects.has(req.params.id)) {
      return res.status(404).json({ ok: false, error: 'Project not found.' });
    }
    const { status } = req.query;
    let list = tasks.get(req.params.id) ?? [];
    if (status) list = list.filter((t) => t.status === status);
    res.json({ ok: true, data: list });
  });

  // POST /projects/:id/tasks - create task
  router.post('/projects/:id/tasks', validate(CreateTaskSchema), (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ ok: false, error: 'Project not found.' });

    const body = req.validatedBody;

    /** @type {Task} */
    const task = {
      id: uuidv4(),
      projectId: req.params.id,
      title: body.title,
      description: body.description,
      status: body.status,
      priority: body.priority,
      assigneeId: body.assigneeId ?? null,
      dueDate: body.dueDate ?? null,
      estimatedHours: body.estimatedHours ?? null,
      tags: body.tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
    };

    const projectTasks = tasks.get(req.params.id) ?? [];
    projectTasks.push(task);
    tasks.set(req.params.id, projectTasks);

    res.status(201).json({ ok: true, data: task });
  });

  // PUT /projects/:id/tasks/:taskId - update task status
  router.put('/projects/:id/tasks/:taskId', validate(UpdateTaskSchema), (req, res) => {
    if (!projects.has(req.params.id)) {
      return res.status(404).json({ ok: false, error: 'Project not found.' });
    }

    const projectTasks = tasks.get(req.params.id) ?? [];
    const taskIdx = projectTasks.findIndex((t) => t.id === req.params.taskId);
    if (taskIdx === -1) return res.status(404).json({ ok: false, error: 'Task not found.' });

    const task = projectTasks[taskIdx];
    const body = req.validatedBody;
    const wasCompleted = task.status === 'done';
    const nowCompleted = body.status === 'done';

    Object.assign(task, body, {
      updatedAt: Date.now(),
      completedAt: nowCompleted && !wasCompleted ? Date.now() : task.completedAt,
    });

    projectTasks[taskIdx] = task;
    tasks.set(req.params.id, projectTasks);

    if (nowCompleted && !wasCompleted) {
      const event = { event: 'task_completed', projectId: req.params.id, taskId: task.id, title: task.title };
      broadcastSSE('task:completed', event);
      emitSocketEvent(router, 'task:completed', event);
    }

    res.json({ ok: true, data: task });
  });

  // =========================================================================
  // METRICS & DASHBOARD
  // =========================================================================

  // GET /projects/:id/metrics - project health metrics
  router.get('/projects/:id/metrics', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ ok: false, error: 'Project not found.' });

    const metrics = computeProjectMetrics(req.params.id);
    res.json({ ok: true, data: { projectId: req.params.id, ...metrics } });
  });

  // GET /dashboard - overall project dashboard data
  router.get('/dashboard', (_req, res) => {
    const allProjects = [...projects.values()];
    const summary = {
      total: allProjects.length,
      byStatus: Object.fromEntries(
        ['planning', 'active', 'paused', 'completed', 'cancelled'].map((s) => [
          s,
          allProjects.filter((p) => p.status === s).length,
        ])
      ),
      byType: Object.fromEntries(
        ['coding', 'ar', 'vr', '3d', 'game'].map((t) => [
          t,
          allProjects.filter((p) => p.type === t).length,
        ])
      ),
      projects: allProjects.map((p) => ({
        ...p,
        metrics: computeProjectMetrics(p.id),
      })),
    };
    res.json({ ok: true, data: summary });
  });

  // =========================================================================
  // MILESTONES
  // =========================================================================

  // POST /projects/:id/milestone - create milestone
  router.post('/projects/:id/milestone', validate(CreateMilestoneSchema), (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ ok: false, error: 'Project not found.' });

    const body = req.validatedBody;

    /** @type {Milestone} */
    const milestone = {
      id: uuidv4(),
      projectId: req.params.id,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate ?? null,
      targetPercentage: body.targetPercentage,
      reached: false,
      reachedAt: null,
      createdAt: Date.now(),
    };

    project.milestones.push(milestone);
    project.updatedAt = Date.now();
    projects.set(project.id, project);

    // Check if project completion percentage already meets the milestone target
    const metrics = computeProjectMetrics(project.id);
    if (metrics.completionPct >= milestone.targetPercentage) {
      milestone.reached = true;
      milestone.reachedAt = Date.now();
      const event = { event: 'milestone_reached', projectId: project.id, milestone: milestone.title };
      broadcastSSE('milestone:reached', event);
      emitSocketEvent(router, 'milestone:reached', event);
    }

    res.status(201).json({ ok: true, data: milestone });
  });

  // =========================================================================
  // TIMELINE (Gantt data)
  // =========================================================================

  // GET /projects/:id/timeline - Gantt timeline data
  router.get('/projects/:id/timeline', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ ok: false, error: 'Project not found.' });

    const projectTasks = tasks.get(req.params.id) ?? [];

    /**
     * Shape each task into a Gantt row.  If dates are missing we fall back to
     * createdAt and a 7-day estimate so the timeline is always renderable.
     */
    const ganttRows = projectTasks.map((t) => {
      const start = t.createdAt;
      const estimatedMs = (t.estimatedHours ?? 8) * 3600 * 1000;
      const end = t.completedAt ?? (start + estimatedMs);
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        start,
        end,
        progress: t.status === 'done' ? 100 : t.status === 'in_progress' ? 50 : 0,
        dependencies: [], // extend to add task dependency edges
      };
    });

    const milestoneRows = project.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      type: 'milestone',
      date: m.dueDate ? new Date(m.dueDate).getTime() : null,
      reached: m.reached,
      targetPercentage: m.targetPercentage,
    }));

    res.json({
      ok: true,
      data: {
        projectId: project.id,
        projectName: project.name,
        startDate: project.startDate,
        targetDate: project.targetDate,
        tasks: ganttRows,
        milestones: milestoneRows,
      },
    });
  });

  // =========================================================================
  // SSE REALTIME STREAM
  // =========================================================================

  // GET /realtime - SSE stream for project updates
  router.get('/realtime', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    sseClients.add(res);

    sendSSEEvent(res, 'connected', {
      timestamp: Date.now(),
      message: 'Projects SSE stream connected',
      activeProjects: projects.size,
    });

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  return router;
}

export default createProjectsRouter();
