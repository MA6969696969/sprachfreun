import { useSettings, FONT_SIZES, THEMES } from "../context/SettingsContext.jsx";
import { useLocale } from "../context/LocaleContext.jsx";
import { UI_LANGUAGES } from "../lib/translations.js";

const THEME_LABEL_KEYS = {
  light: "themeLight",
  dark: "themeDark",
  system: "themeSystem",
};

export default function Settings() {
  const { fontSize, setFontSize, theme, setTheme } = useSettings();
  const { locale, setLocale, t } = useLocale();

  return (
    <>
      <div className="page">
        <header className="hero small">
          <h1>⚙️ {t("settings")}</h1>
        </header>

        <section>
          <h2>{t("theme")}</h2>
          <div className="settings-row">
            {THEMES.map((value) => (
              <button
                key={value}
                type="button"
                className={`settings-choice ${theme === value ? "active" : ""}`}
                onClick={() => setTheme(value)}
              >
                {t(THEME_LABEL_KEYS[value])}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>{t("fontSize")}</h2>
          <div className="settings-row">
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                className={`settings-choice ${fontSize === size ? "active" : ""}`}
                onClick={() => setFontSize(size)}
              >
                {t(size)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>{t("appLanguage")}</h2>
          <div className="settings-lang-grid">
            {UI_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`settings-lang-choice ${locale === lang.code ? "active" : ""}`}
                onClick={() => setLocale(lang.code)}
              >
                <span className="settings-lang-flag">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
