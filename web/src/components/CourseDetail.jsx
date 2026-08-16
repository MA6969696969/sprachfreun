import { Link, useParams, Navigate } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";

export default function CourseDetail({ courses }) {
  const { lang: langCode, courseId } = useParams();
  const lang = courses[langCode];
  const course = lang?.courses.find((c) => c.id === courseId);
  if (!lang || !course) return <Navigate to="/" replace />;

  return (
    <>
      <AppHeader backTo={`/${langCode}`} backLabel={lang.languageName} />
      <div className="page">
        <header className="hero small course-hero">
          <span className="course-icon course-icon-lg">{course.icon}</span>
          <div>
            <h1>{course.title}</h1>
            <p>{course.description}</p>
          </div>
        </header>

        <section>
          <h2>Key vocabulary</h2>
          <div className="list-card">
            <ul className="vocab-list">
              {course.vocabulary.map((v, i) => (
                <li key={i}>
                  <div className="vocab-term">
                    {v.term}
                    {v.romaji && <span className="romaji"> · {v.romaji}</span>}
                  </div>
                  <div className="vocab-translation">{v.translation}</div>
                  <div className="vocab-example">{v.example}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h2>Useful phrases</h2>
          <div className="list-card">
            <ul className="phrase-list">
              {course.phrases.map((p, i) => (
                <li key={i}>
                  <div className="phrase-text">{p.phrase}</div>
                  {p.romaji && <div className="romaji">{p.romaji}</div>}
                  <div className="phrase-translation">{p.translation}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="cta-stack">
          <Link to={`/${langCode}/course/${courseId}/flashcards`} className="primary-button practice-cta flashcard-cta">
            📇 Practice vocabulary
          </Link>
          <Link to={`/${langCode}/course/${courseId}/match`} className="secondary-button practice-cta">
            🔀 Play match
          </Link>
          <Link to={`/${langCode}/practice/${courseId}`} className="secondary-button practice-cta">
            🎙️ Practice speaking with AI
          </Link>
        </div>
      </div>
    </>
  );
}
