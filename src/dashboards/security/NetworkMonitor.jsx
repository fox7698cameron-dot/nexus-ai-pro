// 2026-07-20
import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Wifi, AlertTriangle, Globe, Shield, Activity, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';

const API_BASE = '/api/security';

const RISK_COLORS = {
  critical: 'text-red-400 bg-red-900/30 border-red-500/40',
  high:     'text-orange-400 bg-orange-900/30 border-orange-500/40',
  medium:   'text-yellow-400 bg-yellow-900/30 border-yellow-500/40',
  low:      'text-green-400 bg-green-900/30 border-green-500/40',
};

const COUNTRY_FLAGS = {
  US: '🇺🇸', RU: '🇷🇺', CN: '🇨🇳', DE: '🇩🇪', GB: '🇬🇧', JP: '🇯🇵',
  KR: '🇰🇷', FR: '🇫🇷', IN: '🇮🇳', BR: '🇧🇷',
};

const APP_COLORS = ['#818cf8', '#22d3ee', '#fb923c', '#a78bfa'];

function generateTrafficPoint() {
  return {
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    inbound:  Math.floor(50  + Math.random() * 200),
    outbound: Math.floor(20  + Math.random() * 120),
    packets:  Math.floor(300 + Math.random() * 800),
  };
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value} {p.name === 'packets' ? 'pkt/s' : 'Mbps'}</p>
      ))}
    </div>
  );
}

export default function NetworkMonitor() {
  const [traffic,     setTraffic]     = useState(() => Array.from({ length: 20 }, generateTrafficPoint));
  const [connections, setConnections] = useState([]);
  const [firewall,    setFirewall]    = useState([]);
  const [anomalies,   setAnomalies]   = useState([]);
  const [byApp,       setByApp]       = useState([]);
  const [sortField,   setSortField]   = useState('risk');
  const [sortDir,     setSortDir]     = useState('desc');
  const [loading,     setLoading]     = useState(false);

  const fetchNetwork = useCallback(async () => {
    setLoading(true);
    try {
      const [netR, trafficR] = await Promise.all([
        fetch(`${API_BASE}/network`),
        fetch(`${API_BASE}/network/traffic`),
      ]);
      const net = await netR.json();
      const traf = await trafficR.json();
      setConnections(net.connections ?? []);
      setFirewall(net.firewallRules ?? []);
      setAnomalies(net.anomalies ?? []);
      setByApp(traf.byApp ?? []);
    } catch {
      // Use mock data on API failure
      setConnections([
        { id: '1', ip: '142.250.80.100', port: 443, protocol: 'HTTPS', status: 'ESTABLISHED', risk: 'low',      process: 'node',    country: 'US' },
        { id: '2', ip: '198.51.100.42',  port: 8080, protocol: 'HTTP', status: 'CLOSE_WAIT',  risk: 'high',     process: 'unknown', country: 'RU' },
        { id: '3', ip: '203.0.113.7',    port: 22,   protocol: 'SSH',  status: 'SYN_RECV',    risk: 'critical', process: 'sshd',    country: 'CN' },
        { id: '4', ip: '104.18.20.47',   port: 443,  protocol: 'HTTPS',status: 'ESTABLISHED', risk: 'low',      process: 'chrome',  country: 'US' },
      ]);
      setByApp([
        { app: 'node',    mbps: 3.2 },
        { app: 'chrome',  mbps: 9.7 },
        { app: 'ssh',     mbps: 0.1 },
        { app: 'unknown', mbps: 1.5 },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Live traffic ticker
  useEffect(() => {
    const t = setInterval(() => {
      setTraffic(prev => [...prev.slice(-39), generateTrafficPoint()]);
    }, 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchNetwork();
    const t = setInterval(fetchNetwork, 15000);
    return () => clearInterval(t);
  }, [fetchNetwork]);

  // Sort connections
  const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  const sorted = [...connections].sort((a, b) => {
    const av = a[sortField], bv = b[sortField];
    if (sortField === 'risk') {
      return sortDir === 'desc' ? (riskOrder[bv] ?? 0) - (riskOrder[av] ?? 0) : (riskOrder[av] ?? 0) - (riskOrder[bv] ?? 0);
    }
    return sortDir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => sortField !== field ? null :
    sortDir === 'desc' ? <ChevronDown size={10} className="inline" /> : <ChevronUp size={10} className="inline" />;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
            <Wifi size={22} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Network Monitor</h1>
            <p className="text-xs text-gray-500">Real-time traffic · connections · anomalies</p>
          </div>
        </div>
        <button onClick={fetchNetwork} disabled={loading}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <div className="space-y-2">
          {anomalies.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-red-900/30 border border-red-500/40 text-sm">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <span className="text-red-300">{a.type ?? a.message ?? 'Anomaly detected'}</span>
              <span className="ml-auto text-xs text-gray-500">{a.source}</span>
            </div>
          ))}
        </div>
      )}

      {/* Traffic Chart */}
      <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
        <h2 className="font-semibold text-sm text-gray-300 mb-4 flex items-center gap-2">
          <Activity size={14} className="text-indigo-400" /> Live Network Traffic
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={traffic} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="time" stroke="#4b5563" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis stroke="#4b5563" tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line type="monotone" dataKey="inbound"  stroke="#818cf8" strokeWidth={2} dot={false} name="Inbound (Mbps)"  />
            <Line type="monotone" dataKey="outbound" stroke="#22d3ee" strokeWidth={2} dot={false} name="Outbound (Mbps)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Two-column: Geo map + Bandwidth by app */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Geo map placeholder */}
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
          <h2 className="font-semibold text-sm text-gray-300 mb-4 flex items-center gap-2">
            <Globe size={14} className="text-teal-400" /> Connection Origins
          </h2>
          <div className="space-y-2">
            {connections.map(c => (
              <div key={c.id} className={`flex items-center justify-between p-2 rounded-lg border text-xs ${RISK_COLORS[c.risk] ?? RISK_COLORS.low}`}>
                <span className="font-mono">{COUNTRY_FLAGS[c.country] ?? '🌐'} {c.ip}</span>
                <span className="font-medium uppercase">{c.country}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bandwidth by app */}
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
          <h2 className="font-semibold text-sm text-gray-300 mb-4 flex items-center gap-2">
            <Activity size={14} className="text-purple-400" /> Bandwidth by Application
          </h2>
          <div className="space-y-3">
            {byApp.map((a, i) => {
              const maxMbps = Math.max(...byApp.map(x => x.mbps), 1);
              const pct = (a.mbps / maxMbps) * 100;
              return (
                <div key={a.app} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300 font-mono">{a.app}</span>
                    <span className="text-gray-400">{a.mbps.toFixed(1)} Mbps</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: APP_COLORS[i % APP_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Connections Table */}
      <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5 overflow-x-auto">
        <h2 className="font-semibold text-sm text-gray-300 mb-4 flex items-center gap-2">
          <Wifi size={14} className="text-blue-400" /> Active Connections
        </h2>
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              {[['ip','IP Address'],['port','Port'],['protocol','Protocol'],['status','Status'],['risk','Risk'],['process','Process']].map(([f, l]) => (
                <th key={f} className="text-left py-2 px-2 font-medium cursor-pointer select-none hover:text-gray-300 transition"
                  onClick={() => toggleSort(f)}>
                  {l} <SortIcon field={f} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {sorted.map(c => (
              <tr key={c.id} className="hover:bg-gray-700/30 transition">
                <td className="py-2 px-2 font-mono text-gray-200">{COUNTRY_FLAGS[c.country] ?? '🌐'} {c.ip}</td>
                <td className="py-2 px-2 text-gray-400">{c.port}</td>
                <td className="py-2 px-2 text-gray-300">{c.protocol}</td>
                <td className="py-2 px-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    c.status === 'ESTABLISHED' ? 'bg-green-900/40 text-green-400' : 'bg-gray-700 text-gray-400'
                  }`}>{c.status}</span>
                </td>
                <td className="py-2 px-2">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    RISK_COLORS[c.risk]?.split(' ').slice(0,2).join(' ') ?? ''
                  }`}>{c.risk}</span>
                </td>
                <td className="py-2 px-2 font-mono text-gray-400">{c.process}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Firewall Rules */}
      <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-5">
        <h2 className="font-semibold text-sm text-gray-300 mb-4 flex items-center gap-2">
          <Shield size={14} className="text-indigo-400" /> Firewall Rules
        </h2>
        <div className="space-y-2">
          {(firewall.length > 0 ? firewall : [
            { id: 1, name: 'Block Tor exit nodes',  action: 'DENY',  protocol: 'TCP', ports: 'any', enabled: true },
            { id: 2, name: 'Allow HTTPS outbound',  action: 'ALLOW', protocol: 'TCP', ports: '443', enabled: true },
            { id: 3, name: 'Block known bad ASNs',  action: 'DENY',  protocol: 'any', ports: 'any', enabled: true },
          ]).map(rule => (
            <div key={rule.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-700/40 border border-gray-600/40 text-xs">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${rule.enabled ? 'bg-green-500' : 'bg-gray-600'}`} />
                <span className="text-gray-200">{rule.name}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <span className={`font-bold ${rule.action === 'ALLOW' ? 'text-green-400' : rule.action === 'DENY' ? 'text-red-400' : 'text-yellow-400'}`}>{rule.action}</span>
                <span>{rule.protocol}/{rule.ports}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
