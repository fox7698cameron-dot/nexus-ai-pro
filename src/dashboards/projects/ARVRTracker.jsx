// 2026-07-20
import React, { useState, useEffect } from 'react';
import { Layers, Eye, Cpu, Monitor, Triangle, Zap, Box, Plus, X, Activity } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const HEADSETS = [
  { id: 'quest3',   name: 'Meta Quest 3',      targetFPS: 90,  maxPolyK: 100,  maxDrawCalls: 150 },
  { id: 'psvr2',    name: 'PSVR 2',             targetFPS: 90,  maxPolyK: 500,  maxDrawCalls: 300 },
  { id: 'vive',     name: 'HTC Vive Pro 2',     targetFPS: 120, maxPolyK: 800,  maxDrawCalls: 500 },
  { id: 'avp',      name: 'Apple Vision Pro',   targetFPS: 90,  maxPolyK: 200,  maxDrawCalls: 200 },
  { id: 'hololens', name: 'HoloLens 2',         targetFPS: 60,  maxPolyK: 50,   maxDrawCalls: 100 },
];

const MOCK_METRICS = {
  selectedHeadset: 'quest3',
  currentFPS: 82, polyCountK: 73, drawCalls: 118,
  frameTimeMs: 11.2, targetFrameTimeMs: 11.1,
  vramMB: 2048, maxVramMB: 6144,
  sceneComplexity: 62,
  assets: [
    { id: '1', name: 'Environment Base', polyK: 45, textureMB: 512,  drawCalls: 60, color: '#818cf8' },
    { id: '2', name: 'Character Rig',    polyK: 18, textureMB: 256,  drawCalls: 34, color: '#22d3ee' },
    { id: '3', name: 'Prop Collection',  polyK: 10, textureMB: 128,  drawCalls: 24, color: '#a78bfa' },
  ],
};

const FRAME_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  frame: i + 1,
  fps: Math.round(80 + Math.sin(i * 0.5) * 6 + Math.random() * 4),
  frameTime: parseFloat((11.5 + Math.sin(i * 0.3) * 1.5).toFixed(1)),
}));

function buildRadar(metrics, headset) {
  return [
    { subject: 'FPS',        value: Math.round((metrics.currentFPS / headset.targetFPS) * 100) },
    { subject: 'Poly',       value: Math.round((1 - metrics.polyCountK / headset.maxPolyK) * 100) },
    { subject: 'Draw Calls', value: Math.round((1 - metrics.drawCalls / headset.maxDrawCalls) * 100) },
    { subject: 'VRAM',       value: Math.round((1 - metrics.vramMB / metrics.maxVramMB) * 100) },
    { subject: 'Frame Time', value: Math.round((metrics.targetFrameTimeMs / metrics.frameTimeMs) * 100) },
    { subject: 'Complexity', value: 100 - metrics.sceneComplexity },
  ];
}

function BudgetBar({ label, current, max, unit = '' }) {
  const pct   = Math.min(Math.round((current / max) * 100), 100);
  const color = pct > 90 ? '#ef4444' : pct > 75 ? '#f97316' : '#22c55e';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-300">{label}</span>
        <span style={{ color }}>{current}{unit} / {max}{unit} ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ARVRTracker() {
  const [metrics,       setMetrics]       = useState(MOCK_METRICS);
  const [activeHeadset, setActiveHeadset] = useState(HEADSETS[0]);
  const [activeTab,     setActiveTab]     = useState('overview');
  const [frameData,     setFrameData]     = useState(FRAME_HISTORY);
  const [newAsset,      setNewAsset]      = useState({ name: '', polyK: '', textureMB: '', drawCalls: '' });
  const [showAssetForm, setShowAssetForm] = useState(false);

  // Simulate live frame data
  useEffect(() => {
    const t = setInterval(() => {
      setFrameData(prev => {
        const next = [...prev.slice(1), {
          frame: prev[prev.length - 1].frame + 1,
          fps: Math.round(76 + Math.random() * 16),
          frameTime: parseFloat((10 + Math.random() * 4).toFixed(1)),
        }];
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const fpsPercent       = Math.round((metrics.currentFPS / activeHeadset.targetFPS) * 100);
  const polyPercent      = Math.round((metrics.polyCountK / activeHeadset.maxPolyK) * 100);
  const drawCallPercent  = Math.round((metrics.drawCalls / activeHeadset.maxDrawCalls) * 100);
  const radarData        = buildRadar(metrics, activeHeadset);
  const frameTarget      = activeHeadset.targetFPS;
  const comfortOk        = metrics.currentFPS >= activeHeadset.targetFPS * 0.9;

  const addAsset = () => {
    if (!newAsset.name.trim()) return;
    const asset = {
      id: Date.now().toString(),
      name: newAsset.name.trim(),
      polyK: parseFloat(newAsset.polyK) || 0,
      textureMB: parseFloat(newAsset.textureMB) || 0,
      drawCalls: parseInt(newAsset.drawCalls) || 0,
      color: ['#f472b6','#fb923c','#4ade80','#facc15'][metrics.assets.length % 4],
    };
    setMetrics(prev => ({
      ...prev,
      assets:     [...prev.assets, asset],
      polyCountK: prev.polyCountK + asset.polyK,
      drawCalls:  prev.drawCalls  + asset.drawCalls,
    }));
    setNewAsset({ name: '', polyK: '', textureMB: '', drawCalls: '' });
    setShowAssetForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers size={20} className="text-purple-400" /> AR/VR/3D Tracker
        </h2>
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-purple-400" />
          <span className={`text-sm ${comfortOk ? 'text-green-400' : 'text-red-400'}`}>
            Comfort: {comfortOk ? '✓ Good' : '⚠ Below target'}
          </span>
        </div>
      </div>

      {/* Headset selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {HEADSETS.map(h => (
          <button key={h.id} onClick={() => setActiveHeadset(h)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${activeHeadset.id === h.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {h.name}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {['overview', 'performance', 'assets', 'scene'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm transition ${activeTab === tab ? 'text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-300'}`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'FPS',       value: metrics.currentFPS, target: activeHeadset.targetFPS,      icon: Zap,      ok: metrics.currentFPS >= activeHeadset.targetFPS * 0.9 },
              { label: 'Draw Calls',value: metrics.drawCalls,  target: activeHeadset.maxDrawCalls,   icon: Monitor,  ok: drawCallPercent < 90 },
              { label: 'Polys (K)', value: metrics.polyCountK, target: activeHeadset.maxPolyK,       icon: Triangle, ok: polyPercent < 90 },
              { label: 'Frame ms',  value: metrics.frameTimeMs,target: metrics.targetFrameTimeMs,    icon: Cpu,      ok: metrics.frameTimeMs <= metrics.targetFrameTimeMs },
            ].map(({ label, value, target, icon: Icon, ok }) => (
              <div key={label} className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
                <Icon size={20} className={`mx-auto mb-2 ${ok ? 'text-green-400' : 'text-red-400'}`} />
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-gray-500">Target: {target}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Budget Usage</h3>
              <div className="space-y-3">
                <BudgetBar label="Polygon Budget"   current={metrics.polyCountK} max={activeHeadset.maxPolyK}     unit="K"  />
                <BudgetBar label="Draw Call Budget" current={metrics.drawCalls}  max={activeHeadset.maxDrawCalls}            />
                <BudgetBar label="VRAM"             current={metrics.vramMB}     max={metrics.maxVramMB}           unit="MB" />
                <BudgetBar label="Frame Time"       current={metrics.frameTimeMs}max={metrics.targetFrameTimeMs * 1.5} unit="ms" />
              </div>
            </div>
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Performance Health</h3>
              <ResponsiveContainer width="100%" height={190}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Performance ── */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <Activity size={14} className="text-green-400" /> Live FPS — last 30 frames
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={frameData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="frame" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis domain={[50, 130]} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
                <Line type="monotone" dataKey="fps"       stroke="#8b5cf6" strokeWidth={2} dot={false} name="FPS" />
                <Line type="monotone" dataKey={() => frameTarget} stroke="#22c55e" strokeDasharray="4 2" dot={false} name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
              <p className="text-xs text-gray-400 mb-1">Frame Time Budget</p>
              <p className="text-2xl font-bold text-white">{(1000 / frameTarget).toFixed(1)}ms</p>
              <p className="text-xs text-gray-500">at {frameTarget} fps target</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
              <p className="text-xs text-gray-400 mb-1">Current Frame Time</p>
              <p className={`text-2xl font-bold ${metrics.frameTimeMs <= 1000 / frameTarget ? 'text-green-400' : 'text-red-400'}`}>{metrics.frameTimeMs}ms</p>
              <p className="text-xs text-gray-500">{metrics.frameTimeMs <= 1000 / frameTarget ? '✓ on budget' : '⚠ over budget'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Assets ── */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">3D Asset Library</h3>
            <button onClick={() => setShowAssetForm(s => !s)}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600/20 text-purple-300 text-xs rounded-lg border border-purple-500/30 hover:bg-purple-600/30 transition">
              <Plus size={12} /> Add Asset
            </button>
          </div>

          {showAssetForm && (
            <div className="p-4 bg-gray-800 rounded-xl border border-purple-500/30 space-y-2">
              {[['name','Asset Name *'],['polyK','Polygon Count (K)'],['textureMB','Texture MB'],['drawCalls','Draw Calls']].map(([k, ph]) => (
                <input key={k} type={k === 'name' ? 'text' : 'number'} placeholder={ph}
                  value={newAsset[k]} onChange={e => setNewAsset(p => ({ ...p, [k]: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none" />
              ))}
              <div className="flex gap-2">
                <button onClick={addAsset} className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition">Add</button>
                <button onClick={() => setShowAssetForm(false)} className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.assets.map(asset => (
              <div key={asset.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {/* Placeholder thumbnail */}
                <div className="h-28 flex items-center justify-center" style={{ background: asset.color + '22', borderBottom: `2px solid ${asset.color}33` }}>
                  <Box size={36} style={{ color: asset.color }} opacity={0.8} />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-white mb-2">{asset.name}</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div><p className="font-bold text-white">{asset.polyK}K</p><p className="text-gray-500">Polys</p></div>
                    <div><p className="font-bold text-white">{asset.textureMB}MB</p><p className="text-gray-500">Tex</p></div>
                    <div><p className="font-bold text-white">{asset.drawCalls}</p><p className="text-gray-500">Draws</p></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Scene Complexity ── */}
      {activeTab === 'scene' && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Scene Complexity Metrics</h3>
            <div className="space-y-4">
              {[
                { label: 'Overall Complexity',     value: metrics.sceneComplexity,  max: 100, unit: '%', color: metrics.sceneComplexity > 80 ? '#ef4444' : '#8b5cf6' },
                { label: 'Total Polygon Budget',   value: polyPercent,              max: 100, unit: '%', color: polyPercent > 90 ? '#ef4444' : '#22c55e' },
                { label: 'Draw Call Usage',        value: drawCallPercent,          max: 100, unit: '%', color: drawCallPercent > 90 ? '#ef4444' : '#22c55e' },
                { label: 'Lighting Complexity',    value: 55,                       max: 100, unit: '%', color: '#f59e0b' },
                { label: 'Shader Complexity',      value: 42,                       max: 100, unit: '%', color: '#22d3ee' },
                { label: 'Shadow Map Budget',      value: 68,                       max: 100, unit: '%', color: '#fb923c' },
              ].map(({ label, value, max, unit, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{label}</span>
                    <span style={{ color }}>{value}{unit}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
              <p className="text-xs text-gray-400 mb-1">Total Scene Objects</p>
              <p className="text-2xl font-bold text-white">{metrics.assets.length * 42}</p>
              <p className="text-xs text-gray-500">across {metrics.assets.length} asset groups</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-xl border border-gray-700 text-center">
              <p className="text-xs text-gray-400 mb-1">Occlusion Culling</p>
              <p className="text-2xl font-bold text-green-400">Active</p>
              <p className="text-xs text-gray-500">~{Math.round(metrics.drawCalls * 0.3)} calls saved</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
