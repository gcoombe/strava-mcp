import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './jwt.js';

// Extend Express Request type to include athleteId
declare global {
  namespace Express {
    interface Request {
      athleteId?: number;
    }
  }
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Middleware that requires a valid JWT token
 * Attaches athleteId to the request if valid
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({ error: 'Authorization header with Bearer token required' });
    return;
  }

  const athleteId = verifyToken(token);
  if (!athleteId) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.athleteId = athleteId;
  next();
}

/**
 * Middleware that optionally validates JWT token
 * Attaches athleteId to the request if valid, but doesn't require it
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (token) {
    const athleteId = verifyToken(token);
    if (athleteId) {
      req.athleteId = athleteId;
    }
  }

  next();
}
