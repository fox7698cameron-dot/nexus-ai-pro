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
  Network, Wifi, Radio, Antenna, Signal
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
// AI MODEL CONFIGURATIONS
// ============================================
const AI_MODELS = {
  claude: { 
    name: 'Claude 4 Opus', 
    provider: 'Anthropic', 
    icon: '🧠',
    color: '#D97706',
    gradient: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)',
    capabilities: ['chat', 'code', 'analysis', 'writing', 'reasoning'],
    specialties: ['Complex reasoning', 'Code generation', 'Creative writing']
  },
  gpt4: { 
    name: 'GPT-4 Turbo', 
    provider: 'OpenAI', 
    icon: '🤖',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    capabilities: ['chat', 'code', 'analysis', 'image-gen', 'vision'],
    specialties: ['Multimodal', 'DALL-E 3', 'Function calling']
  },
  gemini: { 
    name: 'Gemini Ultra', 
    provider: 'Google', 
    icon: '💫',
    color: '#4285F4',
    gradient: 'linear-gradient(135deg, #4285F4 0%, #8AB4F8 100%)',
    capabilities: ['chat', 'code', 'multimodal', 'analysis', 'video'],
    specialties: ['Long context', 'Multimodal', 'Real-time']
  },
  deepseek: { 
    name: 'DeepSeek V3', 
    provider: 'DeepSeek', 
    icon: '🔮',
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
    capabilities: ['chat', 'code', 'reasoning', 'math'],
    specialties: ['Deep reasoning', 'Mathematics', 'Code']
  },
  grok: { 
    name: 'Grok 2', 
    provider: 'xAI', 
    icon: '⚡',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
    capabilities: ['chat', 'realtime', 'analysis', 'humor'],
    specialties: ['Real-time data', 'X integration', 'Wit']
  },
  kimi: { 
    name: 'Kimi', 
    provider: 'Moonshot', 
    icon: '🌙',
    color: '#6366F1',
    gradient: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
    capabilities: ['chat', 'long-context', 'analysis'],
    specialties: ['200K context', 'Document analysis']
  },
  copilot: { 
    name: 'Copilot', 
    provider: 'Microsoft', 
    icon: '✨',
    color: '#0078D4',
    gradient: 'linear-gradient(135deg, #0078D4 0%, #50A0DC 100%)',
    capabilities: ['chat', 'code', 'productivity', 'office'],
    specialties: ['Code completion', 'Office integration']
  },
  llama: { 
    name: 'Llama 3.2', 
    provider: 'Meta', 
    icon: '🦙',
    color: '#1877F2',
    gradient: 'linear-gradient(135deg, #1877F2 0%, #4BA3FB 100%)',
    capabilities: ['chat', 'code', 'open-source', 'local'],
    specialties: ['Open source', 'Local deployment']
  },
  mixtral: { 
    name: 'Mixtral 8x22B', 
    provider: 'Mistral', 
    icon: '🌀',
    color: '#FF6B35',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF8F65 100%)',
    capabilities: ['chat', 'code', 'multilingual', 'moe'],
    specialties: ['Mixture of Experts', 'Multilingual']
  },
  qwen: { 
    name: 'Qwen 2.5', 
    provider: 'Alibaba', 
    icon: '🐉',
    color: '#FF6A00',
    gradient: 'linear-gradient(135deg, #FF6A00 0%, #FF9248 100%)',
    capabilities: ['chat', 'code', 'math', 'vision'],
    specialties: ['Math', 'Coding', 'Multilingual']
  }
};

// ============================================
// TOOL CATEGORIES
// ============================================
const TOOLS = {
  chat: { name: 'Chat', icon: MessageSquare, description: 'Conversational AI', color: '#6366F1' },
  code: { name: 'Code', icon: Code, description: 'Code generation & debugging', color: '#10B981' },
  gamedev: { name: 'Game Dev', icon: Gamepad2, description: 'Game development suite', color: '#F59E0B' },
  appdev: { name: 'App Dev', icon: Smartphone, description: 'Application development', color: '#8B5CF6' },
  image: { name: 'Image Gen', icon: Image, description: 'AI image generation', color: '#EC4899' },
  video: { name: 'Video Gen', icon: Video, description: 'AI video creation', color: '#EF4444' },
  automation: { name: 'Automation', icon: Workflow, description: 'N8N-style workflows', color: '#06B6D4' },
  deploy: { name: 'Deploy', icon: Rocket, description: 'App deployment', color: '#84CC16' },
  security: { name: 'Security', icon: Shield, description: 'Security analysis', color: '#F97316' },
  schedule: { name: 'Schedule', icon: Calendar, description: 'Task scheduling', color: '#A855F7' }
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
// DEFAULT AVATARS
// ============================================
const AVATAR_STYLES = {
  user: [
    { id: 'u1', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', emoji: '👤' },
    { id: 'u2', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', emoji: '🧑' },
    { id: 'u3', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', emoji: '👨‍💻' },
    { id: 'u4', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', emoji: '👩‍💻' },
    { id: 'u5', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', emoji: '🦸' },
    { id: 'u6', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', emoji: '🧙' },
    { id: 'u7', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', emoji: '🥷' },
    { id: 'u8', gradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', emoji: '🤴' }
  ],
  ai: [
    { id: 'a1', gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', emoji: '🤖' },
    { id: 'a2', gradient: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', emoji: '🧠' },
    { id: 'a3', gradient: 'linear-gradient(135deg, #14B8A6 0%, #22D3EE 100%)', emoji: '✨' },
    { id: 'a4', gradient: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)', emoji: '⚡' },
    { id: 'a5', gradient: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', emoji: '🔮' },
    { id: 'a6', gradient: 'linear-gradient(135deg, #8B5CF6 0%, #C084FC 100%)', emoji: '🌟' },
    { id: 'a7', gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)', emoji: '💎' },
    { id: 'a8', gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)', emoji: '🎯' }
  ]
};

// ============================================
// AUTOMATION WORKFLOW NODES
// ============================================
const WORKFLOW_NODES = {
  trigger: { name: 'Trigger', icon: Play, color: '#10B981', inputs: 0, outputs: 1 },
  ai: { name: 'AI Model', icon: Brain, color: '#8B5CF6', inputs: 1, outputs: 1 },
  condition: { name: 'Condition', icon: GitBranch, color: '#F59E0B', inputs: 1, outputs: 2 },
  http: { name: 'HTTP Request', icon: Globe, color: '#3B82F6', inputs: 1, outputs: 1 },
  code: { name: 'Code', icon: Code, color: '#EF4444', inputs: 1, outputs: 1 },
  database: { name: 'Database', icon: Database, color: '#06B6D4', inputs: 1, outputs: 1 },
  email: { name: 'Email', icon: MessageSquare, color: '#EC4899', inputs: 1, outputs: 1 },
  schedule: { name: 'Schedule', icon: Clock, color: '#84CC16', inputs: 0, outputs: 1 },
  webhook: { name: 'Webhook', icon: Antenna, color: '#F97316', inputs: 1, outputs: 1 },
  transform: { name: 'Transform', icon: Wand2, color: '#A855F7', inputs: 1, outputs: 1 }
};

// ============================================
// SECURITY STATUS COMPONENT
// ============================================
const SecurityStatus = ({ status, onShowDetails }) => {
  const getStatusColor = () => {
    switch(status.level) {
      case 'secure': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div className="security-status" onClick={onShowDetails}>
      <div className="security-indicator" style={{ background: getStatusColor() }}>
        <ShieldCheck size={14} />
      </div>
      <span className="security-label">{status.label}</span>
      <div className="encryption-badge">
        <Lock size={10} />
        <span>AES-256</span>
      </div>
    </div>
  );
};

// ============================================
// AVATAR SELECTOR COMPONENT
// ============================================
const AvatarSelector = ({ type, selected, onSelect, isOpen, onToggle }) => {
  const avatars = type === 'user' ? AVATAR_STYLES.user : AVATAR_STYLES.ai;
  
  return (
    <div className="avatar-selector">
      <button className="avatar-preview" onClick={onToggle}>
        <div 
          className="avatar-circle"
          style={{ background: selected?.gradient || avatars[0].gradient }}
        >
          {selected?.emoji || avatars[0].emoji}
        </div>
        <Edit3 size={12} className="edit-icon" />
      </button>
      {isOpen && (
        <div className="avatar-dropdown">
          <h4>Select Avatar</h4>
          <div className="avatar-grid">
            {avatars.map(avatar => (
              <button
                key={avatar.id}
                className={`avatar-option ${selected?.id === avatar.id ? 'selected' : ''}`}
                onClick={() => { onSelect(avatar); onToggle(); }}
              >
                <div className="avatar-circle" style={{ background: avatar.gradient }}>
                  {avatar.emoji}
                </div>
              </button>
            ))}
          </div>
          <div className="custom-avatar">
            <input type="text" placeholder="Custom emoji..." maxLength={2} />
            <input type="color" defaultValue="#6366F1" />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// REASONING DISPLAY COMPONENT
// ============================================
const ReasoningDisplay = ({ reasoning, isExpanded, onToggle }) => {
  if (!reasoning) return null;
  
  return (
    <div className="reasoning-container">
      <button className="reasoning-header" onClick={onToggle}>
        <Brain size={14} />
        <span>Reasoning Process</span>
        <span className="reasoning-time">{reasoning.duration}ms</span>
        <ChevronDown size={14} className={isExpanded ? 'rotated' : ''} />
      </button>
      {isExpanded && (
        <div className="reasoning-content">
          {reasoning.steps.map((step, i) => (
            <div key={i} className="reasoning-step">
              <span className="step-number">{i + 1}</span>
              <span className="step-text">{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// GAME DEV PANEL COMPONENT
// ============================================
const GameDevPanel = ({ onSelectTemplate, activeTemplate }) => {
  const [gameConfig, setGameConfig] = useState({
    name: '',
    genre: '',
    engine: 'unity',
    platform: 'cross-platform'
  });

  return (
    <div className="gamedev-panel">
      <div className="panel-header">
        <Gamepad2 size={18} />
        <h3>Game Development Studio</h3>
      </div>
      
      <div className="template-grid">
        {Object.entries(GAME_TEMPLATES).map(([key, template]) => (
          <button
            key={key}
            className={`template-card ${activeTemplate === key ? 'active' : ''}`}
            onClick={() => onSelectTemplate(key)}
          >
            <span className="template-icon">{template.icon}</span>
            <span className="template-name">{template.name}</span>
            <span className="template-engine">{template.engine}</span>
          </button>
        ))}
      </div>
      
      <div className="quick-actions">
        <button className="action-btn">
          <Code size={16} /> Generate Code
        </button>
        <button className="action-btn">
          <Layers size={16} /> Level Designer
        </button>
        <button className="action-btn">
          <Users size={16} /> Character Creator
        </button>
        <button className="action-btn">
          <Puzzle size={16} /> Asset Generator
        </button>
      </div>
    </div>
  );
};

// ============================================
// APP DEV PANEL COMPONENT
// ============================================
const AppDevPanel = ({ onSelectTemplate, activeTemplate }) => {
  return (
    <div className="appdev-panel">
      <div className="panel-header">
        <Smartphone size={18} />
        <h3>Application Development</h3>
      </div>
      
      <div className="template-grid">
        {Object.entries(APP_TEMPLATES).map(([key, template]) => (
          <button
            key={key}
            className={`template-card ${activeTemplate === key ? 'active' : ''}`}
            onClick={() => onSelectTemplate(key)}
          >
            <span className="template-icon">{template.icon}</span>
            <span className="template-name">{template.name}</span>
            <span className="template-stack">{template.stack}</span>
          </button>
        ))}
      </div>
      
      <div className="quick-actions">
        <button className="action-btn">
          <Terminal size={16} /> Scaffold Project
        </button>
        <button className="action-btn">
          <Database size={16} /> Database Schema
        </button>
        <button className="action-btn">
          <Shield size={16} /> Auth System
        </button>
        <button className="action-btn">
          <Cloud size={16} /> Deploy
        </button>
      </div>
    </div>
  );
};

// ============================================
// AUTOMATION WORKFLOW BUILDER
// ============================================
const WorkflowBuilder = ({ workflow, onUpdateWorkflow }) => {
  const [nodes, setNodes] = useState(workflow?.nodes || []);
  const [connections, setConnections] = useState(workflow?.connections || []);
  const [selectedNode, setSelectedNode] = useState(null);

  const addNode = (type) => {
    const newNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x: 100 + nodes.length * 50, y: 100 },
      config: {}
    };
    setNodes([...nodes, newNode]);
  };

  return (
    <div className="workflow-builder">
      <div className="workflow-header">
        <Workflow size={18} />
        <h3>Automation Workflow</h3>
        <div className="workflow-controls">
          <button className="control-btn play">
            <Play size={14} /> Run
          </button>
          <button className="control-btn">
            <Save size={14} /> Save
          </button>
        </div>
      </div>
      
      <div className="workflow-toolbar">
        {Object.entries(WORKFLOW_NODES).map(([key, node]) => {
          const Icon = node.icon;
          return (
            <button
              key={key}
              className="node-btn"
              onClick={() => addNode(key)}
              title={node.name}
            >
              <Icon size={16} style={{ color: node.color }} />
            </button>
          );
        })}
      </div>
      
      <div className="workflow-canvas">
        {nodes.length === 0 ? (
          <div className="workflow-empty">
            <Workflow size={48} />
            <p>Drag nodes here to build your automation</p>
          </div>
        ) : (
          <div className="workflow-nodes">
            {nodes.map(node => {
              const nodeType = WORKFLOW_NODES[node.type];
              const Icon = nodeType.icon;
              return (
                <div
                  key={node.id}
                  className={`workflow-node ${selectedNode === node.id ? 'selected' : ''}`}
                  style={{ 
                    left: node.position.x, 
                    top: node.position.y,
                    borderColor: nodeType.color
                  }}
                  onClick={() => setSelectedNode(node.id)}
                >
                  <div className="node-header" style={{ background: nodeType.color }}>
                    <Icon size={14} />
                    <span>{nodeType.name}</span>
                  </div>
                  <div className="node-body">
                    <span className="node-config">Configure...</span>
                  </div>
                  {nodeType.inputs > 0 && <div className="node-input" />}
                  {nodeType.outputs > 0 && <div className="node-output" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// SECURITY DASHBOARD
// ============================================
const SecurityDashboard = ({ isOpen, onClose }) => {
  const [securityMetrics] = useState({
    encryptionStatus: 'Active',
    lastScan: new Date().toISOString(),
    threatsBlocked: 0,
    vulnerabilities: 0,
    patchStatus: 'Up to date',
    certExpiry: '365 days'
  });

  if (!isOpen) return null;

  return (
    <div className="security-overlay">
      <div className="security-dashboard">
        <div className="dashboard-header">
          <Shield size={24} />
          <h2>Security Command Center</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="security-grid">
          <div className="security-card encryption">
            <Lock size={24} />
            <h4>Encryption</h4>
            <p className="status active">AES-256-GCM Active</p>
            <span className="detail">Military-grade encryption</span>
          </div>
          
          <div className="security-card threats">
            <ShieldAlert size={24} />
            <h4>Threats Blocked</h4>
            <p className="value">{securityMetrics.threatsBlocked}</p>
            <span className="detail">Last 24 hours</span>
          </div>
          
          <div className="security-card vulnerabilities">
            <Bug size={24} />
            <h4>Vulnerabilities</h4>
            <p className="value">{securityMetrics.vulnerabilities}</p>
            <span className="detail">Auto-patching enabled</span>
          </div>
          
          <div className="security-card patch">
            <RotateCcw size={24} />
            <h4>Patch Status</h4>
            <p className="status active">{securityMetrics.patchStatus}</p>
            <span className="detail">Self-healing active</span>
          </div>
          
          <div className="security-card auth">
            <Fingerprint size={24} />
            <h4>Authentication</h4>
            <p className="status active">Multi-Factor</p>
            <span className="detail">Biometric + Token</span>
          </div>
          
          <div className="security-card cert">
            <Key size={24} />
            <h4>Certificates</h4>
            <p className="value">{securityMetrics.certExpiry}</p>
            <span className="detail">Until expiry</span>
          </div>
        </div>
        
        <div className="security-actions">
          <button className="security-btn scan">
            <ScanFace size={16} /> Run Security Scan
          </button>
          <button className="security-btn patch">
            <Wrench size={16} /> Force Patch Check
          </button>
          <button className="security-btn rotate">
            <RotateCcw size={16} /> Rotate Keys
          </button>
          <button className="security-btn audit">
            <Activity size={16} /> View Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MESSAGE COMPONENT
// ============================================
const Message = ({ message, userAvatar, aiAvatars, onCopy, onSpeak, onShowReasoning }) => {
  const [copied, setCopied] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const avatar = message.role === 'user' 
    ? userAvatar 
    : aiAvatars[message.model] || AVATAR_STYLES.ai[0];

  return (
    <div className={`message ${message.role}`}>
      <div className="message-avatar">
        <div 
          className="avatar-circle"
          style={{ background: message.role === 'user' ? userAvatar?.gradient : AI_MODELS[message.model]?.gradient }}
        >
          {message.role === 'user' ? userAvatar?.emoji || '👤' : AI_MODELS[message.model]?.icon || '🤖'}
        </div>
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">
            {message.role === 'user' ? 'You' : AI_MODELS[message.model]?.name || 'AI'}
          </span>
          <span className="message-time">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
          {message.encrypted && (
            <span className="encrypted-badge">
              <Lock size={10} /> Encrypted
            </span>
          )}
        </div>
        
        {message.reasoning && (
          <ReasoningDisplay 
            reasoning={message.reasoning}
            isExpanded={reasoningExpanded}
            onToggle={() => setReasoningExpanded(!reasoningExpanded)}
          />
        )}
        
        <div className="message-text">
          {message.content}
          {message.attachments?.map((att, i) => (
            <div key={i} className="attachment">
              {att.type === 'image' ? (
                <img src={att.url} alt="attachment" />
              ) : (
                <div className="file-attachment">
                  <FileText size={16} /> {att.name}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="message-actions">
          <button onClick={handleCopy} title="Copy">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <button onClick={() => onSpeak?.(message.content)} title="Speak">
            <Volume2 size={14} />
          </button>
          {message.role === 'assistant' && (
            <button onClick={() => {}} title="Regenerate">
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// MODEL SELECTOR COMPONENT
// ============================================
const ModelSelector = ({ selectedModel, onSelect, isOpen, onToggle }) => {
  return (
    <div className="model-selector">
      <button className="model-selector-btn" onClick={onToggle}>
        <span className="model-icon">{AI_MODELS[selectedModel]?.icon}</span>
        <span className="model-name">{AI_MODELS[selectedModel]?.name}</span>
        <ChevronDown size={16} className={isOpen ? 'rotated' : ''} />
      </button>
      {isOpen && (
        <div className="model-dropdown">
          {Object.entries(AI_MODELS).map(([key, model]) => (
            <button
              key={key}
              className={`model-option ${selectedModel === key ? 'active' : ''}`}
              onClick={() => { onSelect(key); onToggle(); }}
            >
              <div className="model-icon-wrapper" style={{ background: model.gradient }}>
                <span>{model.icon}</span>
              </div>
              <div className="model-info">
                <span className="model-name">{model.name}</span>
                <span className="model-provider">{model.provider}</span>
              </div>
              <div className="model-capabilities">
                {model.capabilities.slice(0, 2).map(cap => (
                  <span key={cap} className="capability-tag">{cap}</span>
                ))}
              </div>
              {selectedModel === key && <Check size={16} className="check-icon" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// TOOL PANEL COMPONENT
// ============================================
const ToolPanel = ({ activeTool, onSelectTool }) => {
  return (
    <div className="tool-panel">
      {Object.entries(TOOLS).map(([key, tool]) => {
        const Icon = tool.icon;
        return (
          <button
            key={key}
            className={`tool-btn ${activeTool === key ? 'active' : ''}`}
            onClick={() => onSelectTool(key)}
            title={tool.description}
            style={{ '--tool-color': tool.color }}
          >
            <Icon size={18} />
            <span>{tool.name}</span>
          </button>
        );
      })}
    </div>
  );
};

// ============================================
// CHAT HISTORY SIDEBAR
// ============================================
const ChatHistory = ({ chats, activeChat, onSelectChat, onNewChat, onDeleteChat, isOpen }) => {
  if (!isOpen) return null;
  
  return (
    <div className="chat-history">
      <div className="history-header">
        <h3><History size={18} /> Recent Chats</h3>
        <button className="new-chat-btn" onClick={onNewChat}>
          <Plus size={18} /> New
        </button>
      </div>
      <div className="history-search">
        <Search size={14} />
        <input type="text" placeholder="Search chats..." />
      </div>
      <div className="history-list">
        {chats.map(chat => (
          <div 
            key={chat.id} 
            className={`history-item ${activeChat === chat.id ? 'active' : ''}`}
            onClick={() => onSelectChat(chat.id)}
          >
            <div className="history-item-content">
              <span className="history-title">{chat.title}</span>
              <span className="history-preview">{chat.preview}</span>
              <span className="history-date">
                {new Date(chat.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <button 
              className="delete-chat" 
              onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// MEMORY PANEL
// ============================================
const MemoryPanel = ({ memories, onAddMemory, onDeleteMemory, isOpen }) => {
  const [newMemory, setNewMemory] = useState('');
  
  if (!isOpen) return null;
  
  return (
    <div className="memory-panel">
      <div className="memory-header">
        <h3><Brain size={18} /> Persistent Memory</h3>
        <span className="memory-count">{memories.length} items</span>
      </div>
      <div className="memory-input">
        <input
          type="text"
          value={newMemory}
          onChange={(e) => setNewMemory(e.target.value)}
          placeholder="Add a memory..."
          onKeyPress={(e) => {
            if (e.key === 'Enter' && newMemory.trim()) {
              onAddMemory(newMemory);
              setNewMemory('');
            }
          }}
        />
        <button onClick={() => { if (newMemory.trim()) { onAddMemory(newMemory); setNewMemory(''); }}}>
          <Plus size={16} />
        </button>
      </div>
      <div className="memory-list">
        {memories.map((memory, i) => (
          <div key={i} className="memory-item">
            <Database size={14} />
            <span>{memory.content}</span>
            <button onClick={() => onDeleteMemory(i)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// SETTINGS PANEL
// ============================================
const SettingsPanel = ({ settings, onUpdateSettings, isOpen, onClose, userAvatar, onUpdateAvatar }) => {
  const [avatarSelectorOpen, setAvatarSelectorOpen] = useState(false);
  
  if (!isOpen) return null;
  
  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <h3><Settings size={18} /> Settings</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="settings-content">
          <div className="setting-group">
            <h4>Profile</h4>
            <div className="setting-item avatar-setting">
              <label>Your Avatar</label>
              <AvatarSelector
                type="user"
                selected={userAvatar}
                onSelect={onUpdateAvatar}
                isOpen={avatarSelectorOpen}
                onToggle={() => setAvatarSelectorOpen(!avatarSelectorOpen)}
              />
            </div>
            <div className="setting-item">
              <label>Display Name</label>
              <input
                type="text"
                value={settings.displayName || ''}
                onChange={(e) => onUpdateSettings({ ...settings, displayName: e.target.value })}
                placeholder="Your name"
              />
            </div>
          </div>
          
          <div className="setting-group">
            <h4>Security</h4>
            <div className="setting-item">
              <label>End-to-End Encryption</label>
              <input
                type="checkbox"
                checked={settings.e2eEncryption !== false}
                onChange={(e) => onUpdateSettings({ ...settings, e2eEncryption: e.target.checked })}
              />
            </div>
            <div className="setting-item">
              <label>Auto-Patch Vulnerabilities</label>
              <input
                type="checkbox"
                checked={settings.autoPatch !== false}
                onChange={(e) => onUpdateSettings({ ...settings, autoPatch: e.target.checked })}
              />
            </div>
            <div className="setting-item">
              <label>Security Level</label>
              <select 
                value={settings.securityLevel || 'military'}
                onChange={(e) => onUpdateSettings({ ...settings, securityLevel: e.target.value })}
              >
                <option value="standard">Standard</option>
                <option value="high">High</option>
                <option value="military">Military Grade</option>
              </select>
            </div>
          </div>
          
          <div className="setting-group">
            <h4>API Configuration</h4>
            {Object.entries(AI_MODELS).slice(0, 5).map(([key, model]) => (
              <div key={key} className="setting-item">
                <label>{model.name}</label>
                <input
                  type="password"
                  placeholder={`${model.provider} API key`}
                  value={settings.apiKeys?.[key] || ''}
                  onChange={(e) => onUpdateSettings({
                    ...settings,
                    apiKeys: { ...settings.apiKeys, [key]: e.target.value }
                  })}
                />
              </div>
            ))}
          </div>
          
          <div className="setting-group">
            <h4>Voice & Audio</h4>
            <div className="setting-item">
              <label>Voice Enabled</label>
              <input
                type="checkbox"
                checked={settings.voiceEnabled}
                onChange={(e) => onUpdateSettings({ ...settings, voiceEnabled: e.target.checked })}
              />
            </div>
            <div className="setting-item">
              <label>Auto-speak Responses</label>
              <input
                type="checkbox"
                checked={settings.autoSpeak}
                onChange={(e) => onUpdateSettings({ ...settings, autoSpeak: e.target.checked })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// VOICE CALL COMPONENT
// ============================================
const VoiceCall = ({ isActive, onEnd, model }) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => setDuration(d => d + 1), 1000);
      return () => clearInterval(interval);
    }
    setDuration(0);
  }, [isActive]);
  
  if (!isActive) return null;
  
  const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2, '0')}`;
  const modelInfo = AI_MODELS[model];
  
  return (
    <div className="voice-call-overlay">
      <div className="voice-call-panel">
        <div className="call-avatar" style={{ background: modelInfo?.gradient }}>
          <div className="call-waves">
            <div className="wave"></div>
            <div className="wave"></div>
            <div className="wave"></div>
          </div>
          <span className="call-emoji">{modelInfo?.icon || '🤖'}</span>
        </div>
        <h3>Speaking with {modelInfo?.name}</h3>
        <p className="call-duration">{formatTime(duration)}</p>
        <div className="call-status">
          <Signal size={14} />
          <span>Encrypted Connection</span>
          <Lock size={14} />
        </div>
        <div className="call-actions">
          <button 
            className={`mute-btn ${isMuted ? 'muted' : ''}`}
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button className="end-call-btn" onClick={onEnd}>
            <PhoneOff size={20} />
          </button>
          <button className="speaker-btn">
            <Volume2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function NexusAI() {
  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude');
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
  
  // User customization
  const [userAvatar, setUserAvatar] = useState(AVATAR_STYLES.user[0]);
  const [aiAvatars, setAiAvatars] = useState({});
  
  // Chat management
  const [chats, setChats] = useState([
    { id: '1', title: 'New Chat', preview: 'Start a conversation...', messages: [], createdAt: Date.now(), updatedAt: Date.now() }
  ]);
  const [activeChat, setActiveChat] = useState('1');
  
  // Memory
  const [memories, setMemories] = useState([]);
  
  // Settings
  const [settings, setSettings] = useState({
    theme: 'dark',
    voiceEnabled: true,
    autoSpeak: false,
    memoryEnabled: true,
    e2eEncryption: true,
    autoPatch: true,
    securityLevel: 'military',
    apiKeys: {}
  });
  
  // Security status
  const [securityStatus] = useState({
    level: 'secure',
    label: 'Protected',
    encryption: 'AES-256-GCM'
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

  // Simulate AI response with reasoning
  const generateResponse = (prompt, model, tool) => {
    const modelInfo = AI_MODELS[model];
    const memContext = memories.length > 0 
      ? `\n\n[Memory context: ${memories.map(m => m.content).join(', ')}]`
      : '';
    
    const reasoning = {
      duration: Math.floor(Math.random() * 500) + 200,
      steps: [
        `Analyzing request: "${prompt.slice(0, 50)}..."`,
        `Selected approach: ${modelInfo.specialties[0]}`,
        `Processing with ${modelInfo.name}...`,
        `Applying ${tool} mode optimizations`
      ]
    };
    
    const responses = {
      chat: {
        content: `Hello! I'm ${modelInfo.name} powered by ${modelInfo.provider}. I'd be happy to help you with: "${prompt}"\n\nThis platform features military-grade AES-256-GCM encryption, end-to-end security, and automatic vulnerability patching.${memContext}`,
        reasoning
      },
      code: {
        content: `\`\`\`javascript\n// ${modelInfo.name} Code Assistant\n// Request: ${prompt}\n\n// Military-grade encrypted code transmission\nconst secureFunction = async () => {\n  // AES-256 encrypted payload\n  const encrypted = await encrypt(data);\n  return process(encrypted);\n};\n\nexport default secureFunction;\n\`\`\`\n\n🔒 Code transmitted via encrypted channel.`,
        reasoning
      },
      gamedev: {
        content: `🎮 **Game Development Assistant**\n\n**Project:** "${prompt}"\n**Template:** ${gameTemplate ? GAME_TEMPLATES[gameTemplate].name : 'Custom'}\n**Engine:** ${gameTemplate ? GAME_TEMPLATES[gameTemplate].engine : 'Recommended based on requirements'}\n\n**I can help with:**\n• Game mechanics & physics\n• Character controllers\n• Level design patterns\n• AI behavior trees\n• Multiplayer networking\n• Asset optimization\n• Performance profiling\n\n**Next Steps:**\n1. Define core gameplay loop\n2. Create prototype\n3. Implement core systems\n4. Polish & iterate\n\nWhat aspect would you like to explore first?`,
        reasoning: { ...reasoning, steps: [...reasoning.steps, 'Loading game development context'] }
      },
      appdev: {
        content: `📱 **Application Development Assistant**\n\n**Project:** "${prompt}"\n**Template:** ${appTemplate ? APP_TEMPLATES[appTemplate].name : 'Custom'}\n**Stack:** ${appTemplate ? APP_TEMPLATES[appTemplate].stack : 'Recommended based on requirements'}\n\n**Architecture Options:**\n• Frontend: React/Vue/Svelte\n• Backend: Node/Python/Go\n• Database: PostgreSQL/MongoDB\n• Auth: JWT + OAuth2\n• Hosting: Vercel/Railway/AWS\n\n**Security Features (Auto-enabled):**\n✅ HTTPS/TLS 1.3\n✅ SQL Injection Prevention\n✅ XSS Protection\n✅ CSRF Tokens\n✅ Rate Limiting\n✅ Input Validation\n\nReady to scaffold your project?`,
        reasoning: { ...reasoning, steps: [...reasoning.steps, 'Loading app development context'] }
      },
      automation: {
        content: `⚡ **N8N-Style Automation Builder**\n\n**Workflow Request:** "${prompt}"\n\n**Available Nodes:**\n• Triggers (Schedule, Webhook, Event)\n• AI Models (Claude, GPT-4, Gemini)\n• HTTP Requests\n• Database Operations\n• Conditional Logic\n• Transformations\n• Notifications\n\n**Security:**\n🔐 All data encrypted in transit and at rest\n🔐 API keys stored in secure vault\n🔐 Audit logging enabled\n\nUse the workflow builder to visually create your automation, or describe what you want to achieve.`,
        reasoning
      },
      security: {
        content: `🛡️ **Security Analysis**\n\n**Query:** "${prompt}"\n\n**Current Security Status:**\n✅ Encryption: AES-256-GCM (Military Grade)\n✅ Authentication: Multi-Factor Active\n✅ Certificates: Valid (365 days)\n✅ Vulnerability Scan: Clean\n✅ Auto-Patching: Enabled\n✅ Intrusion Detection: Active\n\n**Security Recommendations:**\n1. Rotate API keys every 90 days\n2. Enable hardware security keys\n3. Review audit logs weekly\n4. Test backup restoration monthly\n\nWant me to run a comprehensive security audit?`,
        reasoning: { ...reasoning, steps: [...reasoning.steps, 'Running security protocols'] }
      },
      image: {
        content: `🎨 **Image Generation**\n\n**Prompt:** "${prompt}"\n\n**Available Engines:**\n• DALL-E 3 (OpenAI)\n• Stable Diffusion XL\n• Midjourney API\n• Imagen (Google)\n\n**Settings:**\n• Resolution: 1024x1024\n• Style: Photorealistic\n• Safety Filter: Enabled\n\n[Image generation in progress...]\n\n🔒 All generated images are encrypted before storage.`,
        reasoning
      },
      video: {
        content: `🎬 **Video Generation**\n\n**Prompt:** "${prompt}"\n\n**Available Engines:**\n• Sora (OpenAI)\n• Runway Gen-3\n• Pika Labs\n• Stable Video\n\n**Settings:**\n• Duration: Up to 60s\n• Resolution: 1080p\n• FPS: 24\n\n[Video generation queued...]\n\n🔒 Secure encrypted output.`,
        reasoning
      },
      deploy: {
        content: `🚀 **Deployment Assistant**\n\n**Project:** "${prompt}"\n\n**Deployment Targets:**\n• Vercel (Recommended for frontend)\n• Railway (Full-stack)\n• AWS (Enterprise)\n• Google Cloud\n• Azure\n• DigitalOcean\n\n**Security Checklist:**\n✅ Environment variables secured\n✅ HTTPS enforced\n✅ WAF enabled\n✅ DDoS protection active\n✅ Backup configured\n\nReady to deploy?`,
        reasoning
      },
      schedule: {
        content: `📅 **Task Scheduler**\n\n**Task:** "${prompt}"\n\n**Schedule Options:**\n• One-time\n• Recurring (daily/weekly/monthly)\n• Cron expression\n• Event-triggered\n\n**Integrations:**\n• Calendar sync\n• Email notifications\n• Slack/Discord alerts\n• Webhook triggers\n\nWhen should this task run?`,
        reasoning
      }
    };
    
    return responses[tool] || responses.chat;
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
      encrypted: settings.e2eEncryption
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachments([]);
    setIsLoading(true);
    
    // Simulate AI response
    setTimeout(() => {
      const response = generateResponse(input, selectedModel, activeTool);
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        model: selectedModel,
        content: response.content,
        reasoning: response.reasoning,
        timestamp: Date.now(),
        encrypted: settings.e2eEncryption
      };
      
      const updatedMessages = [...newMessages, aiResponse];
      setMessages(updatedMessages);
      setIsLoading(false);
      
      // Update chat
      setChats(prev => prev.map(chat => 
        chat.id === activeChat 
          ? { 
              ...chat, 
              messages: updatedMessages,
              title: chat.messages.length === 0 ? input.slice(0, 30) + '...' : chat.title,
              preview: input.slice(0, 50),
              updatedAt: Date.now()
            }
          : chat
      ));
      
      if (settings.autoSpeak) {
        speakText(aiResponse.content);
      }
    }, 800 + Math.random() * 800);
  };
  
  // Voice functions
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      const clean = text.replace(/[*#`\[\]]/g, '').replace(/\n+/g, '. ');
      const utterance = new SpeechSynthesisUtterance(clean);
      speechSynthesis.speak(utterance);
    }
  };
  
  const startRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setInput("Voice transcription demo - integrate Web Speech API for production");
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
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      preview: 'Start a conversation...',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChat.id);
    setMessages([]);
  };
  
  const deleteChat = (id) => {
    if (chats.length === 1) createNewChat();
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChat === id) setActiveChat(chats[0]?.id);
  };
  
  // Memory management
  const addMemory = (content) => {
    if (content.trim()) {
      setMemories([...memories, { content, createdAt: Date.now() }]);
    }
  };
  
  const deleteMemory = (index) => {
    setMemories(memories.filter((_, i) => i !== index));
  };

  // Render tool-specific content
  const renderToolContent = () => {
    switch(activeTool) {
      case 'gamedev':
        return <GameDevPanel activeTemplate={gameTemplate} onSelectTemplate={setGameTemplate} />;
      case 'appdev':
        return <AppDevPanel activeTemplate={appTemplate} onSelectTemplate={setAppTemplate} />;
      case 'automation':
        return <WorkflowBuilder workflow={null} onUpdateWorkflow={() => {}} />;
      default:
        return null;
    }
  };

  return (
    <div className="nexus-app">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <button className="menu-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={20} />
          </button>
          <div className="logo">
            <div className="logo-icon">
              <Sparkles size={20} />
            </div>
            <span className="logo-text">NEXUS AI</span>
            <span className="logo-badge">PRO</span>
          </div>
        </div>
        
        <div className="header-center">
          <ModelSelector
            selectedModel={selectedModel}
            onSelect={setSelectedModel}
            isOpen={isModelSelectorOpen}
            onToggle={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
          />
        </div>
        
        <div className="header-right">
          <SecurityStatus 
            status={securityStatus} 
            onShowDetails={() => setIsSecurityOpen(true)}
          />
          <button 
            className={`icon-btn ${isMemoryOpen ? 'active' : ''}`}
            onClick={() => setIsMemoryOpen(!isMemoryOpen)}
            title="Memory"
          >
            <Brain size={20} />
          </button>
          <button 
            className="icon-btn"
            onClick={() => setIsCallActive(true)}
            title="Voice Call"
          >
            <Phone size={20} />
          </button>
          <button 
            className="icon-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <AvatarSelector
            type="user"
            selected={userAvatar}
            onSelect={setUserAvatar}
            isOpen={false}
            onToggle={() => {}}
          />
        </div>
      </header>
      
      {/* Main Content */}
      <div className="app-content">
        {/* Sidebar */}
        <ChatHistory
          chats={chats}
          activeChat={activeChat}
          onSelectChat={setActiveChat}
          onNewChat={createNewChat}
          onDeleteChat={deleteChat}
          isOpen={isSidebarOpen}
        />
        
        {/* Chat Area */}
        <main className="chat-area">
          {/* Tool Panel */}
          <ToolPanel activeTool={activeTool} onSelectTool={setActiveTool} />
          
          {/* Tool-specific content */}
          {renderToolContent()}
          
          {/* Messages */}
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-screen">
                <div className="welcome-icon">
                  <Sparkles size={48} />
                </div>
                <h2>Welcome to Nexus AI Pro</h2>
                <p>Military-grade encrypted AI platform with multi-model support</p>
                <div className="security-badge-large">
                  <Shield size={20} />
                  <span>AES-256-GCM Encryption Active</span>
                  <Lock size={16} />
                </div>
                <div className="quick-actions">
                  {Object.entries(TOOLS).slice(0, 4).map(([key, tool]) => {
                    const Icon = tool.icon;
                    return (
                      <button 
                        key={key}
                        className="quick-action"
                        onClick={() => setActiveTool(key)}
                        style={{ '--action-color': tool.color }}
                      >
                        <Icon size={24} />
                        <span>{tool.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="model-badges">
                  {Object.entries(AI_MODELS).slice(0, 6).map(([key, model]) => (
                    <span 
                      key={key} 
                      className="model-badge"
                      style={{ background: model.gradient }}
                      onClick={() => setSelectedModel(key)}
                    >
                      {model.icon} {model.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <Message 
                    key={msg.id} 
                    message={msg}
                    userAvatar={userAvatar}
                    aiAvatars={aiAvatars}
                    onSpeak={speakText}
                  />
                ))}
                {isLoading && (
                  <div className="message assistant loading">
                    <div className="message-avatar">
                      <div className="avatar-circle loading-avatar" style={{ background: AI_MODELS[selectedModel]?.gradient }}>
                        {AI_MODELS[selectedModel]?.icon}
                      </div>
                    </div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span><span></span><span></span>
                      </div>
                      <div className="reasoning-loading">
                        <Brain size={12} /> Reasoning...
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="input-area">
            {attachments.length > 0 && (
              <div className="attachments-preview">
                {attachments.map((att, i) => (
                  <div key={i} className="attachment-preview">
                    {att.type === 'image' ? (
                      <img src={att.url} alt="preview" />
                    ) : (
                      <FileText size={20} />
                    )}
                    <button onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="input-container">
              <button 
                className="attach-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                hidden
              />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Message ${AI_MODELS[selectedModel]?.name}... (${TOOLS[activeTool]?.name} mode)`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
              />
              <button 
                className={`voice-btn ${isRecording ? 'recording' : ''}`}
                onClick={startRecording}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button 
                className="send-btn"
                onClick={sendMessage}
                disabled={!input.trim() && attachments.length === 0}
              >
                {isLoading ? <Loader2 className="spin" size={20} /> : <Send size={20} />}
              </button>
            </div>
            <div className="input-footer">
              <div className="footer-left">
                <span className="model-indicator" style={{ background: AI_MODELS[selectedModel]?.gradient }}>
                  {AI_MODELS[selectedModel]?.icon} {AI_MODELS[selectedModel]?.name}
                </span>
                <span className="tool-indicator">
                  {TOOLS[activeTool]?.name}
                </span>
              </div>
              <div className="footer-right">
                <Lock size={12} />
                <span>End-to-end encrypted</span>
              </div>
            </div>
          </div>
        </main>
        
        {/* Memory Panel */}
        <MemoryPanel
          memories={memories}
          onAddMemory={addMemory}
          onDeleteMemory={deleteMemory}
          isOpen={isMemoryOpen}
        />
      </div>
      
      {/* Modals */}
      <SettingsPanel
        settings={settings}
        onUpdateSettings={setSettings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userAvatar={userAvatar}
        onUpdateAvatar={setUserAvatar}
      />
      
      <SecurityDashboard
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />
      
      <VoiceCall
        isActive={isCallActive}
        onEnd={() => setIsCallActive(false)}
        model={selectedModel}
      />
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        :root {
          --bg-primary: #0a0a0c;
          --bg-secondary: #111114;
          --bg-tertiary: #18181c;
          --bg-hover: #1f1f24;
          --bg-card: #141417;
          --text-primary: #ffffff;
          --text-secondary: #9ca3af;
          --text-muted: #6b7280;
          --border: #27272a;
          --border-light: #3f3f46;
          --accent: #6366f1;
          --accent-secondary: #8b5cf6;
          --gradient-primary: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
          --gradient-logo: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f472b6 100%);
          --success: #10b981;
          --error: #ef4444;
          --warning: #f59e0b;
          --shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }
        
        .nexus-app {
          font-family: 'Inter', -apple-system, sans-serif;
          background: var(--bg-primary);
          color: var(--text-primary);
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        /* ============================================ */
        /* HEADER */
        /* ============================================ */
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          z-index: 100;
        }
        
        .header-left, .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .menu-btn, .icon-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 10px;
          border-radius: 10px;
          transition: all 0.2s;
        }
        
        .menu-btn:hover, .icon-btn:hover, .icon-btn.active {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .logo-icon {
          width: 36px;
          height: 36px;
          background: var(--gradient-logo);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .logo-text {
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          background: var(--gradient-logo);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .logo-badge {
          font-size: 0.6rem;
          font-weight: 700;
          padding: 3px 6px;
          background: var(--gradient-primary);
          border-radius: 4px;
          color: white;
        }
        
        /* Security Status */
        .security-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .security-status:hover {
          border-color: var(--success);
        }
        
        .security-indicator {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .security-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        
        .encryption-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          color: var(--success);
          background: rgba(16, 185, 129, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        /* ============================================ */
        /* MODEL SELECTOR */
        /* ============================================ */
        .model-selector {
          position: relative;
        }
        
        .model-selector-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 12px;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .model-selector-btn:hover {
          border-color: var(--accent);
          background: var(--bg-hover);
        }
        
        .model-icon {
          font-size: 1.2rem;
        }
        
        .model-selector-btn svg.rotated {
          transform: rotate(180deg);
        }
        
        .model-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 8px;
          min-width: 380px;
          max-height: 500px;
          overflow-y: auto;
          box-shadow: var(--shadow);
          z-index: 1000;
        }
        
        .model-option {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: var(--text-primary);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        
        .model-option:hover {
          background: var(--bg-hover);
        }
        
        .model-option.active {
          background: var(--bg-tertiary);
          border: 1px solid var(--accent);
        }
        
        .model-icon-wrapper {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }
        
        .model-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        
        .model-info .model-name {
          font-weight: 500;
        }
        
        .model-provider {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .model-capabilities {
          display: flex;
          gap: 4px;
        }
        
        .capability-tag {
          font-size: 0.65rem;
          padding: 2px 6px;
          background: var(--bg-hover);
          border-radius: 4px;
          color: var(--text-muted);
        }
        
        .check-icon {
          color: var(--accent);
        }
        
        /* ============================================ */
        /* MAIN CONTENT */
        /* ============================================ */
        .app-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        
        /* ============================================ */
        /* CHAT HISTORY SIDEBAR */
        /* ============================================ */
        .chat-history {
          width: 280px;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--border);
        }
        
        .history-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        
        .new-chat-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--gradient-primary);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .new-chat-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }
        
        .history-search {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 12px;
          padding: 10px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        
        .history-search svg {
          color: var(--text-muted);
        }
        
        .history-search input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.85rem;
          outline: none;
        }
        
        .history-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
        
        .history-item {
          display: flex;
          align-items: flex-start;
          padding: 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 4px;
          border: 1px solid transparent;
        }
        
        .history-item:hover {
          background: var(--bg-hover);
        }
        
        .history-item.active {
          background: var(--bg-tertiary);
          border-color: var(--border);
        }
        
        .history-item-content {
          flex: 1;
          min-width: 0;
        }
        
        .history-title {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }
        
        .history-preview {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 4px;
        }
        
        .history-date {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        
        .delete-chat {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          opacity: 0;
          transition: all 0.2s;
        }
        
        .history-item:hover .delete-chat {
          opacity: 1;
        }
        
        .delete-chat:hover {
          background: var(--error);
          color: white;
        }
        
        /* ============================================ */
        /* CHAT AREA */
        /* ============================================ */
        .chat-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg-primary);
        }
        
        /* ============================================ */
        /* TOOL PANEL */
        /* ============================================ */
        .tool-panel {
          display: flex;
          gap: 6px;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          overflow-x: auto;
        }
        
        .tool-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--bg-tertiary);
          border: 1px solid transparent;
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }
        
        .tool-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border);
        }
        
        .tool-btn.active {
          background: var(--bg-hover);
          color: var(--tool-color, var(--accent));
          border-color: var(--tool-color, var(--accent));
        }
        
        .tool-btn.active svg {
          color: var(--tool-color, var(--accent));
        }
        
        /* ============================================ */
        /* GAME/APP DEV PANELS */
        /* ============================================ */
        .gamedev-panel, .appdev-panel {
          padding: 16px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
        }
        
        .panel-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        
        .panel-header h3 {
          font-size: 0.95rem;
          font-weight: 600;
        }
        
        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 10px;
          margin-bottom: 16px;
        }
        
        .template-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .template-card:hover {
          background: var(--bg-hover);
          border-color: var(--accent);
          transform: translateY(-2px);
        }
        
        .template-card.active {
          border-color: var(--accent);
          background: rgba(99, 102, 241, 0.1);
        }
        
        .template-icon {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }
        
        .template-name {
          font-size: 0.8rem;
          font-weight: 500;
          margin-bottom: 4px;
        }
        
        .template-engine, .template-stack {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        
        .quick-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .action-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--accent);
        }
        
        /* ============================================ */
        /* WORKFLOW BUILDER */
        /* ============================================ */
        .workflow-builder {
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
        }
        
        .workflow-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
        }
        
        .workflow-header h3 {
          flex: 1;
          font-size: 0.95rem;
          font-weight: 600;
        }
        
        .workflow-controls {
          display: flex;
          gap: 8px;
        }
        
        .control-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-secondary);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .control-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        
        .control-btn.play {
          background: var(--success);
          border-color: var(--success);
          color: white;
        }
        
        .workflow-toolbar {
          display: flex;
          gap: 6px;
          padding: 10px 16px;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border);
          overflow-x: auto;
        }
        
        .node-btn {
          padding: 10px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .node-btn:hover {
          background: var(--bg-hover);
          border-color: var(--accent);
        }
        
        .workflow-canvas {
          height: 200px;
          background: var(--bg-primary);
          background-image: 
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 20px 20px;
          position: relative;
          overflow: auto;
        }
        
        .workflow-empty {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        
        .workflow-empty svg {
          margin-bottom: 12px;
          opacity: 0.5;
        }
        
        .workflow-nodes {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .workflow-node {
          position: absolute;
          width: 160px;
          background: var(--bg-card);
          border: 2px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          cursor: move;
        }
        
        .workflow-node.selected {
          box-shadow: 0 0 0 2px var(--accent);
        }
        
        .node-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          color: white;
          font-size: 0.75rem;
          font-weight: 500;
        }
        
        .node-body {
          padding: 12px 10px;
        }
        
        .node-config {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        
        .node-input, .node-output {
          position: absolute;
          width: 12px;
          height: 12px;
          background: var(--bg-tertiary);
          border: 2px solid var(--border);
          border-radius: 50%;
        }
        
        .node-input {
          left: -6px;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .node-output {
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
        }
        
        /* ============================================ */
        /* MESSAGES */
        /* ============================================ */
        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        
        .message {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .message-avatar {
          flex-shrink: 0;
        }
        
        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
        }
        
        .loading-avatar {
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        .message-content {
          flex: 1;
          min-width: 0;
        }
        
        .message-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        
        .message-sender {
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .message-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .encrypted-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          color: var(--success);
          background: rgba(16, 185, 129, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        /* Reasoning Display */
        .reasoning-container {
          margin-bottom: 12px;
        }
        
        .reasoning-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 0.8rem;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s;
        }
        
        .reasoning-header:hover {
          background: var(--bg-hover);
        }
        
        .reasoning-header svg:last-child {
          margin-left: auto;
          transition: transform 0.2s;
        }
        
        .reasoning-header svg.rotated {
          transform: rotate(180deg);
        }
        
        .reasoning-time {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-left: auto;
          margin-right: 8px;
        }
        
        .reasoning-content {
          padding: 12px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-top: none;
          border-radius: 0 0 8px 8px;
        }
        
        .reasoning-step {
          display: flex;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
        }
        
        .reasoning-step:last-child {
          border-bottom: none;
        }
        
        .step-number {
          width: 20px;
          height: 20px;
          background: var(--bg-tertiary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          color: var(--text-muted);
          flex-shrink: 0;
        }
        
        .step-text {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        
        .reasoning-loading {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 8px;
        }
        
        .message-text {
          line-height: 1.7;
          color: var(--text-secondary);
          white-space: pre-wrap;
          font-size: 0.9rem;
        }
        
        .message.user .message-text {
          background: var(--bg-tertiary);
          padding: 14px 18px;
          border-radius: 16px;
          border: 1px solid var(--border);
        }
        
        .message-text code {
          font-family: 'JetBrains Mono', monospace;
          background: var(--bg-card);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.85em;
        }
        
        .message-text pre {
          background: var(--bg-card);
          padding: 16px;
          border-radius: 10px;
          border: 1px solid var(--border);
          overflow-x: auto;
          margin: 12px 0;
        }
        
        .message-text pre code {
          background: transparent;
          padding: 0;
        }
        
        .message-actions {
          display: flex;
          gap: 4px;
          margin-top: 10px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .message:hover .message-actions {
          opacity: 1;
        }
        
        .message-actions button {
          background: var(--bg-tertiary);
          border: none;
          color: var(--text-muted);
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .message-actions button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        
        /* Typing Indicator */
        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 12px;
        }
        
        .typing-indicator span {
          width: 8px;
          height: 8px;
          background: var(--accent);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        
        /* ============================================ */
        /* WELCOME SCREEN */
        /* ============================================ */
        .welcome-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          padding: 40px;
        }
        
        .welcome-icon {
          width: 90px;
          height: 90px;
          background: var(--gradient-logo);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
          animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .welcome-icon svg {
          color: white;
        }
        
        .welcome-screen h2 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 8px;
          background: var(--gradient-logo);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .welcome-screen > p {
          color: var(--text-secondary);
          margin-bottom: 20px;
        }
        
        .security-badge-large {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          color: var(--success);
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 32px;
        }
        
        .quick-actions {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
        }
        
        .quick-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 24px 32px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 16px;
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .quick-action:hover {
          background: var(--bg-hover);
          border-color: var(--action-color, var(--accent));
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        .quick-action svg {
          color: var(--action-color, var(--accent));
        }
        
        .model-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: center;
          max-width: 700px;
        }
        
        .model-badge {
          padding: 10px 16px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .model-badge:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        
        /* ============================================ */
        /* INPUT AREA */
        /* ============================================ */
        .input-area {
          padding: 16px 20px;
          background: var(--bg-secondary);
          border-top: 1px solid var(--border);
        }
        
        .attachments-preview {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        
        .attachment-preview {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 10px;
          overflow: hidden;
          background: var(--bg-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
        }
        
        .attachment-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .attachment-preview button {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 18px;
          height: 18px;
          background: var(--error);
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .input-container {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 8px;
        }
        
        .input-container:focus-within {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .attach-btn, .voice-btn, .send-btn {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          background: transparent;
          border: none;
          border-radius: 12px;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .attach-btn:hover, .voice-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        
        .voice-btn.recording {
          background: var(--error);
          color: white;
          animation: pulse 1s infinite;
        }
        
        .send-btn {
          background: var(--gradient-primary);
          color: white;
        }
        
        .send-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }
        
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .input-container textarea {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 0.95rem;
          resize: none;
          min-height: 44px;
          max-height: 200px;
          padding: 12px 4px;
        }
        
        .input-container textarea:focus {
          outline: none;
        }
        
        .input-container textarea::placeholder {
          color: var(--text-muted);
        }
        
        .input-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .footer-left {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .model-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.7rem;
          color: white;
        }
        
        .tool-indicator {
          padding: 4px 10px;
          background: var(--bg-tertiary);
          border-radius: 6px;
          font-size: 0.7rem;
        }
        
        .footer-right {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--success);
        }
        
        /* ============================================ */
        /* MEMORY PANEL */
        /* ============================================ */
        .memory-panel {
          width: 300px;
          background: var(--bg-secondary);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
        }
        
        .memory-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-bottom: 1px solid var(--border);
        }
        
        .memory-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 600;
        }
        
        .memory-count {
          font-size: 0.7rem;
          color: var(--text-muted);
          background: var(--bg-tertiary);
          padding: 4px 8px;
          border-radius: 6px;
        }
        
        .memory-input {
          display: flex;
          gap: 8px;
          padding: 12px;
          border-bottom: 1px solid var(--border);
        }
        
        .memory-input input {
          flex: 1;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 12px;
          color: var(--text-primary);
          font-size: 0.85rem;
        }
        
        .memory-input input:focus {
          outline: none;
          border-color: var(--accent);
        }
        
        .memory-input button {
          background: var(--accent);
          border: none;
          border-radius: 8px;
          color: white;
          padding: 0 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .memory-input button:hover {
          background: var(--accent-secondary);
        }
        
        .memory-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
        
        .memory-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 10px;
          margin-bottom: 8px;
          font-size: 0.85rem;
        }
        
        .memory-item svg {
          color: var(--text-muted);
          flex-shrink: 0;
        }
        
        .memory-item span {
          flex: 1;
          color: var(--text-secondary);
        }
        
        .memory-item button {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          opacity: 0;
          transition: all 0.2s;
        }
        
        .memory-item:hover button {
          opacity: 1;
        }
        
        .memory-item button:hover {
          background: var(--error);
          color: white;
        }
        
        /* ============================================ */
        /* SETTINGS PANEL */
        /* ============================================ */
        .settings-overlay, .security-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .settings-panel {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 20px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow);
        }
        
        .settings-header, .dashboard-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px;
          border-bottom: 1px solid var(--border);
        }
        
        .settings-header h3, .dashboard-header h2 {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .settings-header button, .dashboard-header button {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        
        .settings-header button:hover, .dashboard-header button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        
        .settings-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        
        .setting-group {
          margin-bottom: 28px;
        }
        
        .setting-group h4 {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          border-bottom: 1px solid var(--border);
        }
        
        .setting-item label {
          font-size: 0.9rem;
        }
        
        .setting-item input[type="password"],
        .setting-item input[type="text"],
        .setting-item select {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text-primary);
          width: 220px;
          font-size: 0.85rem;
        }
        
        .setting-item input[type="password"]:focus,
        .setting-item input[type="text"]:focus,
        .setting-item select:focus {
          outline: none;
          border-color: var(--accent);
        }
        
        .setting-item input[type="checkbox"] {
          width: 48px;
          height: 26px;
          appearance: none;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 13px;
          position: relative;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .setting-item input[type="checkbox"]:checked {
          background: var(--success);
          border-color: var(--success);
        }
        
        .setting-item input[type="checkbox"]::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: all 0.2s;
        }
        
        .setting-item input[type="checkbox"]:checked::after {
          left: 24px;
        }
        
        /* Avatar Selector in Settings */
        .avatar-setting {
          flex-wrap: wrap;
        }
        
        .avatar-selector {
          position: relative;
        }
        
        .avatar-preview {
          background: transparent;
          border: none;
          cursor: pointer;
          position: relative;
        }
        
        .avatar-preview .avatar-circle {
          width: 44px;
          height: 44px;
        }
        
        .avatar-preview .edit-icon {
          position: absolute;
          bottom: 0;
          right: 0;
          background: var(--bg-tertiary);
          border-radius: 50%;
          padding: 4px;
          color: var(--text-secondary);
        }
        
        .avatar-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          min-width: 240px;
          box-shadow: var(--shadow);
          z-index: 100;
        }
        
        .avatar-dropdown h4 {
          font-size: 0.85rem;
          margin-bottom: 12px;
          color: var(--text-secondary);
        }
        
        .avatar-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .avatar-option {
          background: transparent;
          border: 2px solid transparent;
          border-radius: 12px;
          padding: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .avatar-option:hover {
          border-color: var(--border);
        }
        
        .avatar-option.selected {
          border-color: var(--accent);
        }
        
        .avatar-option .avatar-circle {
          width: 44px;
          height: 44px;
        }
        
        .custom-avatar {
          display: flex;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        
        .custom-avatar input[type="text"] {
          flex: 1;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px;
          color: var(--text-primary);
          font-size: 1rem;
          text-align: center;
        }
        
        .custom-avatar input[type="color"] {
          width: 40px;
          height: 40px;
          padding: 0;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        
        /* ============================================ */
        /* SECURITY DASHBOARD */
        /* ============================================ */
        .security-dashboard {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 20px;
          width: 90%;
          max-width: 800px;
          max-height: 85vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow);
        }
        
        .dashboard-header svg:first-child {
          color: var(--success);
        }
        
        .security-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 20px;
        }
        
        .security-card {
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
        }
        
        .security-card svg {
          color: var(--text-muted);
          margin-bottom: 12px;
        }
        
        .security-card h4 {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
        
        .security-card .status {
          font-size: 1rem;
          font-weight: 600;
        }
        
        .security-card .status.active {
          color: var(--success);
        }
        
        .security-card .value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        
        .security-card .detail {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 4px;
          display: block;
        }
        
        .security-actions {
          display: flex;
          gap: 12px;
          padding: 0 20px 20px;
          flex-wrap: wrap;
        }
        
        .security-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-secondary);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .security-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--accent);
        }
        
        .security-btn.scan {
          background: var(--success);
          border-color: var(--success);
          color: white;
        }
        
        .security-btn.scan:hover {
          background: #059669;
        }
        
        /* ============================================ */
        /* VOICE CALL */
        /* ============================================ */
        .voice-call-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        
        .voice-call-panel {
          text-align: center;
        }
        
        .call-avatar {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 28px;
          position: relative;
        }
        
        .call-emoji {
          font-size: 3rem;
          z-index: 1;
        }
        
        .call-waves {
          position: absolute;
          inset: 0;
        }
        
        .wave {
          position: absolute;
          inset: 0;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          animation: wave 2s infinite;
          opacity: 0;
        }
        
        .wave:nth-child(2) { animation-delay: 0.5s; }
        .wave:nth-child(3) { animation-delay: 1s; }
        
        @keyframes wave {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        
        .voice-call-panel h3 {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }
        
        .call-duration {
          font-size: 2rem;
          font-weight: 300;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }
        
        .call-status {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: var(--success);
          font-size: 0.85rem;
          margin-bottom: 32px;
        }
        
        .call-actions {
          display: flex;
          gap: 24px;
          justify-content: center;
        }
        
        .call-actions button {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .mute-btn, .speaker-btn {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        
        .mute-btn.muted {
          background: var(--warning);
          color: white;
        }
        
        .mute-btn:hover, .speaker-btn:hover {
          background: var(--bg-hover);
          transform: scale(1.05);
        }
        
        .end-call-btn {
          background: var(--error);
          color: white;
        }
        
        .end-call-btn:hover {
          background: #dc2626;
          transform: scale(1.05);
        }
        
        /* ============================================ */
        /* UTILITIES */
        /* ============================================ */
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: var(--text-muted);
        }
        
        /* ============================================ */
        /* RESPONSIVE */
        /* ============================================ */
        @media (max-width: 1024px) {
          .security-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 768px) {
          .chat-history, .memory-panel {
            position: fixed;
            z-index: 500;
            height: calc(100vh - 64px);
            top: 64px;
          }
          
          .chat-history {
            left: 0;
            width: 280px;
          }
          
          .memory-panel {
            right: 0;
            width: 280px;
          }
          
          .tool-panel {
            padding: 8px 12px;
          }
          
          .tool-btn span {
            display: none;
          }
          
          .model-dropdown {
            width: 300px;
            left: 0;
            transform: none;
          }
          
          .quick-actions {
            flex-wrap: wrap;
          }
          
          .quick-action {
            padding: 16px 20px;
          }
          
          .security-grid {
            grid-template-columns: 1fr;
          }
          
          .template-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .header-center {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
