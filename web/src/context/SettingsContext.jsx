import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "sprachfreund.settings.v1";
export const FONT_SIZES = ["small", "medium", "large"];
export const THEMES = ["light", "dark", "system"];

function loadSettings() {
  let fontSize = "medium";
  let theme = "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (FONT_SIZES.includes(parsed.fontSize)) fontSize = parsed.fontSize;
      if (THEMES.includes(parsed.theme)) theme = parsed.theme;
    }
  } catch {
    // ignore
  }
  return { fontSize, theme };
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [{ fontSize, theme }, setState] = useState(loadSettings);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontSize, theme }));
    } catch {
      // ignore write failures
    }

    // Keep the browser-chrome/status-bar color (and the installed PWA's
    // safe-area tinting) in sync with the resolved theme — a static value
    // here would mismatch the app whenever dark mode is active.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    function updateThemeColor() {
      const isDark = theme === "dark" || (theme === "system" && mql.matches);
      meta.setAttribute("content", isDark ? "#16161c" : "#ffffff");
    }
    updateThemeColor();
    if (theme === "system") {
      mql.addEventListener("change", updateThemeColor);
      return () => mql.removeEventListener("change", updateThemeColor);
    }
  }, [fontSize, theme]);

  const setFontSize = (value) => setState((prev) => ({ ...prev, fontSize: value }));
  const setTheme = (value) => setState((prev) => ({ ...prev, theme: value }));

  return (
    <SettingsContext.Provider value={{ fontSize, setFontSize, theme, setTheme }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
