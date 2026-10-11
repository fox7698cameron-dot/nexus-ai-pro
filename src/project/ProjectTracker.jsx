/* src/project/ProjectTracker.jsx
   Created: 2026-10-11
   Project Tracking Dashboard - Coding, Game Dev, AR/VR/3D
   Features: Real-time metrics, build status, milestone tracking
*/

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, Archive, Bell, BellOff,
  Box, Calendar, CheckCircle, ChevronDown, ChevronRight, Clock,
  Code, Code2, Cpu, Database, ExternalLink, Eye, Filter,
  Flame, Gamepad2, GitBranch, GitCommit, GitMerge, GitPullRequest,
  Globe, Headset, Layout, Layers, Monitor, Moon, Package,
  Play, Plus, RefreshCw, Search, Settings, Shield, Smartphone,
  Star, Sun, Tag, Target, Terminal, Timer, Trash2, TrendingUp,
  Triangle, Users, Wifi, WifiOff, X, Zap
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const PROJECT_TYPES = [
  'Web App', 'Mobile App', 'Game', 'AR Experience',
  'VR Experience', '3D Application', 'Desktop App', 'API/Backend'
];

const PROJECT_STATUSES = [
  'Planning', 'In Development', 'Testing', 'Review', 'Deployed', 'Archived'
];

const KANBAN_COLUMNS = ['Backlog', 'In Progress', 'Review', 'Done'];

const AR_VR_PLATFORMS = [
  'Meta Quest', 'HTC Vive', 'Apple Vision Pro', 'WebXR', 'PlayStation VR', 'Steam VR'
];

const STATUS_COLORS = {
  Planning:       'bg-slate-500/20 text-slate-300 border-slate-500/40',
  'In Development': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  Testing:        'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  Review:         'bg-purple-500/20 text-purple-300 border-purple-500/40',
  Deployed:       'bg-green-500/20 text-green-300 border-green-500/40',
  Archived:       'bg-gray-500/20 text-gray-400 border-gray-500/40',
};

const BUILD_COLORS = {
  passing: 'text-green-400',
  failing: 'text-red-400',
  pending: 'text-yellow-400',
};

const TYPE_ICONS = {
  'Web App':        <Globe className="w-4 h-4" />,
  'Mobile App':     <Smartphone className="w-4 h-4" />,
  'Game':           <Gamepad2 className="w-4 h-4" />,
  'AR Experience':  <Eye className="w-4 h-4" />,
  'VR Experience':  <Headset className="w-4 h-4" />,
  '3D Application': <Box className="w-4 h-4" />,
  'Desktop App':    <Monitor className="w-4 h-4" />,
  'API/Backend':    <Terminal className="w-4 h-4" />,
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PROJECTS = [
  {
    id: 'proj-001',
    name: 'NexusAI Dashboard',
    type: 'Web App',
    status: 'In Development',
    completion: 67,
    description: 'AI-powered analytics dashboard with real-time data visualization',
    deadline: '2026-12-15',
    hoursLogged: 342,
    hoursEstimated: 500,
    team: [
      { id: 'u1', name: 'Alex Chen', avatar: 'AC', role: 'Lead Dev', online: true },
      { id: 'u2', name: 'Maria Santos', avatar: 'MS', role: 'UI/UX', online: false },
      { id: 'u3', name: 'Jordan Kim', avatar: 'JK', role: 'Backend', online: true },
    ],
    buildStatus: 'passing',
    testCoverage: 84,
    milestones: [
      { id: 'm1', title: 'Core API Integration', done: true, date: '2026-09-01' },
      { id: 'm2', title: 'Authentication System', done: true, date: '2026-09-20' },
      { id: 'm3', title: 'Dashboard UI v1', done: false, date: '2026-10-30' },
      { id: 'm4', title: 'Beta Launch', done: false, date: '2026-11-30' },
    ],
    commitHistory: [3, 7, 5, 12, 8, 4, 9, 11, 6, 14, 10, 7, 3, 8],
    languages: [
      { name: 'TypeScript', pct: 58, color: '#3178c6' },
      { name: 'Python', pct: 24, color: '#3572A5' },
      { name: 'CSS', pct: 12, color: '#563d7c' },
      { name: 'Other', pct: 6, color: '#555' },
    ],
    linesOfCode: 28540,
    dependencies: 47,
    techDebtScore: 23,
    kanban: {
      Backlog: [
        { id: 't1', title: 'Dark mode refinements', priority: 'low', assignee: 'MS' },
        { id: 't2', title: 'Export to CSV feature', priority: 'medium', assignee: 'JK' },
      ],
      'In Progress': [
        { id: 't3', title: 'Real-time WebSocket feed', priority: 'high', assignee: 'AC' },
        { id: 't4', title: 'Chart performance opt', priority: 'medium', assignee: 'AC' },
      ],
      Review: [
        { id: 't5', title: 'Auth token refresh', priority: 'high', assignee: 'JK' },
      ],
      Done: [
        { id: 't6', title: 'Initial API setup', priority: 'high', assignee: 'AC' },
        { id: 't7', title: 'User onboarding flow', priority: 'medium', assignee: 'MS' },
      ],
    },
  },
  {
    id: 'proj-002',
    name: 'Starfall Chronicles',
    type: 'Game',
    status: 'In Development',
    completion: 45,
    description: 'Procedurally generated space exploration RPG with multiplayer support',
    deadline: '2027-03-01',
    hoursLogged: 890,
    hoursEstimated: 2000,
    team: [
      { id: 'u4', name: 'Sam Rivera', avatar: 'SR', role: 'Game Dev', online: true },
      { id: 'u5', name: 'Priya Patel', avatar: 'PP', role: 'Artist', online: true },
      { id: 'u6', name: 'Tom Nguyen', avatar: 'TN', role: 'Audio', online: false },
    ],
    buildStatus: 'pending',
    testCoverage: 52,
    milestones: [
      { id: 'm5', title: 'Core Engine Setup', done: true, date: '2026-07-15' },
      { id: 'm6', title: 'Procedural World Gen', done: true, date: '2026-09-01' },
      { id: 'm7', title: 'Combat System', done: false, date: '2026-11-15' },
      { id: 'm8', title: 'Multiplayer Alpha', done: false, date: '2027-01-15' },
    ],
    commitHistory: [2, 4, 8, 6, 11, 9, 7, 5, 13, 8, 6, 10, 12, 7],
    languages: [
      { name: 'C#', pct: 72, color: '#178600' },
      { name: 'HLSL', pct: 18, color: '#DF3D22' },
      { name: 'Python', pct: 10, color: '#3572A5' },
    ],
    linesOfCode: 95200,
    dependencies: 12,
    techDebtScore: 41,
    kanban: {
      Backlog: [
        { id: 't8', title: 'Boss AI behavior tree', priority: 'high', assignee: 'SR' },
        { id: 't9', title: 'Inventory UI polish', priority: 'low', assignee: 'PP' },
      ],
      'In Progress': [
        { id: 't10', title: 'Multiplayer sync logic', priority: 'high', assignee: 'SR' },
      ],
      Review: [
        { id: 't11', title: 'Particle system v2', priority: 'medium', assignee: 'PP' },
      ],
      Done: [
        { id: 't12', title: 'Planet generation algo', priority: 'high', assignee: 'SR' },
      ],
    },
  },
  {
    id: 'proj-003',
    name: 'MetaSpace Workshop',
    type: 'VR Experience',
    status: 'Testing',
    completion: 82,
    description: 'Collaborative VR workspace for remote teams with spatial audio',
    deadline: '2026-11-01',
    hoursLogged: 1204,
    hoursEstimated: 1500,
    team: [
      { id: 'u7', name: 'Zoe Thompson', avatar: 'ZT', role: 'XR Dev', online: true },
      { id: 'u8', name: 'Leo Martins', avatar: 'LM', role: '3D Artist', online: false },
    ],
    buildStatus: 'failing',
    testCoverage: 71,
    milestones: [
      { id: 'm9', title: 'Hand Tracking System', done: true, date: '2026-08-01' },
      { id: 'm10', title: 'Spatial Audio Engine', done: true, date: '2026-09-10' },
      { id: 'm11', title: 'Multi-user Lobby', done: true, date: '2026-10-01' },
      { id: 'm12', title: 'Store Submission', done: false, date: '2026-11-01' },
    ],
    commitHistory: [5, 9, 6, 8, 14, 11, 7, 10, 12, 9, 8, 6, 4, 11],
    languages: [
      { name: 'C#', pct: 65, color: '#178600' },
      { name: 'HLSL', pct: 22, color: '#DF3D22' },
      { name: 'JavaScript', pct: 13, color: '#f1e05a' },
    ],
    linesOfCode: 62800,
    dependencies: 18,
    techDebtScore: 15,
    arvrMetrics: {
      platform: 'Meta Quest',
      polygonTarget: 500000,
      polygonCurrent: 487320,
      frameRateTarget: 72,
      frameRateCurrent: 68,
      assetLoadTime: 2.4,
      assetLoadTarget: 3.0,
    },
    kanban: {
      Backlog: [
        { id: 't13', title: 'Haptic feedback tuning', priority: 'medium', assignee: 'ZT' },
      ],
      'In Progress': [
        { id: 't14', title: 'Fix hand occlusion bug', priority: 'high', assignee: 'ZT' },
        { id: 't15', title: 'Optimize draw calls', priority: 'high', assignee: 'LM' },
      ],
      Review: [],
      Done: [
        { id: 't16', title: 'Lobby networking', priority: 'high', assignee: 'ZT' },
        { id: 't17', title: 'Avatar system', priority: 'medium', assignee: 'LM' },
        { id: 't18', title: 'Spatial UI framework', priority: 'medium', assignee: 'ZT' },
      ],
    },
  },
  {
    id: 'proj-004',
    name: 'ARchitect Pro',
    type: 'AR Experience',
    status: 'Planning',
    completion: 12,
    description: 'AR interior design tool for Apple Vision Pro with room scanning',
    deadline: '2027-06-01',
    hoursLogged: 86,
    hoursEstimated: 1800,
    team: [
      { id: 'u9', name: 'Nina Weber', avatar: 'NW', role: 'AR Dev', online: false },
      { id: 'u10', name: 'Chris Park', avatar: 'CP', role: 'UX', online: true },
      { id: 'u11', name: 'Amy Liu', avatar: 'AL', role: '3D Modeler', online: false },
    ],
    buildStatus: 'pending',
    testCoverage: 8,
    milestones: [
      { id: 'm13', title: 'Vision Pro SDK Setup', done: true, date: '2026-10-05' },
      { id: 'm14', title: 'Room Scanning MVP', done: false, date: '2026-12-01' },
      { id: 'm15', title: 'Furniture Catalog', done: false, date: '2027-02-01' },
      { id: 'm16', title: 'Public Beta', done: false, date: '2027-05-01' },
    ],
    commitHistory: [1, 0, 2, 3, 1, 4, 2, 0, 3, 5, 2, 1, 4, 3],
    languages: [
      { name: 'Swift', pct: 70, color: '#F05138' },
      { name: 'Metal', pct: 20, color: '#A97BFF' },
      { name: 'Python', pct: 10, color: '#3572A5' },
    ],
    linesOfCode: 8400,
    dependencies: 9,
    techDebtScore: 7,
    arvrMetrics: {
      platform: 'Apple Vision Pro',
      polygonTarget: 200000,
      polygonCurrent: 18500,
      frameRateTarget: 90,
      frameRateCurrent: 90,
      assetLoadTime: 0.8,
      assetLoadTarget: 1.5,
    },
    kanban: {
      Backlog: [
        { id: 't19', title: 'Room scanning algo', priority: 'high', assignee: 'NW' },
        { id: 't20', title: 'Furniture model imports', priority: 'medium', assignee: 'AL' },
        { id: 't21', title: 'Gesture control system', priority: 'high', assignee: 'CP' },
      ],
      'In Progress': [
        { id: 't22', title: 'Vision Pro project setup', priority: 'high', assignee: 'NW' },
      ],
      Review: [],
      Done: [
        { id: 't23', title: 'SDK integration spike', priority: 'high', assignee: 'NW' },
      ],
    },
  },
  {
    id: 'proj-005',
    name: 'CloudSync API',
    type: 'API/Backend',
    status: 'Deployed',
    completion: 98,
    description: 'High-performance distributed file sync API with conflict resolution',
    deadline: '2026-10-01',
    hoursLogged: 980,
    hoursEstimated: 1000,
    team: [
      { id: 'u12', name: 'Dave Okonkwo', avatar: 'DO', role: 'Architect', online: true },
      { id: 'u13', name: 'Sara Johansson', avatar: 'SJ', role: 'DevOps', online: false },
    ],
    buildStatus: 'passing',
    testCoverage: 94,
    milestones: [
      { id: 'm17', title: 'Core Sync Engine', done: true, date: '2026-07-01' },
      { id: 'm18', title: 'Conflict Resolution', done: true, date: '2026-08-15' },
      { id: 'm19', title: 'Load Testing', done: true, date: '2026-09-15' },
      { id: 'm20', title: 'Production Deploy', done: true, date: '2026-10-01' },
    ],
    commitHistory: [8, 11, 14, 9, 12, 7, 10, 13, 11, 8, 6, 4, 2, 3],
    languages: [
      { name: 'Go', pct: 78, color: '#00ADD8' },
      { name: 'SQL', pct: 14, color: '#e38c00' },
      { name: 'Bash', pct: 8, color: '#89e051' },
    ],
    linesOfCode: 41200,
    dependencies: 23,
    techDebtScore: 9,
    kanban: {
      Backlog: [],
      'In Progress': [
        { id: 't24', title: 'v2.1 rate limiting', priority: 'medium', assignee: 'DO' },
      ],
      Review: [
        { id: 't25', title: 'Perf regression fix', priority: 'high', assignee: 'SJ' },
      ],
      Done: [
        { id: 't26', title: 'gRPC endpoints', priority: 'high', assignee: 'DO' },
        { id: 't27', title: 'K8s deployment', priority: 'high', assignee: 'SJ' },
        { id: 't28', title: 'Auth middleware', priority: 'high', assignee: 'DO' },
      ],
    },
  },
];

const MOCK_NOTIFICATIONS = [
  { id: 'n1', type: 'build_fail', projectId: 'proj-003', message: 'MetaSpace Workshop build failed on branch feature/hand-tracking', time: '2 min ago', read: false },
  { id: 'n2', type: 'pr_review', projectId: 'proj-001', message: 'Jordan Kim requested review on PR #47: Auth token refresh', time: '15 min ago', read: false },
  { id: 'n3', type: 'milestone', projectId: 'proj-003', message: 'Milestone "Multi-user Lobby" completed in MetaSpace Workshop', time: '1 hr ago', read: false },
  { id: 'n4', type: 'deadline', projectId: 'proj-003', message: 'MetaSpace Workshop deadline in 21 days — 3 tasks still open', time: '3 hr ago', read: true },
  { id: 'n5', type: 'build_pass', projectId: 'proj-005', message: 'CloudSync API all checks passing — ready to merge', time: '5 hr ago', read: true },
];

// ─── Utility Helpers ──────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function formatDeadline(dateStr) {
  const days = daysUntil(dateStr);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, cls: 'text-red-400' };
  if (days <= 7) return { label: `${days}d left`, cls: 'text-red-400' };
  if (days <= 21) return { label: `${days}d left`, cls: 'text-yellow-400' };
  return { label: `${days}d left`, cls: 'text-slate-400' };
}

function isXRProject(type) {
  return ['AR Experience', 'VR Experience', '3D Application', 'Game'].includes(type);
}

function notifIcon(type) {
  switch (type) {
    case 'build_fail': return <AlertCircle className="w-4 h-4 text-red-400" />;
    case 'build_pass': return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'pr_review': return <GitPullRequest className="w-4 h-4 text-purple-400" />;
    case 'milestone': return <Target className="w-4 h-4 text-blue-400" />;
    case 'deadline': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    default: return <Bell className="w-4 h-4 text-slate-400" />;
  }
}

function priorityBadge(priority) {
  const map = {
    high:   'bg-red-500/20 text-red-300 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    low:    'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${map[priority] || map.low}`}>
      {priority}
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ pct, color = 'bg-blue-500', height = 'h-2', showLabel = false }) {
  const capped = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-slate-700 rounded-full overflow-hidden ${height}`}>
        <div
          className={`${height} rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${capped}%` }}
        />
      </div>
      {showLabel && <span className="text-xs text-slate-400 w-8 text-right">{capped}%</span>}
    </div>
  );
}

function BuildBadge({ status }) {
  const icons = {
    passing: <CheckCircle className="w-3.5 h-3.5" />,
    failing: <AlertCircle className="w-3.5 h-3.5" />,
    pending: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
  };
  const cls = {
    passing: 'bg-green-500/15 text-green-400 border-green-500/30',
    failing: 'bg-red-500/15 text-red-400 border-red-500/30',
    pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cls[status] || cls.pending}`}>
      {icons[status]}
      {status}
    </span>
  );
}

function CommitGraph({ history }) {
  const maxVal = Math.max(...history, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {history.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-blue-500 opacity-70 hover:opacity-100 transition-opacity"
          style={{ height: `${(v / maxVal) * 100}%`, minHeight: v > 0 ? '2px' : '0' }}
          title={`${v} commits`}
        />
      ))}
    </div>
  );
}

function TeamAvatars({ team, limit = 4 }) {
  const shown = team.slice(0, limit);
  const overflow = team.length - limit;
  return (
    <div className="flex -space-x-2">
      {shown.map(m => (
        <div
          key={m.id}
          className="relative w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white border-2 border-slate-800"
          title={`${m.name} (${m.role})`}
        >
          {m.avatar}
          {m.online && (
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-400 border border-slate-800" />
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-300 border-2 border-slate-800">
          +{overflow}
        </div>
      )}
    </div>
  );
}

function LanguageBar({ languages }) {
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden">
        {languages.map(l => (
          <div
            key={l.name}
            style={{ width: `${l.pct}%`, backgroundColor: l.color }}
            title={`${l.name}: ${l.pct}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {languages.map(l => (
          <span key={l.name} className="flex items-center gap-1 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: l.color }} />
            {l.name} {l.pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

function XRMetricsPanel({ metrics }) {
  if (!metrics) return null;
  const polyPct = Math.round((metrics.polygonCurrent / metrics.polygonTarget) * 100);
  const fpsPct = Math.round((metrics.frameRateCurrent / metrics.frameRateTarget) * 100);
  const loadPct = Math.round((metrics.assetLoadTime / metrics.assetLoadTarget) * 100);

  return (
    <div className="mt-4 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
      <div className="flex items-center gap-2 mb-3">
        <Headset className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-semibold text-slate-200">XR / 3D Metrics</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
          {metrics.platform}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1"><Triangle className="w-3 h-3" /> Polygons</span>
            <span>{metrics.polygonCurrent.toLocaleString()} / {metrics.polygonTarget.toLocaleString()}</span>
          </div>
          <ProgressBar pct={polyPct} color={polyPct > 90 ? 'bg-yellow-500' : 'bg-purple-500'} />
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> FPS</span>
            <span>{metrics.frameRateCurrent} / {metrics.frameRateTarget} fps</span>
          </div>
          <ProgressBar pct={fpsPct} color={fpsPct < 90 ? 'bg-red-500' : 'bg-green-500'} />
        </div>
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1"><Package className="w-3 h-3" /> Load Time</span>
            <span>{metrics.assetLoadTime}s / {metrics.assetLoadTarget}s</span>
          </div>
          <ProgressBar pct={loadPct} color={loadPct > 80 ? 'bg-yellow-500' : 'bg-green-500'} />
        </div>
      </div>
    </div>
  );
}

function KanbanBoard({ kanban, projectId }) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Layout className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold text-slate-200">Task Board</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {KANBAN_COLUMNS.map(col => {
          const tasks = (kanban[col] || []).slice().sort((a, b) =>
            (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
          );
          const colColors = {
            Backlog: 'border-slate-600/40',
            'In Progress': 'border-blue-500/40',
            Review: 'border-purple-500/40',
            Done: 'border-green-500/40',
          };
          const headerColors = {
            Backlog: 'text-slate-400',
            'In Progress': 'text-blue-400',
            Review: 'text-purple-400',
            Done: 'text-green-400',
          };
          return (
            <div key={col} className={`bg-slate-800/40 rounded-xl border ${colColors[col]} p-3`}>
              <div className={`flex items-center justify-between mb-2 text-xs font-semibold ${headerColors[col]}`}>
                <span>{col}</span>
                <span className="bg-slate-700 text-slate-300 rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                  {tasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className="bg-slate-700/50 rounded-lg p-2 border border-slate-600/30 hover:border-slate-500/50 transition-colors cursor-default"
                  >
                    <p className="text-xs text-slate-200 leading-tight mb-2">{task.title}</p>
                    <div className="flex items-center justify-between">
                      {priorityBadge(task.priority)}
                      <span className="text-[10px] text-slate-500 font-mono">{task.assignee}</span>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-xs text-slate-600 text-center py-2">No tasks</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MilestoneList({ milestones }) {
  return (
    <div className="space-y-2">
      {milestones.map(m => (
        <div key={m.id} className="flex items-center gap-2 text-sm">
          {m.done
            ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            : <div className="w-4 h-4 rounded-full border-2 border-slate-500 shrink-0" />
          }
          <span className={m.done ? 'text-slate-400 line-through' : 'text-slate-200'}>{m.title}</span>
          <span className="ml-auto text-xs text-slate-500">{m.date}</span>
        </div>
      ))}
    </div>
  );
}

function ProjectDetailPanel({ project, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');
  const deadline = formatDeadline(project.deadline);
  const hoursRemaining = project.hoursEstimated - project.hoursLogged;
  const tabs = ['overview', 'code', 'milestones', 'board'];
  if (isXRProject(project.type) && project.arvrMetrics) tabs.splice(2, 0, 'xr/3d');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-600/30 flex items-center justify-center text-blue-300">
              {TYPE_ICONS[project.type]}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{project.name}</h2>
              <p className="text-sm text-slate-400">{project.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 border-b border-slate-700/60">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 text-sm rounded-t-lg capitalize transition-colors ${
                activeTab === t
                  ? 'text-blue-400 border-b-2 border-blue-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Status row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1">Completion</p>
                  <p className="text-2xl font-bold text-white">{project.completion}%</p>
                  <ProgressBar pct={project.completion} color="bg-blue-500" height="h-1.5" />
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1">Build Status</p>
                  <div className="mt-1"><BuildBadge status={project.buildStatus} /></div>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1">Test Coverage</p>
                  <p className="text-2xl font-bold text-white">{project.testCoverage}%</p>
                  <ProgressBar pct={project.testCoverage} color={project.testCoverage >= 80 ? 'bg-green-500' : project.testCoverage >= 60 ? 'bg-yellow-500' : 'bg-red-500'} height="h-1.5" />
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1">Deadline</p>
                  <p className={`text-lg font-bold ${deadline.cls}`}>{deadline.label}</p>
                  <p className="text-xs text-slate-500">{project.deadline}</p>
                </div>
              </div>

              {/* Time tracking */}
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-3">
                  <Timer className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-slate-200">Time Tracking</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400">{project.hoursLogged}h logged / {project.hoursEstimated}h estimated</span>
                  <span className="text-slate-400">{hoursRemaining}h remaining</span>
                </div>
                <ProgressBar pct={Math.round((project.hoursLogged / project.hoursEstimated) * 100)} color="bg-indigo-500" />
              </div>

              {/* Commit history */}
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-3">
                  <GitCommit className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-slate-200">Commit Activity (last 14 days)</span>
                </div>
                <CommitGraph history={project.commitHistory} />
              </div>

              {/* Team */}
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-slate-200">Team</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {project.team.map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                        {m.avatar}
                        {m.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-slate-800" />}
                      </div>
                      <div>
                        <p className="text-sm text-slate-200 font-medium">{m.name}</p>
                        <p className="text-xs text-slate-500">{m.role}</p>
                      </div>
                      <span className={`ml-auto text-xs ${m.online ? 'text-green-400' : 'text-slate-500'}`}>
                        {m.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Code2 className="w-3 h-3" /> Lines of Code</p>
                  <p className="text-xl font-bold text-white">{project.linesOfCode.toLocaleString()}</p>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Package className="w-3 h-3" /> Dependencies</p>
                  <p className="text-xl font-bold text-white">{project.dependencies}</p>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Shield className="w-3 h-3" /> Tech Debt Score</p>
                  <p className={`text-xl font-bold ${project.techDebtScore < 20 ? 'text-green-400' : project.techDebtScore < 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {project.techDebtScore}
                  </p>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> Coverage</p>
                  <p className="text-xl font-bold text-white">{project.testCoverage}%</p>
                </div>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
                <p className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Code className="w-4 h-4 text-blue-400" /> Languages
                </p>
                <LanguageBar languages={project.languages} />
              </div>
            </div>
          )}

          {activeTab === 'xr/3d' && (
            <div className="space-y-4">
              {project.arvrMetrics && <XRMetricsPanel metrics={project.arvrMetrics} />}
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
              <p className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-400" /> Milestones
              </p>
              <MilestoneList milestones={project.milestones} />
            </div>
          )}

          {activeTab === 'board' && (
            <KanbanBoard kanban={project.kanban} projectId={project.id} />
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationPanel({ notifications, onClose, onMarkAllRead }) {
  return (
    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-700/60">
        <span className="font-semibold text-slate-200">Notifications</span>
        <div className="flex items-center gap-2">
          <button onClick={onMarkAllRead} className="text-xs text-blue-400 hover:text-blue-300">
            Mark all read
          </button>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/40">
        {notifications.map(n => (
          <div key={n.id} className={`flex items-start gap-3 p-3 hover:bg-slate-800/40 transition-colors ${!n.read ? 'bg-blue-500/5' : ''}`}>
            <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-200 leading-snug">{n.message}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{n.time}</p>
            </div>
            {!n.read && <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick }) {
  const deadline = formatDeadline(project.deadline);
  const unreadNotifs = MOCK_NOTIFICATIONS.filter(n => !n.read && n.projectId === project.id).length;
  return (
    <button
      onClick={() => onClick(project)}
      className="text-left w-full bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/50 hover:border-slate-600/70 rounded-2xl p-4 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center text-blue-300">
            {TYPE_ICONS[project.type]}
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm group-hover:text-white transition-colors">
              {project.name}
            </h3>
            <p className="text-xs text-slate-500">{project.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {unreadNotifs > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadNotifs}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[project.status]}`}>
            {project.status}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">Progress</span>
          <span className="text-slate-300 font-medium">{project.completion}%</span>
        </div>
        <ProgressBar pct={project.completion} color="bg-blue-500" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BuildBadge status={project.buildStatus} />
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {project.hoursLogged}h
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs flex items-center gap-1 ${deadline.cls}`}>
            <Calendar className="w-3 h-3" />
            {deadline.label}
          </span>
          <TeamAvatars team={project.team} limit={3} />
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectTracker() {
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const notifsRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Close notifs on outside click
  useEffect(() => {
    const handler = e => {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Simulate real-time polling against /api/projects/*
  const refreshProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      // In production this would be: const data = await fetch('/api/projects').then(r => r.json());
      // Using mock data with slight randomisation to simulate live updates
      setProjects(prev => prev.map(p => ({
        ...p,
        hoursLogged: p.status === 'Deployed' ? p.hoursLogged : p.hoursLogged + Math.floor(Math.random() * 2),
      })));
      setLastRefresh(new Date());
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll every 30 seconds
  useEffect(() => {
    pollIntervalRef.current = setInterval(refreshProjects, 30000);
    return () => clearInterval(pollIntervalRef.current);
  }, [refreshProjects]);

  // Simulate incoming notifications
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(prev => [
        {
          id: `n-live-${Date.now()}`,
          type: 'pr_review',
          projectId: 'proj-001',
          message: 'New PR #48 opened: "Add WebSocket reconnection logic"',
          time: 'just now',
          read: false,
        },
        ...prev,
      ]);
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredProjects = projects.filter(p => {
    const matchSearch = searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = filterType === 'All' || p.type === filterType;
    const matchStatus = filterStatus === 'All' || p.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const statsTotal = {
    total: projects.length,
    active: projects.filter(p => p.status === 'In Development').length,
    passing: projects.filter(p => p.buildStatus === 'passing').length,
    failing: projects.filter(p => p.buildStatus === 'failing').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">ProjectTracker</span>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search projects…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Online indicator */}
            <div className={`flex items-center gap-1 text-xs ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:block">{isOnline ? 'Live' : 'Offline'}</span>
            </div>

            {/* Refresh */}
            <button
              onClick={refreshProjects}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifsRef}>
              <button
                onClick={() => setShowNotifs(v => !v)}
                className="relative p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setShowNotifs(false)}
                  onMarkAllRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Projects', value: statsTotal.total, icon: <Layers className="w-4 h-4" />, color: 'text-blue-400' },
            { label: 'In Development', value: statsTotal.active, icon: <Play className="w-4 h-4" />, color: 'text-indigo-400' },
            { label: 'Builds Passing', value: statsTotal.passing, icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400' },
            { label: 'Builds Failing', value: statsTotal.failing, icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 flex items-center gap-3">
              <div className={`${s.color} opacity-80`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <div className="flex gap-1 flex-wrap">
            {['All', ...PROJECT_TYPES].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filterType === t
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="w-px h-4 bg-slate-700 hidden sm:block" />
          <div className="flex gap-1 flex-wrap">
            {['All', ...PROJECT_STATUSES].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filterStatus === s
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-slate-500">
            {filteredProjects.length} of {projects.length} projects
          </span>
        </div>

        {/* Project Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No projects match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProjects.map(p => (
              <ProjectCard key={p.id} project={p} onClick={setSelectedProject} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between text-xs text-slate-600">
          <span>Last refreshed: {lastRefresh.toLocaleTimeString()}</span>
          <span>Auto-refresh every 30s · Data from /api/projects/*</span>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}
