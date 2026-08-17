import AppHeader from "./AppHeader.jsx";
import { useSettings, FONT_SIZES } from "../context/SettingsContext.jsx";
import { useLocale } from "../context/LocaleContext.jsx";
import { UI_LANGUAGES } from "../lib/translations.js";

export default function Settings() {
  const { fontSize, setFontSize } = useSettings();
  const { locale, setLocale, t } = useLocale();

  return (
    <>
      <AppHeader backTo="/" backLabel={t("done")} />
      <div className="page">
        <header className="hero small">
          <h1>⚙️ {t("settings")}</h1>
        </header>

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
