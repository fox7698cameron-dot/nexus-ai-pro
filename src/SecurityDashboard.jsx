import React, { useState, useEffect } from 'react';

const SecurityDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await window.electron.security.getDashboard();
      setDashboard(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const data = await window.electron.security.runScan();
      setDashboard(data);
      setError(null);
    } catch (err) {
      console.error('Scan failed:', err);
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePatchVulnerability = async (vulnId) => {
    try {
      const result = await window.electron.security.patchVulnerability(vulnId);
      if (result.success && dashboard) {
        const updated = {
          ...dashboard,
          vulnerabilities: dashboard.vulnerabilities.map(v =>
            v.id === vulnId ? { ...v, status: 'patched' } : v
          ),
          overallScore: Math.min(100, dashboard.overallScore + 5),
        };
        setDashboard(updated);
      }
      setError(null);
    } catch (err) {
      console.error('Patch failed:', err);
      setError(err.message);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#16b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      default:
        return '#3b82f6';
    }
  };

  if (!dashboard) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p style={{ color: '#999' }}>Loading security dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: '#fff', fontFamily: 'system-ui, -apple-system' }}>
      <h1 style={{ marginBottom: '30px', fontSize: '24px', fontWeight: '600' }}>
        Security Dashboard
      </h1>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '20px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}

      {/* Overall Score Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f472b6 100%)',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '30px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
          Overall Security Score
        </p>
        <h2 style={{ fontSize: '48px', fontWeight: 'bold', margin: '0 0 12px 0' }}>
          {dashboard.overallScore}/100
        </h2>
        <div
          style={{
            height: '6px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${dashboard.overallScore}%`,
              background: getScoreColor(dashboard.overallScore),
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Scan Action */}
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
          Run Security Scan
        </h3>
        <p style={{ fontSize: '12px', color: '#999', marginBottom: '16px' }}>
          Detect vulnerabilities and threats in your system
        </p>
        <button
          onClick={handleScan}
          disabled={isScanning}
          style={{
            width: '100%',
            padding: '12px',
            background: isScanning ? 'rgba(102, 126, 234, 0.5)' : '#667eea',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: isScanning ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background 0.2s',
          }}
        >
          {isScanning ? 'Scanning...' : 'Start Scan'}
        </button>
      </div>

      {/* Vulnerabilities */}
      {dashboard.vulnerabilities && dashboard.vulnerabilities.length > 0 && (
        <>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Vulnerabilities
          </h3>
          {dashboard.vulnerabilities.map((vuln) => (
            <div
              key={vuln.id}
              style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h4 style={{ margin: '0', fontSize: '14px', fontWeight: '600' }}>
                  {vuln.name}
                </h4>
                <span
                  style={{
                    padding: '4px 8px',
                    background: `${getSeverityColor(vuln.severity)}20`,
                    color: getSeverityColor(vuln.severity),
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  {vuln.severity.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#999', margin: '0 0 12px 0' }}>
                {vuln.description}
              </p>
              {vuln.status !== 'patched' ? (
                <button
                  onClick={() => handlePatchVulnerability(vuln.id)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#16b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  Apply Patch
                </button>
              ) : (
                <div
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#16b98120',
                    color: '#16b981',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  Patched
                </div>
              )}
            </div>
          ))}
          <div style={{ marginBottom: '30px' }} />
        </>
      )}

      {/* Threats */}
      {dashboard.threats && dashboard.threats.length > 0 && (
        <>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Recent Threats
          </h3>
          {dashboard.threats.map((threat, idx) => (
            <div
              key={idx}
              style={{
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <p style={{ margin: '0', fontSize: '14px', fontWeight: '600' }}>
                  {threat.type}
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#999' }}>
                  {new Date(threat.timestamp).toLocaleString()}
                </p>
              </div>
              <span
                style={{
                  padding: '4px 8px',
                  background:
                    threat.status === 'blocked'
                      ? '#16b98120'
                      : threat.status === 'prevented'
                        ? '#3b82f620'
                        : '#f59e0b20',
                  color:
                    threat.status === 'blocked'
                      ? '#16b981'
                      : threat.status === 'prevented'
                        ? '#3b82f6'
                        : '#f59e0b',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
              >
                {threat.status.toUpperCase()}
              </span>
            </div>
          ))}
          <div style={{ marginBottom: '30px' }} />
        </>
      )}

      {/* Encryption Status */}
      <div
        style={{
          background: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
          Encryption Status
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              background: '#16b981',
              borderRadius: '50%',
            }}
          />
          <span style={{ fontSize: '12px', color: '#999' }}>
            AES-256-GCM {dashboard.encryptionStatus.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
