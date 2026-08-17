import { useLocale } from "../context/LocaleContext.jsx";

export default function Splash() {
  const { t } = useLocale();
  return (
    <div className="splash">
      <div className="splash-orb">
        <span className="splash-ring" />
        <span className="splash-ring splash-ring-delay" />
        <span className="splash-core" />
      </div>
      <h1 className="splash-word">Sprachfreund</h1>
      <p className="splash-tagline">{t("tagline")}</p>
      <div className="splash-loading" aria-label="Loading">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
