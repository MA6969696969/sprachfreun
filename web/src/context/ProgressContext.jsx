import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CATEGORY_ORDER } from "../lib/categories.js";

const STORAGE_KEY = "sprachfreund.progress.v1";

const PROFICIENCY_LADDER = ["Beginner", "Elementary", "Intermediate", "Upper Intermediate", "Advanced"];

export function getProficiency(passedCount) {
  const index = Math.max(0, Math.min(PROFICIENCY_LADDER.length - 1, passedCount));
  return { title: PROFICIENCY_LADDER[index], passedCount, totalCount: CATEGORY_ORDER.length };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { passed: parsed.passed || {} };
    }
  } catch {
    // ignore corrupt storage
  }
  return { passed: {} };
}

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore write failures (e.g. private browsing)
    }
  }, [state]);

  const markCategoryPassed = useCallback((langCode, category) => {
    setState((prev) => {
      const current = prev.passed[langCode] || [];
      if (current.includes(category)) return prev;
      return { ...prev, passed: { ...prev.passed, [langCode]: [...current, category] } };
    });
  }, []);

  const isCategoryPassed = useCallback(
    (langCode, category) => (state.passed[langCode] || []).includes(category),
    [state.passed]
  );

  const getLangProficiency = useCallback(
    (langCode) => getProficiency((state.passed[langCode] || []).length),
    [state.passed]
  );

  const value = { passed: state.passed, markCategoryPassed, isCategoryPassed, getLangProficiency };

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within a ProgressProvider");
  return ctx;
}
