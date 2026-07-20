// 2026-07-20
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = express.Router();

// ── In-memory stores ────────────────────────────────────────────────────────
const projects     = new Map();
const tasks        = new Map(); // taskId → task (with projectId)
const members      = new Map(); // projectId → [member]
const gameBuilds   = new Map(); // buildId → build record
const gamingConns  = new Map(); // `${userId}:${platform}` → encrypted credentials meta

// ── Auth guard ───────────────────────────────────────────────────────────────
function authGuard(req, res, next) {
  const auth = req.headers.authorization || '';
  req.userId = auth.startsWith('Bearer ') ? 'authenticated-user' : 'guest';
  next();
}

// ── Encrypt credentials (no plaintext stored) ────────────────────────────────
function encryptCreds(secret, platform) {
  const key  = process.env.ENCRYPTION_SECRET || 'default-dev-key-change-in-prod';
  const salt = crypto.createHash('sha256').update(platform).digest();
  const iv   = crypto.randomBytes(12);
  const derivedKey = crypto.scryptSync(key, salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const enc  = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag  = cipher.getAuthTag();
  return { iv: iv.toString('hex'), enc: enc.toString('hex'), tag: tag.toString('hex') };
}

// ── Seed demo projects ───────────────────────────────────────────────────────
const DEMO_PROJECTS = [
  {
    id: uuidv4(), name: 'Nexus AI Pro', type: 'Web App', status: 'In Progress',
    description: 'AI-powered platform with multi-model support',
    engine: null, platforms: ['Web', 'iOS', 'Android'], sprint: 3, milestone: 'Beta Release',
    createdAt: Date.now() - 2592000000, updatedAt: Date.now() - 86400000,
  },
  {
    id: uuidv4(), name: 'Project Aurora', type: 'Game Development', status: 'In Progress',
    description: 'Open-world RPG built with Unreal Engine 5',
    engine: 'Unreal Engine 5', platforms: ['PC', 'PlayStation', 'Xbox'], sprint: 7, milestone: 'Alpha',
    createdAt: Date.now() - 7776000000, updatedAt: Date.now() - 43200000,
  },
  {
    id: uuidv4(), name: 'HoloSpace', type: 'AR/VR/3D', status: 'Backlog',
    description: 'Mixed reality workspace for Meta Quest 3',
    engine: 'Unity', platforms: ['Meta Quest', 'PSVR2'], sprint: 1, milestone: 'Prototype',
    createdAt: Date.now() - 604800000, updatedAt: Date.now() - 3600000,
  },
];
const DEMO_MEMBERS = [
  { id: uuidv4(), name: 'Cameron Fox',  role: 'Lead Developer',  avatar: 'CF' },
  { id: uuidv4(), name: 'Alex Rivera',  role: 'Game Designer',   avatar: 'AR' },
  { id: uuidv4(), name: 'Sam Chen',     role: ' 3D Artist',       avatar: 'SC' },
  { id: uuidv4(), name: 'Jordan Park',  role: 'QA Engineer',     avatar: 'JP' },
];

DEMO_PROJECTS.forEach(p => {
  projects.set(p.id, p);
  members.set(p.id, DEMO_MEMBERS.slice(0, 2));

  // Seed tasks
  const cols = ['Backlog', 'In Progress', 'Review', 'Done'];
  cols.forEach((col, ci) => {
    const task = {
      id: uuidv4(), projectId: p.id, title: `${col} task for ${p.name}`,
      description: 'Auto-seeded task', status: col, priority: ['low','medium','high'][ci % 3],
      assignee: DEMO_MEMBERS[ci % DEMO_MEMBERS.length].name,
      createdAt: Date.now() - ci * 86400000, updatedAt: Date.now(),
    };
    tasks.set(task.id, task);
  });
});

// Seed game builds
const buildStatuses = ['dev', 'alpha', 'beta', 'RC', 'gold'];
for (let i = 0; i < 5; i++) {
  const b = {
    id: uuidv4(),
    projectId: DEMO_PROJECTS[1].id,
    version: `0.${i + 1}.0`,
    status: buildStatuses[i],
    engine: 'Unreal Engine 5',
    platforms: ['PC'],
    buildNumber: 1000 + i,
    buildTime: 240 + i * 30,
    notes: `Build ${1000 + i} notes`,
    createdAt: Date.now() - (5 - i) * 86400000,
  };
  gameBuilds.set(b.id, b);
}

// ── Burndown helper ──────────────────────────────────────────────────────────
function generateBurndown(project) {
  const sprintDays = 14;
  const totalPoints = 80 + Math.floor(Math.random() * 40);
  const points = [];
  for (let d = 0; d <= sprintDays; d++) {
    const ideal   = totalPoints - (totalPoints / sprintDays) * d;
    const actual  = d === 0 ? totalPoints : Math.max(0, ideal + (Math.random() - 0.4) * 15);
    points.push({ day: d, ideal: +ideal.toFixed(1), actual: +actual.toFixed(1) });
  }
  return { sprintDays, totalPoints, points, sprint: project.sprint };
}

// ── Mock gaming platform data ────────────────────────────────────────────────
const PLATFORM_GAMES = {
  epic: [
    { id: 'ep1', title: 'Fortnite',        genre: 'Battle Royale', hours: 120 },
    { id: 'ep2', title: 'Rocket League',   genre: 'Sports',        hours: 85  },
    { id: 'ep3', title: 'Fall Guys',       genre: 'Party',         hours: 40  },
  ],
  playstation: [
    { id: 'ps1', title: 'God of War Ragnarök', genre: 'Action-Adventure', hours: 65 },
    { id: 'ps2', title: 'Spider-Man 2',         genre: 'Action',           hours: 30 },
    { id: 'ps3', title: 'Horizon FW',           genre: 'RPG',              hours: 90 },
  ],
  xbox: [
    { id: 'xb1', title: 'Halo Infinite', genre: 'FPS',   hours: 50 },
    { id: 'xb2', title: 'Forza Horizon 5', genre: 'Racing', hours: 75 },
  ],
  ubisoft: [
    { id: 'ub1', title: "Assassin's Creed Mirage", genre: 'Action-Adventure', hours: 25 },
    { id: 'ub2', title: 'Rainbow Six Siege',        genre: 'Tactical FPS',     hours: 200 },
  ],
};

const PLATFORM_ACHIEVEMENTS = {
  epic: [
    { id: 'ea1', title: 'Battle Hardened', description: '100 wins in Fortnite', game: 'Fortnite', earned: true,  earnedAt: Date.now() - 864000000, rarity: 'rare',   points: 50, progress: 100 },
    { id: 'ea2', title: 'Rocket Scientist', description: 'Reach Grand Champion', game: 'Rocket League', earned: false, rarity: 'legendary', points: 100, progress: 62 },
  ],
  playstation: [
    { id: 'pa1', title: 'God Slayer',  description: 'Defeat Odin',   game: 'God of War Ragnarök', earned: true,  earnedAt: Date.now() - 2592000000, rarity: 'uncommon', points: 30, progress: 100, trophy: 'gold' },
    { id: 'pa2', title: 'Web-slinger', description: '100% completion', game: 'Spider-Man 2',       earned: false, rarity: 'epic',     points: 90, progress: 45,  trophy: 'platinum' },
  ],
  xbox: [
    { id: 'xa1', title: 'Spartan',    description: 'Complete campaign on Legendary', game: 'Halo Infinite',     earned: true,  earnedAt: Date.now() - 1728000000, rarity: 'rare',   points: 75, progress: 100 },
    { id: 'xa2', title: 'Speed Demon', description: 'Set a speed record',            game: 'Forza Horizon 5', earned: false, rarity: 'uncommon', points: 25, progress: 80 },
  ],
  ubisoft: [
    { id: 'ua1', title: 'Hidden Blade', description: 'Complete the story', game: "Assassin's Creed Mirage", earned: true, earnedAt: Date.now() - 432000000, rarity: 'common', points: 20, progress: 100 },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// PROJECT ROUTES
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/projects
router.get('/', authGuard, (req, res) => {
  const list = Array.from(projects.values());
  res.json({ projects: list, total: list.length });
});

// POST /api/projects
router.post('/', authGuard, (req, res) => {
  const { name, type, description, engine, platforms, milestone } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const project = {
    id: uuidv4(), name, type: type || 'General', description: description || '',
    engine: engine || null, platforms: platforms || [], sprint: 1,
    milestone: milestone || '', status: 'Backlog',
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  projects.set(project.id, project);
  members.set(project.id, []);
  res.status(201).json(project);
});

// GET /api/projects/:id
router.get('/:id', authGuard, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const projectTasks = Array.from(tasks.values()).filter(t => t.projectId === req.params.id);
  const projectMembers = members.get(req.params.id) || [];
  res.json({ ...project, tasks: projectTasks, members: projectMembers });
});

// PUT /api/projects/:id
router.put('/:id', authGuard, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  const updated = { ...project, ...req.body, id: project.id, updatedAt: Date.now() };
  projects.set(project.id, updated);
  res.json(updated);
});

// DELETE /api/projects/:id
router.delete('/:id', authGuard, (req, res) => {
  if (!projects.has(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  projects.delete(req.params.id);
  // Also delete related tasks and members
  for (const [taskId, task] of tasks.entries()) {
    if (task.projectId === req.params.id) tasks.delete(taskId);
  }
  members.delete(req.params.id);
  res.json({ success: true });
});

// ── Tasks ───────────────────────────────────────────────────────────────────

// GET /api/projects/:id/tasks
router.get('/:id/tasks', authGuard, (req, res) => {
  if (!projects.has(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  const list = Array.from(tasks.values()).filter(t => t.projectId === req.params.id);
  res.json({ tasks: list, total: list.length });
});

// POST /api/projects/:id/tasks
router.post('/:id/tasks', authGuard, (req, res) => {
  if (!projects.has(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  const { title, description, status, priority, assignee } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const task = {
    id: uuidv4(), projectId: req.params.id, title, description: description || '',
    status: status || 'Backlog', priority: priority || 'medium', assignee: assignee || '',
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  tasks.set(task.id, task);
  // Update project updatedAt
  const p = projects.get(req.params.id);
  if (p) projects.set(p.id, { ...p, updatedAt: Date.now() });
  res.status(201).json(task);
});

// PUT /api/projects/:id/tasks/:taskId
router.put('/:id/tasks/:taskId', authGuard, (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task || task.projectId !== req.params.id) return res.status(404).json({ error: 'Task not found' });
  const updated = { ...task, ...req.body, id: task.id, projectId: task.projectId, updatedAt: Date.now() };
  tasks.set(task.id, updated);
  res.json(updated);
});

// DELETE /api/projects/:id/tasks/:taskId
router.delete('/:id/tasks/:taskId', authGuard, (req, res) => {
  const task = tasks.get(req.params.taskId);
  if (!task || task.projectId !== req.params.id) return res.status(404).json({ error: 'Task not found' });
  tasks.delete(req.params.taskId);
  res.json({ success: true });
});

// ── Burndown ─────────────────────────────────────────────────────────────────

// GET /api/projects/:id/burndown
router.get('/:id/burndown', authGuard, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(generateBurndown(project));
});

// ── Members ──────────────────────────────────────────────────────────────────

// POST /api/projects/:id/members
router.post('/:id/members', authGuard, (req, res) => {
  if (!projects.has(req.params.id)) return res.status(404).json({ error: 'Project not found' });
  const { name, role } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const member = {
    id: uuidv4(), name, role: role || 'Contributor',
    avatar: name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    addedAt: Date.now(),
  };
  const list = members.get(req.params.id) || [];
  list.push(member);
  members.set(req.params.id, list);
  res.status(201).json(member);
});

// ── Game builds ──────────────────────────────────────────────────────────────

// GET /api/projects/gamedev/builds
router.get('/gamedev/builds', authGuard, (req, res) => {
  const projectId = req.query.projectId;
  let list = Array.from(gameBuilds.values());
  if (projectId) list = list.filter(b => b.projectId === projectId);
  list.sort((a, b) => b.createdAt - a.createdAt);
  res.json({ builds: list, total: list.length });
});

// POST /api/projects/gamedev/builds
router.post('/gamedev/builds', authGuard, (req, res) => {
  const { projectId, version, status, engine, platforms, notes } = req.body;
  if (!projectId || !version) return res.status(400).json({ error: 'projectId and version are required' });
  const build = {
    id: uuidv4(), projectId, version,
    status: status || 'dev', engine: engine || 'Unknown',
    platforms: platforms || ['PC'], notes: notes || '',
    buildNumber: 1000 + gameBuilds.size,
    buildTime: 0, createdAt: Date.now(),
  };
  gameBuilds.set(build.id, build);
  res.status(201).json(build);
});

// ══════════════════════════════════════════════════════════════════════════════
// GAMING CONNECTOR ROUTES  (mounted at /api/connectors/gaming)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/connectors/gaming/:platform
router.get('/connectors/gaming/:platform', authGuard, (req, res) => {
  const { platform } = req.params;
  const key = `${req.userId}:${platform}`;
  const connected = gamingConns.has(key);
  res.json({
    platform,
    connected,
    lastSync: connected ? gamingConns.get(key).lastSync : null,
    gamesCount:        (PLATFORM_GAMES[platform] || []).length,
    achievementsCount: (PLATFORM_ACHIEVEMENTS[platform] || []).length,
    earnedCount:       (PLATFORM_ACHIEVEMENTS[platform] || []).filter(a => a.earned).length,
  });
});

// POST /api/connectors/gaming/:platform/connect
router.post('/connectors/gaming/:platform/connect', authGuard, (req, res) => {
  const { platform } = req.params;
  const validPlatforms = ['epic', 'playstation', 'xbox', 'ubisoft'];
  if (!validPlatforms.includes(platform)) {
    return res.status(400).json({ error: `Unknown platform. Valid: ${validPlatforms.join(', ')}` });
  }

  const { credential } = req.body; // caller passes opaque credential – we never echo it back
  if (!credential) return res.status(400).json({ error: 'credential is required' });

  const key  = `${req.userId}:${platform}`;
  const meta = {
    platform,
    connectedAt: Date.now(),
    lastSync:    Date.now(),
    // Only store encrypted reference – never plaintext
    credRef: encryptCreds(credential, platform),
  };
  gamingConns.set(key, meta);
  res.json({ success: true, platform, connectedAt: meta.connectedAt });
});

// GET /api/connectors/gaming/:platform/achievements
router.get('/connectors/gaming/:platform/achievements', authGuard, (req, res) => {
  const { platform } = req.params;
  const list = PLATFORM_ACHIEVEMENTS[platform] || [];
  res.json({ platform, achievements: list, total: list.length, earned: list.filter(a => a.earned).length });
});

// GET /api/connectors/gaming/:platform/games
router.get('/connectors/gaming/:platform/games', authGuard, (req, res) => {
  const { platform } = req.params;
  const list = PLATFORM_GAMES[platform] || [];
  res.json({ platform, games: list, total: list.length });
});

export default router;
