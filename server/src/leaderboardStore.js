// Leaderboard storage. Uses a real Postgres database (Neon or any standard
// Postgres) when DATABASE_URL is set, so scores survive restarts/redeploys.
// Falls back to an in-memory Map when it isn't set, so local dev and testing
// keep working before the database is wired up — that fallback loses all
// data on every server restart, so it's not meant for production use.

import pg from "pg";

const { Pool } = pg;

const MAX_NAME_LENGTH = 24;
const MAX_LEADERBOARD_SIZE = 100;

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : null;

let schemaReady = null;

async function ensureSchema() {
  if (!pool) return;
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS leaderboard_scores (
        device_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        total_points INTEGER NOT NULL DEFAULT 0,
        points JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }
  await schemaReady;
}

function cleanSubmission({ deviceId, name, totalPoints, points }) {
  if (!deviceId || typeof deviceId !== "string") {
    throw new Error("Missing deviceId");
  }
  const cleanName = String(name || "Anonymous").trim().slice(0, MAX_NAME_LENGTH) || "Anonymous";
  const cleanTotal = Number.isFinite(totalPoints) ? Math.max(0, Math.round(totalPoints)) : 0;
  const cleanPoints = {};
  if (points && typeof points === "object") {
    for (const [langCode, value] of Object.entries(points)) {
      if (typeof langCode === "string" && Number.isFinite(value)) {
        cleanPoints[langCode] = Math.max(0, Math.round(value));
      }
    }
  }
  return { deviceId, name: cleanName, totalPoints: cleanTotal, points: cleanPoints };
}

// ---------------- in-memory fallback ----------------

const memoryEntries = new Map(); // deviceId -> { deviceId, name, totalPoints, points }

function submitScoreMemory(clean) {
  memoryEntries.set(clean.deviceId, clean);
  return { ok: true };
}

function getLeaderboardMemory({ langCode, limit }) {
  const scored = [...memoryEntries.values()].map((e) => ({
    name: e.name,
    deviceId: e.deviceId,
    score: langCode ? e.points[langCode] || 0 : e.totalPoints,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored
    .slice(0, limit)
    .map((e, i) => ({ rank: i + 1, name: e.name, score: e.score, deviceId: e.deviceId }));
}

// ---------------- Postgres-backed ----------------

async function submitScorePostgres(clean) {
  await ensureSchema();
  await pool.query(
    `INSERT INTO leaderboard_scores (device_id, name, total_points, points, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (device_id) DO UPDATE SET
       name = EXCLUDED.name,
       total_points = EXCLUDED.total_points,
       points = EXCLUDED.points,
       updated_at = EXCLUDED.updated_at`,
    [clean.deviceId, clean.name, clean.totalPoints, JSON.stringify(clean.points)]
  );
  return { ok: true };
}

async function getLeaderboardPostgres({ langCode, limit }) {
  await ensureSchema();
  const result = langCode
    ? await pool.query(
        `SELECT device_id, name, COALESCE((points ->> $1)::int, 0) AS score
         FROM leaderboard_scores
         ORDER BY score DESC, updated_at ASC
         LIMIT $2`,
        [langCode, limit]
      )
    : await pool.query(
        `SELECT device_id, name, total_points AS score
         FROM leaderboard_scores
         ORDER BY score DESC, updated_at ASC
         LIMIT $1`,
        [limit]
      );
  return result.rows.map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    deviceId: row.device_id,
  }));
}

// ---------------- public API (unchanged shape either way) ----------------

export async function submitScore(input) {
  const clean = cleanSubmission(input);
  return pool ? submitScorePostgres(clean) : submitScoreMemory(clean);
}

export async function getLeaderboard({ langCode, limit = 50 } = {}) {
  const cappedLimit = Math.min(limit, MAX_LEADERBOARD_SIZE);
  return pool
    ? getLeaderboardPostgres({ langCode, limit: cappedLimit })
    : getLeaderboardMemory({ langCode, limit: cappedLimit });
}

export function isUsingDatabase() {
  return !!pool;
}
