import { createContext, useContext, useEffect, useState } from "react";
import { useProfile } from "./ProfileContext.jsx";

const STORAGE_KEY = "sprachfreund.streak.v1";
const GOAL_SECONDS = 5 * 60;
const TICK_MS = 10000;

function pad(n) {
  return String(n).padStart(2, "0");
}

function dateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayStr() {
  return dateStr(new Date());
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateStr(d);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        streakCount: parsed.streakCount || 0,
        lastCompletedDate: parsed.lastCompletedDate || null,
        todayDate: parsed.todayDate || todayStr(),
        todaySeconds: parsed.todaySeconds || 0,
        completedDates: Array.isArray(parsed.completedDates) ? parsed.completedDates : [],
      };
    }
  } catch {
    // ignore corrupt storage
  }
  return {
    streakCount: 0,
    lastCompletedDate: null,
    todayDate: todayStr(),
    todaySeconds: 0,
    completedDates: [],
  };
}

// If the stored state is from an earlier day, roll it forward: reset today's
// timer, and break the streak unless yesterday (or today, already handled)
// was the last completed day.
function rolloverIfNeeded(prev) {
  const today = todayStr();
  if (prev.todayDate === today) return prev;
  const streakSurvives = prev.lastCompletedDate === yesterdayStr() || prev.lastCompletedDate === today;
  return {
    ...prev,
    todayDate: today,
    todaySeconds: 0,
    streakCount: streakSurvives ? prev.streakCount : 0,
  };
}

function streakPoints(streakCount) {
  return Math.min(10 + streakCount * 2, 50);
}

const StreakContext = createContext(null);

export function StreakProvider({ children }) {
  const [state, setState] = useState(() => rolloverIfNeeded(loadState()));
  const { addPoints } = useProfile();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore write failures
    }
  }, [state]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setState((prev) => {
        const rolled = rolloverIfNeeded(prev);
        if (rolled.todaySeconds >= GOAL_SECONDS) return rolled;
        return { ...rolled, todaySeconds: rolled.todaySeconds + TICK_MS / 1000 };
      });
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (state.todaySeconds < GOAL_SECONDS) return;
    if (state.lastCompletedDate === state.todayDate) return; // already awarded today
    const newStreak = state.streakCount + 1;
    setState((prev) => ({
      ...prev,
      streakCount: newStreak,
      lastCompletedDate: state.todayDate,
      completedDates: prev.completedDates.includes(state.todayDate)
        ? prev.completedDates
        : [...prev.completedDates, state.todayDate],
    }));
    addPoints("streak", streakPoints(newStreak));
  }, [state.todaySeconds, state.todayDate, state.lastCompletedDate, state.streakCount, addPoints]);

  const value = {
    streakCount: state.streakCount,
    todaySeconds: Math.min(state.todaySeconds, GOAL_SECONDS),
    goalSeconds: GOAL_SECONDS,
    completedToday: state.lastCompletedDate === state.todayDate,
    completedDates: state.completedDates,
  };

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
}

export function useStreak() {
  const ctx = useContext(StreakContext);
  if (!ctx) throw new Error("useStreak must be used within a StreakProvider");
  return ctx;
}
