// ================================================
// NEXUS AI PRO - Project Tracking Routes
// ================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ------------------------------------------------
// In-memory stores
// ------------------------------------------------
const projects = new Map();
const milestones = new Map(); // key: projectId, value: Milestone[]
const activities = new Map(); // key: projectId, value: Activity[]

// ------------------------------------------------
// Constants
// ------------------------------------------------
const PROJECT_TYPES = ['web', 'mobile', 'desktop', 'api', 'game', 'ar', 'vr', 'xr', '3d', 'fullstack', 'ai'];
const LANGUAGES = ['C++', 'Swift', 'JavaScript', 'TypeScript', 'Python', 'Rust', 'Go', 'Java', 'Kotlin', 'Dart', 'C#', 'Lua', 'HLSL', 'GLSL', 'Blueprint'];
const PLATFORMS = ['web', 'ios', 'android', 'windows', 'macos', 'linux', 'ps5', 'xbox', 'switch', 'steam', 'vr-quest', 'ar-glass'];
const STATUSES = ['active', 'paused', 'complete', 'archived'];

// ------------------------------------------------
// Helpers
// ------------------------------------------------
function validateProject(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string') errors.push('name is required');
  if (data.type && !PROJECT_TYPES.includes(data.type)) errors.push(`type must be one of: ${PROJECT_TYPES.join(', ')}`);
  if (data.status && !STATUSES.includes(data.status)) errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  if (data.language && !LANGUAGES.includes(data.language) && !Array.isArray(data.language)) {
    // allow array of languages
  }
  if (data.platforms && !Array.isArray(data.platforms)) errors.push('platforms must be an array');
  return errors;
}

function generateMockMetrics(project) {
  const now = Date.now();
  return {
    projectId: project.id,
    commits: Math.floor(Math.random() * 300) + 10,
    linesOfCode: Math.floor(Math.random() * 50000) + 500,
    testCoverage: Math.floor(Math.random() * 40) + 50, // 50-90%
    buildStatus: ['passing', 'failing', 'pending'][Math.floor(Math.random() * 3)],
    deployments: Math.floor(Math.random() * 20),
    openIssues: Math.floor(Math.random() * 15),
    closedIssues: Math.floor(Math.random() * 50),
    lastBuildAt: now - Math.floor(Math.random() * 86400000),
    lastDeployAt: now - Math.floor(Math.random() * 604800000),
    pullRequests: Math.floor(Math.random() * 10),
    contributors: Math.floor(Math.random() * 5) + 1,
    generatedAt: now
  };
}

function logActivity(projectId, type, description, meta = {}) {
  const list = activities.get(projectId) || [];
  const entry = {
    id: uuidv4(),
    projectId,
    type,
    description,
    meta,
    createdAt: Date.now()
  };
  list.unshift(entry);
  // Keep last 200 activity entries per project
  activities.set(projectId, list.slice(0, 200));
  return entry;
}

// ------------------------------------------------
// GET /api/projects — list all projects
// ------------------------------------------------
router.get('/', (req, res) => {
  const { type, status, language, platform } = req.query;
  let results = Array.from(projects.values());

  if (type) results = results.filter(p => p.type === type);
  if (status) results = results.filter(p => p.status === status);
  if (language) {
    results = results.filter(p => {
      const langs = Array.isArray(p.language) ? p.language : [p.language];
      return langs.includes(language);
    });
  }
  if (platform) {
    results = results.filter(p => {
      const plats = Array.isArray(p.platforms) ? p.platforms : [];
      return plats.includes(platform);
    });
  }

  results.sort((a, b) => b.updatedAt - a.updatedAt);
  res.json({ projects: results, total: results.length });
});

// ------------------------------------------------
// POST /api/projects — create project
// ------------------------------------------------
router.post('/', (req, res) => {
  const { name, type, description, stack, language, platforms, status } = req.body;

  const errors = validateProject(req.body);
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

  const now = Date.now();
  const project = {
    id: uuidv4(),
    name: name.trim(),
    type: type || 'web',
    description: description || '',
    stack: stack || '',
    language: Array.isArray(language) ? language : (language ? [language] : []),
    platforms: Array.isArray(platforms) ? platforms : [],
    status: status || 'active',
    progress: 0,
    createdAt: now,
    updatedAt: now
  };

  projects.set(project.id, project);
  milestones.set(project.id, []);
  activities.set(project.id, []);

  logActivity(project.id, 'project_created', `Project "${project.name}" was created`);

  res.status(201).json(project);
});

// ------------------------------------------------
// GET /api/projects/:id — project detail
// ------------------------------------------------
router.get('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const projectMilestones = milestones.get(req.params.id) || [];
  const total = projectMilestones.length;
  const completed = projectMilestones.filter(m => m.status === 'complete').length;

  res.json({
    ...project,
    milestonesSummary: { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
  });
});

// ------------------------------------------------
// PUT /api/projects/:id — update project
// ------------------------------------------------
router.put('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const errors = validateProject({ name: project.name, ...req.body });
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

  const { name, type, description, stack, language, platforms, status, progress } = req.body;

  const updated = {
    ...project,
    ...(name !== undefined && { name: name.trim() }),
    ...(type !== undefined && { type }),
    ...(description !== undefined && { description }),
    ...(stack !== undefined && { stack }),
    ...(language !== undefined && { language: Array.isArray(language) ? language : [language] }),
    ...(platforms !== undefined && { platforms }),
    ...(status !== undefined && { status }),
    ...(progress !== undefined && { progress: Math.min(100, Math.max(0, Number(progress))) }),
    updatedAt: Date.now()
  };

  projects.set(req.params.id, updated);
  logActivity(req.params.id, 'project_updated', `Project "${updated.name}" was updated`);

  res.json(updated);
});

// ------------------------------------------------
// DELETE /api/projects/:id
// ------------------------------------------------
router.delete('/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  projects.delete(req.params.id);
  milestones.delete(req.params.id);
  activities.delete(req.params.id);

  res.json({ success: true, id: req.params.id });
});

// ------------------------------------------------
// GET /api/projects/:id/metrics
// ------------------------------------------------
router.get('/:id/metrics', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  res.json(generateMockMetrics(project));
});

// ------------------------------------------------
// POST /api/projects/:id/milestone — add milestone
// ------------------------------------------------
router.post('/:id/milestone', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { title, description, dueDate, priority } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const milestone = {
    id: uuidv4(),
    projectId: req.params.id,
    title: title.trim(),
    description: description || '',
    dueDate: dueDate || null,
    priority: priority || 'medium',
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const list = milestones.get(req.params.id) || [];
  list.push(milestone);
  milestones.set(req.params.id, list);

  logActivity(req.params.id, 'milestone_added', `Milestone "${milestone.title}" was added`);

  res.status(201).json(milestone);
});

// ------------------------------------------------
// GET /api/projects/:id/milestones
// ------------------------------------------------
router.get('/:id/milestones', (req, res) => {
  if (!projects.has(req.params.id)) return res.status(404).json({ error: 'Project not found' });

  const list = milestones.get(req.params.id) || [];
  res.json({ milestones: list, total: list.length });
});

// ------------------------------------------------
// PUT /api/projects/:id/milestones/:milestoneId
// ------------------------------------------------
router.put('/:id/milestones/:milestoneId', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const list = milestones.get(req.params.id) || [];
  const idx = list.findIndex(m => m.id === req.params.milestoneId);
  if (idx === -1) return res.status(404).json({ error: 'Milestone not found' });

  const { title, description, dueDate, priority, status } = req.body;
  const updated = {
    ...list[idx],
    ...(title !== undefined && { title: title.trim() }),
    ...(description !== undefined && { description }),
    ...(dueDate !== undefined && { dueDate }),
    ...(priority !== undefined && { priority }),
    ...(status !== undefined && { status }),
    updatedAt: Date.now()
  };

  if (status === 'complete' && list[idx].status !== 'complete') {
    updated.completedAt = Date.now();
    logActivity(req.params.id, 'milestone_completed', `Milestone "${updated.title}" was completed`);
  }

  list[idx] = updated;
  milestones.set(req.params.id, list);

  // Recalculate project progress based on milestones
  const total = list.length;
  const completed = list.filter(m => m.status === 'complete').length;
  if (total > 0) {
    const prog = projects.get(req.params.id);
    projects.set(req.params.id, { ...prog, progress: Math.round((completed / total) * 100), updatedAt: Date.now() });
  }

  res.json(updated);
});

// ------------------------------------------------
// GET /api/projects/:id/activity
// ------------------------------------------------
router.get('/:id/activity', (req, res) => {
  if (!projects.has(req.params.id)) return res.status(404).json({ error: 'Project not found' });

  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const list = (activities.get(req.params.id) || []).slice(offset, offset + limit);

  res.json({ activities: list, total: (activities.get(req.params.id) || []).length });
});

// ------------------------------------------------
// POST /api/projects/:id/activity — log event
// ------------------------------------------------
router.post('/:id/activity', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { type, description, meta } = req.body;
  if (!type || !description) return res.status(400).json({ error: 'type and description are required' });

  const entry = logActivity(req.params.id, type, description, meta || {});
  res.status(201).json(entry);
});

// ------------------------------------------------
// Seed a couple of demo projects on startup
// ------------------------------------------------
const seedProjects = [
  {
    name: 'Nexus Web Dashboard',
    type: 'fullstack',
    description: 'Main web dashboard with AI integration',
    stack: 'React + Node.js + Socket.IO',
    language: ['TypeScript', 'JavaScript'],
    platforms: ['web'],
    status: 'active',
    progress: 65
  },
  {
    name: 'Galaxy Raiders',
    type: 'game',
    description: 'Cross-platform space shooter with Unreal Engine 5',
    stack: 'Unreal Engine 5',
    language: ['C++', 'Blueprint', 'HLSL'],
    platforms: ['windows', 'ps5', 'xbox', 'steam'],
    status: 'active',
    progress: 42
  },
  {
    name: 'AR Navigation App',
    type: 'ar',
    description: 'Augmented reality indoor navigation application',
    stack: 'ARKit / ARCore',
    language: ['Swift', 'Kotlin'],
    platforms: ['ios', 'android', 'ar-glass'],
    status: 'active',
    progress: 28
  }
];

for (const seed of seedProjects) {
  const now = Date.now();
  const id = uuidv4();
  projects.set(id, { id, ...seed, createdAt: now, updatedAt: now });
  milestones.set(id, []);
  activities.set(id, []);
  logActivity(id, 'project_created', `Project "${seed.name}" was created`);
}

export default router;
