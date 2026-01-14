import jwt, { SignOptions } from 'jsonwebtoken';

export interface JwtPayload {
  athleteId: number;
  iat: number;
  exp: number;
}

export interface JwtConfig {
  secret: string;
  expiresIn: SignOptions['expiresIn'];
}

/**
 * Get JWT configuration from environment
 */
export function getJwtConfig(): JwtConfig {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required for HTTP mode');
  }

  return {
    secret,
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };
}

/**
 * Generate a JWT token for an athlete
 */
export function generateToken(athleteId: number, config?: JwtConfig): string {
  const { secret, expiresIn } = config || getJwtConfig();
  return jwt.sign({ athleteId }, secret, { expiresIn });
}

/**
 * Verify and decode a JWT token
 * Returns the athleteId if valid, null if invalid
 */
export function verifyToken(token: string, config?: JwtConfig): number | null {
  try {
    const { secret } = config || getJwtConfig();
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded.athleteId;
  } catch {
    return null;
  }
}
