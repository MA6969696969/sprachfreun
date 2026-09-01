import { NavLink, Outlet } from "react-router-dom";
import { Flame, Medal } from "lucide-react";
import { useProfile } from "../context/ProfileContext.jsx";
import { useStreak } from "../context/StreakContext.jsx";
import { useLocale } from "../context/LocaleContext.jsx";
import { NAV_ICONS } from "../lib/icons.jsx";

const NAV_ITEMS = [
  { to: "/", icon: NAV_ICONS.home, labelKey: "navHome", end: true },
  { to: "/leaderboard", icon: NAV_ICONS.leaderboard, labelKey: "navLeaderboard" },
  { to: "/streak", icon: NAV_ICONS.streak, labelKey: "navStreak" },
  { to: "/settings", icon: NAV_ICONS.settings, labelKey: "navSettings" },
];

export default function AppShell() {
  const { totalPoints } = useProfile();
  const { streakCount } = useStreak();
  const { t } = useLocale();

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar-inner">
          <div className="app-brand">
            <span className="app-brand-mark" />
            <span>Sprachfreund</span>
          </div>
          <div className="top-bar-stats">
            <span className="top-stat">
              <Flame size={15} /> {streakCount}
            </span>
            <span className="top-stat">
              <Medal size={15} /> {totalPoints}
            </span>
          </div>
        </div>
      </header>

      <nav className="side-nav" aria-label="Main">
        <div className="side-nav-brand">
          <span className="app-brand-mark" />
          <span>Sprachfreund</span>
        </div>
        <div className="side-nav-stats">
          <span className="top-stat">
            <Flame size={15} /> {streakCount}
          </span>
          <span className="top-stat">
            <Medal size={15} /> {totalPoints}
          </span>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `side-nav-item ${isActive ? "active" : ""}`}
          >
            <span className="side-nav-icon">
              <item.icon size={20} />
            </span>
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      <main className="shell-content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottom-nav-item ${isActive ? "active" : ""}`}
          >
            <span className="bottom-nav-icon">
              <item.icon size={22} />
            </span>
            <span className="bottom-nav-label">{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
