import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Lock, Crown, Medal } from "lucide-react";
import { useProfile } from "../context/ProfileContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getDeviceId } from "../lib/deviceId.js";
import { submitLeaderboardScore, fetchLeaderboard } from "../api.js";

export default function Leaderboard({ courses }) {
  const { name, setName, totalPoints, points } = useProfile();
  const { isSignedIn, user, token } = useAuth();
  const [editing, setEditing] = useState(!name && !isSignedIn);
  const [draft, setDraft] = useState(name || "");
  const [langCode, setLangCode] = useState(null);
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const deviceId = getDeviceId();
  // Signed-in submissions are keyed by account, not this browser's device id
  // (the backend does the same thing) — so "you" highlighting still lines up.
  const effectiveDeviceId = isSignedIn ? `user:${user.id}` : deviceId;
  const effectiveName = isSignedIn ? user.username : name;

  useEffect(() => {
    let cancelled = false;
    setError(null);

    async function submitThenFetch() {
      if (effectiveName) {
        // Submit first so a fresh visit shows your own just-updated score
        // right away instead of one page load behind.
        await submitLeaderboardScore({
          deviceId,
          name: effectiveName,
          totalPoints,
          points,
          token: isSignedIn ? token : undefined,
        }).catch(() => {
          // best-effort — still try to load the list below with whatever's there
        });
      }
      if (cancelled) return;
      try {
        const data = await fetchLeaderboard(langCode || undefined);
        if (!cancelled) setEntries(data.entries);
      } catch {
        if (!cancelled) setError("Couldn't load the leaderboard — try again in a moment.");
      }
    }

    submitThenFetch();
    return () => {
      cancelled = true;
    };
  }, [langCode, effectiveName, totalPoints, points, deviceId, isSignedIn, token]);

  function commitName() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setName(trimmed);
    setEditing(false);
  }

  const languageList = Object.values(courses);

  return (
    <>
      <div className="page">
        <header className="hero small">
          <h1>
            <Trophy size={26} className="icon-inline" /> Leaderboard
          </h1>
          <p>See how your points stack up against everyone else playing Sprachfreund.</p>
        </header>

        {isSignedIn ? (
          <p className="leaderboard-account-status">
            <Lock size={14} className="icon-inline" /> Signed in as <strong>{user.username}</strong> —
            your name is protected.
          </p>
        ) : (
          <p className="leaderboard-account-status">
            <Link to="/account">Sign in</Link> to protect your name so no one else can use it.
          </p>
        )}

        {editing ? (
          <div className="list-card leaderboard-name-card">
            <p>Pick a name so people can find you on the board.</p>
            <form
              className="profile-name-form"
              onSubmit={(e) => {
                e.preventDefault();
                commitName();
              }}
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="What should we call you?"
                maxLength={24}
                autoFocus
              />
              <button type="submit" className="primary-button">
                Join the leaderboard
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="leaderboard-filters">
              <button
                type="button"
                className={`settings-choice ${langCode === null ? "active" : ""}`}
                onClick={() => setLangCode(null)}
              >
                <Trophy size={16} /> Overall
              </button>
              {languageList.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`settings-choice ${langCode === lang.code ? "active" : ""}`}
                  onClick={() => setLangCode(lang.code)}
                >
                  {lang.flag} {lang.languageName}
                </button>
              ))}
            </div>

            <div className="list-card leaderboard-list">
              {error && <p className="leaderboard-empty">{error}</p>}
              {!error && entries === null && <p className="leaderboard-empty">Loading…</p>}
              {!error && entries && entries.length === 0 && (
                <p className="leaderboard-empty">
                  No scores yet for this {langCode ? "language" : "board"} — be the first!
                </p>
              )}
              {!error && entries && entries.length > 0 && (
                <ul className="leaderboard-rows">
                  {entries.map((entry) => (
                    <li
                      key={entry.deviceId}
                      className={`leaderboard-row ${entry.deviceId === effectiveDeviceId ? "me" : ""}`}
                    >
                      <span
                        className={`leaderboard-rank ${
                          entry.rank === 1
                            ? "rank-gold"
                            : entry.rank === 2
                            ? "rank-silver"
                            : entry.rank === 3
                            ? "rank-bronze"
                            : ""
                        }`}
                      >
                        {entry.rank === 1 ? (
                          <Crown size={18} />
                        ) : entry.rank <= 3 ? (
                          <Medal size={18} />
                        ) : (
                          `#${entry.rank}`
                        )}
                      </span>
                      <span className="leaderboard-name">
                        {entry.name}
                        {entry.deviceId === effectiveDeviceId && (
                          <span className="leaderboard-you"> · you</span>
                        )}
                      </span>
                      <span className="leaderboard-score">{entry.score} pts</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="leaderboard-note">
              Your name and points are visible to everyone else on this leaderboard.
              {!isSignedIn && " You can change your name anytime in Settings."}
            </p>
          </>
        )}
      </div>
    </>
  );
}
