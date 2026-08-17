import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "sprachfreund.settings.v1";
export const FONT_SIZES = ["small", "medium", "large"];

function loadFontSize() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (FONT_SIZES.includes(parsed.fontSize)) return parsed.fontSize;
    }
  } catch {
    // ignore
  }
  return "medium";
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [fontSize, setFontSize] = useState(loadFontSize);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize }));
    } catch {
      // ignore write failures
    }
  }, [fontSize]);

  return (
    <SettingsContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
