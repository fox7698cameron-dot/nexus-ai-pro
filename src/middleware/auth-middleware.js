// src/middleware/auth-middleware.js
// Date: 2026-07-08
// JWT auth middleware with role-based access control

export function createAuthMiddleware(authService) {
  return function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.slice(7);
    const decoded = authService.verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions || []
    };

    next();
  };
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
    }
    next();
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!req.user.permissions?.includes(permission)) {
      return res.status(403).json({ error: `Permission denied: ${permission} required` });
    }
    next();
  };
}

export function optionalAuth(authService) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = authService.verifyAccessToken(token);
      if (decoded) {
        req.user = { id: decoded.sub, email: decoded.email, role: decoded.role, permissions: decoded.permissions || [] };
      }
    }
    next();
  };
}
