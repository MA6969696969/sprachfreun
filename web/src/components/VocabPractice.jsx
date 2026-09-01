import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";
import { buildDeck, shuffle } from "../lib/deck.js";
import { useProfile } from "../context/ProfileContext.jsx";
import { flashcardPoints } from "../lib/points.js";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";
import SpeakButton from "./SpeakButton.jsx";
import { CourseIcon } from "../lib/icons.jsx";

export default function VocabPractice({ courses }) {
  const { lang: langCode, courseId } = useParams();
  const lang = courses[langCode];
  const course = lang?.courses.find((c) => c.id === courseId);
  const { speak } = useSpeechSynthesis(lang?.speechLang);

  const deck = useMemo(
    () => (course ? buildDeck(course).map((c, i) => ({ ...c, _id: i })) : []),
    [course]
  );
  const [roundOrder, setRoundOrder] = useState(() => shuffle(deck));
  const [index, setIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [marks, setMarks] = useState({});
  const [round, setRound] = useState(1);
  const [flipped, setFlipped] = useState(false);
  const awardedRef = useRef(false);
  const { addPoints } = useProfile();

  const masteredCount = useMemo(
    () => Object.values(marks).filter((m) => m === "got").length,
    [marks]
  );
  const roundDone = roundOrder.length > 0 && index >= roundOrder.length;
  const complete = roundDone && roundOrder.every((c) => marks[c._id] === "got");

  // When a round finishes, requeue anything still marked "learning" into a
  // fresh shuffled round. Self-terminating: resetting index/roundOrder makes
  // roundDone false again, so this can't loop.
  useEffect(() => {
    if (!roundDone) return;
    const stillLearning = roundOrder.filter((c) => marks[c._id] === "learning");
    if (stillLearning.length === 0) return;
    setRoundOrder(shuffle(stillLearning));
    setIndex(0);
    setFurthest(0);
    setRound((r) => r + 1);
  }, [roundDone, roundOrder, marks]);

  useEffect(() => {
    if (complete && !awardedRef.current) {
      awardedRef.current = true;
      addPoints(langCode, flashcardPoints(deck.length, round));
    }
  }, [complete, langCode, deck.length, round, addPoints]);

  if (!lang || !course) return <Navigate to="/" replace />;

  const current = roundOrder[index];
  const backTo = `/${langCode}`;
  const reviewing = index < furthest;

  function handleMark(gotIt) {
    const cardId = current._id;
    setMarks((prev) => ({ ...prev, [cardId]: gotIt ? "got" : "learning" }));
    setFlipped(false);
    setFurthest((f) => Math.max(f, index + 1));
    setIndex((i) => i + 1);
  }

  function handleBack() {
    if (index === 0) return;
    setFlipped(false);
    setIndex((i) => i - 1);
  }

  function handleForward() {
    if (index >= furthest) return;
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  function handleRestart() {
    setMarks({});
    setRound(1);
    setIndex(0);
    setFurthest(0);
    setFlipped(false);
    setRoundOrder(shuffle(deck));
  }

  return (
    <>
      <AppHeader backTo={backTo} backLabel={lang.languageName} />
      <div className="page flashcard-page">
        <header className="hero small">
          <h1>
            <CourseIcon courseId={course.id} size={26} /> {course.title}
          </h1>
          <p>
            {complete
              ? `All done — ${deck.length} cards mastered.`
              : `Round ${round} · ${masteredCount}/${deck.length} mastered`}
          </p>
        </header>

        {!complete && (
          <>
            <div className="flashcard-progress-track">
              <div
                className="flashcard-progress-fill"
                style={{ width: `${(masteredCount / deck.length) * 100}%` }}
              />
            </div>
            <div className="flashcard-nav-row">
              <button
                type="button"
                className="flashcard-nav-btn"
                onClick={handleBack}
                disabled={index === 0}
                aria-label="Previous card"
              >
                ‹
              </button>
              <span className="flashcard-position">
                {index + 1} / {roundOrder.length}
              </span>
              <button
                type="button"
                className="flashcard-nav-btn"
                onClick={handleForward}
                disabled={index >= furthest}
                aria-label="Next card"
              >
                ›
              </button>
            </div>
          </>
        )}

        {complete ? (
          <div className="flashcard-complete">
            <div className="flashcard-complete-icon">🎉</div>
            <p>
              You made it through every card in {course.title}
              {round > 1 ? ` in ${round} rounds` : ""}. Nice work.
            </p>
            <div className="cta-stack">
              <Link to={`/${langCode}/course/${courseId}/test`} className="primary-button">
                🎯 Take the test
              </Link>
              <Link to={`/${langCode}/course/${courseId}/match`} className="secondary-button">
                🔀 Play match
              </Link>
              <Link to={`/${langCode}/practice/${courseId}`} className="secondary-button">
                🎙️ Practice speaking with AI
              </Link>
              <button type="button" className="secondary-button" onClick={handleRestart}>
                🔁 Practice again
              </button>
              <Link to={backTo} className="cta-text-link">
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
                    <div className="flashcard-term">
                      {current.front}
                      <SpeakButton text={current.front} speak={speak} className="flashcard-speak" />
                    </div>
                    {current.romaji && <div className="romaji">{current.romaji}</div>}
                    <div className="flashcard-hint">Tap to reveal</div>
                  </div>
                  <div className="flashcard-face back">
                    <div className="flashcard-definition">{current.back}</div>
                    {current.example && <div className="flashcard-example">{current.example}</div>}
                  </div>
                </div>
              </div>
            </div>

            {flipped ? (
              reviewing ? (
                <p className="flashcard-review-note">
                  {marks[current._id] === "got" ? "✅ You had this one" : "😅 Still practicing this one"}
                </p>
              ) : (
                <div className="flashcard-actions">
                  <button type="button" className="flashcard-btn still-learning" onClick={() => handleMark(false)}>
                    😅 Still learning
                  </button>
                  <button type="button" className="flashcard-btn got-it" onClick={() => handleMark(true)}>
                    ✅ Got it
                  </button>
                </div>
              )
            ) : (
              <p className="flashcard-tap-prompt">Tap the card to see the translation</p>
            )}
          </>
        )}
      </div>
    </>
  );
}
