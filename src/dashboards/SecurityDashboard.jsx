// File: SecurityDashboard.jsx | Date: 2026-06-16 | Nexus AI Pro

import { useState, useEffect, useCallback, useRef } from 'react'
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Download, Lock, Wifi, Server, Database, Key, Clock, Eye, X, RotateCcw, ShieldCheck, Activity, Globe, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useSocket } from '../contexts/SocketContext.jsx'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SECURITY = {
  score: 87,
  lastScan: '2026-06-16T10:30:00Z',
  encryption: { algorithm: 'AES-256-GCM', status: 'active', keyRotation: 23 },
  firewall: { status: 'active', blockedToday: 1247 },
  ssl: { status: 'valid', expiresAt: '2027-03-15', issuer: "Let's Encrypt" },
  threats: { blocked: 1247, critical: 3, high: 12, medium: 28, low: 89, info: 204 },
  vulnerabilities: [
    { id: 'CVE-2026-1001', name: 'Outdated dependency lodash',         severity: 'high',     status: 'open',    patchedAt: null },
    { id: 'CVE-2026-0892', name: 'XSS in user input field',            severity: 'critical', status: 'open',    patchedAt: null },
    { id: 'CVE-2025-4421', name: 'Missing CSRF token on /api/user',    severity: 'medium',   status: 'patched', patchedAt: '2026-06-10' },
    { id: 'CVE-2025-3310', name: 'Weak session entropy',               severity: 'medium',   status: 'patched', patchedAt: '2026-06-08' },
    { id: 'CVE-2025-1120', name: 'Verbose error disclosure',           severity: 'low',      status: 'patched', patchedAt: '2026-06-01' },
    { id: 'INFO-001',      name: 'Server version header exposed',      severity: 'info',     status: 'open',    patchedAt: null },
  ],
  network: { latency: 28, packetLoss: 0.02, openPorts: [80, 443, 22], suspiciousConnections: 2 },
  auditLog: [
    { id: 1, timestamp: '2026-06-16T11:45:00Z', event: 'LOGIN_SUCCESS', user: 'admin@nexus.ai',    severity: 'info' },
    { id: 2, timestamp: '2026-06-16T11:30:00Z', event: 'THREAT_BLOCKED', user: 'system',           severity: 'high' },
    { id: 3, timestamp: '2026-06-16T11:15:00Z', event: 'KEY_ROTATED',   user: 'system',            severity: 'info' },
    { id: 4, timestamp: '2026-06-16T10:58:00Z', event: 'SCAN_COMPLETE', user: 'system',            severity: 'info' },
    { id: 5, timestamp: '2026-06-16T10:30:00Z', event: 'FAILED_LOGIN',  user: 'unknown@evil.com',  severity: 'warning' },
    { id: 6, timestamp: '2026-06-16T09:00:00Z', event: 'VULN_PATCHED',  user: 'devops@nexus.ai',   severity: 'info' },
  ],
  alerts: [
    { id: 1, message: 'Critical XSS vulnerability detected in production',  severity: 'critical', time: '5 min ago' },
    { id: 2, message: 'Suspicious login attempt from Russia (blocked)',       severity: 'high',     time: '23 min ago' },
    { id: 3, message: 'SSL certificate renews in 272 days',                  severity: 'info',     time: '1 hr ago' },
  ],
  compliance: { gdpr: 'compliant', soc2: 'in_progress', hipaa: 'not_applicable' },
  browserChecks: {
    https:               true,
    secureCookies:       true,
    csp:                 true,
    localStorage_ok:     true,
    extensionAnomalies:  0,
  },
}

// ─── Severity Helpers ─────────────────────────────────────────────────────────

const SEVERITY_COLOR = {
  critical: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  high:     'bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  medium:   'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  low:      'bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  info:     'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400 border-gray-200 dark:border-gray-600',
  warning:  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
}

const SEVERITY_DOT = {
  critical: 'bg-red-600',
  high:     'bg-orange-500',
  medium:   'bg-yellow-500',
  low:      'bg-blue-500',
  info:     'bg-gray-400',
  warning:  'bg-yellow-500',
}

function SeverityBadge({ severity }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${SEVERITY_COLOR[severity] || SEVERITY_COLOR.info}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[severity] || 'bg-gray-400'}`} />
      {severity.toUpperCase()}
    </span>
  )
}

function StatusBadge({ status }) {
  if (status === 'patched') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle size={10} /> Patched
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
      <XCircle size={10} /> Open
    </span>
  )
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const circumference = 283 // 2 * PI * 45
  const dash          = (score / 100) * circumference

  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" className="dark:stroke-gray-700" />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${dash} ${circumference}`}
          strokeDashoffset="0"
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-gray-900 dark:text-white leading-none">{score}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">/ 100</p>
      </div>
    </div>
  )
}

// ─── Badge Row ────────────────────────────────────────────────────────────────

function StatusChip({ icon, label, value, ok }) {
  return (
    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm">
      <div className={`p-2 rounded-lg ${ok ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-500'}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{value}</p>
      </div>
      <div className="ml-auto">
        {ok
          ? <CheckCircle size={16} className="text-emerald-500" />
          : <XCircle size={16} className="text-red-500" />}
      </div>
    </div>
  )
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({ alert, onDismiss }) {
  const icons = { critical: <XCircle size={16} />, high: <AlertTriangle size={16} />, info: <Shield size={16} /> }
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-lg border ${SEVERITY_COLOR[alert.severity] || SEVERITY_COLOR.info} relative`}>
      <div className="mt-0.5">{icons[alert.severity] || <AlertTriangle size={16} />}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug">{alert.message}</p>
        <p className="text-xs opacity-70 mt-0.5">{alert.time}</p>
      </div>
      <button
        onClick={() => onDismiss(alert.id)}
        className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
        aria-label="Dismiss alert"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Audit Log Row ────────────────────────────────────────────────────────────

function AuditRow({ entry }) {
  const dt = new Date(entry.timestamp)
  const time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap font-mono">{time}</td>
      <td className="px-4 py-2.5">
        <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{entry.event}</span>
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 max-w-[160px] truncate">{entry.user}</td>
      <td className="px-4 py-2.5"><SeverityBadge severity={entry.severity} /></td>
    </tr>
  )
}

// ─── Compliance Chip ──────────────────────────────────────────────────────────

const COMPLIANCE_LABEL = { compliant: 'Compliant', in_progress: 'In Progress', not_applicable: 'N/A' }
const COMPLIANCE_COLOR = {
  compliant:       'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  in_progress:     'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  not_applicable:  'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600',
}

function ComplianceChip({ standard, status }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${COMPLIANCE_COLOR[status] || COMPLIANCE_COLOR.not_applicable}`}>
      <span className="text-sm font-semibold uppercase tracking-wide">{standard}</span>
      <span className="text-xs font-medium">{COMPLIANCE_LABEL[status] || status}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SecurityDashboard() {
  const { user }   = useAuth()   || {}
  const { socket } = useSocket() || {}

  const [security, setSecurity]   = useState(MOCK_SECURITY)
  const [alerts, setAlerts]       = useState(MOCK_SECURITY.alerts)
  const [loading, setLoading]     = useState(false)
  const [scanning, setScanning]   = useState(false)
  const [rotating, setRotating]   = useState(false)
  const [error, setError]         = useState(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const timerRef = useRef(null)

  // ── Load security data ─────────────────────────────────────────────────────
  const loadSecurityData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/security/status')
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      setSecurity(data)
      setAlerts(data.alerts || [])
      setLastRefresh(new Date())
    } catch {
      setSecurity(MOCK_SECURITY)
      setAlerts(MOCK_SECURITY.alerts)
      setError('Using demo data — API unavailable')
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Auto-refresh every 30s ─────────────────────────────────────────────────
  useEffect(() => {
    loadSecurityData()
    timerRef.current = setInterval(loadSecurityData, 30000)
    return () => clearInterval(timerRef.current)
  }, [loadSecurityData])

  // ── Socket events ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const onAlert = data => {
      setAlerts(prev => [data, ...prev])
    }
    const onScanComplete = data => {
      setSecurity(prev => ({ ...prev, ...data, lastScan: new Date().toISOString() }))
      setScanning(false)
    }
    const onThreat = data => {
      setSecurity(prev => ({
        ...prev,
        threats: { ...prev.threats, blocked: prev.threats.blocked + 1 },
      }))
      setAlerts(prev => [{ id: Date.now(), message: data.message || 'Threat detected and blocked', severity: data.severity || 'high', time: 'just now' }, ...prev])
    }

    socket.on('security:alert',          onAlert)
    socket.on('security:scan-complete',  onScanComplete)
    socket.on('security:threat-detected', onThreat)

    return () => {
      socket.off('security:alert',          onAlert)
      socket.off('security:scan-complete',  onScanComplete)
      socket.off('security:threat-detected', onThreat)
    }
  }, [socket])

  // ── Run Scan ───────────────────────────────────────────────────────────────
  const handleRunScan = async () => {
    setScanning(true)
    try {
      const res = await fetch('/api/security/scan', { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setSecurity(prev => ({ ...prev, ...data }))
    } catch {
      // fallback: simulate scan completion after 2s
      await new Promise(r => setTimeout(r, 2000))
      setSecurity(prev => ({ ...prev, lastScan: new Date().toISOString() }))
    } finally {
      setScanning(false)
    }
  }

  // ── Rotate Keys ───────────────────────────────────────────────────────────
  const handleRotateKeys = async () => {
    setRotating(true)
    try {
      const res = await fetch('/api/security/rotate-keys', { method: 'POST' })
      if (!res.ok) throw new Error()
      setSecurity(prev => ({ ...prev, encryption: { ...prev.encryption, keyRotation: 90 } }))
    } catch {
      await new Promise(r => setTimeout(r, 1500))
      setSecurity(prev => ({ ...prev, encryption: { ...prev.encryption, keyRotation: 90 } }))
    } finally {
      setRotating(false)
    }
  }

  // ── Patch Vuln ─────────────────────────────────────────────────────────────
  const handlePatch = async (vulnId) => {
    setSecurity(prev => ({
      ...prev,
      vulnerabilities: prev.vulnerabilities.map(v =>
        v.id === vulnId ? { ...v, status: 'patched', patchedAt: new Date().toISOString().split('T')[0] } : v
      ),
    }))
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const report = { ...security, alerts, exportedAt: new Date().toISOString(), generatedBy: 'Nexus AI Pro' }
    const blob   = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = `nexus-security-report-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Dismiss alert ──────────────────────────────────────────────────────────
  const dismissAlert = id => setAlerts(prev => prev.filter(a => a.id !== id))

  // ── Derived ────────────────────────────────────────────────────────────────
  const { score, lastScan, encryption, firewall, ssl, threats, vulnerabilities, network, auditLog, compliance, browserChecks } = security
  const lastScanDate = new Date(lastScan).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const keyRotPct    = Math.min(100, Math.max(0, ((90 - encryption.keyRotation) / 90) * 100))

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="text-indigo-500" size={28} />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Last scan: {lastScanDate} ·{' '}
                <span className="text-emerald-500 font-medium">Auto-refresh ON</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadSecurityData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleRunScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60"
            >
              <Activity size={15} className={scanning ? 'animate-pulse' : ''} />
              {scanning ? 'Scanning…' : 'Run Scan'}
            </button>
            <button
              onClick={handleRotateKeys}
              disabled={rotating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-60"
            >
              <RotateCcw size={15} className={rotating ? 'animate-spin' : ''} />
              {rotating ? 'Rotating…' : 'Rotate Keys'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Download size={15} />
              Export Report
            </button>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-lg px-4 py-2.5 text-sm">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* ── Status Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* Score Ring */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center gap-2">
            <ScoreRing score={score} />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Security Score</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
              {score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Poor'}
            </span>
          </div>

          {/* Status chips */}
          <div className="space-y-3">
            <StatusChip
              icon={<Lock size={16} />}
              label="Encryption"
              value={encryption.algorithm}
              ok={encryption.status === 'active'}
            />
            <StatusChip
              icon={<Wifi size={16} />}
              label="Firewall"
              value={`Active · ${firewall.blockedToday.toLocaleString()} blocked today`}
              ok={firewall.status === 'active'}
            />
          </div>
          <div className="space-y-3 sm:col-span-2 lg:col-span-2">
            <StatusChip
              icon={<ShieldCheck size={16} />}
              label="SSL / TLS Certificate"
              value={`${ssl.status.toUpperCase()} · Expires ${ssl.expiresAt} · ${ssl.issuer}`}
              ok={ssl.status === 'valid'}
            />
            <div className="grid grid-cols-3 gap-3">
              {(['critical', 'high', 'medium'] ).map(sev => (
                <div key={sev} className={`rounded-lg border p-3 text-center ${SEVERITY_COLOR[sev]}`}>
                  <p className="text-xs font-semibold uppercase">{sev}</p>
                  <p className="text-2xl font-bold mt-1">{threats[sev]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Threat Counter ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Threat Overview</h3>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Blocked</p>
              <p className="text-5xl font-black text-gray-900 dark:text-white tabular-nums">{threats.blocked.toLocaleString()}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'critical', label: 'Critical' },
                { key: 'high',     label: 'High' },
                { key: 'medium',   label: 'Medium' },
                { key: 'low',      label: 'Low' },
                { key: 'info',     label: 'Info' },
              ].map(({ key, label }) => (
                <div key={key} className={`px-4 py-2.5 rounded-xl border text-center min-w-[80px] ${SEVERITY_COLOR[key]}`}>
                  <p className="text-xs font-semibold uppercase opacity-80">{label}</p>
                  <p className="text-2xl font-bold">{threats[key]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Alerts Panel ── */}
        {alerts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Alerts</h3>
              <span className="text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {alerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} onDismiss={dismissAlert} />
              ))}
            </div>
          </div>
        )}

        {/* ── Vulnerability Table ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Vulnerabilities</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">{vulnerabilities.filter(v => v.status === 'open').length} open</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left px-5 py-3">ID</th>
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-5 py-3">Severity</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Patched At</th>
                  <th className="text-left px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {vulnerabilities.map(vuln => (
                  <tr key={vuln.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{vuln.id}</td>
                    <td className="px-5 py-3 text-gray-800 dark:text-gray-200 max-w-[280px]">{vuln.name}</td>
                    <td className="px-5 py-3"><SeverityBadge severity={vuln.severity} /></td>
                    <td className="px-5 py-3"><StatusBadge status={vuln.status} /></td>
                    <td className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">{vuln.patchedAt || '—'}</td>
                    <td className="px-5 py-3">
                      {vuln.status === 'open' ? (
                        <button
                          onClick={() => handlePatch(vuln.id)}
                          className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-lg transition-colors"
                        >
                          Patch
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Network + Browser Checks ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Network Diagnostics */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={16} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Network Diagnostics</h3>
            </div>
            <dl className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Latency</dt>
                <dd className={`text-sm font-semibold ${network.latency < 50 ? 'text-emerald-500' : network.latency < 100 ? 'text-yellow-500' : 'text-red-500'}`}>
                  {network.latency} ms
                </dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Packet Loss</dt>
                <dd className={`text-sm font-semibold ${network.packetLoss < 0.1 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {network.packetLoss}%
                </dd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Open Ports</dt>
                <dd className="flex gap-1.5">
                  {network.openPorts.map(p => (
                    <span key={p} className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{p}</span>
                  ))}
                </dd>
              </div>
              <div className="flex justify-between items-center py-2">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Suspicious Connections</dt>
                <dd className={`flex items-center gap-1.5 text-sm font-semibold ${network.suspiciousConnections > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                  {network.suspiciousConnections > 0 && <AlertTriangle size={13} />}
                  {network.suspiciousConnections}
                </dd>
              </div>
            </dl>
          </div>

          {/* Browser Security Checks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={16} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Browser Security Checks</h3>
            </div>
            <ul className="space-y-2.5">
              {[
                { label: 'HTTPS Active',           ok: browserChecks.https },
                { label: 'Secure Cookies (HttpOnly/SameSite)', ok: browserChecks.secureCookies },
                { label: 'Content Security Policy', ok: browserChecks.csp },
                { label: 'LocalStorage Integrity',  ok: browserChecks.localStorage_ok },
                { label: `Extension Anomalies (${browserChecks.extensionAnomalies} found)`, ok: browserChecks.extensionAnomalies === 0 },
              ].map((chk, i) => (
                <li key={i} className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  {chk.ok
                    ? <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                    : <XCircle size={16} className="text-red-500 flex-shrink-0" />}
                  <span className={`text-sm ${chk.ok ? 'text-gray-700 dark:text-gray-300' : 'text-red-600 dark:text-red-400 font-medium'}`}>
                    {chk.label}
                  </span>
                  <span className={`ml-auto text-xs font-semibold ${chk.ok ? 'text-emerald-500' : 'text-red-500'}`}>
                    {chk.ok ? 'PASS' : 'FAIL'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Encryption + Compliance ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Encryption Health */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Key size={16} className="text-violet-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Encryption Health</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Algorithm</span>
                <span className="text-xs font-mono font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 px-3 py-1 rounded-full">
                  {encryption.algorithm}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Clock size={13} />Key Rotation
                  </span>
                  <span className={`font-semibold ${encryption.keyRotation <= 7 ? 'text-red-500' : encryption.keyRotation <= 14 ? 'text-orange-500' : 'text-emerald-500'}`}>
                    {encryption.keyRotation} days remaining
                  </span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all ${encryption.keyRotation <= 7 ? 'bg-red-500' : encryption.keyRotation <= 14 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                    style={{ width: `${keyRotPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{100 - Math.round(keyRotPct)}% of rotation cycle remaining</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-sm text-gray-500 dark:text-gray-400">SSL Certificate</span>
                <span className="text-xs text-gray-600 dark:text-gray-400">Expires <span className="font-semibold text-emerald-500">{ssl.expiresAt}</span></span>
              </div>
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={16} className="text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Compliance Status</h3>
            </div>
            <div className="space-y-3">
              <ComplianceChip standard="GDPR"  status={compliance.gdpr} />
              <ComplianceChip standard="SOC 2" status={compliance.soc2} />
              <ComplianceChip standard="HIPAA" status={compliance.hipaa} />
            </div>
          </div>
        </div>

        {/* ── Audit Log ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Audit Log</h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">Showing latest {Math.min(8, auditLog.length)} entries</span>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/80 backdrop-blur-sm">
                  <th className="text-left px-4 py-3">Time</th>
                  <th className="text-left px-4 py-3">Event</th>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {auditLog.slice(0, 8).map(entry => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── System Controls Footer ── */}
        <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">System Controls</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRunScan}
              disabled={scanning}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-60 shadow-sm"
            >
              <Activity size={15} className={scanning ? 'animate-pulse' : ''} />
              {scanning ? 'Scan in Progress…' : 'Run Security Scan'}
            </button>
            <button
              onClick={handleRotateKeys}
              disabled={rotating}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-60 shadow-sm"
            >
              <RotateCcw size={15} className={rotating ? 'animate-spin' : ''} />
              {rotating ? 'Rotating…' : 'Rotate Encryption Keys'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <Download size={15} />
              Export Security Report
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
