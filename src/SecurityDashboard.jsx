// ================================================
// NEXUS AI PRO - Security Dashboard (Web + Electron)
// Updated: 2026-06-13
// Detects Electron vs. Web and uses the correct API
// ================================================

import React from 'react';
import SecurityDashboardFull from './components/SecurityDashboardFull.jsx';

// Lightweight Electron shim so the full dashboard
// works identically in web and desktop contexts.
// Electron main process exposes window.electron.security;
// on web we proxy to the REST API instead.
function useSecurityBridge() {
  if (typeof window !== 'undefined' && window.electron?.security) {
    return window.electron.security;
  }
  return null; // web: SecurityDashboardFull uses fetch() directly
}

const SecurityDashboard = ({ socket }) => {
  const bridge = useSecurityBridge();

  // If running under Electron with native bridge, we still
  // use the full dashboard — it reads from /api/security/* which
  // the Electron main process proxies to the local server.
  return <SecurityDashboardFull socket={socket} electronBridge={bridge} />;
};

export default SecurityDashboard;
