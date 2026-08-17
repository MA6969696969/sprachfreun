import { Link } from "react-router-dom";
import { useProfile } from "../context/ProfileContext.jsx";
import { useStreak } from "../context/StreakContext.jsx";

export default function AppHeader({ backTo, backLabel }) {
  const { totalPoints, level } = useProfile();
  const { streakCount, todaySeconds, goalSeconds, completedToday } = useStreak();

  const streakTitle = completedToday
    ? `${streakCount} day streak — today's goal is done!`
    : `${streakCount} day streak — ${Math.round((todaySeconds / goalSeconds) * 100)}% to today's goal`;

  return (
    <div className="app-header">
      <div className="app-header-inner">
        <Link to="/" className="app-brand">
          <span className="app-brand-mark" />
          <span>Sprachfreund</span>
        </Link>
        <div className="app-header-right">
          {backTo ? (
            <Link to={backTo} className="app-header-back">
              ← {backLabel}
            </Link>
          ) : (
            <>
              <div className="profile-badge" title={`${level.title} · ${totalPoints} points`}>
                <span className="profile-badge-dot" />
                {level.title} · {totalPoints} pts
              </div>
              <div
                className={`streak-badge ${completedToday ? "complete" : ""}`}
                title={streakTitle}
              >
                📅 {streakCount}
              </div>
            </>
          )}
          <Link to="/settings" className="settings-gear" aria-label="Settings">
            ⚙️
          </Link>
        </div>
      </div>
    </div>
  );
}
