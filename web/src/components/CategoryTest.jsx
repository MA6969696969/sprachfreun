import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import { PartyPopper, CheckCircle2, XCircle, RotateCcw, X } from "lucide-react";
import AppHeader from "./AppHeader.jsx";
import { gradeAnswer } from "../api.js";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";
import { useProfile } from "../context/ProfileContext.jsx";
import { useProgress } from "../context/ProgressContext.jsx";
import { categoryFromSlug } from "../lib/categories.js";
import { buildCategoryPool, pickQuizItems } from "../lib/quizPool.js";
import { testPoints, testPassed, TEST_PASS_RATIO } from "../lib/points.js";

const QUIZ_LENGTH = 8;

export default function CategoryTest({ courses }) {
  const { lang: langCode, category: categorySlugParam } = useParams();
  const navigate = useNavigate();
  const lang = courses[langCode];
  const category = categoryFromSlug(categorySlugParam);

  const [items, setItems] = useState(() =>
    lang && category ? pickQuizItems(buildCategoryPool(lang, category), QUIZ_LENGTH) : []
  );
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("prompt"); // prompt -> listening -> grading -> feedback
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState(null);

  const startedRef = useRef(false);
  const awardedRef = useRef(false);
  const { addPoints } = useProfile();
  const { markCategoryPassed } = useProgress();

  const { speak, cancel: cancelSpeech, isSupported: ttsSupported } = useSpeechSynthesis(
    lang?.speechLang
  );

  const {
    listening,
    interimTranscript,
    start: startListening,
    stop: stopListening,
    isSupported: sttSupported,
  } = useSpeechRecognition({
    lang: "en-US",
    onFinalResult: (text) => submitAnswer(text),
  });

  const presentItem = useCallback(
    (itemsArr, i) => {
      cancelSpeech();
      stopListening();
      if (i >= itemsArr.length) {
        setFinished(true);
        return;
      }
      setPhase("prompt");
      setFeedback(null);
      setError(null);
      speak(itemsArr[i].term, {
        onEnd: () => {
          setPhase("listening");
          startListening();
        },
      });
    },
    [speak, cancelSpeech, stopListening, startListening]
  );

  const submitAnswer = useCallback(
    async (text) => {
      stopListening();
      setPhase("grading");
      const item = items[index];
      let graded;
      try {
        graded = await gradeAnswer({
          language: langCode,
          term: item.term,
          correctTranslation: item.translation,
          userAnswer: text,
        });
      } catch (e) {
        setError(e.message);
        graded = { correct: false, feedback: "Couldn't check that answer, but let's keep going." };
      }
      const result = {
        term: item.term,
        translation: item.translation,
        userAnswer: text,
        correct: !!graded.correct,
        feedback: graded.feedback || "",
      };
      setResults((prev) => [...prev, result]);
      setFeedback(result);
      setPhase("feedback");
    },
    [items, index, langCode, stopListening]
  );

  useEffect(() => {
    if (startedRef.current || items.length === 0) return;
    startedRef.current = true;
    presentItem(items, 0);
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    if (listening) setFeedback(null);
  }, [listening]);

  useEffect(() => {
    return () => {
      cancelSpeech();
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const correctCount = results.filter((r) => r.correct).length;
  const passed = testPassed(correctCount, items.length);

  useEffect(() => {
    if (finished && !awardedRef.current) {
      awardedRef.current = true;
      addPoints(langCode, testPoints(correctCount, items.length));
      if (passed) markCategoryPassed(langCode, category);
    }
  }, [finished, correctCount, items.length, passed, langCode, category, addPoints, markCategoryPassed]);

  if (!lang || !category) return <Navigate to="/" replace />;

  const backTo = `/${langCode}`;
  const currentItem = items[index];

  function handleClose() {
    navigate(backTo);
  }

  function handleOrbTap() {
    if (phase === "listening") {
      stopListening();
    } else if (phase === "prompt") {
      cancelSpeech();
      setPhase("listening");
      startListening();
    }
  }

  function handleNext() {
    const nextIndex = index + 1;
    setIndex(nextIndex);
    presentItem(items, nextIndex);
  }

  function handleRetry() {
    const freshItems = pickQuizItems(buildCategoryPool(lang, category), QUIZ_LENGTH);
    setItems(freshItems);
    setIndex(0);
    setResults([]);
    setFeedback(null);
    setFinished(false);
    setError(null);
    awardedRef.current = false;
    presentItem(freshItems, 0);
  }

  function handleTextSubmit(e) {
    e.preventDefault();
    submitAnswer(textInput);
    setTextInput("");
    setShowTextFallback(false);
  }

  if (items.length === 0) {
    return (
      <>
        <AppHeader backTo={backTo} backLabel={lang.languageName} />
        <div className="page">
          <p>This unit doesn't have enough content for a test yet.</p>
        </div>
      </>
    );
  }

  if (finished) {
    return (
      <>
        <AppHeader backTo={backTo} backLabel={lang.languageName} />
        <div className="page">
          <header className="hero small">
            <h1>
              {passed ? (
                <>
                  <PartyPopper size={26} className="icon-inline" /> Test passed!
                </>
              ) : (
                "Test results"
              )}
            </h1>
            <p>
              {lang.flag} {category} · {correctCount}/{items.length} correct
            </p>
          </header>

          {!passed && (
            <p>
              Score {Math.round(TEST_PASS_RATIO * 100)}% or higher to pass this unit. Review below
              and try again whenever you're ready.
            </p>
          )}

          <div className="list-card">
            <ul className="recap-list">
              {results.map((r, i) => (
                <li key={i}>
                  <div className="recap-said">
                    {r.correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {r.term} → "
                    {r.userAnswer || "(no answer)"}"
                  </div>
                  {r.correct ? (
                    <div className="recap-ok">{r.feedback || "Correct!"}</div>
                  ) : (
                    <div className="recap-tip">
                      Means: {r.translation}
                      {r.feedback ? ` — ${r.feedback}` : ""}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="cta-stack">
            <button type="button" className="primary-button" onClick={handleRetry}>
              <RotateCcw size={18} /> Retake test
            </button>
            <Link to={backTo} className="secondary-button">
              Done
            </Link>
          </div>
        </div>
      </>
    );
  }

  const orbState =
    phase === "listening" ? "listening" : phase === "grading" ? "thinking" : phase === "prompt" ? "speaking" : "idle";

  function statusLabel() {
    switch (phase) {
      case "prompt":
        return "Tap to skip ahead";
      case "listening":
        return "Say what it means in English — tap when you're done";
      case "grading":
        return "Checking…";
      default:
        return feedback?.correct ? "Correct!" : "Not quite";
    }
  }

  return (
    <div className="voice-session">
      <div className="voice-topbar">
        <button type="button" className="voice-close" onClick={handleClose} aria-label="Exit test">
          <X size={18} />
        </button>
        <div className="voice-title">
          {lang.flag} <strong>{category} Test</strong>
        </div>
        <div className="voice-tip-count">
          {index + 1}/{items.length}
        </div>
      </div>

      {!sttSupported && (
        <p className="voice-warning">
          Voice input isn't supported in this browser — try Chrome. Use "Type instead" below.
        </p>
      )}
      {!ttsSupported && (
        <p className="voice-warning">This browser can't read the prompt aloud, but it's shown as text too.</p>
      )}

      <div className={`orb-stage state-${orbState}`}>
        <div className="orb-wrap">
          <span className="ring ring-1" />
          <span className="ring ring-2" />
          <span className="ring ring-3" />
          <span className="thinking-ring" />
          <button
            type="button"
            className="orb-button"
            onClick={handleOrbTap}
            aria-label={statusLabel()}
          >
            <span className="orb-core" />
          </button>
        </div>
        <p className="orb-status">{statusLabel()}</p>
        {phase !== "feedback" && (
          <p className={`orb-caption ${phase === "listening" ? "faint" : ""}`}>
            {phase === "listening" && interimTranscript ? interimTranscript : currentItem.term}
          </p>
        )}
      </div>

      {phase === "feedback" && feedback && (
        <div className={`test-feedback ${feedback.correct ? "correct" : "incorrect"}`}>
          <p className="test-feedback-verdict">
            {feedback.correct ? (
              <>
                <CheckCircle2 size={18} /> Correct
              </>
            ) : (
              <>
                <XCircle size={18} /> Not quite
              </>
            )}
          </p>
          <p className="test-feedback-meaning">
            "{currentItem.term}" means: {currentItem.translation}
          </p>
          {feedback.feedback && <p className="test-feedback-note">{feedback.feedback}</p>}
          <button type="button" className="primary-button" onClick={handleNext}>
            {index + 1 >= items.length ? "See results →" : "Next →"}
          </button>
        </div>
      )}

      {error && <p className="voice-error">{error}</p>}

      <div className="voice-footer">
        {!showTextFallback && phase === "listening" && (
          <button className="text-fallback-toggle" onClick={() => setShowTextFallback(true)}>
            Type instead
          </button>
        )}
        {showTextFallback && phase === "listening" && (
          <form className="text-fallback-row" onSubmit={handleTextSubmit}>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type what it means…"
              autoFocus
            />
            <button type="submit">Send</button>
          </form>
        )}
      </div>
    </div>
  );
}
