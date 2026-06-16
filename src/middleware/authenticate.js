// File: authenticate.js | Date: 2026-06-16
import authService from '../services/authService.js';
import redisService from '../services/redisService.js';

/**
 * Require a valid JWT Bearer token. Attaches req.user on success.
 * Returns 401 if the token is missing or invalid.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
    }

    const token = authHeader.slice(7);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
    }

    // Check token blacklist
    const blacklisted = await redisService.get(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked', code: 'TOKEN_REVOKED' });
    }

    let payload;
    try {
      payload = authService.verifyJWT(token);
    } catch (err) {
      const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
      return res.status(401).json({ error: 'Invalid or expired token', code });
    }

    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type', code: 'WRONG_TOKEN_TYPE' });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      username: payload.username,
    };
    req.token = token;

    next();
  } catch (err) {
    console.error('[authenticate] Unexpected error:', err.message);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Optionally authenticate. Attaches req.user if a valid token is present,
 * but does NOT return 401 if the token is absent.
 */
export async function authenticateOptional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);
    if (!token) return next();

    const blacklisted = await redisService.get(`blacklist:${token}`);
    if (blacklisted) return next();

    try {
      const payload = authService.verifyJWT(token);
      if (payload.type === 'access') {
        req.user = {
          id: payload.sub,
          email: payload.email,
          role: payload.role,
          username: payload.username,
        };
        req.token = token;
      }
    } catch {
      // Silently ignore invalid tokens in optional mode
    }

    next();
  } catch (err) {
    console.error('[authenticateOptional] Unexpected error:', err.message);
    next();
  }
}

export default authenticate;
