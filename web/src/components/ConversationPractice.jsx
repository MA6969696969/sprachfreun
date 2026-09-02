import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";
import { sendChat } from "../api.js";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";
import { useProfile } from "../context/ProfileContext.jsx";
import { useProgress, scoreToTier } from "../context/ProgressContext.jsx";
import { conversationTurnPoints, conversationSessionBonus } from "../lib/points.js";

const TEST_TURN_COUNT = 5;
const TEST_TIER_BONUS = { green: 40, yellow: 20, red: 5 };
const TEST_TIER_LABEL = {
  green: "Great job! 🟢",
  yellow: "Getting there 🟡",
  red: "Keep practicing 🔴",
};

export default function ConversationPractice({ courses, mode }) {
  const { lang: langCode, courseId, level } = useParams();
  const navigate = useNavigate();
  const lang = courses[langCode];
  const isCourseLike = mode === "course" || mode === "test";
  const course = isCourseLike ? lang?.courses.find((c) => c.id === courseId) : null;

  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState("");
  const [captionFaint, setCaptionFaint] = useState(true);
  const [turns, setTurns] = useState([]);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState(null);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [starting, setStarting] = useState(false);

  const startedRef = useRef(false);
  const historyRef = useRef([]);
  const turnsRef = useRef([]);
  const activeRef = useRef(true);
  const { addPoints } = useProfile();
  const { setCourseMastery } = useProgress();

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
    lang: lang?.speechLang,
    onFinalResult: (text) => submitTurn(text),
  });

  const callApi = useCallback(
    (history, message) =>
      sendChat({
        language: langCode,
        // The test is a bounded, auto-scored course conversation — the AI
        // doesn't need a different prompt for it, just the normal course one.
        mode: mode === "test" ? "course" : mode,
        courseId: isCourseLike ? courseId : undefined,
        level: mode === "playground" ? level : undefined,
        history,
        message,
      }),
    [langCode, mode, courseId, level, isCourseLike]
  );

  const submitTurn = useCallback(
    async (text) => {
      if (!text || !text.trim()) return;
      stopListening();
      setError(null);
      const trimmed = text.trim();
      const historyForApi = historyRef.current;
      setCaption(trimmed);
      setCaptionFaint(false);
      setLoading(true);
      try {
        const result = await callApi(historyForApi, trimmed);
        if (!activeRef.current) return;
        historyRef.current = [
          ...historyForApi,
          { role: "user", content: trimmed },
          { role: "assistant", content: result.reply },
        ];
        const newTurn = {
          userText: trimmed,
          hasCorrection: !!result.has_correction,
          correction: result.correction || "",
        };
        turnsRef.current = [...turnsRef.current, newTurn];
        setTurns(turnsRef.current);
        addPoints(langCode, conversationTurnPoints(result.has_correction));
        setLoading(false);
        setCaption(result.reply);
        setCaptionFaint(false);
        setSpeaking(true);
        const testDone = mode === "test" && turnsRef.current.length >= TEST_TURN_COUNT;
        speak(result.reply, {
          onEnd: () => {
            setSpeaking(false);
            if (testDone) {
              finishTest();
            } else {
              setStarting(true);
              startListening();
            }
          },
        });
      } catch (e) {
        if (!activeRef.current) return;
        setLoading(false);
        setError(e.message);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callApi, speak, stopListening, startListening, addPoints, langCode, mode]
  );

  function finishTest() {
    cancelSpeech();
    stopListening();
    const finalTurns = turnsRef.current;
    const correctCount = finalTurns.filter((t) => !t.hasCorrection).length;
    const percent = finalTurns.length > 0 ? Math.round((correctCount / finalTurns.length) * 100) : 0;
    const tier = scoreToTier(percent);
    setCourseMastery(langCode, courseId, tier);
    addPoints(langCode, conversationSessionBonus(finalTurns) + (TEST_TIER_BONUS[tier] || 0));
    setTestResult({ percent, tier, correctCount, total: finalTurns.length });
    setEnded(true);
  }

  const startSession = useCallback(() => {
    setEnded(false);
    setTurns([]);
    setTestResult(null);
    setError(null);
    setCaption("");
    setCaptionFaint(true);
    historyRef.current = [];
    turnsRef.current = [];
    setLoading(true);
    callApi([], null)
      .then((result) => {
        if (!activeRef.current) return;
        historyRef.current = [{ role: "assistant", content: result.reply }];
        setLoading(false);
        setCaption(result.reply);
        setCaptionFaint(false);
        setSpeaking(true);
        speak(result.reply, {
          onEnd: () => {
            setSpeaking(false);
            setStarting(true);
            startListening();
          },
        });
      })
      .catch((e) => {
        if (!activeRef.current) return;
        setLoading(false);
        setError(e.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callApi, speak, startListening]);

  useEffect(() => {
    if (startedRef.current || !lang) return;
    if (isCourseLike && !course) return;
    startedRef.current = true;
    startSession();
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, course]);

  useEffect(() => {
    if (listening) {
      setStarting(false);
      setCaption(interimTranscript);
      setCaptionFaint(!interimTranscript);
    }
  }, [listening, interimTranscript]);

  // Safety net: if the mic never actually starts (denied permission, a
  // flaky device), don't leave the orb stuck showing "starting" forever.
  useEffect(() => {
    if (!starting) return undefined;
    const timeout = setTimeout(() => setStarting(false), 2500);
    return () => clearTimeout(timeout);
  }, [starting]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      cancelSpeech();
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!lang) return <Navigate to="/" replace />;
  if (isCourseLike && !course) return <Navigate to={`/${langCode}`} replace />;

  const title = isCourseLike ? course.title : `Playground · ${capitalize(level)}`;
  const backTo = isCourseLike ? `/${langCode}` : `/${langCode}/playground`;
  const tipCount = turns.filter((t) => t.hasCorrection).length;
  const orbState = listening
    ? "listening"
    : starting
    ? "starting"
    : loading
    ? "thinking"
    : speaking
    ? "speaking"
    : "idle";

  function statusLabel() {
    switch (orbState) {
      case "listening":
        return "Listening… tap when you're done";
      case "starting":
        return "Go ahead, I'm listening…";
      case "thinking":
        return "Thinking…";
      case "speaking":
        return "Tap to interrupt";
      default:
        return "Tap to talk";
    }
  }

  function handleOrbTap() {
    if (orbState === "listening" || orbState === "starting") {
      setStarting(false);
      stopListening();
    } else if (orbState === "speaking") {
      cancelSpeech();
      setSpeaking(false);
      setStarting(true);
      startListening();
    } else if (orbState === "idle") {
      setStarting(true);
      startListening();
    }
  }

  function handleEndSession() {
    cancelSpeech();
    stopListening();
    if (mode === "test") {
      // Leaving a test early doesn't produce a fair score — just exit
      // without recording a result so it can be retaken cleanly.
      navigate(backTo);
      return;
    }
    if (turns.length > 0) {
      addPoints(langCode, conversationSessionBonus(turns));
      setEnded(true);
    } else {
      navigate(backTo);
    }
  }

  function handleTextSubmit(e) {
    e.preventDefault();
    if (!textInput.trim()) return;
    submitTurn(textInput);
    setTextInput("");
  }

  if (ended && mode === "test" && testResult) {
    return (
      <>
        <AppHeader backTo={backTo} backLabel={lang.languageName} />
        <div className="page">
          <header className="hero small">
            <h1>Test results</h1>
            <p>
              {lang.flag} {course.title}
            </p>
          </header>

          <div className={`test-score-card tier-${testResult.tier}`}>
            <div className="test-score-percent">{testResult.percent}%</div>
            <div className="test-score-label">{TEST_TIER_LABEL[testResult.tier]}</div>
            <div className="test-score-detail">
              {testResult.correctCount}/{testResult.total} without a correction
            </div>
          </div>

          <div className="list-card">
            <ul className="recap-list">
              {turns.map((t, i) => (
                <li key={i}>
                  <div className="recap-said">🗣️ {t.userText}</div>
                  {t.hasCorrection ? (
                    <div className="recap-tip">💡 {t.correction}</div>
                  ) : (
                    <div className="recap-ok">✓ Nice — no corrections here</div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="cta-stack">
            <button type="button" className="primary-button" onClick={startSession}>
              🔁 Retake the test
            </button>
            <Link to={backTo} className="cta-text-link">
              Done
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (ended) {
    return (
      <>
        <AppHeader backTo={backTo} backLabel={mode === "course" ? lang.languageName : "Playground"} />
        <div className="page">
          <header className="hero small">
            <h1>Session recap</h1>
            <p>
              {lang.flag} {title} ·{" "}
              {turns.length === 1 ? "1 thing you said" : `${turns.length} things you said`}
            </p>
          </header>

          {turns.length === 0 ? (
            <p>You ended before saying anything — want to try again?</p>
          ) : (
            <div className="list-card">
              <ul className="recap-list">
                {turns.map((t, i) => (
                  <li key={i}>
                    <div className="recap-said">🗣️ {t.userText}</div>
                    {t.hasCorrection ? (
                      <div className="recap-tip">💡 {t.correction}</div>
                    ) : (
                      <div className="recap-ok">✓ Nice — no corrections here</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="cta-stack">
            <button type="button" className="primary-button" onClick={startSession}>
              🔁 Practice again
            </button>
            <Link to={backTo} className="secondary-button">
              Done
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="voice-session">
      <div className="voice-topbar">
        <button type="button" className="voice-close" onClick={handleEndSession} aria-label="End session">
          ✕
        </button>
        <div className="voice-title">
          {lang.flag} <strong>{title}</strong>
        </div>
        <div className="voice-tip-count">
          {mode === "test" ? `${turns.length}/${TEST_TURN_COUNT}` : tipCount > 0 && `💡 ${tipCount}`}
        </div>
      </div>

      {!sttSupported && (
        <p className="voice-warning">
          Voice input isn't supported in this browser — try Chrome. Use "Type instead" below.
        </p>
      )}
      {!ttsSupported && (
        <p className="voice-warning">This browser can't read replies aloud, but text still works.</p>
      )}

      <div className={`orb-stage state-${orbState === "starting" ? "listening" : orbState}`}>
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
        <p className={`orb-caption ${captionFaint ? "faint" : ""}`}>{caption}</p>
      </div>

      {error && <p className="voice-error">{error}</p>}

      <div className="voice-footer">
        {mode !== "test" && turns.length > 0 && (
          <button type="button" className="end-session-link" onClick={handleEndSession}>
            End session &amp; see recap →
          </button>
        )}
        {!showTextFallback && (
          <button className="text-fallback-toggle" onClick={() => setShowTextFallback(true)}>
            Type instead
          </button>
        )}
        {showTextFallback && (
          <form className="text-fallback-row" onSubmit={handleTextSubmit}>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your reply…"
              autoFocus
            />
            <button type="submit">Send</button>
          </form>
        )}
      </div>
    </div>
  );
}

function capitalize(s) {
  if (!s) return "";
  return s[0].toUpperCase() + s.slice(1);
}
