import { Link, useParams, Navigate } from "react-router-dom";
import { Drama } from "lucide-react";
import AppHeader from "./AppHeader.jsx";

const LEVELS = [
  { id: "beginner", label: "Beginner", desc: "Simple words, short sentences, lots of patience." },
  { id: "intermediate", label: "Intermediate", desc: "Normal pace, wider vocabulary." },
  { id: "advanced", label: "Advanced", desc: "Native speed, idioms, no simplification." },
];

export default function Playground({ courses }) {
  const { lang: langCode } = useParams();
  const lang = courses[langCode];
  if (!lang) return <Navigate to="/" replace />;

  return (
    <>
      <AppHeader backTo={`/${langCode}`} backLabel={lang.languageName} />
      <div className="page">
        <header className="hero small">
          <h1>Speaking Playground</h1>
          <p>Pick your level, then talk about anything — {lang.languageName} only.</p>
        </header>

        <section>
          <div className="card-grid">
            {LEVELS.map((level, i) => (
              <Link
                key={level.id}
                to={`/${langCode}/playground/${level.id}`}
                className="level-card"
                style={{ "--stagger": i }}
              >
                <h3>{level.label}</h3>
                <p>{level.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2>Real-Life Situations</h2>
          <Link to={`/${langCode}/situations`} className="playground-card">
            <h3>
              <Drama size={20} className="icon-inline" /> Try a scripted scenario
            </h3>
            <p>Grocery store, meeting a neighbor, ordering coffee, and more — talk it through and get a score.</p>
          </Link>
        </section>
      </div>
    </>
  );
}
