import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { TRANSLATIONS } from "../lib/translations.js";

const STORAGE_KEY = "sprachfreund.locale.v1";

function loadLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && TRANSLATIONS[stored]) return stored;
  } catch {
    // ignore
  }
  return "en";
}

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(loadLocale);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore write failures
    }
  }, [locale]);

  const t = useCallback(
    (key) => {
      const dict = TRANSLATIONS[locale] || TRANSLATIONS.en;
      return dict[key] || TRANSLATIONS.en[key] || key;
    },
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
