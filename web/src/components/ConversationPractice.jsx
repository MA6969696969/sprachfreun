import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";
import { sendChat } from "../api.js";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";
import { useProfile } from "../context/ProfileContext.jsx";
import { conversationTurnPoints, conversationSessionBonus } from "../lib/points.js";

export default function ConversationPractice({ courses, mode }) {
  const { lang: langCode, courseId, level } = useParams();
  const navigate = useNavigate();
  const lang = courses[langCode];
  const course = mode === "course" ? lang?.courses.find((c) => c.id === courseId) : null;

  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [caption, setCaption] = useState("");
  const [captionFaint, setCaptionFaint] = useState(true);
  const [turns, setTurns] = useState([]);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState(null);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [textInput, setTextInput] = useState("");

  const startedRef = useRef(false);
  const historyRef = useRef([]);
  const { addPoints } = useProfile();

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
        mode,
        courseId: mode === "course" ? courseId : undefined,
        level: mode === "playground" ? level : undefined,
        history,
        message,
      }),
    [langCode, mode, courseId, level]
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
        historyRef.current = [
          ...historyForApi,
          { role: "user", content: trimmed },
          { role: "assistant", content: result.reply },
        ];
        setTurns((prev) => [
          ...prev,
          {
            userText: trimmed,
            hasCorrection: !!result.has_correction,
            correction: result.correction || "",
          },
        ]);
        addPoints(langCode, conversationTurnPoints(result.has_correction));
        setLoading(false);
        setCaption(result.reply);
        setCaptionFaint(false);
        setSpeaking(true);
        speak(result.reply, {
          onEnd: () => {
            setSpeaking(false);
            startListening();
          },
        });
      } catch (e) {
        setLoading(false);
        setError(e.message);
      }
    },
    [callApi, speak, stopListening, startListening, addPoints, langCode]
  );

  const startSession = useCallback(() => {
    setEnded(false);
    setTurns([]);
    setError(null);
    setCaption("");
    setCaptionFaint(true);
    historyRef.current = [];
    setLoading(true);
    callApi([], null)
      .then((result) => {
        historyRef.current = [{ role: "assistant", content: result.reply }];
        setLoading(false);
        setCaption(result.reply);
        setCaptionFaint(false);
        setSpeaking(true);
        speak(result.reply, {
          onEnd: () => {
            setSpeaking(false);
            startListening();
          },
        });
      })
      .catch((e) => {
        setLoading(false);
        setError(e.message);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callApi, speak, startListening]);

  useEffect(() => {
    if (startedRef.current || !lang) return;
    if (mode === "course" && !course) return;
    startedRef.current = true;
    startSession();
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, course]);

  useEffect(() => {
    if (listening) {
      setCaption(interimTranscript);
      setCaptionFaint(!interimTranscript);
    }
  }, [listening, interimTranscript]);

  useEffect(() => {
    return () => {
      cancelSpeech();
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!lang) return <Navigate to="/" replace />;
  if (mode === "course" && !course) return <Navigate to={`/${langCode}`} replace />;

  const title = mode === "course" ? course.title : `Playground · ${capitalize(level)}`;
  const backTo = mode === "course" ? `/${langCode}/course/${courseId}` : `/${langCode}/playground`;
  const tipCount = turns.filter((t) => t.hasCorrection).length;
  const orbState = listening ? "listening" : loading ? "thinking" : speaking ? "speaking" : "idle";

  function statusLabel() {
    switch (orbState) {
      case "listening":
        return "Listening… tap when you're done";
      case "thinking":
        return "Thinking…";
      case "speaking":
        return "Tap to interrupt";
      default:
        return "Tap to talk";
    }
  }

  function handleOrbTap() {
    if (orbState === "listening") {
      stopListening();
    } else if (orbState === "speaking") {
      cancelSpeech();
      setSpeaking(false);
      startListening();
    } else if (orbState === "idle") {
      startListening();
    }
  }

  function handleEndSession() {
    cancelSpeech();
    stopListening();
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

  if (ended) {
    return (
      <>
        <AppHeader backTo={backTo} backLabel={mode === "course" ? course.title : "Playground"} />
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
        <div className="voice-tip-count">{tipCount > 0 && `💡 ${tipCount}`}</div>
      </div>

      {!sttSupported && (
        <p className="voice-warning">
          Voice input isn't supported in this browser — try Chrome. Use "Type instead" below.
        </p>
      )}
      {!ttsSupported && (
        <p className="voice-warning">This browser can't read replies aloud, but text still works.</p>
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
        <p className={`orb-caption ${captionFaint ? "faint" : ""}`}>{caption}</p>
      </div>

      {error && <p className="voice-error">{error}</p>}

      <div className="voice-footer">
        {turns.length > 0 && (
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
