// File: DevDashboard.jsx | Date: 2026-06-16 | Nexus AI Pro

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  Code2, GitBranch, GitPullRequest, Activity, Zap, Clock, Check,
  AlertCircle, Server, Database, RefreshCw, ExternalLink
} from 'lucide-react';

const MOCK_DEV_DATA = {
  myProjects: [
    { id: 'p1', name: 'Nexus AI Pro', language: 'JavaScript', coverage: 71, openIssues: 8, lastCommit: '8 min ago', branch: 'main' },
    { id: 'p2', name: 'GameVault API', language: 'Python', coverage: 84, openIssues: 3, lastCommit: '2 hr ago', branch: 'develop' },
  ],
  apiUsage: [
    { endpoint: 'GET /api/analytics/metrics', calls: 42840, errors: 12, p50: 28, p99: 142 },
    { endpoint: 'POST /api/auth/login', calls: 18290, errors: 340, p50: 45, p99: 280 },
    { endpoint: 'GET /api/projects', calls: 9820, errors: 2, p50: 18, p99: 89 },
    { endpoint: 'POST /api/subscriptions/subscribe', calls: 1240, errors: 28, p50: 320, p99: 1800 },
  ],
  deployments: [
    { id: 'd1', project: 'Nexus AI Pro', env: 'staging', status: 'success', commit: 'a1b2c3d', time: '4 min ago', duration: '2m 14s' },
    { id: 'd2', project: 'Nexus AI Pro', env: 'production', status: 'success', commit: '9f8e7d6', time: '2 days ago', duration: '3m 02s' },
    { id: 'd3', project: 'GameVault API', env: 'staging', status: 'failed', commit: 'c4d5e6f', time: '1 hr ago', duration: '0m 48s' },
  ],
  connectors: [
    { name: 'GitHub', status: 'connected', user: 'nexus-dev', repos: 14 },
    { name: 'Bitbucket', status: 'disconnected' },
    { name: 'Slack', status: 'connected', workspace: 'NexusHQ', channels: 3 },
    { name: 'Zoom', status: 'disconnected' },
  ],
  cicd: {
    totalBuilds: 482, passing: 441, failing: 28, avgDuration: '2m 32s',
    recentRuns: [
      { id: 'r1', project: 'Nexus AI Pro', branch: 'main', status: 'passing', triggered: '4 min ago', tests: '184/184' },
      { id: 'r2', project: 'GameVault API', branch: 'feature/push', status: 'failing', triggered: '1 hr ago', tests: '142/168' },
    ],
  },
};

const LANG_COLORS = {
  JavaScript: 'bg-yellow-100 text-yellow-800',
  Python: 'bg-blue-100 text-blue-800',
  TypeScript: 'bg-indigo-100 text-indigo-800',
  Go: 'bg-cyan-100 text-cyan-800',
  Rust: 'bg-orange-100 text-orange-800',
};

const ENV_COLORS = {
  staging: 'bg-blue-100 text-blue-700',
  production: 'bg-purple-100 text-purple-700',
  development: 'bg-gray-100 text-gray-700',
};

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function latencyColor(ms) {
  if (ms < 50) return 'text-green-600';
  if (ms <= 200) return 'text-yellow-500';
  return 'text-red-600';
}

function SectionHeader({ children }) {
  return (
    <h2 className="text-base font-semibold text-gray-800 mb-3">{children}</h2>
  );
}

function ProjectCard({ project }) {
  const coverageColor = project.coverage >= 80 ? 'bg-green-500' : project.coverage >= 60 ? 'bg-yellow-400' : 'bg-red-400';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{project.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <GitBranch className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 font-mono">{project.branch}</span>
          </div>
        </div>
        <Badge className={LANG_COLORS[project.language] || 'bg-gray-100 text-gray-700'}>
          {project.language}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Test Coverage</span>
          <span className="font-medium">{project.coverage}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${coverageColor} rounded-full`} style={{ width: `${project.coverage}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-gray-500">
          <AlertCircle className="w-4 h-4" />
          <span>{project.openIssues} open issues</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>{project.lastCommit}</span>
        </div>
      </div>
    </div>
  );
}

function APIUsageTable({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <SectionHeader>API Usage</SectionHeader>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Endpoint</th>
              <th className="px-5 py-3 text-right">Calls</th>
              <th className="px-5 py-3 text-right">Errors</th>
              <th className="px-5 py-3 text-right">Error Rate</th>
              <th className="px-5 py-3 text-right">p50</th>
              <th className="px-5 py-3 text-right">p99</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row, i) => {
              const errorRate = ((row.errors / row.calls) * 100).toFixed(2);
              const isHighError = parseFloat(errorRate) > 1;
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">{row.endpoint}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{row.calls.toLocaleString()}</td>
                  <td className={`px-5 py-3 text-right font-medium ${isHighError ? 'text-red-600' : 'text-gray-600'}`}>
                    {row.errors}
                  </td>
                  <td className={`px-5 py-3 text-right text-xs font-semibold ${isHighError ? 'text-red-600' : 'text-green-600'}`}>
                    {errorRate}%
                  </td>
                  <td className={`px-5 py-3 text-right font-medium ${latencyColor(row.p50)}`}>
                    {row.p50}ms
                  </td>
                  <td className={`px-5 py-3 text-right font-medium ${latencyColor(row.p99)}`}>
                    {row.p99}ms
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeploymentsTable({ deployments }) {
  const statusConfig = {
    success: { color: 'bg-green-100 text-green-700', icon: <Check className="w-3 h-3" /> },
    failed: { color: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-3 h-3" /> },
    running: { color: 'bg-blue-100 text-blue-700', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <SectionHeader>Deployments</SectionHeader>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Project</th>
              <th className="px-5 py-3 text-left">Environment</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Commit</th>
              <th className="px-5 py-3 text-left">Time</th>
              <th className="px-5 py-3 text-left">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {deployments.map(dep => {
              const sc = statusConfig[dep.status] || statusConfig.success;
              return (
                <tr key={dep.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{dep.project}</td>
                  <td className="px-5 py-3">
                    <Badge className={ENV_COLORS[dep.env] || 'bg-gray-100 text-gray-600'}>{dep.env}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${sc.color}`}>
                      {sc.icon} {dep.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{dep.commit}</td>
                  <td className="px-5 py-3 text-gray-500">{dep.time}</td>
                  <td className="px-5 py-3 text-gray-500">{dep.duration}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConnectorGrid({ connectors, setConnectors }) {
  const handleToggle = async (name, currentStatus) => {
    const action = currentStatus === 'connected' ? 'disconnect' : 'connect';
    try {
      await fetch(`/api/dev/connectors/${name.toLowerCase()}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (_) {}
    setConnectors(prev =>
      prev.map(c => c.name === name ? { ...c, status: action === 'connect' ? 'connected' : 'disconnected' } : c)
    );
  };

  const CONNECTOR_ICONS = {
    GitHub: <Code2 className="w-5 h-5 text-gray-800" />,
    Bitbucket: <GitBranch className="w-5 h-5 text-blue-600" />,
    Slack: <Zap className="w-5 h-5 text-yellow-500" />,
    Zoom: <Activity className="w-5 h-5 text-blue-500" />,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {connectors.map(conn => {
        const isConnected = conn.status === 'connected';
        return (
          <div key={conn.name} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {CONNECTOR_ICONS[conn.name] || <ExternalLink className="w-5 h-5 text-gray-500" />}
                <span className="font-medium text-gray-800">{conn.name}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {conn.status}
              </span>
            </div>
            {isConnected && (
              <div className="text-xs text-gray-500 space-y-0.5">
                {conn.user && <p>User: <span className="text-gray-700 font-medium">{conn.user}</span></p>}
                {conn.repos !== undefined && <p>Repos: <span className="text-gray-700 font-medium">{conn.repos}</span></p>}
                {conn.workspace && <p>Workspace: <span className="text-gray-700 font-medium">{conn.workspace}</span></p>}
                {conn.channels !== undefined && <p>Channels: <span className="text-gray-700 font-medium">{conn.channels}</span></p>}
              </div>
            )}
            <button
              onClick={() => handleToggle(conn.name, conn.status)}
              className={`w-full py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isConnected
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function CICDSection({ cicd }) {
  const passRate = Math.round((cicd.passing / cicd.totalBuilds) * 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Builds', value: cicd.totalBuilds, color: 'text-gray-900' },
          { label: 'Passing', value: cicd.passing, color: 'text-green-600' },
          { label: 'Failing', value: cicd.failing, color: 'text-red-600' },
          { label: 'Avg Duration', value: cicd.avgDuration, color: 'text-gray-900' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Recent CI Runs</span>
          <span className="text-xs text-gray-400">{passRate}% pass rate</span>
        </div>
        <div className="divide-y divide-gray-50">
          {cicd.recentRuns.map(run => (
            <div key={run.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {run.status === 'passing'
                  ? <Check className="w-4 h-4 text-green-500 shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                }
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{run.project}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <GitBranch className="w-3 h-3 text-gray-400" />
                    <span className="text-xs font-mono text-gray-500">{run.branch}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-xs text-gray-500">
                <span className={`font-semibold ${run.status === 'passing' ? 'text-green-600' : 'text-red-600'}`}>
                  {run.tests} tests
                </span>
                <span>{run.triggered}</span>
                <Badge className={run.status === 'passing' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {run.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DevDashboard() {
  const { role } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectors, setConnectors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/dev/dashboard', { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        setData(json);
        setConnectors(json.connectors);
      } catch (_) {
        setData(MOCK_DEV_DATA);
        setConnectors(MOCK_DEV_DATA.connectors);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (!['developer', 'admin', 'super_admin'].includes(role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center shadow-sm">
          <Code2 className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm">Developer or Admin role required to access this dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Developer Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Build and ship with confidence.</p>
          </div>
          <Badge className={role === 'admin' || role === 'super_admin' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}>
            {role}
          </Badge>
        </div>

        <section>
          <SectionHeader>My Projects</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.myProjects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>

        <section>
          <APIUsageTable data={data.apiUsage} />
        </section>

        <section>
          <DeploymentsTable deployments={data.deployments} />
        </section>

        <section>
          <SectionHeader>Integrations</SectionHeader>
          <ConnectorGrid connectors={connectors} setConnectors={setConnectors} />
        </section>

        <section>
          <SectionHeader>CI/CD Overview</SectionHeader>
          <CICDSection cicd={data.cicd} />
        </section>
      </div>
    </div>
  );
}
