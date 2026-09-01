import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "sprachfreund.activeLanguage.v1";

const ActiveLanguageContext = createContext(null);

export function ActiveLanguageProvider({ courses, children }) {
  const codes = Object.keys(courses);

  const [activeLanguage, setActiveLanguageState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && courses[stored]) return stored;
    } catch {
      // ignore
    }
    return codes[0];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, activeLanguage);
    } catch {
      // ignore write failures
    }
  }, [activeLanguage]);

  function setActiveLanguage(code) {
    if (courses[code]) setActiveLanguageState(code);
  }

  return (
    <ActiveLanguageContext.Provider value={{ activeLanguage, setActiveLanguage }}>
      {children}
    </ActiveLanguageContext.Provider>
  );
}

export function useActiveLanguage() {
  const ctx = useContext(ActiveLanguageContext);
  if (!ctx) throw new Error("useActiveLanguage must be used within an ActiveLanguageProvider");
  return ctx;
}
