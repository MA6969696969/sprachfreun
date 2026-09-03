// User accounts: email + password, protecting a unique leaderboard username.
// Uses Postgres (Neon) when DATABASE_URL is set, so accounts survive
// restarts/redeploys. Falls back to an in-memory Map when it isn't set, so
// local dev keeps working before the database is wired up — that fallback
// loses all accounts on every server restart, so it's not for production.

import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID, randomInt } from "crypto";
import { sendPasswordResetEmail } from "./mailer.js";

const { Pool } = pg;

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-insecure-secret-change-me";
const TOKEN_EXPIRY = "30d";
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;

let schemaReady = null;

async function ensureSchema() {
  if (!pool) return;
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username));
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires TIMESTAMPTZ;
    `);
  }
  await schemaReady;
}

function validateSignupInput({ email, username, password }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanUsername = String(username || "").trim();
  if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length > 254) {
    throw new Error("Enter a valid email address.");
  }
  if (!USERNAME_RE.test(cleanUsername)) {
    throw new Error("Username must be 3-20 characters: letters, numbers, underscores only.");
  }
  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  return { cleanEmail, cleanUsername };
}

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function toPublicUser(u) {
  return { id: u.id, email: u.email, username: u.username };
}

// ---------------- in-memory fallback ----------------

const memoryUsersByEmail = new Map(); // lowercase email -> record
const memoryUsersById = new Map(); // id -> record

function memorySignup(id, cleanEmail, cleanUsername, passwordHash) {
  const takenUsername = [...memoryUsersByEmail.values()].some(
    (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
  );
  if (memoryUsersByEmail.has(cleanEmail) || takenUsername) {
    throw new Error("That email or username is already taken.");
  }
  const record = { id, email: cleanEmail, username: cleanUsername, passwordHash };
  memoryUsersByEmail.set(cleanEmail, record);
  memoryUsersById.set(id, record);
}

// ---------------- public API ----------------

export async function signup({ email, username, password }) {
  const { cleanEmail, cleanUsername } = validateSignupInput({ email, username, password });
  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomUUID();

  if (pool) {
    await ensureSchema();
    const existing = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $2`,
      [cleanEmail, cleanUsername.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      throw new Error("That email or username is already taken.");
    }
    await pool.query(
      `INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)`,
      [id, cleanEmail, cleanUsername, passwordHash]
    );
  } else {
    memorySignup(id, cleanEmail, cleanUsername, passwordHash);
  }

  return { user: toPublicUser({ id, email: cleanEmail, username: cleanUsername }), token: signToken(id) };
}

export async function login({ email, password }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  let record;
  if (pool) {
    await ensureSchema();
    const result = await pool.query(`SELECT * FROM users WHERE LOWER(email) = $1`, [cleanEmail]);
    record = result.rows[0]
      ? {
          id: result.rows[0].id,
          email: result.rows[0].email,
          username: result.rows[0].username,
          passwordHash: result.rows[0].password_hash,
        }
      : null;
  } else {
    record = memoryUsersByEmail.get(cleanEmail) || null;
  }
  if (!record) throw new Error("Incorrect email or password.");
  const valid = await bcrypt.compare(password || "", record.passwordHash);
  if (!valid) throw new Error("Incorrect email or password.");
  return { user: toPublicUser(record), token: signToken(record.id) };
}

export async function getUserById(id) {
  if (!id) return null;
  if (pool) {
    await ensureSchema();
    const result = await pool.query(`SELECT id, email, username FROM users WHERE id = $1`, [id]);
    return result.rows[0] ? toPublicUser(result.rows[0]) : null;
  }
  const record = memoryUsersById.get(id);
  return record ? toPublicUser(record) : null;
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.userId;
  } catch {
    return null;
  }
}

function generateResetCode() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

// Always resolves — doesn't reveal whether the email has an account. If it
// does, a 6-digit code is emailed and valid for 15 minutes.
export async function requestPasswordReset({ email }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) return;

  let record;
  if (pool) {
    await ensureSchema();
    const result = await pool.query(`SELECT id, email, username FROM users WHERE LOWER(email) = $1`, [
      cleanEmail,
    ]);
    record = result.rows[0] || null;
  } else {
    record = memoryUsersByEmail.get(cleanEmail) || null;
  }
  if (!record) return;

  const code = generateResetCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expires = new Date(Date.now() + RESET_CODE_TTL_MS);

  if (pool) {
    await pool.query(`UPDATE users SET reset_code_hash = $1, reset_code_expires = $2 WHERE id = $3`, [
      codeHash,
      expires,
      record.id,
    ]);
  } else {
    const memRecord = memoryUsersById.get(record.id);
    memRecord.resetCodeHash = codeHash;
    memRecord.resetCodeExpires = expires;
  }

  await sendPasswordResetEmail(record.email, record.username, code);
}

export async function resetPassword({ email, code, newPassword }) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim();
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  let record;
  if (pool) {
    await ensureSchema();
    const result = await pool.query(`SELECT * FROM users WHERE LOWER(email) = $1`, [cleanEmail]);
    record = result.rows[0]
      ? {
          id: result.rows[0].id,
          email: result.rows[0].email,
          username: result.rows[0].username,
          resetCodeHash: result.rows[0].reset_code_hash,
          resetCodeExpires: result.rows[0].reset_code_expires,
        }
      : null;
  } else {
    record = memoryUsersById.get(memoryUsersByEmail.get(cleanEmail)?.id) || null;
  }

  if (!record || !record.resetCodeHash || !record.resetCodeExpires) {
    throw new Error("Invalid or expired code.");
  }
  if (new Date(record.resetCodeExpires).getTime() < Date.now()) {
    throw new Error("Invalid or expired code.");
  }
  const validCode = await bcrypt.compare(cleanCode, record.resetCodeHash);
  if (!validCode) {
    throw new Error("Invalid or expired code.");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  if (pool) {
    await pool.query(
      `UPDATE users SET password_hash = $1, reset_code_hash = NULL, reset_code_expires = NULL WHERE id = $2`,
      [passwordHash, record.id]
    );
  } else {
    const memRecord = memoryUsersById.get(record.id);
    memRecord.passwordHash = passwordHash;
    memRecord.resetCodeHash = null;
    memRecord.resetCodeExpires = null;
  }

  return { user: toPublicUser(record), token: signToken(record.id) };
}
