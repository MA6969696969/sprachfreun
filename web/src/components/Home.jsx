import { Link } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";
import ProfileBar from "./ProfileBar.jsx";
import { useLocale } from "../context/LocaleContext.jsx";

export default function Home({ courses }) {
  const { t } = useLocale();
  return (
    <>
      <AppHeader />
      <div className="page">
        <header className="hero">
          <h1>Sprachfreund</h1>
          <p>{t("homeSubtitle")}</p>
        </header>
        <ProfileBar />
        <div className="card-grid">
          {Object.values(courses).map((lang, i) => (
            <Link
              key={lang.code}
              to={`/${lang.code}`}
              className="lang-card"
              style={{ "--stagger": i }}
            >
              <span className="flag">{lang.flag}</span>
              <span className="lang-name">{lang.languageName}</span>
              <span className="lang-sub">{lang.courses.length} courses</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
