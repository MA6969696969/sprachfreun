import { Link, useParams, Navigate } from "react-router-dom";
import { Layers, Shuffle, Mic } from "lucide-react";
import AppHeader from "./AppHeader.jsx";
import SpeakButton from "./SpeakButton.jsx";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";
import { CourseIcon, courseColorClass } from "../lib/icons.jsx";

export default function CourseDetail({ courses }) {
  const { lang: langCode, courseId } = useParams();
  const lang = courses[langCode];
  const course = lang?.courses.find((c) => c.id === courseId);
  const { speak } = useSpeechSynthesis(lang?.speechLang);
  if (!lang || !course) return <Navigate to="/" replace />;

  return (
    <>
      <AppHeader backTo={`/${langCode}`} backLabel={lang.languageName} />
      <div className="page">
        <header className="hero small course-hero">
          <span className={`course-icon course-icon-lg ${courseColorClass(course.id)}`}>
            <CourseIcon courseId={course.id} size={32} />
          </span>
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
                    <span>
                      {v.term}
                      {v.romaji && <span className="romaji"> · {v.romaji}</span>}
                    </span>
                    <SpeakButton text={v.term} speak={speak} />
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
                  <div className="phrase-text">
                    <span>{p.phrase}</span>
                    <SpeakButton text={p.phrase} speak={speak} />
                  </div>
                  {p.romaji && <div className="romaji">{p.romaji}</div>}
                  <div className="phrase-translation">{p.translation}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="cta-stack">
          <Link to={`/${langCode}/course/${courseId}/flashcards`} className="primary-button practice-cta flashcard-cta">
            <Layers size={18} /> Practice vocabulary
          </Link>
          <Link to={`/${langCode}/course/${courseId}/match`} className="secondary-button practice-cta">
            <Shuffle size={18} /> Play match
          </Link>
          <Link to={`/${langCode}/practice/${courseId}`} className="secondary-button practice-cta">
            <Mic size={18} /> Practice speaking with AI
          </Link>
        </div>
      </div>
    </>
  );
}
