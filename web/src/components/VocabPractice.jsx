import { useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";
import { buildDeck, shuffle } from "../lib/deck.js";

export default function VocabPractice({ courses }) {
  const { lang: langCode, courseId } = useParams();
  const lang = courses[langCode];
  const course = lang?.courses.find((c) => c.id === courseId);

  const deck = useMemo(() => (course ? buildDeck(course) : []), [course]);
  const [queue, setQueue] = useState(() => shuffle(deck));
  const [round, setRound] = useState(1);
  const [masteredCount, setMasteredCount] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const nextRoundRef = useRef([]);

  if (!lang || !course) return <Navigate to="/" replace />;

  const current = queue[0];
  const complete = queue.length === 0;
  const backTo = `/${langCode}/course/${courseId}`;

  function handleMark(gotIt) {
    const rest = queue.slice(1);
    if (gotIt) {
      setMasteredCount((c) => c + 1);
    } else {
      nextRoundRef.current.push(current);
    }
    setFlipped(false);
    if (rest.length > 0) {
      setQueue(rest);
    } else if (nextRoundRef.current.length > 0) {
      const next = shuffle(nextRoundRef.current);
      nextRoundRef.current = [];
      setRound((r) => r + 1);
      setQueue(next);
    } else {
      setQueue([]);
    }
  }

  function handleRestart() {
    nextRoundRef.current = [];
    setRound(1);
    setMasteredCount(0);
    setFlipped(false);
    setQueue(shuffle(deck));
  }

  return (
    <>
      <AppHeader backTo={backTo} backLabel={course.title} />
      <div className="page flashcard-page">
        <header className="hero small">
          <h1>
            {course.icon} {course.title}
          </h1>
          <p>
            {complete
              ? `All done — ${deck.length} cards mastered.`
              : `Round ${round} · ${masteredCount}/${deck.length} mastered`}
          </p>
        </header>

        {!complete && (
          <div className="flashcard-progress-track">
            <div
              className="flashcard-progress-fill"
              style={{ width: `${(masteredCount / deck.length) * 100}%` }}
            />
          </div>
        )}

        {complete ? (
          <div className="flashcard-complete">
            <div className="flashcard-complete-icon">🎉</div>
            <p>
              You made it through every card in {course.title}
              {round > 1 ? ` in ${round} rounds` : ""}. Nice work.
            </p>
            <div className="cta-stack">
              <button type="button" className="primary-button" onClick={handleRestart}>
                🔁 Practice again
              </button>
              <Link to={backTo} className="secondary-button">
                Done
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flashcard-stage">
              <div
                className={`flashcard ${flipped ? "flipped" : ""}`}
                onClick={() => setFlipped((f) => !f)}
                role="button"
                tabIndex={0}
                aria-label={flipped ? "Showing translation, tap to flip back" : "Tap to reveal translation"}
              >
                <div className="flashcard-inner">
                  <div className="flashcard-face front">
                    <div className="flashcard-term">{current.front}</div>
                    {current.romaji && <div className="romaji">{current.romaji}</div>}
                    <div className="flashcard-hint">Tap to reveal</div>
                  </div>
                  <div className="flashcard-face back">
                    <div className="flashcard-term">{current.back}</div>
                    {current.example && <div className="flashcard-example">{current.example}</div>}
                  </div>
                </div>
              </div>
            </div>

            {flipped ? (
              <div className="flashcard-actions">
                <button type="button" className="flashcard-btn still-learning" onClick={() => handleMark(false)}>
                  😅 Still learning
                </button>
                <button type="button" className="flashcard-btn got-it" onClick={() => handleMark(true)}>
                  ✅ Got it
                </button>
              </div>
            ) : (
              <p className="flashcard-tap-prompt">Tap the card to see the translation</p>
            )}
          </>
        )}
      </div>
    </>
  );
}
