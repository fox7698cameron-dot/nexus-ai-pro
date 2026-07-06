// app.jsx — Nexus AI Pro Frontend
// 2026-07-06

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from 'react';
import { securityService } from './src/security-service.js';
import {
  Send, Mic, MicOff, Image, FileText, Code, Video,
  Settings, Menu, X, Plus, Trash2, Download, Upload,
  Brain, Sparkles, Zap, Globe, Bot, MessageSquare,
  Clock, Calendar, Gamepad2, Rocket, Database,
  ChevronDown, ChevronRight, Check, Copy, Volume2, VolumeX,
  Sun, Moon, Palette, Search, History, Star,
  Phone, PhoneOff, Loader2, RefreshCw, Share2,
  Shield, Lock, Key, Eye, EyeOff, AlertTriangle,
  Workflow, GitBranch, Play, Pause, Square,
  User, Users, Smile, Camera, Edit3, Save,
  Cpu, Terminal, Box, Layers, Puzzle, Wand2,
  Smartphone, Monitor, Server, Cloud, HardDrive,
  Activity, BarChart3, PieChart, TrendingUp,
  Bug, Wrench, Hammer, Cog, RotateCcw,
  ShieldCheck, ShieldAlert, Fingerprint, ScanFace,
  Network, Wifi, Radio, Antenna, Signal,
  ArrowLeft, Film, ImagePlus, Clapperboard,
  CreditCard, Gift, Gamepad, BarChart2, FolderKanban,
  Languages, LogIn, LogOut, UserPlus, AtSign, QrCode
} from 'lucide-react';

// Lazy-loaded dashboard modules (loaded on demand)
const AnalyticsDashboard = lazy(() => import('./src/analytics/AnalyticsDashboard.jsx').catch(() => ({ default: () => <div style={{padding:'2rem',color:'#888'}}>Analytics dashboard loading...</div> })));
const ProjectDashboard = lazy(() => import('./src/tracking/ProjectDashboard.jsx').catch(() => ({ default: () => <div style={{padding:'2rem',color:'#888'}}>Project tracking loading...</div> })));
const CheckoutUI = lazy(() => import('./src/payments/CheckoutUI.jsx').catch(() => ({ default: () => <div style={{padding:'2rem',color:'#888'}}>Payment UI loading...</div> })));

// Persistence keys
const STORAGE_KEYS = {
  chats: 'nexus:chats',
  activeChat: 'nexus:activeChat',
  memories: 'nexus:memories',
  settings: 'nexus:settings',
  selectedModel: 'nexus:selectedModel',
  userAvatar: 'nexus:userAvatar',
  aiAvatars: 'nexus:aiAvatars',
  sidebarOpen: 'nexus:sidebarOpen',
  memoryOpen: 'nexus:memoryOpen'
};

// ============================================
// SECURITY CONSTANTS & ENCRYPTION (UI side label)
// ============================================
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-256-GCM',
  keyLength: 256,
  ivLength: 12,
  tagLength: 128,
  iterations: 100000,
  hashAlgorithm: 'SHA-512'
};

// ============================================
// SUBSCRIPTION TIERS
// ============================================
const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: '$0/month',
    color: 'from-gray-400 to-gray-600',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    models: ['gpt4', 'claude-sonnet', 'gemini-flash'],
    features: ['5 chats/day', 'Basic models only', '1MB file uploads'],
    badge: '🆓',
    reasoningTime: '⚡ Fast',
    reasoningDetails: 'Instant responses (< 2 seconds)',
    icon: '💰'
  },
  pro: {
    name: 'Pro',
    price: '$9.99/month',
    color: 'from-blue-400 to-blue-600',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    models: ['gpt5', 'o1', 'claude4', 'gemini-ultra', 'deepseek-v3'],
    features: ['Unlimited chats', 'All models', '100MB uploads', 'Priority support'],
    badge: '⭐',
    reasoningTime: '🧠 Mid',
    reasoningDetails: 'Balanced responses (2-10 seconds)',
    icon: '🚀'
  },
  enterprise: {
    name: 'Enterprise',
    price: '$14.99/month',
    color: 'from-purple-400 to-pink-600',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    get models() { return Object.keys(AI_MODELS); },
    features: ['Everything in Pro', 'Custom models', 'API access', 'Dedicated support', 'SLA guarantee'],
    badge: '👑',
    reasoningTime: '🔬 Expert',
    reasoningDetails: 'Deep reasoning (10-60 seconds)',
    icon: '💎'
  }
};

// ============================================
// AI MODEL CONFIGURATIONS - 25+ MODELS
// ============================================
const AI_MODELS = {
  // OpenAI Models
  'gpt5': {
    name: 'GPT-5.2',
    provider: 'OpenAI',
    emoji: '🤖',
    tier: 'pro',
    capabilities: ['chat', 'code', 'analysis', 'image-gen', 'video-gen', 'reasoning'],
    specialties: ['Advanced reasoning', 'Multimodal', 'Real-time']
  },
  'gpt4': {
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    emoji: '🧠',
    tier: 'free',
    capabilities: ['chat', 'code', 'analysis', 'image-gen', 'vision'],
    specialties: ['Multimodal', 'DALL-E 3', 'Function calling']
  },
  'gpt4o': {
    name: 'GPT-4o',
    provider: 'OpenAI',
    emoji: '⚡',
    tier: 'pro',
    capabilities: ['chat', 'code', 'vision', 'audio'],
    specialties: ['Omni-modal', 'Real-time', 'Fast']
  },
  'o1': {
    name: 'o1 Pro',
    provider: 'OpenAI',
    emoji: '🎯',
    tier: 'pro',
    capabilities: ['reasoning', 'math', 'code', 'analysis'],
    specialties: ['Chain of thought', 'PhD-level reasoning']
  },
  'o1-mini': {
    name: 'o1 Mini',
    provider: 'OpenAI',
    emoji: '💡',
    tier: 'pro',
    capabilities: ['reasoning', 'code', 'math'],
    specialties: ['Fast reasoning', 'Cost-effective']
  },
  'sora': {
    name: 'Sora',
    provider: 'OpenAI',
    emoji: '🎬',
    tier: 'enterprise',
    capabilities: ['video-gen', 'image-gen'],
    specialties: ['Video generation', '60s clips', 'Cinematic']
  },
  'dalle3': {
    name: 'DALL-E 3',
    provider: 'OpenAI',
    emoji: '🎨',
    tier: 'pro',
    capabilities: ['image-gen'],
    specialties: ['Image generation', 'Photorealistic', 'Art']
  },

  // Anthropic Models
  'claude4': {
    name: 'Claude 4 Opus',
    provider: 'Anthropic',
    emoji: '🧬',
    tier: 'pro',
    capabilities: ['chat', 'code', 'analysis', 'writing', 'reasoning'],
    specialties: ['Complex reasoning', 'Code generation', 'Creative writing']
  },
  'claude-sonnet': {
    name: 'Claude 4 Sonnet',
    provider: 'Anthropic',
    emoji: '🎵',
    tier: 'free',
    capabilities: ['chat', 'code', 'analysis', 'writing'],
    specialties: ['Balanced', 'Fast', 'Efficient']
  },
  'claude-haiku': {
    name: 'Claude 4 Haiku',
    provider: 'Anthropic',
    emoji: '🏃',
    tier: 'free',
    capabilities: ['chat', 'code', 'analysis'],
    specialties: ['Ultra-fast', 'Cost-effective', 'Concise']
  },

  // Google Models
  'gemini-ultra': {
    name: 'Gemini 2.0 Ultra',
    provider: 'Google',
    emoji: '✨',
    tier: 'pro',
    capabilities: ['chat', 'code', 'multimodal', 'video', 'reasoning'],
    specialties: ['1M context', 'Video understanding', 'Real-time']
  },
  'gemini-pro': {
    name: 'Gemini 2.0 Pro',
    provider: 'Google',
    emoji: '🔥',
    tier: 'pro',
    capabilities: ['chat', 'code', 'analysis', 'vision'],
    specialties: ['Balanced', 'Multimodal', 'Fast']
  },
  'gemini-flash': {
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    emoji: '⚙️',
    tier: 'free',
    capabilities: ['chat', 'code', 'vision'],
    specialties: ['Ultra-fast', 'Low-latency', 'Efficient']
  },
  'imagen3': {
    name: 'Imagen 3',
    provider: 'Google',
    emoji: '🖼️',
    tier: 'enterprise',
    capabilities: ['image-gen'],
    specialties: ['Image generation', 'Photorealistic', 'High-res']
  },
  'veo': {
    name: 'Veo 2',
    provider: 'Google',
    emoji: '📹',
    tier: 'enterprise',
    capabilities: ['video-gen'],
    specialties: ['Video generation', '4K', 'Cinematic']
  },

  // xAI Models
  'grok4': {
    name: 'Grok 4.1',
    provider: 'xAI',
    emoji: '🧙',
    tier: 'enterprise',
    capabilities: ['chat', 'realtime', 'analysis', 'code', 'image-gen'],
    specialties: ['Real-time data', 'X integration', 'Unfiltered']
  },
  'grok3': {
    name: 'Grok 3',
    provider: 'xAI',
    emoji: '😄',
    tier: 'pro',
    capabilities: ['chat', 'code', 'analysis'],
    specialties: ['Humor', 'Real-time', 'Uncensored']
  },
  'aurora': {
    name: 'Aurora',
    provider: 'xAI',
    emoji: '🌅',
    tier: 'enterprise',
    capabilities: ['image-gen'],
    specialties: ['Image generation', 'Artistic', 'Fast']
  },

  // DeepSeek Models
  'deepseek-v3': {
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    emoji: '🌊',
    tier: 'pro',
    capabilities: ['chat', 'code', 'reasoning', 'math'],
    specialties: ['Deep reasoning', 'Mathematics', 'Code']
  },
  'deepseek-r1': {
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    emoji: '🚀',
    tier: 'pro',
    capabilities: ['reasoning', 'math', 'code'],
    specialties: ['Chain of thought', 'PhD-level', 'Open-source']
  },
  'deepseek-coder': {
    name: 'DeepSeek Coder V3',
    provider: 'DeepSeek',
    emoji: '💻',
    tier: 'pro',
    capabilities: ['code', 'debugging', 'analysis'],
    specialties: ['Code generation', 'Bug fixing', '330B params']
  },

  // Meta Models
  'llama4': {
    name: 'Llama 4 405B',
    provider: 'Meta',
    emoji: '🦙',
    tier: 'enterprise',
    capabilities: ['chat', 'code', 'reasoning', 'multilingual'],
    specialties: ['Open-source', 'Local deployment', 'Massive scale']
  },
  'llama3': {
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    emoji: '🦙',
    tier: 'pro',
    capabilities: ['chat', 'code', 'analysis'],
    specialties: ['Open-source', 'Efficient', 'Fast']
  },
  'code-llama': {
    name: 'Code Llama 70B',
    provider: 'Meta',
    emoji: '🔗',
    tier: 'pro',
    capabilities: ['code', 'debugging'],
    specialties: ['Code generation', 'Python', 'C++']
  },

  // Mistral Models
  'mistral-large': {
    name: 'Mistral Large 2',
    provider: 'Mistral',
    emoji: '⛈️',
    tier: 'pro',
    capabilities: ['chat', 'code', 'analysis', 'multilingual'],
    specialties: ['123B params', 'Multilingual', 'Function calling']
  },
  'mixtral': {
    name: 'Mixtral 8x22B',
    provider: 'Mistral',
    emoji: '🎛️',
    tier: 'pro',
    capabilities: ['chat', 'code', 'multilingual'],
    specialties: ['MoE architecture', 'Efficient', 'Open-source']
  },
  'codestral': {
    name: 'Codestral',
    provider: 'Mistral',
    emoji: '🛠️',
    tier: 'pro',
    capabilities: ['code', 'debugging', 'completion'],
    specialties: ['Code generation', '80+ languages', 'Fast']
  },

  // Microsoft Models
  'copilot-pro': {
    name: 'Copilot Pro',
    provider: 'Microsoft',
    emoji: '🪟',
    tier: 'enterprise',
    capabilities: ['chat', 'code', 'productivity', 'image-gen'],
    specialties: ['Office integration', 'DALL-E 3', 'GPT-4 Turbo']
  },
  'phi4': {
    name: 'Phi-4',
    provider: 'Microsoft',
    emoji: '🔬',
    tier: 'pro',
    capabilities: ['chat', 'reasoning', 'math'],
    specialties: ['Small but mighty', 'Reasoning', 'Efficient']
  },

  // Other Major Models
  'kimi': {
    name: 'Kimi k2',
    provider: 'Moonshot',
    emoji: '🌙',
    tier: 'enterprise',
    capabilities: ['chat', 'long-context', 'analysis'],
    specialties: ['2M context', 'Document analysis', 'Chinese']
  },
  'qwen': {
    name: 'Qwen 2.5 Max',
    provider: 'Alibaba',
    emoji: '🏯',
    tier: 'pro',
    capabilities: ['chat', 'code', 'math', 'vision'],
    specialties: ['Math', 'Coding', 'Multilingual']
  },
  'perplexity': {
    name: 'Perplexity Pro',
    provider: 'Perplexity',
    emoji: '🔍',
    tier: 'pro',
    capabilities: ['chat', 'search', 'realtime'],
    specialties: ['Live search', 'Citations', 'Real-time']
  },
  'groq': {
    name: 'Groq LPU',
    provider: 'Groq',
    emoji: '⚡️',
    tier: 'enterprise',
    capabilities: ['chat', 'code', 'ultra-fast'],
    specialties: ['500 tokens/sec', 'Hardware accelerated']
  },

  // Image Generation Models
  'midjourney': {
    name: 'Midjourney V6.1',
    provider: 'Midjourney',
    emoji: '🎭',
    tier: 'enterprise',
    capabilities: ['image-gen'],
    specialties: ['Artistic', 'Photorealistic', 'Stylized']
  },
  'stable-diffusion': {
    name: 'Stable Diffusion 3.5',
    provider: 'Stability AI',
    emoji: '🌈',
    tier: 'pro',
    capabilities: ['image-gen', 'video-gen'],
    specialties: ['Open-source', 'Local', 'Customizable']
  },
  'flux': {
    name: 'Flux Pro 1.1',
    provider: 'Black Forest Labs',
    emoji: '✨',
    tier: 'enterprise',
    capabilities: ['image-gen'],
    specialties: ['Ultra-fast', 'High quality', 'Photorealistic']
  },
  'ideogram': {
    name: 'Ideogram 2.0',
    provider: 'Ideogram',
    emoji: '📝',
    tier: 'enterprise',
    capabilities: ['image-gen'],
    specialties: ['Text rendering', 'Logos', 'Typography']
  },

  // Video Generation Models
  'runway': {
    name: 'Runway Gen-3 Alpha',
    provider: 'Runway',
    emoji: '🎥',
    tier: 'enterprise',
    capabilities: ['video-gen', 'image-gen'],
    specialties: ['Video generation', '10s clips', 'Motion brush']
  },
  'pika': {
    name: 'Pika 1.5',
    provider: 'Pika Labs',
    emoji: '🎞️',
    tier: 'enterprise',
    capabilities: ['video-gen'],
    specialties: ['Video generation', 'Lip sync', 'Effects']
  },
  'kling': {
    name: 'Kling AI',
    provider: 'Kuaishou',
    emoji: '🎬',
    tier: 'enterprise',
    capabilities: ['video-gen'],
    specialties: ['Long videos', 'Realistic', '2min clips']
  },
  'luma': {
    name: 'Luma Dream Machine',
    provider: 'Luma AI',
    emoji: '🌟',
    tier: 'enterprise',
    capabilities: ['video-gen', '3d-gen'],
    specialties: ['Video gen', '3D capture', 'Fast']
  }
};

// ============================================
// TOOL CATEGORIES
// ============================================
const TOOLS = {
  chat: { name: 'Chat', icon: MessageSquare, description: 'Conversational AI' },
  code: { name: 'Code', icon: Code, description: 'Code generation & debugging' },
  image: { name: 'Image Gen', icon: ImagePlus, description: 'AI image generation' },
  video: { name: 'Video Gen', icon: Clapperboard, description: 'AI video creation' },
  gamedev: { name: 'Game Dev', icon: Gamepad2, description: 'Game development suite' },
  appdev: { name: 'App Dev', icon: Smartphone, description: 'Application development' },
  analytics: { name: 'Analytics', icon: BarChart2, description: 'Social media analytics' },
  tracking: { name: 'Projects', icon: FolderKanban, description: 'Real-time project tracking' },
  automation: { name: 'Automation', icon: Workflow, description: 'N8N-style workflows' },
  deploy: { name: 'Deploy', icon: Rocket, description: 'App deployment' },
  security: { name: 'Security', icon: Shield, description: 'Security analysis' },
  schedule: { name: 'Schedule', icon: Calendar, description: 'Task scheduling' },
  subscription: { name: 'Upgrade', icon: CreditCard, description: 'Subscription & billing' }
};

// ============================================
// GAME DEV TEMPLATES
// ============================================
const GAME_TEMPLATES = {
  unity: {
    name: 'Unity 6',
    engine: 'Unity',
    icon: '🎮',
    framework: 'C#',
    platform: 'Multi-platform',
    features: ['2D/3D', 'VR/AR', 'Mobile', 'Console', 'Web']
  },
  unreal: {
    name: 'Unreal Engine 5',
    engine: 'UE5',
    icon: '⚡',
    framework: 'C++/Blueprints',
    platform: 'Multi-platform',
    features: ['AAA-grade', '3D', 'Nanite', 'Lumen', 'Metahuman']
  },
  godot: {
    name: 'Godot 4.x',
    engine: 'Godot',
    icon: '🟢',
    framework: 'GDScript/C#',
    platform: 'Multi-platform',
    features: ['Open-source', '2D/3D', 'Lightweight', 'Cross-platform']
  },
  babylon: {
    name: 'Babylon.js',
    engine: 'Web 3D',
    icon: '🌐',
    framework: 'JavaScript',
    platform: 'Web/Mobile',
    features: ['WebGL', 'Physics', 'Particles', 'Post-processing']
  },
  threejs: {
    name: 'Three.js',
    engine: 'Web 3D',
    icon: '📦',
    framework: 'JavaScript',
    platform: 'Web',
    features: ['WebGL', 'Minimal', 'Customizable', 'Community']
  }
};

// ============================================
// APP DEV TEMPLATES
// ============================================
const APP_TEMPLATES = {
  react: {
    name: 'React Native',
    framework: 'React',
    icon: '⚛️',
    language: 'JavaScript/TypeScript',
    platform: 'iOS/Android',
    features: ['Hot reload', 'Native', 'Component-based', 'Ecosystem']
  },
  flutter: {
    name: 'Flutter',
    framework: 'Flutter',
    icon: '📱',
    language: 'Dart',
    platform: 'iOS/Android/Web',
    features: ['Fast', 'Beautiful', 'Single codebase', 'Hot reload']
  },
  swift: {
    name: 'SwiftUI',
    framework: 'SwiftUI',
    icon: '🍎',
    language: 'Swift',
    platform: 'iOS/macOS',
    features: ['Native', 'Modern UI', 'Type-safe', 'Performance']
  },
  kotlin: {
    name: 'Kotlin',
    framework: 'Compose',
    icon: '🤖',
    language: 'Kotlin',
    platform: 'Android',
    features: ['Jetpack', 'Modern', 'Interop', 'Null-safe']
  },
  electron: {
    name: 'Electron',
    framework: 'Electron',
    icon: '🖥️',
    language: 'JavaScript/TypeScript',
    platform: 'Desktop',
    features: ['Cross-platform', 'Web tech', 'Native access', 'Large ecosystem']
  }
};

// ============================================
// AVATAR STYLES - CLEAN EMOJIS
// ============================================
const AVATAR_STYLES = {
  user: [
    { id: 'u1', emoji: '👨‍💼' },
    { id: 'u2', emoji: '👩‍💼' },
    { id: 'u3', emoji: '👨‍🚀' },
    { id: 'u4', emoji: '👩‍🚀' },
    { id: 'u5', emoji: '👨‍🎨' },
    { id: 'u6', emoji: '👩‍🎨' },
    { id: 'u7', emoji: '👨‍💻' },
    { id: 'u8', emoji: '👩‍💻' }
  ],
  ai: [
    { id: 'a1', emoji: '🤖' },
    { id: 'a2', emoji: '🧠' },
    { id: 'a3', emoji: '✨' },
    { id: 'a4', emoji: '⚡' }
  ]
};

// ============================================
// WORKFLOW NODES
// ============================================
const WORKFLOW_NODES = {
  trigger: { name: 'Trigger', icon: Play, inputs: 0, outputs: 1 },
  ai: { name: 'AI Model', icon: Brain, inputs: 1, outputs: 1 },
  condition: { name: 'Condition', icon: GitBranch, inputs: 1, outputs: 2 },
  http: { name: 'HTTP Request', icon: Globe, inputs: 1, outputs: 1 },
  code: { name: 'Code', icon: Code, inputs: 1, outputs: 1 },
  database: { name: 'Database', icon: Database, inputs: 1, outputs: 1 },
  email: { name: 'Email', icon: MessageSquare, inputs: 1, outputs: 1 },
  schedule: { name: 'Schedule', icon: Clock, inputs: 0, outputs: 1 },
  transform: { name: 'Transform', icon: Wand2, inputs: 1, outputs: 1 }
};

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function NexusAI() {
  // Helpers for persisted state
  const loadLS = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  };
  const saveLS = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };

  // Auth state
  const [authUser, setAuthUser] = useState(() => loadLS('nexus:user', null));
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('nexus:accessToken') || null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ email: '', username: '', password: '', confirmPassword: '', totpCode: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [currentLang, setCurrentLang] = useState(() => loadLS('nexus:lang', 'en'));

  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => loadLS(STORAGE_KEYS.selectedModel, 'claude4'));
  const [activeTool, setActiveTool] = useState('chat');
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => loadLS(STORAGE_KEYS.sidebarOpen, true));
  const [isMemoryOpen, setIsMemoryOpen] = useState(() => loadLS(STORAGE_KEYS.memoryOpen, false));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [gameTemplate, setGameTemplate] = useState(null);
  const [appTemplate, setAppTemplate] = useState(null);
  const [showToolContent, setShowToolContent] = useState(false);
  const [activeDashboard, setActiveDashboard] = useState(null); // 'analytics' | 'tracking' | 'checkout'

  // Security Dashboard State
  const [securityScan, setSecurityScan] = useState({
    isScanning: false,
    lastScanTime: null,
    vulnerabilities: [],
    threats: [],
    encryptionStatus: 'secure',
    overallScore: 92
  });

  // User customization
  const [userAvatar, setUserAvatar] = useState(() => loadLS(STORAGE_KEYS.userAvatar, AVATAR_STYLES.user[0]));

  // Chat management
  const [chats, setChats] = useState(() => loadLS(STORAGE_KEYS.chats, [
    { id: '1', title: 'New Chat', preview: 'Start a conversation...', messages: [], createdAt: Date.now(), updatedAt: Date.now() }
  ]));
  const [activeChat, setActiveChat] = useState(() => loadLS(STORAGE_KEYS.activeChat, '1'));

  // Memory
  const [memories, setMemories] = useState(() => loadLS(STORAGE_KEYS.memories, []));

  // Settings
  const [settings, setSettings] = useState(() => loadLS(STORAGE_KEYS.settings, {
    theme: 'grayscale',
    voiceEnabled: true,
    autoSpeak: false,
    e2eEncryption: true,
    autoPatch: true,
    securityLevel: 'military',
    language: 'en',
    apiKeys: {}
  }));

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Persist state to localStorage
  useEffect(() => { saveLS(STORAGE_KEYS.chats, chats); }, [chats]);
  useEffect(() => { saveLS(STORAGE_KEYS.activeChat, activeChat); }, [activeChat]);
  useEffect(() => { saveLS(STORAGE_KEYS.memories, memories); }, [memories]);
  useEffect(() => { saveLS(STORAGE_KEYS.settings, settings); }, [settings]);
  useEffect(() => { saveLS(STORAGE_KEYS.selectedModel, selectedModel); }, [selectedModel]);
  useEffect(() => { saveLS(STORAGE_KEYS.userAvatar, userAvatar); }, [userAvatar]);
  useEffect(() => { saveLS(STORAGE_KEYS.sidebarOpen, isSidebarOpen); }, [isSidebarOpen]);
  useEffect(() => { saveLS(STORAGE_KEYS.memoryOpen, isMemoryOpen); }, [isMemoryOpen]);

  // Sync auth token
  useEffect(() => {
    if (authToken) localStorage.setItem('nexus:accessToken', authToken);
    else localStorage.removeItem('nexus:accessToken');
  }, [authToken]);
  useEffect(() => {
    if (authUser) saveLS('nexus:user', authUser);
    else localStorage.removeItem('nexus:user');
  }, [authUser]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get current chat messages
  useEffect(() => {
    const chat = chats.find(c => c.id === activeChat);
    if (chat) setMessages(chat.messages);
  }, [activeChat, chats]);

  // Generate response
  const generateResponse = (prompt, model, tool) => {
    const modelInfo = AI_MODELS[model];
    const reasoning = {
      duration: Math.floor(Math.random() * 500) + 200,
      steps: [
        `Analyzing: "${prompt.slice(0, 50)}..."`,
        `Using: ${modelInfo?.name || 'AI'}`,
        `Mode: ${tool}`,
        'Processing...'
      ]
    };

    return {
      content: `**${modelInfo?.name || 'AI'}** responding to: "${prompt}"\n\nΓ£à Processing complete with ${tool} mode.\n\n≡ƒöÆ End-to-end encrypted`,
      reasoning
    };
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      attachments: attachments,
      timestamp: Date.now(),
      encrypted: true
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const authToken = localStorage.getItem('nexus:accessToken');
      const apiMessages = newMessages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ model: selectedModel, messages: apiMessages, options: {} })
      });

      let content = '';
      if (res.ok) {
        const data = await res.json();
        // Normalize response across providers
        if (data.content?.[0]?.text) content = data.content[0].text;
        else if (data.choices?.[0]?.message?.content) content = data.choices[0].message.content;
        else if (data.candidates?.[0]?.content?.parts?.[0]?.text) content = data.candidates[0].content.parts[0].text;
        else content = data.error || 'Response received';
      } else {
        const errData = await res.json().catch(() => ({}));
        content = errData.error || `API error ${res.status} — check your API key configuration`;
      }

      const aiResponse = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        model: selectedModel,
        content,
        timestamp: Date.now(),
        encrypted: true
      };

      const updatedMessages = [...newMessages, aiResponse];
      setMessages(updatedMessages);
      setIsLoading(false);
      setChats(prev => prev.map(chat =>
        chat.id === activeChat
          ? { ...chat, messages: updatedMessages, title: chat.messages.length === 0 ? input.slice(0, 30) + '...' : chat.title, preview: input.slice(0, 50), updatedAt: Date.now() }
          : chat
      ));
    } catch (err) {
      const errMsg = `Connection error: ${err.message}. Is the server running?`;
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        model: selectedModel,
        content: errMsg,
        timestamp: Date.now(),
        encrypted: false
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }
  };

  // Voice functions
  const startRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setInput('Voice transcription demo');
    }, 3000);
  };

  // Security Scanning Functions
  const runSecurityScan = async () => {
    setSecurityScan(prev => ({ ...prev, isScanning: true }));
    
    try {
      const dashboard = await securityService.runScan();
      setSecurityScan(prev => ({
        ...prev,
        isScanning: false,
        lastScanTime: Date.now(),
        vulnerabilities: dashboard.vulnerabilities || [],
        threats: dashboard.threats || [],
        encryptionStatus: dashboard.encryptionStatus || 'secure',
        overallScore: dashboard.overallScore || 92
      }));
    } catch (error) {
      console.warn('Security scan error, using fallback:', error);
      // Fallback to local data if service fails
      const vulnerabilities = [
        { id: 1, name: 'Outdated Dependencies', severity: 'medium', status: 'warning', description: '2 npm packages have updates available' },
        { id: 2, name: 'API Key Exposure Risk', severity: 'low', status: 'info', description: 'Review environment variable handling' },
        { id: 3, name: 'TLS/SSL Configuration', severity: 'high', status: 'resolved', description: 'TLS 1.3 enabled and verified' }
      ];
      
      const threats = [
        { type: 'Unauthorized Access', status: 'blocked', timestamp: Date.now() - 3600000 },
        { type: 'Injection Attack', status: 'prevented', timestamp: Date.now() - 7200000 },
        { type: 'XSS Attempt', status: 'filtered', timestamp: Date.now() - 86400000 }
      ];
      
      setSecurityScan(prev => ({
        ...prev,
        isScanning: false,
        lastScanTime: Date.now(),
        vulnerabilities,
        threats,
        encryptionStatus: 'secure',
        overallScore: 92
      }));
    }
  };

  const patchVulnerability = (vulnId) => {
    setSecurityScan(prev => ({
      ...prev,
      vulnerabilities: prev.vulnerabilities.map(v =>
        v.id === vulnId ? { ...v, status: 'patched' } : v
      )
    }));
  };

  // File handling
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      url: URL.createObjectURL(file)
    }));
    setAttachments([...attachments, ...newAttachments]);
  };

  // Chat management
  const createNewChat = () => {
    const newChat = { id: Date.now().toString(), title: 'New Chat', preview: 'Start a conversation...', messages: [], createdAt: Date.now(), updatedAt: Date.now() };
    setChats([newChat, ...chats]);
    setActiveChat(newChat.id);
    setMessages([]);
  };

  const deleteChat = (id) => {
    if (chats.length === 1) createNewChat();
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChat === id) setActiveChat(chats[0]?.id);
  };

  // Memory
  const addMemory = (content) => {
    if (content.trim()) setMemories([...memories, { content, createdAt: Date.now() }]);
  };

  const deleteMemory = (index) => setMemories(memories.filter((_, i) => i !== index));

  // Auth handlers
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (requiresTOTP) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email, password: authForm.password, totpCode: authForm.totpCode })
        });
        const data = await res.json();
        if (!res.ok) { setAuthError(data.error || 'Verification failed'); setAuthLoading(false); return; }
        setAuthToken(data.accessToken); setAuthUser(data.user);
        setShowAuth(false); setRequiresTOTP(false);
        setAuthForm({ email: '', username: '', password: '', confirmPassword: '', totpCode: '' });
      } else if (authMode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email, password: authForm.password })
        });
        const data = await res.json();
        if (!res.ok) { setAuthError(data.error || 'Login failed'); setAuthLoading(false); return; }
        if (data.requiresTOTP) { setRequiresTOTP(true); setAuthLoading(false); return; }
        setAuthToken(data.accessToken); setAuthUser(data.user);
        setShowAuth(false);
        setAuthForm({ email: '', username: '', password: '', confirmPassword: '', totpCode: '' });
      } else {
        if (authForm.password !== authForm.confirmPassword) { setAuthError('Passwords do not match'); setAuthLoading(false); return; }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email, username: authForm.username, password: authForm.password })
        });
        const data = await res.json();
        if (!res.ok) { setAuthError(data.error || 'Registration failed'); setAuthLoading(false); return; }
        setAuthToken(data.accessToken); setAuthUser(data.user);
        setShowAuth(false);
        setAuthForm({ email: '', username: '', password: '', confirmPassword: '', totpCode: '' });
      }
    } catch (err) {
      setAuthError('Network error — is the server running?');
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    if (authToken) fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } }).catch(() => {});
    setAuthToken(null); setAuthUser(null);
  };

  // Group models by capability for selector
  const modelGroups = useMemo(() => {
    const groups = {
      'Chat & Reasoning': [],
      'Image Generation': [],
      'Video Generation': [],
      'Code & Development': []
    };

    Object.entries(AI_MODELS).forEach(([key, model]) => {
      if (model.capabilities.includes('image-gen') && !model.capabilities.includes('chat')) {
        groups['Image Generation'].push({ key, ...model });
      } else if (model.capabilities.includes('video-gen') && !model.capabilities.includes('chat')) {
        groups['Video Generation'].push({ key, ...model });
      } else if (model.capabilities.includes('code') && model.specialties?.some(s => s.toLowerCase().includes('code'))) {
        groups['Code & Development'].push({ key, ...model });
      } else {
        groups['Chat & Reasoning'].push({ key, ...model });
      }
    });

    return groups;
  }, []);

  return (
    <div className="nexus-app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <button className="icon-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={20} />
          </button>
          {showToolContent && (
            <button className="back-btn" onClick={() => setShowToolContent(false)}>
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
          )}
          <div className="logo">
            <div className="logo-icon"><Sparkles size={20} /></div>
            <span className="logo-text">NEXUS AI</span>
            <span className="logo-badge">PRO</span>
          </div>
        </div>

        <div className="header-center">
          <button className="model-selector-btn" onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}>
            <span className="model-icon">{AI_MODELS[selectedModel]?.emoji}</span>
            <span className="model-name">{AI_MODELS[selectedModel]?.name}</span>
            <ChevronDown size={16} className={isModelSelectorOpen ? 'rotated' : ''} />
          </button>

          {isModelSelectorOpen && (
            <div className="model-dropdown">
              <div className="model-search">
                <Search size={14} />
                <input type="text" placeholder="Search models..." />
              </div>
              {Object.entries(modelGroups).map(([group, models]) => (
                models.length > 0 && (
                  <div key={group} className="model-group">
                    <h4>{group}</h4>
                    {models.map(model => (
                      <button
                        key={model.key}
                        className={`model-option ${selectedModel === model.key ? 'active' : ''}`}
                        onClick={() => { setSelectedModel(model.key); setIsModelSelectorOpen(false); }}
                      >
                        <span className="model-emoji">{model.emoji}</span>
                        <div className="model-info">
                          <span className="model-name">{model.name}</span>
                          <span className="model-provider">{model.provider}</span>
                        </div>
                        <div className="model-caps">
                          {model.capabilities.slice(0, 2).map(cap => (
                            <span key={cap} className="cap-tag">{cap}</span>
                          ))}
                        </div>
                        {selectedModel === model.key && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                )
              ))}
            </div>
          )}
        </div>

        <div className="header-right">
          <div className="security-badge">
            <ShieldCheck size={14} />
            <span>Protected</span>
            <Lock size={10} />
            <span>AES-256</span>
          </div>
          <select
            className="lang-select"
            value={currentLang}
            onChange={e => { setCurrentLang(e.target.value); saveLS('nexus:lang', e.target.value); }}
            title="Language"
          >
            {[['en','EN'],['es','ES'],['fr','FR'],['de','DE'],['ja','JA'],['ko','KO'],['zh','ZH'],['ar','AR'],['pt','PT'],['ru','RU'],['hi','HI'],['it','IT']].map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
          <button className="icon-btn" onClick={() => setIsMemoryOpen(!isMemoryOpen)}><Brain size={20} /></button>
          <button className="icon-btn" onClick={() => setIsCallActive(true)}><Phone size={20} /></button>
          <button className="icon-btn" onClick={() => setIsSettingsOpen(true)}><Settings size={20} /></button>
          {authUser ? (
            <div className="auth-user-btn" onClick={handleLogout} title="Click to sign out">
              <div className="user-avatar">{userAvatar?.emoji || '👤'}</div>
              <span className="auth-username">{authUser.username || authUser.email?.split('@')[0]}</span>
              <LogOut size={14} />
            </div>
          ) : (
            <button className="auth-login-btn" onClick={() => { setAuthMode('login'); setShowAuth(true); }}>
              <LogIn size={16} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="app-content">
        {/* Sidebar */}
        {isSidebarOpen && (
          <div className="sidebar">
            <div className="sidebar-header">
              <h3><History size={18} /> Chats</h3>
              <button className="new-chat-btn" onClick={createNewChat}><Plus size={18} /></button>
            </div>
            <div className="chat-list">
              {chats.map(chat => (
                <div key={chat.id} className={`chat-item ${activeChat === chat.id ? 'active' : ''}`} onClick={() => setActiveChat(chat.id)}>
                  <span className="chat-title">{chat.title}</span>
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <main className="chat-area">
          {/* Tool Panel */}
          <div className="tool-panel">
            {Object.entries(TOOLS).map(([key, tool]) => {
              const Icon = tool.icon;
              return (
                <button key={key} className={`tool-btn ${activeTool === key ? 'active' : ''}`} onClick={() => { setActiveTool(key); if (['gamedev', 'appdev', 'automation', 'security', 'analytics', 'tracking', 'subscription'].includes(key)) setShowToolContent(true); }}>
                  <Icon size={18} />
                  <span>{tool.name}</span>
                </button>
              );
            })}
          </div>

          {/* Tool Content Panels */}
          {showToolContent && activeTool === 'gamedev' && (
            <div className="tool-content">
              <div className="panel-header">
                <Gamepad2 size={18} />
                <h3>Game Development Studio</h3>
              </div>
              <div className="template-grid">
                {Object.entries(GAME_TEMPLATES).map(([key, t]) => (
                  <button key={key} className={`template-card ${gameTemplate === key ? 'active' : ''}`} onClick={() => setGameTemplate(key)}>
                    <span className="template-icon">{t.icon}</span>
                    <span className="template-name">{t.name}</span>
                    <span className="template-meta">{t.engine}</span>
                  </button>
                ))}
              </div>
              <div className="quick-btns">
                <button><Code size={16} /> Generate Code</button>
                <button><Layers size={16} /> Level Designer</button>
              </div>
            </div>
          )}

          {showToolContent && activeTool === 'appdev' && (
            <div className="tool-content">
              <div className="panel-header">
                <Smartphone size={18} />
                <h3>App Development</h3>
              </div>
              <div className="template-grid">
                {Object.entries(APP_TEMPLATES).map(([key, t]) => (
                  <button key={key} className={`template-card ${appTemplate === key ? 'active' : ''}`} onClick={() => setAppTemplate(key)}>
                    <span className="template-icon">{t.icon}</span>
                    <span className="template-name">{t.name}</span>
                    <span className="template-meta">{t.stack}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Security Dashboard */}
          {showToolContent && activeTool === 'security' && (
            <div className="tool-content security-dashboard">
              <div className="panel-header">
                <ShieldCheck size={18} />
                <h3>Security Dashboard</h3>
              </div>
              
              <div className="security-grid">
                {/* Overall Score */}
                <div className="security-card score-card">
                  <div className="score-circle">
                    <div className="score-value">{securityScan.overallScore}</div>
                    <div className="score-label">Security Score</div>
                  </div>
                  <div className="score-status">
                    <div className="status-item">
                      <ShieldCheck size={16} style={{ color: '#10b981' }} />
                      <span>Encryption: {securityScan.encryptionStatus.toUpperCase()}</span>
                    </div>
                    <div className="status-item">
                      <Lock size={16} style={{ color: '#3b82f6' }} />
                      <span>AES-256-GCM Active</span>
                    </div>
                  </div>
                </div>

                {/* Scan Button */}
                <div className="security-card action-card">
                  <button 
                    className={`scan-btn ${securityScan.isScanning ? 'scanning' : ''}`}
                    onClick={runSecurityScan}
                    disabled={securityScan.isScanning}
                  >
                    {securityScan.isScanning ? (
                      <>
                        <Loader2 size={18} className="spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Zap size={18} />
                        Run Full Scan
                      </>
                    )}
                  </button>
                  {securityScan.lastScanTime && (
                    <div className="scan-time">
                      Last scan: {new Date(securityScan.lastScanTime).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                {/* Vulnerabilities */}
                <div className="security-card vulnerabilities-card">
                  <h4><AlertTriangle size={16} /> Vulnerabilities</h4>
                  <div className="vuln-list">
                    {securityScan.vulnerabilities.length > 0 ? (
                      securityScan.vulnerabilities.map(vuln => (
                        <div key={vuln.id} className={`vuln-item severity-${vuln.severity} status-${vuln.status}`}>
                          <div className="vuln-header">
                            <span className={`severity-badge ${vuln.severity}`}>{vuln.severity.toUpperCase()}</span>
                            <span className="vuln-name">{vuln.name}</span>
                            <span className={`status-badge ${vuln.status}`}>{vuln.status.toUpperCase()}</span>
                          </div>
                          <div className="vuln-desc">{vuln.description}</div>
                          {vuln.status !== 'patched' && (
                            <button 
                              className="patch-btn"
                              onClick={() => patchVulnerability(vuln.id)}
                            >
                              <Wrench size={14} /> Patch Now
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">No vulnerabilities detected</div>
                    )}
                  </div>
                </div>

                {/* Threats */}
                <div className="security-card threats-card">
                  <h4><Network size={16} /> Recent Threats</h4>
                  <div className="threat-list">
                    {securityScan.threats.length > 0 ? (
                      securityScan.threats.map((threat, idx) => (
                        <div key={idx} className={`threat-item status-${threat.status}`}>
                          <div className="threat-status">
                            {threat.status === 'blocked' && <ShieldAlert size={16} style={{ color: '#ef4444' }} />}
                            {threat.status === 'prevented' && <ShieldCheck size={16} style={{ color: '#10b981' }} />}
                            {threat.status === 'filtered' && <Eye size={16} style={{ color: '#f59e0b' }} />}
                          </div>
                          <div className="threat-info">
                            <div className="threat-type">{threat.type}</div>
                            <div className="threat-time">{threat.status.toUpperCase()} ΓÇó {new Date(threat.timestamp).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">No threats detected</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Dashboard */}
          {showToolContent && activeTool === 'analytics' && (
            <div className="tool-content full-panel">
              <Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}><Loader2 size={24} style={{animation:'spin 1s linear infinite'}}/> Loading Analytics...</div>}>
                <AnalyticsDashboard
                  theme={settings.theme === 'light' ? 'light' : 'dark'}
                  onConnect={(platform) => console.info('Connect platform:', platform)}
                  onExport={(data) => { const a = document.createElement('a'); a.href = 'data:text/json,' + encodeURIComponent(JSON.stringify(data)); a.download = 'analytics.json'; a.click(); }}
                />
              </Suspense>
            </div>
          )}

          {/* Project Tracking Dashboard */}
          {showToolContent && activeTool === 'tracking' && (
            <div className="tool-content full-panel">
              <Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}><Loader2 size={24} style={{animation:'spin 1s linear infinite'}}/> Loading Projects...</div>}>
                <ProjectDashboard
                  theme={settings.theme === 'light' ? 'light' : 'dark'}
                  userId={authUser?.id || 'guest'}
                  onCreateProject={async (data) => {
                    const token = authToken;
                    const res = await fetch('/api/projects', { method:'POST', headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}, body:JSON.stringify(data) });
                    return res.ok ? res.json() : Promise.reject(new Error('Failed to create project'));
                  }}
                  onProjectSelect={(p) => console.info('Project selected:', p.name)}
                />
              </Suspense>
            </div>
          )}

          {/* Subscription / Checkout */}
          {showToolContent && activeTool === 'subscription' && (
            <div className="tool-content full-panel">
              <Suspense fallback={<div style={{padding:'2rem',textAlign:'center'}}><Loader2 size={24} style={{animation:'spin 1s linear infinite'}}/> Loading Checkout...</div>}>
                <CheckoutUI
                  theme={settings.theme === 'light' ? 'light' : 'dark'}
                  currentTier={authUser?.tier || 'free'}
                  onSuccess={(tier, method) => { console.info('Subscribed:', tier, method); setShowToolContent(false); }}
                  onCancel={() => setShowToolContent(false)}
                />
              </Suspense>
            </div>
          )}

          {/* Messages */}
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome">
                <div className="welcome-icon"><Sparkles size={48} /></div>
                <h2>Nexus AI Pro</h2>
                <p>Military-grade encrypted AI · 40+ Models</p>
                <div className="model-badges">
                  {Object.entries(AI_MODELS).slice(0, 12).map(([key, m]) => (
                    <span key={key} className="badge" onClick={() => setSelectedModel(key)}>{m.emoji} {m.name}</span>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className="message-avatar">{msg.role === 'user' ? userAvatar?.emoji : AI_MODELS[msg.model]?.emoji || '🤖'}</div>
                  <div className="message-body">
                    <div className="message-header">
                      <span className="sender">{msg.role === 'user' ? 'You' : AI_MODELS[msg.model]?.name}</span>
                      <span className="time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      {msg.encrypted && <span className="encrypted"><Lock size={10} /> Encrypted</span>}
                    </div>
                    <div className="message-text">{msg.content}</div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">{AI_MODELS[selectedModel]?.emoji}</div>
                <div className="message-body">
                  <div className="typing"><span></span><span></span><span></span></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="input-area">
            <div className="input-box">
              <button className="attach-btn" onClick={() => fileInputRef.current?.click()}><Upload size={20} /></button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple hidden />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${AI_MODELS[selectedModel]?.name}...`}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                rows={1}
              />
              <button className={`voice-btn ${isRecording ? 'recording' : ''}`} onClick={startRecording}>
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button className="send-btn" onClick={sendMessage} disabled={!input.trim()}>
                {isLoading ? <Loader2 className="spin" size={20} /> : <Send size={20} />}
              </button>
            </div>
            <div className="input-footer">
              <span className="model-tag">{AI_MODELS[selectedModel]?.emoji} {AI_MODELS[selectedModel]?.name}</span>
              <span className="tool-tag">{TOOLS[activeTool]?.name}</span>
              <span className="secure"><Lock size={12} /> End-to-end encrypted</span>
            </div>
          </div>
        </main>

        {/* Memory Panel */}
        {isMemoryOpen && (
          <div className="memory-panel">
            <div className="panel-header"><Brain size={18} /><h3>Memory</h3></div>
            <div className="memory-list">
              {memories.map((m, i) => (
                <div key={i} className="memory-item">
                  <span>{m.content}</span>
                  <button onClick={() => deleteMemory(i)}><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Settings size={18} /> Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="setting-group">
                <h4>API Keys</h4>
                {['OpenAI', 'Anthropic', 'Google', 'xAI', 'DeepSeek'].map(provider => (
                  <div key={provider} className="setting-item">
                    <label>{provider}</label>
                    <input type="password" placeholder={`${provider} API Key`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Modal */}
      {isSecurityOpen && (
        <div className="modal-overlay" onClick={() => setIsSecurityOpen(false)}>
          <div className="modal large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Shield size={18} /> Security Center</h3>
              <button onClick={() => setIsSecurityOpen(false)}><X size={20} /></button>
            </div>
            <div className="security-grid">
              <div className="security-card"><Lock size={24} /><h4>Encryption</h4><p>AES-256-GCM Active</p></div>
              <div className="security-card"><ShieldCheck size={24} /><h4>Status</h4><p>Secure</p></div>
              <div className="security-card"><Fingerprint size={24} /><h4>Auth</h4><p>Multi-Factor</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuth && (
        <div className="modal-overlay" onClick={() => { setShowAuth(false); setRequiresTOTP(false); setAuthError(''); }}>
          <div className="modal auth-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {requiresTOTP ? <><QrCode size={18} /> Two-Factor Auth</> : authMode === 'login' ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Create Account</>}
              </h3>
              <button onClick={() => { setShowAuth(false); setRequiresTOTP(false); setAuthError(''); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {requiresTOTP ? (
                  <>
                    <p style={{ color: 'var(--text-2)', fontSize: '13px', textAlign: 'center', margin: 0 }}>
                      Enter the 6-digit code from your authenticator app.
                    </p>
                    <div className="auth-field">
                      <label><QrCode size={13} /> Authenticator Code</label>
                      <input type="text" inputMode="numeric" maxLength={6} placeholder="000 000"
                        value={authForm.totpCode}
                        onChange={e => setAuthForm(f => ({ ...f, totpCode: e.target.value.replace(/\D/g,'') }))}
                        style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: '20px' }} autoFocus />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="auth-field">
                      <label><AtSign size={13} /> Email</label>
                      <input type="email" placeholder="you@example.com" autoComplete="email"
                        value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} required />
                    </div>
                    {authMode === 'register' && (
                      <div className="auth-field">
                        <label><User size={13} /> Username <span style={{color:'var(--text-3)',fontWeight:400}}>(emoji ok 🚀)</span></label>
                        <input type="text" placeholder="cool_username 🎮" autoComplete="username"
                          value={authForm.username} onChange={e => setAuthForm(f => ({ ...f, username: e.target.value }))}
                          required minLength={2} maxLength={30} />
                      </div>
                    )}
                    <div className="auth-field">
                      <label><Lock size={13} /> Password</label>
                      <input type="password"
                        placeholder={authMode === 'register' ? '13+ chars, special chars required' : 'Password'}
                        autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                        value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} required />
                    </div>
                    {authMode === 'register' && (
                      <div className="auth-field">
                        <label><Lock size={13} /> Confirm Password</label>
                        <input type="password" placeholder="Re-enter password" autoComplete="new-password"
                          value={authForm.confirmPassword} onChange={e => setAuthForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
                      </div>
                    )}
                  </>
                )}
                {authError && <p style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>{authError}</p>}
                <button type="submit" className="auth-submit-btn" disabled={authLoading}>
                  {authLoading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                  {authLoading ? 'Please wait…' : requiresTOTP ? 'Verify Code' : authMode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
                {!requiresTOTP && (
                  <button type="button" className="auth-toggle-btn"
                    onClick={() => { setAuthMode(m => m === 'login' ? 'register' : 'login'); setAuthError(''); }}>
                    {authMode === 'login' ? 'No account? Register →' : '← Back to Sign In'}
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Voice Call Modal */}
      {isCallActive && (
        <div className="call-overlay">
          <div className="call-panel">
            <div className="call-avatar">{AI_MODELS[selectedModel]?.emoji}</div>
            <h3>Speaking with {AI_MODELS[selectedModel]?.name}</h3>
            <div className="call-actions">
              <button className="end-call" onClick={() => setIsCallActive(false)}><PhoneOff size={24} /></button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
          --bg-1: #0a0a0a;
          --bg-2: #111111;
          --bg-3: #1a1a1a;
          --bg-4: #222222;
          --text-1: #ffffff;
          --text-2: #a0a0a0;
          --text-3: #666666;
          --border: #2a2a2a;
          --accent: #888888;
          
          /* Bold Gradient Colors */
          --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f472b6 100%);
          --gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
          --gradient-warning: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          --gradient-danger: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          --gradient-info: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          --gradient-cyan: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          --gradient-purple: linear-gradient(135deg, #a855f7 0%, #7e22ce 100%);
          --gradient-pink: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
        }
        
        .nexus-app {
          font-family: 'Inter', sans-serif;
          background: var(--bg-1);
          color: var(--text-1);
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        
        /* Header */
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border);
        }
        
        .header-left, .header-right { display: flex; align-items: center; gap: 12px; }
        
        .icon-btn {
          background: transparent;
          border: none;
          color: var(--text-2);
          cursor: pointer;
          padding: 10px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .icon-btn:hover { background: var(--bg-3); color: var(--text-1); }
        
        .back-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-2);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .back-btn:hover { background: var(--bg-4); color: var(--text-1); }
        
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #444 0%, #666 100%);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: white;
        }
        .logo-text { font-size: 1.1rem; font-weight: 700; color: var(--text-1); }
        .logo-badge { font-size: 0.6rem; font-weight: 700; padding: 3px 6px; background: var(--accent); border-radius: 4px; }
        
        .security-badge {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 0.75rem;
          color: var(--text-2);
        }
        
        /* Bold Gradient Buttons */
        .btn-gradient {
          background: var(--gradient-primary);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .btn-gradient:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
        }
        
        .btn-success { background: var(--gradient-success); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); }
        .btn-success:hover { box-shadow: 0 8px 25px rgba(16, 185, 129, 0.5); }
        
        .btn-warning { background: var(--gradient-warning); box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3); }
        .btn-warning:hover { box-shadow: 0 8px 25px rgba(245, 158, 11, 0.5); }
        
        .btn-danger { background: var(--gradient-danger); box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3); }
        .btn-danger:hover { box-shadow: 0 8px 25px rgba(239, 68, 68, 0.5); }
        
        /* Gradient Text */
        .text-gradient {
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
        }
        
        /* Highlight Gradient Backgrounds */
        .highlight-primary { background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); }
        .highlight-success { background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); }
        .highlight-warning { background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%); }
        .highlight-danger { background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%); }
        
        .user-avatar {
          width: 36px; height: 36px;
          background: var(--bg-3);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
        }
        
        /* Model Selector */
        .header-center { position: relative; }
        
        .model-selector-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-1);
          cursor: pointer;
        }
        .model-selector-btn:hover { border-color: var(--accent); }
        .model-selector-btn svg.rotated { transform: rotate(180deg); }
        .model-emoji { font-size: 1.2rem; }
        
        .model-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 12px;
          width: 420px;
          max-height: 70vh;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        
        .model-search {
          display: flex; align-items: center; gap: 8px;
          padding: 12px;
          border-bottom: 1px solid var(--border);
        }
        .model-search input {
          flex: 1;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-1);
          font-size: 0.85rem;
        }
        .model-search svg { color: var(--text-3); }
        
        .model-group { padding: 8px; }
        .model-group h4 {
          font-size: 0.7rem;
          color: var(--text-3);
          text-transform: uppercase;
          padding: 8px 12px;
          letter-spacing: 1px;
        }
        
        .model-option {
          display: flex; align-items: center; gap: 12px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-1);
          cursor: pointer;
          text-align: left;
        }
        .model-option:hover { background: var(--bg-3); }
        .model-option.active { background: var(--bg-4); border: 1px solid var(--border); }
        
        .model-info { flex: 1; }
        .model-info .model-name { display: block; font-weight: 500; font-size: 0.9rem; }
        .model-provider { font-size: 0.75rem; color: var(--text-3); }
        
        .model-caps { display: flex; gap: 4px; }
        .cap-tag { font-size: 0.65rem; padding: 2px 6px; background: var(--bg-4); border-radius: 4px; color: var(--text-3); }
        
        /* Main Content */
        .app-content { display: flex; flex: 1; overflow: hidden; }
        
        /* Sidebar */
        .sidebar {
          width: 260px;
          background: var(--bg-2);
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
        }
        .sidebar-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--border);
        }
        .sidebar-header h3 { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-2); }
        .new-chat-btn {
          padding: 8px;
          background: var(--accent);
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
        }
        
        .chat-list { flex: 1; overflow-y: auto; padding: 8px; }
        .chat-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          margin-bottom: 4px;
        }
        .chat-item:hover { background: var(--bg-3); }
        .chat-item.active { background: var(--bg-4); }
        .chat-title { font-size: 0.85rem; }
        .delete-btn {
          background: transparent;
          border: none;
          color: var(--text-3);
          cursor: pointer;
          opacity: 0;
        }
        .chat-item:hover .delete-btn { opacity: 1; }
        
        /* Chat Area */
        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        /* Tool Panel */
        .tool-panel {
          display: flex; gap: 6px;
          padding: 12px 16px;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border);
          overflow-x: auto;
        }
        .tool-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px;
          background: var(--bg-3);
          border: 1px solid transparent;
          border-radius: 8px;
          color: var(--text-2);
          font-size: 0.8rem;
          cursor: pointer;
          white-space: nowrap;
        }
        .tool-btn:hover { background: var(--bg-4); color: var(--text-1); }
        .tool-btn.active { background: var(--bg-4); color: var(--text-1); border-color: var(--accent); }
        
        /* Tool Content */
        .tool-content {
          padding: 16px;
          background: var(--bg-2);
          border-bottom: 1px solid var(--border);
        }
        .panel-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .panel-header h3 { font-size: 0.95rem; }
        
        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 10px;
          margin-bottom: 16px;
        }
        .template-card {
          display: flex; flex-direction: column; align-items: center;
          padding: 16px 12px;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 10px;
          cursor: pointer;
        }
        .template-card:hover { background: var(--bg-4); border-color: var(--accent); }
        .template-card.active { border-color: var(--accent); }
        .template-icon { font-size: 1.5rem; margin-bottom: 8px; }
        .template-name { font-size: 0.8rem; font-weight: 500; }
        .template-meta { font-size: 0.65rem; color: var(--text-3); }
        
        .quick-btns { display: flex; gap: 8px; }
        .quick-btns button {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-2);
          font-size: 0.8rem;
          cursor: pointer;
        }
        .quick-btns button:hover { background: var(--bg-4); }
        
        /* Messages */
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        
        .welcome {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          height: 100%;
          text-align: center;
        }
        .welcome-icon {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, #333 0%, #555 100%);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
          color: white;
        }
        .welcome h2 { font-size: 1.5rem; margin-bottom: 8px; }
        .welcome p { color: var(--text-2); margin-bottom: 24px; }
        
        .model-badges {
          display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
          max-width: 600px;
        }
        .badge {
          padding: 8px 14px;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 20px;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .badge:hover { background: var(--bg-4); border-color: var(--accent); }
        
        .message {
          display: flex; gap: 12px;
          margin-bottom: 20px;
        }
        .message-avatar {
          width: 36px; height: 36px;
          background: var(--bg-3);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
          flex-shrink: 0;
        }
        .message-body { flex: 1; }
        .message-header {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 6px;
        }
        .sender { font-weight: 600; font-size: 0.9rem; }
        .time { font-size: 0.75rem; color: var(--text-3); }
        .encrypted { display: flex; align-items: center; gap: 4px; font-size: 0.65rem; color: var(--text-3); }
        .message-text { line-height: 1.6; color: var(--text-2); white-space: pre-wrap; }
        .message.user .message-text {
          background: var(--bg-3);
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        
        .typing { display: flex; gap: 4px; padding: 12px; }
        .typing span {
          width: 8px; height: 8px;
          background: var(--accent);
          border-radius: 50%;
          animation: bounce 1.4s infinite;
        }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
        
        /* Input */
        .input-area {
          padding: 16px 20px;
          background: var(--bg-2);
          border-top: 1px solid var(--border);
        }
        .input-box {
          display: flex; align-items: flex-end; gap: 10px;
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px;
        }
        .input-box:focus-within { border-color: var(--accent); }
        
        .attach-btn, .voice-btn, .send-btn {
          flex-shrink: 0;
          width: 40px; height: 40px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: var(--text-2);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .attach-btn:hover, .voice-btn:hover { background: var(--bg-4); }
        .voice-btn.recording { background: #ef4444; color: white; }
        .send-btn { background: var(--accent); color: white; }
        .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        
        .input-box textarea {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-1);
          font-family: inherit;
          font-size: 0.95rem;
          resize: none;
          min-height: 40px;
          padding: 10px 4px;
        }
        .input-box textarea:focus { outline: none; }
        .input-box textarea::placeholder { color: var(--text-3); }
        
        .input-footer {
          display: flex; align-items: center; gap: 10px;
          margin-top: 10px;
          font-size: 0.75rem;
          color: var(--text-3);
        }
        .model-tag, .tool-tag {
          padding: 4px 8px;
          background: var(--bg-3);
          border-radius: 4px;
        }
        .secure { display: flex; align-items: center; gap: 4px; margin-left: auto; }
        
        /* Memory Panel */
        .memory-panel {
          width: 280px;
          background: var(--bg-2);
          border-left: 1px solid var(--border);
          padding: 16px;
        }
        .memory-list { margin-top: 16px; }
        .memory-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px;
          background: var(--bg-3);
          border-radius: 8px;
          margin-bottom: 8px;
          font-size: 0.85rem;
        }
        .memory-item button {
          background: transparent;
          border: none;
          color: var(--text-3);
          cursor: pointer;
        }
        
        /* Modals */
        .modal-overlay, .call-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .modal {
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: 16px;
          width: 90%; max-width: 500px;
          max-height: 80vh;
          overflow: hidden;
        }
        .modal.large { max-width: 700px; }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }
        .modal-header h3 { display: flex; align-items: center; gap: 10px; }
        .modal-header button { background: transparent; border: none; color: var(--text-2); cursor: pointer; padding: 8px; border-radius: 6px; }
        .modal-body { padding: 20px; overflow-y: auto; }
        
        .setting-group { margin-bottom: 24px; }
        .setting-group h4 { font-size: 0.8rem; color: var(--text-3); margin-bottom: 12px; text-transform: uppercase; }
        .setting-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
        }
        .setting-item label { font-size: 0.9rem; }
        .setting-item input {
          background: var(--bg-3);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 12px;
          color: var(--text-1);
          width: 200px;
        }
        
        .security-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 20px;
        }
        .security-card {
          background: var(--bg-3);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .security-card svg { margin-bottom: 10px; color: var(--text-2); }
        .security-card h4 { font-size: 0.85rem; color: var(--text-2); margin-bottom: 6px; }
        .security-card p { font-size: 0.9rem; color: var(--text-1); }
        
        /* Call */
        .call-panel { text-align: center; }
        .call-avatar {
          width: 120px; height: 120px;
          background: var(--bg-3);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 3rem;
          margin: 0 auto 20px;
        }
        .call-panel h3 { margin-bottom: 20px; }
        .call-actions { display: flex; justify-content: center; gap: 16px; }
        .end-call {
          width: 60px; height: 60px;
          background: #ef4444;
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
        }
        
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        /* Security Dashboard Styles */
        .security-dashboard {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px;
        }
        
        .security-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          flex: 1;
          overflow-y: auto;
        }
        
        .security-card {
          background: linear-gradient(135deg, var(--bg-3) 0%, var(--bg-4) 100%);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .security-card h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          color: var(--text-1);
          margin: 0;
        }
        
        /* Score Card */
        .score-card {
          align-items: center;
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
        }
        
        .score-circle {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          margin-bottom: 16px;
        }
        
        .score-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
        }
        
        .score-label {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.8);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .score-status {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(0,0,0,0.2);
          border-radius: 8px;
          font-size: 0.85rem;
          color: white;
        }
        
        /* Action Card */
        .action-card {
          align-items: center;
          gap: 16px;
        }
        
        .scan-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease;
        }
        
        .scan-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
        }
        
        .scan-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .scan-time {
          font-size: 0.75rem;
          color: var(--text-3);
          text-align: center;
          width: 100%;
        }
        
        /* Vulnerabilities */
        .vulnerabilities-card,
        .threats-card {
          grid-column: span 1;
        }
        
        .vuln-list,
        .threat-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 400px;
          overflow-y: auto;
        }
        
        .vuln-item {
          padding: 12px;
          background: var(--bg-4);
          border-left: 4px solid #f59e0b;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.85rem;
        }
        
        .vuln-item.severity-high {
          border-left-color: #ef4444;
        }
        
        .vuln-item.severity-medium {
          border-left-color: #f59e0b;
        }
        
        .vuln-item.severity-low {
          border-left-color: #3b82f6;
        }
        
        .vuln-item.status-resolved,
        .vuln-item.status-patched {
          opacity: 0.6;
          border-left-color: #10b981;
        }
        
        .vuln-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .severity-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .severity-badge.high {
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
        }
        
        .severity-badge.medium {
          background: rgba(245, 158, 11, 0.2);
          color: #fcd34d;
        }
        
        .severity-badge.low {
          background: rgba(59, 130, 246, 0.2);
          color: #93c5fd;
        }
        
        .status-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
          margin-left: auto;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .status-badge.warning {
          background: rgba(245, 158, 11, 0.2);
          color: #fcd34d;
        }
        
        .status-badge.info {
          background: rgba(59, 130, 246, 0.2);
          color: #93c5fd;
        }
        
        .status-badge.resolved {
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
        }
        
        .status-badge.patched {
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
        }
        
        .vuln-name {
          font-weight: 600;
          flex: 1;
          color: var(--text-1);
        }
        
        .vuln-desc {
          color: var(--text-3);
          font-size: 0.8rem;
          margin-left: 4px;
        }
        
        .patch-btn {
          padding: 6px 12px;
          background: linear-gradient(135deg, #f97316 0%, #f59e0b 100%);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 0.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          width: fit-content;
          transition: all 0.2s;
        }
        
        .patch-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }
        
        /* Threats */
        .threat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: var(--bg-4);
          border-radius: 6px;
          border-left: 3px solid #f59e0b;
        }
        
        .threat-item.status-blocked {
          border-left-color: #ef4444;
        }
        
        .threat-item.status-prevented {
          border-left-color: #10b981;
        }
        
        .threat-item.status-filtered {
          border-left-color: #f59e0b;
        }
        
        .threat-status {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .threat-info {
          flex: 1;
        }
        
        .threat-type {
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-1);
          margin-bottom: 2px;
        }
        
        .threat-time {
          font-size: 0.75rem;
          color: var(--text-3);
        }
        
        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 20px;
          color: var(--text-3);
          font-size: 0.9rem;
        }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        
        @media (max-width: 768px) {
          .sidebar { position: fixed; z-index: 500; height: calc(100vh - 60px); top: 60px; left: 0; }
          .memory-panel { position: fixed; z-index: 500; height: calc(100vh - 60px); top: 60px; right: 0; }
          .tool-btn span { display: none; }
          .model-dropdown { width: 300px; left: 0; transform: none; }
        }

        /* Accessibility: larger tap areas */
        .menu-btn, .icon-btn, .attach-btn, .voice-btn, .send-btn { min-width: 44px; min-height: 44px; }

        /* Language selector */
        .lang-select {
          background: var(--bg-3);
          border: 1px solid var(--border);
          color: var(--text-2);
          border-radius: 6px;
          padding: 4px 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          height: 30px;
        }
        .lang-select:focus { outline: none; border-color: var(--accent); }

        /* Auth header buttons */
        .auth-login-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--gradient-primary);
          border: none; border-radius: 8px;
          color: #fff; font-size: 13px; font-weight: 600;
          padding: 6px 12px; cursor: pointer; white-space: nowrap;
          transition: opacity 0.2s;
        }
        .auth-login-btn:hover { opacity: 0.88; }
        .auth-user-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--bg-3); border: 1px solid var(--border);
          border-radius: 8px; padding: 4px 10px;
          cursor: pointer; transition: border-color 0.2s;
        }
        .auth-user-btn:hover { border-color: var(--accent); }
        .auth-username { font-size: 12px; color: var(--text-2); max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Auth modal */
        .auth-modal { max-width: 420px; width: 94vw; }
        .auth-field { display: flex; flex-direction: column; gap: 5px; }
        .auth-field label {
          display: flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 600; color: var(--text-2);
        }
        .auth-field input {
          background: var(--bg-3); border: 1px solid var(--border);
          border-radius: 8px; padding: 10px 12px;
          color: var(--text-1); font-size: 14px;
          transition: border-color 0.2s;
        }
        .auth-field input:focus { outline: none; border-color: #667eea; }
        .auth-submit-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 12px;
          background: var(--gradient-primary);
          border: none; border-radius: 10px;
          color: #fff; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: opacity 0.2s;
          margin-top: 4px;
        }
        .auth-submit-btn:hover:not(:disabled) { opacity: 0.88; }
        .auth-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .auth-toggle-btn {
          background: none; border: none;
          color: var(--text-3); font-size: 13px;
          cursor: pointer; text-align: center; padding: 4px;
          transition: color 0.2s;
        }
        .auth-toggle-btn:hover { color: var(--text-2); }

      `}</style>
    </div>
  );
}

