import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface StoredTokens {
  athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_name: string | null;
  created_at: string;
  updated_at: string;
}

let db: Database.Database | null = null;

/**
 * Get or create the database connection
 */
export function getDatabase(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || join(__dirname, '..', 'data', 'strava-mcp.db');
  const dbDir = dirname(dbPath);

  // Ensure data directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS strava_tokens (
      athlete_id INTEGER PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      athlete_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // OAuth authorization codes (temporary, for OAuth 2.0 flow)
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_codes (
      code TEXT PRIMARY KEY,
      athlete_id INTEGER NOT NULL,
      client_redirect_uri TEXT NOT NULL,
      code_challenge TEXT,
      code_challenge_method TEXT,
      expires_at INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // OAuth pending authorizations (stores state while user is at Strava)
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_pending (
      state TEXT PRIMARY KEY,
      client_redirect_uri TEXT NOT NULL,
      client_state TEXT,
      code_challenge TEXT,
      code_challenge_method TEXT,
      expires_at INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

/**
 * Save or update tokens for an athlete
 */
export function saveTokens(
  athleteId: number,
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  athleteName?: string
): void {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO strava_tokens (athlete_id, access_token, refresh_token, expires_at, athlete_name, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(athlete_id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at = excluded.expires_at,
      athlete_name = COALESCE(excluded.athlete_name, strava_tokens.athlete_name),
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(athleteId, accessToken, refreshToken, expiresAt, athleteName || null);
}

/**
 * Get tokens for an athlete
 */
export function getTokens(athleteId: number): StoredTokens | null {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM strava_tokens WHERE athlete_id = ?');
  return stmt.get(athleteId) as StoredTokens | null;
}

/**
 * Delete tokens for an athlete
 */
export function deleteTokens(athleteId: number): void {
  const database = getDatabase();
  const stmt = database.prepare('DELETE FROM strava_tokens WHERE athlete_id = ?');
  stmt.run(athleteId);
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ============================================
// OAuth 2.0 Pending Authorizations
// ============================================

export interface OAuthPending {
  state: string;
  client_redirect_uri: string;
  client_state: string | null;
  code_challenge: string | null;
  code_challenge_method: string | null;
  expires_at: number;
}

/**
 * Save a pending OAuth authorization (while user is at Strava)
 */
export function savePendingAuth(
  state: string,
  clientRedirectUri: string,
  clientState?: string,
  codeChallenge?: string,
  codeChallengeMethod?: string
): void {
  const database = getDatabase();
  const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 minutes
  const stmt = database.prepare(`
    INSERT INTO oauth_pending (state, client_redirect_uri, client_state, code_challenge, code_challenge_method, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(state, clientRedirectUri, clientState || null, codeChallenge || null, codeChallengeMethod || null, expiresAt);
}

/**
 * Get and delete a pending OAuth authorization
 */
export function getPendingAuth(state: string): OAuthPending | null {
  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);

  const stmt = database.prepare('SELECT * FROM oauth_pending WHERE state = ? AND expires_at > ?');
  const pending = stmt.get(state, now) as OAuthPending | null;

  if (pending) {
    // Delete it (one-time use)
    const deleteStmt = database.prepare('DELETE FROM oauth_pending WHERE state = ?');
    deleteStmt.run(state);
  }

  return pending;
}

// ============================================
// OAuth 2.0 Authorization Codes
// ============================================

export interface OAuthCode {
  code: string;
  athlete_id: number;
  client_redirect_uri: string;
  code_challenge: string | null;
  code_challenge_method: string | null;
  expires_at: number;
}

/**
 * Save an OAuth authorization code
 */
export function saveAuthCode(
  code: string,
  athleteId: number,
  clientRedirectUri: string,
  codeChallenge?: string,
  codeChallengeMethod?: string
): void {
  const database = getDatabase();
  const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 minutes
  const stmt = database.prepare(`
    INSERT INTO oauth_codes (code, athlete_id, client_redirect_uri, code_challenge, code_challenge_method, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(code, athleteId, clientRedirectUri, codeChallenge || null, codeChallengeMethod || null, expiresAt);
}

/**
 * Get and delete an OAuth authorization code
 */
export function getAuthCode(code: string): OAuthCode | null {
  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);

  const stmt = database.prepare('SELECT * FROM oauth_codes WHERE code = ? AND expires_at > ?');
  const authCode = stmt.get(code, now) as OAuthCode | null;

  if (authCode) {
    // Delete it (one-time use)
    const deleteStmt = database.prepare('DELETE FROM oauth_codes WHERE code = ?');
    deleteStmt.run(code);
  }

  return authCode;
}

/**
 * Clean up expired OAuth data
 */
export function cleanupExpiredOAuth(): void {
  const database = getDatabase();
  const now = Math.floor(Date.now() / 1000);

  database.prepare('DELETE FROM oauth_pending WHERE expires_at <= ?').run(now);
  database.prepare('DELETE FROM oauth_codes WHERE expires_at <= ?').run(now);
}
