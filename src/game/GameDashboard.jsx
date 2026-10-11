/* src/game/GameDashboard.jsx
   Created: 2026-10-11
   Game Development & Project Tracking Dashboard
   Supports: Unreal Engine, Epic Games, Sony PlayStation, Microsoft Xbox, Ubisoft Connect
*/

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gamepad2, Monitor, Cpu, Zap, Globe, Trophy, Star, GitBranch,
  Play, Pause, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp,
  TrendingDown, Users, DollarSign, MessageSquare, Package, Layers,
  Box, Eye, Smartphone, Headset, Car, Puzzle, Sword, Target,
  Activity, BarChart3, RefreshCw, Settings, Bell, ChevronRight,
  ChevronDown, Shield, Wifi, WifiOff, Code, Wrench, Upload,
  Download, HardDrive, Cpu as CpuIcon, MemoryStick, Timer,
  Calendar, Flag, Award, Flame, Rocket, Building2
} from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: 'unreal',
    name: 'Unreal Engine',
    version: '5.4.2',
    status: 'connected',
    icon: '⚙️',
    color: 'from-blue-600 to-blue-800',
    borderColor: 'border-blue-500',
    projects: 4,
    lastSync: '2 min ago',
    sdkVersion: 'UE 5.4.2',
    features: ['Nanite', 'Lumen', 'MetaHuman'],
  },
  {
    id: 'epic',
    name: 'Epic Games Store',
    version: '17.2.1',
    status: 'connected',
    icon: '🎮',
    color: 'from-purple-600 to-purple-800',
    borderColor: 'border-purple-500',
    projects: 2,
    lastSync: '5 min ago',
    sdkVersion: 'EGS SDK 1.16.3',
    features: ['Achievements', 'Social Overlay', 'Cross-Play'],
  },
  {
    id: 'playstation',
    name: 'Sony PlayStation',
    version: 'PS5 SDK 10.0',
    status: 'connected',
    icon: '🎯',
    color: 'from-indigo-600 to-blue-700',
    borderColor: 'border-indigo-500',
    projects: 3,
    lastSync: '12 min ago',
    sdkVersion: 'PS5 SDK 10.000.001',
    features: ['DualSense Haptics', 'Trophy System', 'Activity Cards'],
  },
  {
    id: 'xbox',
    name: 'Microsoft Xbox',
    version: 'GDK 2025.5',
    status: 'warning',
    icon: '🟢',
    color: 'from-green-600 to-green-800',
    borderColor: 'border-green-500',
    projects: 2,
    lastSync: '45 min ago',
    sdkVersion: 'GDK 250500.0.0',
    features: ['Xbox Live', 'Smart Delivery', 'Quick Resume'],
  },
  {
    id: 'ubisoft',
    name: 'Ubisoft Connect',
    version: '2.13.4',
    status: 'disconnected',
    icon: '💎',
    color: 'from-orange-600 to-orange-800',
    borderColor: 'border-orange-500',
    projects: 1,
    lastSync: '3 hrs ago',
    sdkVersion: 'Ubisoft Connect SDK 4.5',
    features: ['Uplay', 'Club Challenges', 'Cross-Progression'],
  },
];

const PROJECTS = [
  {
    id: 1,
    name: 'Project Nexus VR',
    type: 'VR',
    genre: 'Action RPG',
    engine: 'Unreal Engine 5.4',
    platform: ['PC', 'VR', 'PS5'],
    progress: 72,
    status: 'In Development',
    statusColor: 'text-blue-400',
    team: 18,
    dueDate: '2027-Q1',
    milestone: 'Alpha Build',
    milestoneProgress: 85,
    buildStatus: 'passing',
    lastBuild: '14 min ago',
    commits: 1247,
    openIssues: 34,
    criticalBugs: 3,
    assets: { total: 4820, complete: 3471, pending: 841, review: 508 },
    description: 'Open-world VR action RPG with procedural environments',
    thumbnail: '🌌',
  },
  {
    id: 2,
    name: 'Velocity Rush AR',
    type: 'AR',
    genre: 'Racing',
    engine: 'Unreal Engine 5.3',
    platform: ['Mobile', 'AR'],
    progress: 48,
    status: 'Pre-Alpha',
    statusColor: 'text-yellow-400',
    team: 9,
    dueDate: '2027-Q3',
    milestone: 'Pre-Alpha Demo',
    milestoneProgress: 48,
    buildStatus: 'failing',
    lastBuild: '2 hrs ago',
    commits: 523,
    openIssues: 67,
    criticalBugs: 8,
    assets: { total: 2100, complete: 1008, pending: 782, review: 310 },
    description: 'Augmented reality racing game using real-world surfaces',
    thumbnail: '🏎️',
  },
  {
    id: 3,
    name: 'Cipher Protocol',
    type: '3D',
    genre: 'FPS',
    engine: 'Unreal Engine 5.4',
    platform: ['PC', 'PS5', 'XSX'],
    progress: 91,
    status: 'Beta',
    statusColor: 'text-green-400',
    team: 32,
    dueDate: '2026-Q4',
    milestone: 'Gold Master',
    milestoneProgress: 91,
    buildStatus: 'passing',
    lastBuild: '3 min ago',
    commits: 8843,
    openIssues: 12,
    criticalBugs: 0,
    assets: { total: 11200, complete: 10208, pending: 612, review: 380 },
    description: 'Tactical first-person shooter with co-op campaign',
    thumbnail: '🔫',
  },
  {
    id: 4,
    name: 'Mindscape Puzzle',
    type: '3D',
    genre: 'Puzzle',
    engine: 'Unreal Engine 5.2',
    platform: ['Mobile', 'PC', 'Console'],
    progress: 35,
    status: 'Concept',
    statusColor: 'text-orange-400',
    team: 6,
    dueDate: '2027-Q4',
    milestone: 'Vertical Slice',
    milestoneProgress: 35,
    buildStatus: 'passing',
    lastBuild: '1 day ago',
    commits: 187,
    openIssues: 21,
    criticalBugs: 1,
    assets: { total: 900, complete: 315, pending: 412, review: 173 },
    description: 'Narrative-driven 3D puzzle game with dynamic environments',
    thumbnail: '🧩',
  },
  {
    id: 5,
    name: 'Shadow Realm Online',
    type: '3D',
    genre: 'RPG',
    engine: 'Unreal Engine 5.4',
    platform: ['PC', 'PS5', 'XSX', 'Mobile'],
    progress: 60,
    status: 'In Development',
    statusColor: 'text-blue-400',
    team: 45,
    dueDate: '2027-Q2',
    milestone: 'Closed Beta',
    milestoneProgress: 60,
    buildStatus: 'passing',
    lastBuild: '28 min ago',
    commits: 4512,
    openIssues: 89,
    criticalBugs: 5,
    assets: { total: 18700, complete: 11220, pending: 4960, review: 2520 },
    description: 'Massively multiplayer online RPG with dynamic world events',
    thumbnail: '⚔️',
  },
];

const ACHIEVEMENTS = [
  { id: 1, name: 'First Commit', description: 'Push initial project commit', unlocked: true, rarity: 'Common', icon: '🌱', xp: 50 },
  { id: 2, name: 'Alpha Release', description: 'Ship first alpha build to QA', unlocked: true, rarity: 'Uncommon', icon: '🧪', xp: 150 },
  { id: 3, name: 'Bug Crusher', description: 'Close 100 critical bugs', unlocked: true, rarity: 'Rare', icon: '🐛', xp: 300 },
  { id: 4, name: 'Multi-Platform', description: 'Simultaneously target 3+ platforms', unlocked: true, rarity: 'Rare', icon: '🌐', xp: 400 },
  { id: 5, name: 'Console Master', description: 'Pass certification on all consoles', unlocked: false, rarity: 'Epic', icon: '🏆', xp: 750, progress: 67 },
  { id: 6, name: 'VR Pioneer', description: 'Ship a VR title to market', unlocked: false, rarity: 'Epic', icon: '🥽', xp: 800, progress: 72 },
  { id: 7, name: 'Million Players', description: 'Reach 1M concurrent players', unlocked: false, rarity: 'Legendary', icon: '💫', xp: 2000, progress: 23 },
  { id: 8, name: 'Gold Master', description: 'Submit gold master build', unlocked: false, rarity: 'Legendary', icon: '🥇', xp: 2500, progress: 91 },
];

const BUILD_PIPELINE = [
  {
    id: 1,
    project: 'Cipher Protocol',
    branch: 'main',
    stage: 'Deploy',
    status: 'success',
    duration: '18m 43s',
    trigger: 'push',
    commit: 'a3f7b91',
    message: 'Fix PS5 haptic feedback timing',
    author: 'dev_team',
    timestamp: '14 min ago',
    stages: [
      { name: 'Checkout', status: 'success', time: '12s' },
      { name: 'Compile', status: 'success', time: '8m 24s' },
      { name: 'Shader Cook', status: 'success', time: '4m 11s' },
      { name: 'Package', status: 'success', time: '3m 18s' },
      { name: 'Test', status: 'success', time: '2m 38s' },
      { name: 'Deploy', status: 'success', time: '0s' },
    ],
  },
  {
    id: 2,
    project: 'Shadow Realm Online',
    branch: 'dev/multiplayer',
    stage: 'Compile',
    status: 'running',
    duration: '6m 12s',
    trigger: 'schedule',
    commit: 'c9d2e45',
    message: 'Add dynamic weather system',
    author: 'engine_team',
    timestamp: '6 min ago',
    stages: [
      { name: 'Checkout', status: 'success', time: '15s' },
      { name: 'Compile', status: 'running', time: '6m+' },
      { name: 'Shader Cook', status: 'pending', time: '--' },
      { name: 'Package', status: 'pending', time: '--' },
      { name: 'Test', status: 'pending', time: '--' },
      { name: 'Deploy', status: 'pending', time: '--' },
    ],
  },
  {
    id: 3,
    project: 'Velocity Rush AR',
    branch: 'feature/ar-tracking',
    stage: 'Package',
    status: 'failed',
    duration: '14m 07s',
    trigger: 'pr',
    commit: 'e1b8f33',
    message: 'Improve AR plane detection',
    author: 'ar_team',
    timestamp: '2 hrs ago',
    stages: [
      { name: 'Checkout', status: 'success', time: '11s' },
      { name: 'Compile', status: 'success', time: '7m 52s' },
      { name: 'Shader Cook', status: 'success', time: '3m 49s' },
      { name: 'Package', status: 'failed', time: '2m 15s' },
      { name: 'Test', status: 'skipped', time: '--' },
      { name: 'Deploy', status: 'skipped', time: '--' },
    ],
  },
];

const ARVR_METRICS = {
  vr: {
    frameRate: 91,
    targetFrameRate: 90,
    motionToPhoton: 18,
    targetMTP: 20,
    renderResolution: '2880x3096',
    eyeTracking: true,
    handTracking: true,
    spaceCalibration: 'Configured',
    headsets: ['Meta Quest 3', 'PS VR2', 'Valve Index'],
    comfortScore: 88,
    immersionScore: 94,
  },
  ar: {
    trackingAccuracy: 97.3,
    planeDetection: 'Active',
    lightEstimation: 'Enabled',
    objectRecognition: 142,
    fps: 60,
    latency: 12,
    devices: ['iPhone 16 Pro', 'Samsung Galaxy S25', 'Microsoft HoloLens 2'],
    occlusionSupport: true,
    persistentWorldAnchors: 318,
  },
  '3d': {
    polyCount: '4.2M avg',
    drawCalls: 847,
    gpuMemory: '8.4 GB',
    cpuTime: '3.2ms',
    gpuTime: '8.7ms',
    shadowQuality: 'Ultra',
    reflections: 'Ray Traced',
    globalIllumination: 'Lumen',
  },
};

const ANALYTICS = [
  {
    id: 1,
    project: 'Cipher Protocol',
    players: { current: 124800, peak: 387200, change: 12.4 },
    revenue: { total: 4280000, monthly: 312000, change: 8.7 },
    reviews: { score: 92, count: 14820, positive: 13594, negative: 1226 },
    retention: { d1: 74, d7: 52, d30: 38 },
    platforms: { pc: 61, ps5: 28, xbox: 11 },
  },
  {
    id: 2,
    project: 'Shadow Realm Online',
    players: { current: 52100, peak: 98400, change: -3.2 },
    revenue: { total: 1920000, monthly: 87000, change: -5.1 },
    reviews: { score: 79, count: 6240, positive: 4930, negative: 1310 },
    retention: { d1: 81, d7: 61, d30: 44 },
    platforms: { pc: 48, ps5: 32, xbox: 14, mobile: 6 },
  },
];

const SDK_STATUS = [
  { platform: 'Unreal Engine', sdk: 'UE 5.4.2', status: 'active', lastCheck: '2 min ago', certExpiry: '2027-12-01', warnings: 0 },
  { platform: 'Epic Games Store', sdk: 'EGS SDK 1.16.3', status: 'active', lastCheck: '5 min ago', certExpiry: '2027-08-15', warnings: 0 },
  { platform: 'PlayStation 5', sdk: 'PS5 SDK 10.0', status: 'active', lastCheck: '12 min ago', certExpiry: '2027-06-30', warnings: 1 },
  { platform: 'Xbox Series', sdk: 'GDK 2025.5', status: 'warning', lastCheck: '45 min ago', certExpiry: '2026-11-20', warnings: 2 },
  { platform: 'Ubisoft Connect', sdk: 'UC SDK 4.5', status: 'inactive', lastCheck: '3 hrs ago', certExpiry: '2026-12-31', warnings: 3 },
  { platform: 'Steam', sdk: 'Steamworks 1.60', status: 'active', lastCheck: '1 min ago', certExpiry: '2028-01-15', warnings: 0 },
  { platform: 'iOS / Apple', sdk: 'iOS 18 SDK', status: 'active', lastCheck: '8 min ago', certExpiry: '2027-09-01', warnings: 0 },
  { platform: 'Android', sdk: 'Android NDK r27', status: 'active', lastCheck: '8 min ago', certExpiry: '2028-03-01', warnings: 0 },
];

const RECENT_ACTIVITY = [
  { id: 1, type: 'commit', project: 'Cipher Protocol', message: 'Fix PS5 haptic feedback edge case on DualSense controller', author: 'J. Rivera', time: '14 min', hash: 'a3f7b91', branch: 'main', icon: GitBranch, color: 'text-green-400' },
  { id: 2, type: 'build', project: 'Shadow Realm Online', message: 'Build #2841 started on dev/multiplayer', author: 'CI/CD', time: '6 min', hash: 'c9d2e45', branch: 'dev/multiplayer', icon: Cpu, color: 'text-blue-400' },
  { id: 3, type: 'achievement', project: 'Cipher Protocol', message: 'Achievement unlocked: "Console Master" — PS5 cert passed!', author: 'System', time: '1 hr', hash: '', branch: '', icon: Trophy, color: 'text-yellow-400' },
  { id: 4, type: 'commit', project: 'Project Nexus VR', message: 'Optimize Lumen GI for VR rendering pipeline', author: 'M. Chen', time: '1 hr', hash: 'd9a1c23', branch: 'feature/vr-lumen', icon: GitBranch, color: 'text-green-400' },
  { id: 5, type: 'build', project: 'Velocity Rush AR', message: 'Build #341 failed on feature/ar-tracking — package error', author: 'CI/CD', time: '2 hrs', hash: 'e1b8f33', branch: 'feature/ar-tracking', icon: XCircle, color: 'text-red-400' },
  { id: 6, type: 'commit', project: 'Shadow Realm Online', message: 'Add procedural weather system with dynamic lighting', author: 'K. Patel', time: '3 hrs', hash: 'b4f2d78', branch: 'dev/multiplayer', icon: GitBranch, color: 'text-green-400' },
  { id: 7, type: 'release', project: 'Cipher Protocol', message: 'Beta build 0.9.41 distributed to QA teams', author: 'Release Mgr', time: '5 hrs', hash: '', branch: 'beta', icon: Rocket, color: 'text-purple-400' },
  { id: 8, type: 'commit', project: 'Mindscape Puzzle', message: 'Implement dynamic puzzle generation algorithm v2', author: 'A. Torres', time: '8 hrs', hash: 'f7c9e12', branch: 'main', icon: GitBranch, color: 'text-green-400' },
];

const TEMPLATES = [
  { id: 'fps', name: 'FPS Template', icon: Target, color: 'from-red-600 to-red-800', description: 'Tactical shooter with multiplayer' },
  { id: 'rpg', name: 'RPG Template', icon: Sword, color: 'from-purple-600 to-purple-800', description: 'Open world RPG starter' },
  { id: 'racing', name: 'Racing Template', icon: Car, color: 'from-yellow-600 to-yellow-800', description: 'High-speed racing with physics' },
  { id: 'puzzle', name: 'Puzzle Template', icon: Puzzle, color: 'from-cyan-600 to-cyan-800', description: 'Narrative puzzle mechanics' },
  { id: 'vr', name: 'VR Template', icon: Headset, color: 'from-indigo-600 to-indigo-800', description: 'VR-first interaction systems' },
  { id: 'ar', name: 'AR Template', icon: Eye, color: 'from-green-600 to-green-800', description: 'ARKit/ARCore foundation' },
];

// ─── Helper Components ────────────────────────────────────────────────────────

const StatusDot = ({ status }) => {
  const colors = {
    connected: 'bg-green-400',
    active: 'bg-green-400',
    warning: 'bg-yellow-400',
    disconnected: 'bg-red-400',
    inactive: 'bg-red-400',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || 'bg-gray-400'}`} />
  );
};

const ProgressBar = ({ value, max = 100, color = 'bg-blue-500', height = 'h-2' }) => (
  <div className={`w-full bg-gray-700 rounded-full ${height} overflow-hidden`}>
    <div
      className={`${color} ${height} rounded-full transition-all duration-700`}
      style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
    />
  </div>
);

const PipelineStageIcon = ({ status }) => {
  if (status === 'success') return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (status === 'running') return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
  if (status === 'failed') return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === 'pending') return <Clock className="w-4 h-4 text-gray-500" />;
  if (status === 'skipped') return <AlertCircle className="w-4 h-4 text-gray-600" />;
  return null;
};

const SectionHeader = ({ title, icon: Icon, count, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-indigo-400" />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {count !== undefined && (
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
    {action && (
      <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
        {action} <ChevronRight className="w-3 h-3" />
      </button>
    )}
  </div>
);

// ─── Section: Platform Connector Cards ───────────────────────────────────────

const PlatformConnectors = () => {
  const [connecting, setConnecting] = useState(null);

  const handleConnect = useCallback((id) => {
    setConnecting(id);
    setTimeout(() => setConnecting(null), 2000);
  }, []);

  return (
    <section>
      <SectionHeader title="Platform Connectors" icon={Globe} count={PLATFORMS.length} action="Manage SDKs" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {PLATFORMS.map((p) => (
          <div
            key={p.id}
            className={`relative bg-gray-800 border ${p.borderColor} rounded-xl p-4 flex flex-col gap-3 hover:bg-gray-750 transition-all`}
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl">{p.icon}</span>
              <div className="flex items-center gap-1.5">
                <StatusDot status={p.status} />
                <span className={`text-xs capitalize ${
                  p.status === 'connected' ? 'text-green-400' :
                  p.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                }`}>{p.status}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{p.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.sdkVersion}</p>
            </div>
            <div className="space-y-1 flex-1">
              <p className="text-xs text-gray-500">Projects: <span className="text-gray-300">{p.projects}</span></p>
              <p className="text-xs text-gray-500">Sync: <span className="text-gray-300">{p.lastSync}</span></p>
            </div>
            <div className="flex flex-wrap gap-1">
              {p.features.slice(0, 2).map((f) => (
                <span key={f} className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{f}</span>
              ))}
            </div>
            <button
              onClick={() => handleConnect(p.id)}
              disabled={connecting === p.id}
              className={`w-full text-xs py-1.5 rounded-lg font-medium transition-all ${
                p.status === 'connected'
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : p.status === 'warning'
                  ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
              } ${connecting === p.id ? 'opacity-50 cursor-wait' : ''}`}
            >
              {connecting === p.id ? 'Connecting...' : p.status === 'connected' ? 'Configure' : p.status === 'warning' ? 'Re-auth' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

// ─── Section: Active Projects Grid ───────────────────────────────────────────

const ProjectsGrid = () => {
  const [expandedProject, setExpandedProject] = useState(null);
  const [filter, setFilter] = useState('all');

  const typeFilters = ['all', 'VR', 'AR', '3D'];
  const filtered = filter === 'all' ? PROJECTS : PROJECTS.filter((p) => p.type === filter);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">Active Projects</h2>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{PROJECTS.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {typeFilters.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-xs px-3 py-1 rounded-lg transition-all ${
                filter === t ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((project) => (
          <div key={project.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{project.thumbnail}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{project.name}</h3>
                      <p className="text-xs text-gray-400">{project.genre} · {project.engine}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gray-700 ${project.statusColor} whitespace-nowrap`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{project.description}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Overall Progress</span>
                  <span className="text-white font-medium">{project.progress}%</span>
                </div>
                <ProgressBar value={project.progress} color="bg-indigo-500" />
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-center">
                <div className="bg-gray-700/60 rounded-lg p-2">
                  <p className="text-gray-400">Team</p>
                  <p className="text-white font-semibold">{project.team}</p>
                </div>
                <div className="bg-gray-700/60 rounded-lg p-2">
                  <p className="text-gray-400">Commits</p>
                  <p className="text-white font-semibold">{project.commits.toLocaleString()}</p>
                </div>
                <div className="bg-gray-700/60 rounded-lg p-2">
                  <p className="text-gray-400">Issues</p>
                  <p className={`font-semibold ${project.openIssues > 50 ? 'text-red-400' : 'text-white'}`}>{project.openIssues}</p>
                </div>
                <div className="bg-gray-700/60 rounded-lg p-2">
                  <p className="text-gray-400">Critical</p>
                  <p className={`font-semibold ${project.criticalBugs > 0 ? 'text-red-400' : 'text-green-400'}`}>{project.criticalBugs}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {project.platform.map((plat) => (
                  <span key={plat} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    {plat === 'VR' && <Headset className="w-2.5 h-2.5" />}
                    {plat === 'AR' && <Eye className="w-2.5 h-2.5" />}
                    {plat === 'Mobile' && <Smartphone className="w-2.5 h-2.5" />}
                    {plat === 'PC' && <Monitor className="w-2.5 h-2.5" />}
                    {(plat === 'PS5' || plat === 'XSX' || plat === 'Console') && <Gamepad2 className="w-2.5 h-2.5" />}
                    {plat}
                  </span>
                ))}
                <span className={`ml-auto text-xs flex items-center gap-1 ${
                  project.buildStatus === 'passing' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {project.buildStatus === 'passing' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  Build {project.buildStatus}
                </span>
              </div>
            </div>

            <button
              onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
              className="w-full px-4 py-2 bg-gray-700/40 hover:bg-gray-700/70 text-xs text-gray-400 flex items-center justify-between transition-colors"
            >
              <span>Asset pipeline · {project.assets.complete}/{project.assets.total} complete</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedProject === project.id ? 'rotate-180' : ''}`} />
            </button>

            {expandedProject === project.id && (
              <div className="p-4 bg-gray-900/50 border-t border-gray-700">
                <p className="text-xs text-gray-400 mb-3 font-medium">Asset Management</p>
                <div className="grid grid-cols-3 gap-2 mb-3 text-xs text-center">
                  <div className="bg-green-900/30 rounded-lg p-2 border border-green-800/30">
                    <p className="text-green-400 font-semibold">{project.assets.complete.toLocaleString()}</p>
                    <p className="text-gray-500">Complete</p>
                  </div>
                  <div className="bg-yellow-900/30 rounded-lg p-2 border border-yellow-800/30">
                    <p className="text-yellow-400 font-semibold">{project.assets.review.toLocaleString()}</p>
                    <p className="text-gray-500">In Review</p>
                  </div>
                  <div className="bg-gray-700/50 rounded-lg p-2">
                    <p className="text-gray-300 font-semibold">{project.assets.pending.toLocaleString()}</p>
                    <p className="text-gray-500">Pending</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Completion</span>
                    <span>{Math.round((project.assets.complete / project.assets.total) * 100)}%</span>
                  </div>
                  <ProgressBar
                    value={project.assets.complete}
                    max={project.assets.total}
                    color="bg-green-500"
                    height="h-1.5"
                  />
                </div>
                <div className="mt-3 flex justify-between items-center text-xs">
                  <span className="text-gray-500">Milestone: <span className="text-gray-300">{project.milestone}</span></span>
                  <span className="text-gray-500">Due: <span className="text-gray-300">{project.dueDate}</span></span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

// ─── Section: Achievement System ─────────────────────────────────────────────

const AchievementTracker = () => {
  const rarityColors = {
    Common: 'text-gray-300 border-gray-600',
    Uncommon: 'text-green-400 border-green-700',
    Rare: 'text-blue-400 border-blue-700',
    Epic: 'text-purple-400 border-purple-700',
    Legendary: 'text-yellow-400 border-yellow-700',
  };

  const totalXP = ACHIEVEMENTS.filter((a) => a.unlocked).reduce((sum, a) => sum + a.xp, 0);
  const maxXP = ACHIEVEMENTS.reduce((sum, a) => sum + a.xp, 0);

  return (
    <section>
      <SectionHeader title="Achievement System" icon={Trophy} count={`${ACHIEVEMENTS.filter((a) => a.unlocked).length}/${ACHIEVEMENTS.length}`} action="View All" />
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-white font-medium">Developer XP</span>
          </div>
          <span className="text-sm text-yellow-400 font-bold">{totalXP.toLocaleString()} / {maxXP.toLocaleString()} XP</span>
        </div>
        <ProgressBar value={totalXP} max={maxXP} color="bg-gradient-to-r from-yellow-500 to-yellow-400" height="h-3" />
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Level 12 — Senior Game Dev</span>
          <span>{maxXP - totalXP} XP to Level 13</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACHIEVEMENTS.map((ach) => (
          <div
            key={ach.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              ach.unlocked
                ? 'bg-gray-800 border-gray-600 opacity-100'
                : 'bg-gray-800/50 border-gray-700/50 opacity-70'
            }`}
          >
            <span className={`text-2xl ${!ach.unlocked ? 'grayscale opacity-40' : ''}`}>{ach.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`text-xs font-semibold ${ach.unlocked ? 'text-white' : 'text-gray-500'}`}>{ach.name}</p>
                <span className={`text-xs border px-1.5 py-0.5 rounded-full ${rarityColors[ach.rarity]}`}>{ach.rarity}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{ach.description}</p>
              {!ach.unlocked && ach.progress !== undefined && (
                <div className="mt-1.5 space-y-0.5">
                  <ProgressBar value={ach.progress} color="bg-indigo-500" height="h-1" />
                  <p className="text-xs text-gray-600">{ach.progress}% complete</p>
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className={`text-xs font-bold ${ach.unlocked ? 'text-yellow-400' : 'text-gray-600'}`}>+{ach.xp}</p>
              <p className="text-xs text-gray-600">XP</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

// ─── Section: Build Pipeline ──────────────────────────────────────────────────

const BuildPipeline = () => (
  <section>
    <SectionHeader title="Build Pipeline" icon={Cpu} count={BUILD_PIPELINE.length} action="View CI/CD" />
    <div className="space-y-3">
      {BUILD_PIPELINE.map((build) => (
        <div key={build.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white">{build.project}</span>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded font-mono">{build.branch}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  build.status === 'success' ? 'bg-green-900/50 text-green-400' :
                  build.status === 'running' ? 'bg-blue-900/50 text-blue-400' :
                  'bg-red-900/50 text-red-400'
                }`}>
                  {build.status === 'running' ? '● Running' : build.status === 'success' ? '✓ Passed' : '✗ Failed'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 truncate">{build.message}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="font-mono text-gray-400">{build.commit}</span> · {build.author} · {build.time}
              </p>
            </div>
            <div className="text-right text-xs shrink-0">
              <p className="text-gray-400">Duration</p>
              <p className="text-white font-mono">{build.duration}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {build.stages.map((stage, idx) => (
              <React.Fragment key={stage.name}>
                <div className="flex items-center gap-1">
                  <PipelineStageIcon status={stage.status} />
                  <span className={`text-xs ${
                    stage.status === 'success' ? 'text-green-400' :
                    stage.status === 'running' ? 'text-blue-400' :
                    stage.status === 'failed' ? 'text-red-400' :
                    'text-gray-600'
                  }`}>{stage.name}</span>
                  {stage.time !== '--' && <span className="text-xs text-gray-600 font-mono">({stage.time})</span>}
                </div>
                {idx < build.stages.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ─── Section: AR/VR/3D Metrics ────────────────────────────────────────────────

const ARVRMetrics = () => {
  const [activeTab, setActiveTab] = useState('vr');

  return (
    <section>
      <SectionHeader title="AR / VR / 3D Metrics" icon={Headset} action="Full Report" />
      <div className="flex gap-2 mb-4">
        {['vr', 'ar', '3d'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all uppercase ${
              activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'vr' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Frame Rate', value: `${ARVR_METRICS.vr.frameRate} fps`, target: `target: ${ARVR_METRICS.vr.targetFrameRate}`, ok: ARVR_METRICS.vr.frameRate >= ARVR_METRICS.vr.targetFrameRate },
            { label: 'Motion-to-Photon', value: `${ARVR_METRICS.vr.motionToPhoton}ms`, target: `max: ${ARVR_METRICS.vr.targetMTP}ms`, ok: ARVR_METRICS.vr.motionToPhoton <= ARVR_METRICS.vr.targetMTP },
            { label: 'Render Resolution', value: ARVR_METRICS.vr.renderResolution, target: 'per eye', ok: true },
            { label: 'Comfort Score', value: `${ARVR_METRICS.vr.comfortScore}/100`, target: 'VR SIG standard', ok: ARVR_METRICS.vr.comfortScore >= 80 },
            { label: 'Immersion Score', value: `${ARVR_METRICS.vr.immersionScore}/100`, target: 'internal metric', ok: true },
            { label: 'Eye Tracking', value: ARVR_METRICS.vr.eyeTracking ? 'Enabled' : 'Disabled', target: 'foveated rendering', ok: ARVR_METRICS.vr.eyeTracking },
          ].map((m) => (
            <div key={m.label} className="bg-gray-800 border border-gray-700 rounded-xl p-3">
              <div className="flex justify-between items-start">
                <p className="text-xs text-gray-400">{m.label}</p>
                <span className={`w-2 h-2 rounded-full mt-0.5 ${m.ok ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>
              <p className="text-base font-bold text-white mt-1">{m.value}</p>
              <p className="text-xs text-gray-500">{m.target}</p>
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-3 bg-gray-800 border border-gray-700 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-2">Supported Headsets</p>
            <div className="flex flex-wrap gap-2">
              {ARVR_METRICS.vr.headsets.map((h) => (
                <span key={h} className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 px-2 py-1 rounded-full">{h}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ar' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: 'Tracking Accuracy', value: `${ARVR_METRICS.ar.trackingAccuracy}%`, ok: true },
            { label: 'Frame Rate', value: `${ARVR_METRICS.ar.fps} fps`, ok: ARVR_METRICS.ar.fps >= 60 },
            { label: 'Input Latency', value: `${ARVR_METRICS.ar.latency}ms`, ok: ARVR_METRICS.ar.latency < 20 },
            { label: 'Object Recognition', value: `${ARVR_METRICS.ar.objectRecognition} types`, ok: true },
            { label: 'World Anchors', value: ARVR_METRICS.ar.persistentWorldAnchors.toLocaleString(), ok: true },
            { label: 'Occlusion', value: ARVR_METRICS.ar.occlusionSupport ? 'Supported' : 'Not Supported', ok: ARVR_METRICS.ar.occlusionSupport },
          ].map((m) => (
            <div key={m.label} className="bg-gray-800 border border-gray-700 rounded-xl p-3">
              <div className="flex justify-between items-start">
                <p className="text-xs text-gray-400">{m.label}</p>
                <span className={`w-2 h-2 rounded-full mt-0.5 ${m.ok ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>
              <p className="text-base font-bold text-white mt-1">{m.value}</p>
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-3 bg-gray-800 border border-gray-700 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-2">Tested Devices</p>
            <div className="flex flex-wrap gap-2">
              {ARVR_METRICS.ar.devices.map((d) => (
                <span key={d} className="text-xs bg-green-900/50 text-green-300 border border-green-700/50 px-2 py-1 rounded-full">{d}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === '3d' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(ARVR_METRICS['3d']).map(([key, val]) => (
            <div key={key} className="bg-gray-800 border border-gray-700 rounded-xl p-3">
              <p className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              <p className="text-base font-bold text-white mt-1">{val}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// ─── Section: Game Analytics ──────────────────────────────────────────────────

const GameAnalytics = () => (
  <section>
    <SectionHeader title="Game Analytics" icon={BarChart3} action="Open Analytics" />
    <div className="space-y-4">
      {ANALYTICS.map((game) => (
        <div key={game.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">{game.project}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gray-700/40 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-gray-400">Players Now</span>
              </div>
              <p className="text-lg font-bold text-white">{game.players.current.toLocaleString()}</p>
              <div className={`flex items-center gap-1 text-xs mt-0.5 ${game.players.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {game.players.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(game.players.change)}%
              </div>
            </div>
            <div className="bg-gray-700/40 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-gray-400">Revenue</span>
              </div>
              <p className="text-lg font-bold text-white">${(game.revenue.monthly / 1000).toFixed(0)}K/mo</p>
              <div className={`flex items-center gap-1 text-xs mt-0.5 ${game.revenue.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {game.revenue.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(game.revenue.change)}%
              </div>
            </div>
            <div className="bg-gray-700/40 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs text-gray-400">Review Score</span>
              </div>
              <p className="text-lg font-bold text-white">{game.reviews.score}%</p>
              <p className="text-xs text-gray-500 mt-0.5">{game.reviews.count.toLocaleString()} reviews</p>
            </div>
            <div className="bg-gray-700/40 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs text-gray-400">Peak Players</span>
              </div>
              <p className="text-lg font-bold text-white">{game.players.peak.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">all-time high</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-2">D1 / D7 / D30 Retention</p>
            <div className="flex gap-3">
              {[
                { label: 'Day 1', value: game.retention.d1, color: 'bg-green-500' },
                { label: 'Day 7', value: game.retention.d7, color: 'bg-blue-500' },
                { label: 'Day 30', value: game.retention.d30, color: 'bg-purple-500' },
              ].map((r) => (
                <div key={r.label} className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{r.label}</span>
                    <span className="text-gray-300">{r.value}%</span>
                  </div>
                  <ProgressBar value={r.value} color={r.color} height="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

// ─── Section: SDK Integration Status ─────────────────────────────────────────

const SDKStatus = () => (
  <section>
    <SectionHeader title="SDK Integration Status" icon={Shield} count={SDK_STATUS.length} action="Manage SDKs" />
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-900/50">
            <th className="text-left text-gray-400 px-4 py-2.5 font-medium">Platform</th>
            <th className="text-left text-gray-400 px-4 py-2.5 font-medium hidden sm:table-cell">SDK Version</th>
            <th className="text-left text-gray-400 px-4 py-2.5 font-medium">Status</th>
            <th className="text-left text-gray-400 px-4 py-2.5 font-medium hidden md:table-cell">Cert Expiry</th>
            <th className="text-left text-gray-400 px-4 py-2.5 font-medium hidden lg:table-cell">Last Check</th>
            <th className="text-center text-gray-400 px-4 py-2.5 font-medium">Warnings</th>
          </tr>
        </thead>
        <tbody>
          {SDK_STATUS.map((sdk, idx) => (
            <tr key={sdk.platform} className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-800/30'}`}>
              <td className="px-4 py-3 text-white font-medium">{sdk.platform}</td>
              <td className="px-4 py-3 text-gray-400 font-mono hidden sm:table-cell">{sdk.sdk}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <StatusDot status={sdk.status} />
                  <span className={`capitalize ${
                    sdk.status === 'active' ? 'text-green-400' :
                    sdk.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                  }`}>{sdk.status}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{sdk.certExpiry}</td>
              <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{sdk.lastCheck}</td>
              <td className="px-4 py-3 text-center">
                {sdk.warnings > 0 ? (
                  <span className="bg-yellow-900/50 text-yellow-400 border border-yellow-700/50 px-2 py-0.5 rounded-full font-medium">{sdk.warnings}</span>
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

// ─── Section: Recent Activity Feed ───────────────────────────────────────────

const RecentActivity = () => (
  <section>
    <SectionHeader title="Recent Activity" icon={Activity} count={RECENT_ACTIVITY.length} action="View All" />
    <div className="bg-gray-800 border border-gray-700 rounded-xl divide-y divide-gray-700/50">
      {RECENT_ACTIVITY.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="flex items-start gap-3 p-3 hover:bg-gray-700/30 transition-colors">
            <div className={`mt-0.5 p-1.5 rounded-lg bg-gray-700/60 ${item.color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-white truncate">{item.project}</p>
                <span className="text-xs text-gray-500 shrink-0">{item.time} ago</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.message}</p>
              <div className="flex items-center gap-2 mt-1">
                {item.hash && (
                  <span className="text-xs font-mono text-indigo-400">{item.hash}</span>
                )}
                {item.branch && (
                  <span className="text-xs text-gray-500 flex items-center gap-0.5">
                    <GitBranch className="w-2.5 h-2.5" />{item.branch}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </section>
);

// ─── Section: Game Dev Templates ─────────────────────────────────────────────

const GameTemplates = () => {
  const [selected, setSelected] = useState(null);
  return (
    <section>
      <SectionHeader title="Project Templates" icon={Package} action="Browse All" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon;
          return (
            <button
              key={tmpl.id}
              onClick={() => setSelected(selected === tmpl.id ? null : tmpl.id)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                selected === tmpl.id
                  ? 'border-indigo-500 bg-indigo-900/20'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-500 hover:bg-gray-750'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tmpl.color} flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-medium text-white text-center leading-tight">{tmpl.name}</p>
              <p className="text-xs text-gray-500 text-center leading-tight">{tmpl.description}</p>
              {selected === tmpl.id && (
                <span className="text-xs text-indigo-400 font-medium">Use Template →</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

// ─── Top Stats Bar ────────────────────────────────────────────────────────────

const StatsBar = () => {
  const totalProjects = PROJECTS.length;
  const activeBuilds = BUILD_PIPELINE.filter((b) => b.status === 'running').length;
  const failedBuilds = BUILD_PIPELINE.filter((b) => b.status === 'failed').length;
  const connectedPlatforms = PLATFORMS.filter((p) => p.status === 'connected').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Active Projects', value: totalProjects, icon: Layers, color: 'text-blue-400', bg: 'bg-blue-900/20 border-blue-700/30' },
        { label: 'Platforms', value: `${connectedPlatforms}/${PLATFORMS.length}`, icon: Globe, color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/30' },
        { label: 'Active Builds', value: activeBuilds, icon: RefreshCw, color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-700/30' },
        { label: 'Failed Builds', value: failedBuilds, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/30' },
      ].map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className={`border rounded-xl p-3 flex items-center gap-3 ${stat.bg}`}>
            <Icon className={`w-5 h-5 ${stat.color} shrink-0`} />
            <div>
              <p className="text-xs text-gray-400">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export default function GameDashboard() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [activeNav, setActiveNav] = useState('overview');

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setLastRefresh(new Date());
      setRefreshing(false);
    }, 1200);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'projects', label: 'Projects', icon: Layers },
    { id: 'builds', label: 'Builds', icon: Cpu },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'platforms', label: 'Platforms', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg flex items-center justify-center shrink-0">
                <Gamepad2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">Nexus AI Pro</h1>
                <p className="text-xs text-gray-400 hidden sm:block">Game Dev Dashboard</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      activeNav === item.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <button className="relative p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                <Bell className="w-4 h-4 text-gray-300" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                <Settings className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Mobile Nav */}
          <nav className="flex md:hidden items-center gap-1 mt-2 overflow-x-auto pb-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                    activeNav === item.id ? 'bg-indigo-600 text-white' : 'text-gray-400 bg-gray-800'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Last refresh notice */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Game Development Hub</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Last refreshed: {lastRefresh.toLocaleTimeString()} ·
              5 platforms · {PROJECTS.length} projects · {BUILD_PIPELINE.length} recent builds
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-400">Oct 11, 2026</span>
          </div>
        </div>

        <StatsBar />
        <PlatformConnectors />
        <ProjectsGrid />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <BuildPipeline />
          <AchievementTracker />
        </div>

        <ARVRMetrics />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
            <GameAnalytics />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>

        <SDKStatus />
        <GameTemplates />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900 mt-8 py-4 px-6 text-center">
        <p className="text-xs text-gray-600">
          Nexus AI Pro · Game Development Dashboard · No API tokens stored client-side
        </p>
      </footer>
    </div>
  );
}
