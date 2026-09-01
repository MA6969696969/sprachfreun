import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProfile } from "../context/ProfileContext.jsx";
import { useStreak } from "../context/StreakContext.jsx";

export default function AppHeader({ backTo, backLabel }) {
  const { totalPoints, level } = useProfile();
  const { streakCount } = useStreak();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function goTo(path) {
    setMenuOpen(false);
    navigate(path);
  }

  return (
    <div className="app-header">
      <div className="app-header-inner">
        <Link to="/" className="app-brand">
          <span className="app-brand-mark" />
          <span>Sprachfreund</span>
        </Link>
        <div className="app-header-right">
          {backTo && (
            <Link to={backTo} className="app-header-back">
              ← {backLabel}
            </Link>
          )}
          <button
            type="button"
            className="menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
          <div className="app-menu">
            <div className="app-menu-profile">
              <span className="profile-badge-dot" />
              <div>
                <div className="app-menu-profile-title">{level.title}</div>
                <div className="app-menu-profile-points">{totalPoints} pts</div>
              </div>
            </div>
            <button type="button" className="app-menu-item" onClick={() => goTo("/streak")}>
              <span>📅 Streak</span>
              <span className="app-menu-item-value">{streakCount}d</span>
            </button>
            <button type="button" className="app-menu-item" onClick={() => goTo("/leaderboard")}>
              <span>🏆 Leaderboard</span>
            </button>
            <button type="button" className="app-menu-item" onClick={() => goTo("/settings")}>
              <span>⚙️ Settings</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
