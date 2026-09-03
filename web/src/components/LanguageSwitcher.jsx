import { useState } from "react";
import { Check } from "lucide-react";
import { useActiveLanguage } from "../context/ActiveLanguageContext.jsx";
import { useProfile } from "../context/ProfileContext.jsx";
import { useLocale } from "../context/LocaleContext.jsx";

export default function LanguageSwitcher({ courses }) {
  const { activeLanguage, setActiveLanguage } = useActiveLanguage();
  const { points } = useProfile();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const active = courses[activeLanguage];

  return (
    <>
      <button type="button" className="lang-switch-trigger" onClick={() => setOpen(true)}>
        <span className="lang-flag-inline">{active.flag}</span>
        <span>{active.languageName}</span>
        <span className="lang-switch-chevron">▾</span>
      </button>

      {open && (
        <>
          <div className="sheet-overlay" onClick={() => setOpen(false)} />
          <div className="sheet" role="dialog" aria-label={t("switchLanguage")}>
            <div className="sheet-handle" />
            <h2 className="sheet-title">{t("switchLanguage")}</h2>
            <div className="sheet-lang-list">
              {Object.values(courses).map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={`sheet-lang-item ${lang.code === activeLanguage ? "active" : ""}`}
                  onClick={() => {
                    setActiveLanguage(lang.code);
                    setOpen(false);
                  }}
                >
                  <span className="flag">{lang.flag}</span>
                  <span className="sheet-lang-info">
                    <span className="sheet-lang-name">{lang.languageName}</span>
                    <span className="sheet-lang-points">{points[lang.code] || 0} pts</span>
                  </span>
                  {lang.code === activeLanguage && (
                    <span className="sheet-lang-check">
                      <Check size={16} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
