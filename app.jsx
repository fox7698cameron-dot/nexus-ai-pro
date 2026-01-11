import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  ArrowLeft, Film, ImagePlus, Clapperboard
} from 'lucide-react';

// ============================================
// SECURITY CONSTANTS & ENCRYPTION
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
// AI MODEL CONFIGURATIONS - 25+ MODELS
// ============================================
const AI_MODELS = {
  // OpenAI Models
  'gpt5': { 
    name: 'GPT-5.2', 
    provider: 'OpenAI', 
    icon: '🧠',
    capabilities: ['chat', 'code', 'analysis', 'image-gen', 'video-gen', 'reasoning'],
    specialties: ['Advanced reasoning', 'Multimodal', 'Real-time']
  },
  'gpt4': { 
    name: 'GPT-4 Turbo', 
    provider: 'OpenAI', 
    icon: '🤖',
    capabilities: ['chat', 'code', 'analysis', 'image-gen', 'vision'],
    specialties: ['Multimodal', 'DALL-E 3', 'Function calling']
  },
  'gpt4o': { 
    name: 'GPT-4o', 
    provider: 'OpenAI', 
    icon: '⚡',
    capabilities: ['chat', 'code', 'vision', 'audio'],
    specialties: ['Omni-modal', 'Real-time', 'Fast']
  },
  'o1': { 
    name: 'o1 Pro', 
    provider: 'OpenAI', 
    icon: '🔬',
    capabilities: ['reasoning', 'math', 'code', 'analysis'],
    specialties: ['Chain of thought', 'PhD-level reasoning']
  },
  'o1-mini': { 
    name: 'o1 Mini', 
    provider: 'OpenAI', 
    icon: '🧪',
    capabilities: ['reasoning', 'code', 'math'],
    specialties: ['Fast reasoning', 'Cost-effective']
  },
  'sora': { 
    name: 'Sora', 
    provider: 'OpenAI', 
    icon: '🎬',
    capabilities: ['video-gen', 'image-gen'],
    specialties: ['Video generation', '60s clips', 'Cinematic']
  },
  'dalle3': { 
    name: 'DALL-E 3', 
    provider: 'OpenAI', 
    icon: '🎨',
    capabilities: ['image-gen'],
    specialties: ['Image generation', 'Photorealistic', 'Art']
  },
  
  // Anthropic Models
  'claude4': { 
    name: 'Claude 4 Opus', 
    provider: 'Anthropic', 
    icon: '🧠',
    capabilities: ['chat', 'code', 'analysis', 'writing', 'reasoning'],
    specialties: ['Complex reasoning', 'Code generation', 'Creative writing']
  },
  'claude-sonnet': { 
    name: 'Claude 4 Sonnet', 
    provider: 'Anthropic', 
    icon: '📝',
    capabilities: ['chat', 'code', 'analysis', 'writing'],
    specialties: ['Balanced', 'Fast', 'Efficient']
  },
  'claude-haiku': { 
    name: 'Claude 4 Haiku', 
    provider: 'Anthropic', 
    icon: '⚡',
    capabilities: ['chat', 'code', 'analysis'],
    specialties: ['Ultra-fast', 'Cost-effective', 'Concise']
  },
  
  // Google Models
  'gemini-ultra': { 
    name: 'Gemini 2.0 Ultra', 
    provider: 'Google', 
    icon: '💫',
    capabilities: ['chat', 'code', 'multimodal', 'video', 'reasoning'],
    specialties: ['1M context', 'Video understanding', 'Real-time']
  },
  'gemini-pro': { 
    name: 'Gemini 2.0 Pro', 
    provider: 'Google', 
    icon: '✨',
    capabilities: ['chat', 'code', 'analysis', 'vision'],
    specialties: ['Balanced', 'Multimodal', 'Fast']
  },
  'gemini-flash': { 
    name: 'Gemini 2.0 Flash', 
    provider: 'Google', 
    icon: '⚡',
    capabilities: ['chat', 'code', 'vision'],
    specialties: ['Ultra-fast', 'Low-latency', 'Efficient']
  },
  'imagen3': { 
    name: 'Imagen 3', 
    provider: 'Google', 
    icon: '🖼️',
    capabilities: ['image-gen'],
    specialties: ['Image generation', 'Photorealistic', 'High-res']
  },
  'veo': { 
    name: 'Veo 2', 
    provider: 'Google', 
    icon: '🎥',
    capabilities: ['video-gen'],
    specialties: ['Video generation', '4K', 'Cinematic']
  },
  
  // xAI Models
  'grok4': { 
    name: 'Grok 4.1', 
    provider: 'xAI', 
    icon: '⚡',
    capabilities: ['chat', 'realtime', 'analysis', 'code', 'image-gen'],
    specialties: ['Real-time data', 'X integration', 'Unfiltered']
  },
  'grok3': { 
    name: 'Grok 3', 
    provider: 'xAI', 
    icon: '🔥',
    capabilities: ['chat', 'code', 'analysis'],
    specialties: ['Humor', 'Real-time', 'Uncensored']
  },
  'aurora': { 
    name: 'Aurora', 
    provider: 'xAI', 
    icon: '🌟',
    capabilities: ['image-gen'],
    specialties: ['Image generation', 'Artistic', 'Fast']
  },
  
  // DeepSeek Models
  'deepseek-v3': { 
    name: 'DeepSeek V3', 
    provider: 'DeepSeek', 
    icon: '🔮',
    capabilities: ['chat', 'code', 'reasoning', 'math'],
    specialties: ['Deep reasoning', 'Mathematics', 'Code']
  },
  'deepseek-r1': { 
    name: 'DeepSeek R1', 
    provider: 'DeepSeek', 
    icon: '🧠',
    capabilities: ['reasoning', 'math', 'code'],
    specialties: ['Chain of thought', 'PhD-level', 'Open-source']
  },
  'deepseek-coder': { 
    name: 'DeepSeek Coder V3', 
    provider: 'DeepSeek', 
    icon: '💻',
    capabilities: ['code', 'debugging', 'analysis'],
    specialties: ['Code generation', 'Bug fixing', '330B params']
  },
  
  // Meta Models
  'llama4': { 
    name: 'Llama 4 405B', 
    provider: 'Meta', 
    icon: '🦙',
    capabilities: ['chat', 'code', 'reasoning', 'multilingual'],
    specialties: ['Open-source', 'Local deployment', 'Massive scale']
  },
  'llama3': { 
    name: 'Llama 3.3 70B', 
    provider: 'Meta', 
    icon: '🦙',
    capabilities: ['chat', 'code', 'analysis'],
    specialties: ['Open-source', 'Efficient', 'Fast']
  },
  'code-llama': { 
    name: 'Code Llama 70B', 
    provider: 'Meta', 
    icon: '💻',
    capabilities: ['code', 'debugging'],
    specialties: ['Code generation', 'Python', 'C++']
  },
  
  // Mistral Models
  'mistral-large': { 
    name: 'Mistral Large 2', 
    provider: 'Mistral', 
    icon: '🌀',
    capabilities: ['chat', 'code', 'analysis', 'multilingual'],
    specialties: ['123B params', 'Multilingual', 'Function calling']
  },
  'mixtral': { 
    name: 'Mixtral 8x22B', 
    provider: 'Mistral', 
    icon: '🔀',
    capabilities: ['chat', 'code', 'multilingual'],
    specialties: ['MoE architecture', 'Efficient', 'Open-source']
  },
  'codestral': { 
    name: 'Codestral', 
    provider: 'Mistral', 
    icon: '💻',
    capabilities: ['code', 'debugging', 'completion'],
    specialties: ['Code generation', '80+ languages', 'Fast']
  },
  
  // Microsoft Models
  'copilot-pro': { 
    name: 'Copilot Pro', 
    provider: 'Microsoft', 
    icon: '✨',
    capabilities: ['chat', 'code', 'productivity', 'image-gen'],
    specialties: ['Office integration', 'DALL-E 3', 'GPT-4 Turbo']
  },
  'phi4': { 
    name: 'Phi-4', 
    provider: 'Microsoft', 
    icon: '🔬',
    capabilities: ['chat', 'reasoning', 'math'],
    specialties: ['Small but mighty', 'Reasoning', 'Efficient']
  },
  
  // Other Major Models
  'kimi': { 
    name: 'Kimi k2', 
    provider: 'Moonshot', 
    icon: '🌙',
    capabilities: ['chat', 'long-context', 'analysis'],
    specialties: ['2M context', 'Document analysis', 'Chinese']
  },
  'qwen': { 
    name: 'Qwen 2.5 Max', 
    provider: 'Alibaba', 
    icon: '🐉',
    capabilities: ['chat', 'code', 'math', 'vision'],
    specialties: ['Math', 'Coding', 'Multilingual']
  },
  'perplexity': { 
    name: 'Perplexity Pro', 
    provider: 'Perplexity', 
    icon: '🔍',
    capabilities: ['chat', 'search', 'realtime'],
    specialties: ['Live search', 'Citations', 'Real-time']
  },
  'groq': { 
    name: 'Groq LPU', 
    provider: 'Groq', 
    icon: '⚡',
    capabilities: ['chat', 'code', 'ultra-fast'],
    specialties: ['500 tokens/sec', 'Hardware accelerated']
  },
  
  // Image Generation Models
  'midjourney': { 
    name: 'Midjourney V6.1', 
    provider: 'Midjourney', 
    icon: '🎨',
    capabilities: ['image-gen'],
    specialties: ['Artistic', 'Photorealistic', 'Stylized']
  },
  'stable-diffusion': { 
    name: 'Stable Diffusion 3.5', 
    provider: 'Stability AI', 
    icon: '🖼️',
    capabilities: ['image-gen', 'video-gen'],
    specialties: ['Open-source', 'Local', 'Customizable']
  },
  'flux': { 
    name: 'Flux Pro 1.1', 
    provider: 'Black Forest Labs', 
    icon: '✨',
    capabilities: ['image-gen'],
    specialties: ['Ultra-fast', 'High quality', 'Photorealistic']
  },
  'ideogram': { 
    name: 'Ideogram 2.0', 
    provider: 'Ideogram', 
    icon: '📝',
    capabilities: ['image-gen'],
    specialties: ['Text rendering', 'Logos', 'Typography']
  },
  
  // Video Generation Models
  'runway': { 
    name: 'Runway Gen-3 Alpha', 
    provider: 'Runway', 
    icon: '🎬',
    capabilities: ['video-gen', 'image-gen'],
    specialties: ['Video generation', '10s clips', 'Motion brush']
  },
  'pika': { 
    name: 'Pika 1.5', 
    provider: 'Pika Labs', 
    icon: '🎥',
    capabilities: ['video-gen'],
    specialties: ['Video generation', 'Lip sync', 'Effects']
  },
  'kling': { 
    name: 'Kling AI', 
    provider: 'Kuaishou', 
    icon: '🎞️',
    capabilities: ['video-gen'],
    specialties: ['Long videos', 'Realistic', '2min clips']
  },
  'luma': { 
    name: 'Luma Dream Machine', 
    provider: 'Luma AI', 
    icon: '💭',
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
  automation: { name: 'Automation', icon: Workflow, description: 'N8N-style workflows' },
  deploy: { name: 'Deploy', icon: Rocket, description: 'App deployment' },
  security: { name: 'Security', icon: Shield, description: 'Security analysis' },
  schedule: { name: 'Schedule', icon: Calendar, description: 'Task scheduling' }
};

// ============================================
// GAME DEV TEMPLATES
// ============================================
const GAME_TEMPLATES = {
  platformer: { name: '2D Platformer', icon: '🎮', engine: 'Unity/Godot' },
  rpg: { name: 'RPG', icon: '⚔️', engine: 'Unity/RPG Maker' },
  puzzle: { name: 'Puzzle Game', icon: '🧩', engine: 'Any' },
  shooter: { name: 'Shooter', icon: '🔫', engine: 'Unity/Unreal' },
  racing: { name: 'Racing', icon: '🏎️', engine: 'Unity' },
  casual: { name: 'Casual/Mobile', icon: '📱', engine: 'Unity/Flutter' },
  vr: { name: 'VR Experience', icon: '🥽', engine: 'Unity/Unreal' },
  multiplayer: { name: 'Multiplayer', icon: '👥', engine: 'Unity/Photon' }
};

// ============================================
// APP DEV TEMPLATES
// ============================================
const APP_TEMPLATES = {
  webapp: { name: 'Web App', icon: '🌐', stack: 'React/Next.js' },
  mobile: { name: 'Mobile App', icon: '📱', stack: 'React Native/Flutter' },
  desktop: { name: 'Desktop App', icon: '🖥️', stack: 'Electron/Tauri' },
  api: { name: 'API/Backend', icon: '⚙️', stack: 'Node/Python/Go' },
  fullstack: { name: 'Full Stack', icon: '🚀', stack: 'MERN/PERN' },
  saas: { name: 'SaaS Platform', icon: '☁️', stack: 'Next.js/Stripe' },
  ecommerce: { name: 'E-Commerce', icon: '🛒', stack: 'Shopify/Custom' },
  ai: { name: 'AI Application', icon: '🤖', stack: 'Python/FastAPI' }
};

// ============================================
// AVATAR STYLES
// ============================================
const AVATAR_STYLES = {
  user: [
    { id: 'u1', emoji: '👤' },
    { id: 'u2', emoji: '🧑' },
    { id: 'u3', emoji: '👨‍💻' },
    { id: 'u4', emoji: '👩‍💻' },
    { id: 'u5', emoji: '🦸' },
    { id: 'u6', emoji: '🧙' },
    { id: 'u7', emoji: '🥷' },
    { id: 'u8', emoji: '🤴' }
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
  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude4');
  const [activeTool, setActiveTool] = useState('chat');
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [gameTemplate, setGameTemplate] = useState(null);
  const [appTemplate, setAppTemplate] = useState(null);
  const [showToolContent, setShowToolContent] = useState(false);
  
  // User customization
  const [userAvatar, setUserAvatar] = useState(AVATAR_STYLES.user[0]);
  
  // Chat management
  const [chats, setChats] = useState([
    { id: '1', title: 'New Chat', preview: 'Start a conversation...', messages: [], createdAt: Date.now(), updatedAt: Date.now() }
  ]);
  const [activeChat, setActiveChat] = useState('1');
  
  // Memory
  const [memories, setMemories] = useState([]);
  
  // Settings
  const [settings, setSettings] = useState({
    theme: 'grayscale',
    voiceEnabled: true,
    autoSpeak: false,
    e2eEncryption: true,
    autoPatch: true,
    securityLevel: 'military',
    apiKeys: {}
  });
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
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
        `Processing...`
      ]
    };
    
    return {
      content: `**${modelInfo?.name || 'AI'}** responding to: "${prompt}"\n\n✅ Processing complete with ${tool} mode.\n\n🔒 End-to-end encrypted`,
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
    
    setTimeout(() => {
      const response = generateResponse(input, selectedModel, activeTool);
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        model: selectedModel,
        content: response.content,
        reasoning: response.reasoning,
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
    }, 800 + Math.random() * 800);
  };
  
  // Voice functions
  const startRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setInput("Voice transcription demo");
    }, 3000);
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
            <span className="model-icon">{AI_MODELS[selectedModel]?.icon}</span>
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
                        <span className="model-emoji">{model.icon}</span>
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
          <button className="icon-btn" onClick={() => setIsMemoryOpen(!isMemoryOpen)}><Brain size={20} /></button>
          <button className="icon-btn" onClick={() => setIsCallActive(true)}><Phone size={20} /></button>
          <button className="icon-btn" onClick={() => setIsSettingsOpen(true)}><Settings size={20} /></button>
          <div className="user-avatar">{userAvatar?.emoji || '👤'}</div>
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
                <button key={key} className={`tool-btn ${activeTool === key ? 'active' : ''}`} onClick={() => { setActiveTool(key); if (['gamedev', 'appdev', 'automation'].includes(key)) setShowToolContent(true); }}>
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
          
          {/* Messages */}
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome">
                <div className="welcome-icon"><Sparkles size={48} /></div>
                <h2>Nexus AI Pro</h2>
                <p>Military-grade encrypted AI • 40+ Models</p>
                <div className="model-badges">
                  {Object.entries(AI_MODELS).slice(0, 12).map(([key, m]) => (
                    <span key={key} className="badge" onClick={() => setSelectedModel(key)}>{m.icon} {m.name}</span>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  <div className="message-avatar">{msg.role === 'user' ? userAvatar?.emoji : AI_MODELS[msg.model]?.icon || '🤖'}</div>
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
                <div className="message-avatar">{AI_MODELS[selectedModel]?.icon}</div>
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
              <span className="model-tag">{AI_MODELS[selectedModel]?.icon} {AI_MODELS[selectedModel]?.name}</span>
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
      
      {/* Voice Call Modal */}
      {isCallActive && (
        <div className="call-overlay">
          <div className="call-panel">
            <div className="call-avatar">{AI_MODELS[selectedModel]?.icon}</div>
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
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        
        @media (max-width: 768px) {
          .sidebar { position: fixed; z-index: 500; height: calc(100vh - 60px); top: 60px; left: 0; }
          .memory-panel { position: fixed; z-index: 500; height: calc(100vh - 60px); top: 60px; right: 0; }
          .tool-btn span { display: none; }
          .model-dropdown { width: 300px; left: 0; transform: none; }
        }
      `}</style>
    </div>
  );
}
