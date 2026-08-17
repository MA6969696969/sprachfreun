import { Link, useParams, Navigate } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";
import { SITUATIONS } from "../lib/situations.js";

export default function Situations({ courses }) {
  const { lang: langCode } = useParams();
  const lang = courses[langCode];
  if (!lang) return <Navigate to="/" replace />;

  return (
    <>
      <AppHeader backTo={`/${langCode}/playground`} backLabel="Playground" />
      <div className="page">
        <header className="hero small">
          <h1>🎭 Real-Life Situations</h1>
          <p>
            Pick a scenario and talk your way through it in {lang.languageName} — you'll get a
            score at the end.
          </p>
        </header>

        <div className="card-grid">
          {SITUATIONS.map((s, i) => (
            <Link
              key={s.id}
              to={`/${langCode}/situations/${s.id}`}
              className="course-card"
              style={{ "--stagger": i }}
            >
              <span className="course-icon">{s.icon}</span>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
