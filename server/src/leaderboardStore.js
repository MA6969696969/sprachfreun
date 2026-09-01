// In-memory leaderboard store. Works for local dev and demoing right now, but
// this data is lost on every server restart/redeploy — Render's free tier
// does exactly that, so this is a placeholder until a real database is wired
// in behind the same submitScore/getLeaderboard functions.

const entries = new Map(); // deviceId -> { deviceId, name, totalPoints, points, updatedAt }

const MAX_NAME_LENGTH = 24;
const MAX_LEADERBOARD_SIZE = 100;

export function submitScore({ deviceId, name, totalPoints, points }) {
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
  entries.set(deviceId, {
    deviceId,
    name: cleanName,
    totalPoints: cleanTotal,
    points: cleanPoints,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true };
}

export function getLeaderboard({ langCode, limit = 50 } = {}) {
  const all = [...entries.values()];
  const scored = all.map((e) => ({
    name: e.name,
    deviceId: e.deviceId,
    score: langCode ? e.points[langCode] || 0 : e.totalPoints,
  }));
  scored.sort((a, b) => b.score - a.score);
  const capped = scored.slice(0, Math.min(limit, MAX_LEADERBOARD_SIZE));
  return capped.map((e, i) => ({ rank: i + 1, name: e.name, score: e.score, deviceId: e.deviceId }));
}

export function getEntryCount() {
  return entries.size;
}
