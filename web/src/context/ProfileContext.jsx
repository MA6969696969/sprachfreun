import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "sprachfreund.profile.v1";

export const LEVELS = [
  { threshold: 0, title: "Newcomer" },
  { threshold: 100, title: "Learner" },
  { threshold: 300, title: "Professional" },
  { threshold: 600, title: "Expert" },
  { threshold: 1000, title: "Master" },
  { threshold: 2000, title: "Legend" },
];

export function getLevel(points) {
  let current = LEVELS[0];
  let currentIndex = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].threshold) {
      current = LEVELS[i];
      currentIndex = i;
    }
  }
  const next = LEVELS[currentIndex + 1] || null;
  const progress = next
    ? (points - current.threshold) / (next.threshold - current.threshold)
    : 1;
  return {
    title: current.title,
    next,
    progress: Math.min(1, Math.max(0, progress)),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { name: parsed.name || "", points: parsed.points || {} };
    }
  } catch {
    // ignore corrupt storage
  }
  return { name: "", points: {} };
}

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore write failures (e.g. private browsing)
    }
  }, [state]);

  const setName = useCallback((name) => {
    setState((prev) => ({ ...prev, name }));
  }, []);

  const addPoints = useCallback((langCode, amount) => {
    if (!langCode || !amount) return;
    setState((prev) => ({
      ...prev,
      points: { ...prev.points, [langCode]: (prev.points[langCode] || 0) + amount },
    }));
  }, []);

  const totalPoints = Object.values(state.points).reduce((sum, n) => sum + n, 0);

  const value = {
    name: state.name,
    setName,
    points: state.points,
    totalPoints,
    level: getLevel(totalPoints),
    addPoints,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
}
