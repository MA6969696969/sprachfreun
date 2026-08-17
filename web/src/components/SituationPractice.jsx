import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Navigate, Link, useNavigate } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";
import { sendChat } from "../api.js";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";
import { useProfile } from "../context/ProfileContext.jsx";
import { getSituation, SITUATION_TURN_COUNT } from "../lib/situations.js";
import { situationPoints } from "../lib/points.js";

export default function SituationPractice({ courses }) {
  const { lang: langCode, situationId } = useParams();
  const navigate = useNavigate();
  const lang = courses[langCode];
  const situation = getSituation(situationId);

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
  const turnCountRef = useRef(0);
  const awardedRef = useRef(false);
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
        mode: "situation",
        situationTitle: situation?.title,
        situationScenario: situation?.scenario,
        turnCount: SITUATION_TURN_COUNT,
        history,
        message,
      }),
    [langCode, situation]
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
        turnCountRef.current += 1;
        setTurns((prev) => [...prev, { userText: trimmed, score: result.turn_score }]);
        setLoading(false);
        setCaption(result.reply);
        setCaptionFaint(false);
        setSpeaking(true);
        speak(result.reply, {
          onEnd: () => {
            setSpeaking(false);
            if (result.situation_complete || turnCountRef.current >= SITUATION_TURN_COUNT + 2) {
              setEnded(true);
            } else {
              startListening();
            }
          },
        });
      } catch (e) {
        setLoading(false);
        setError(e.message);
      }
    },
    [callApi, speak, stopListening, startListening]
  );

  const startSession = useCallback(() => {
    setEnded(false);
    setTurns([]);
    setError(null);
    setCaption("");
    setCaptionFaint(true);
    historyRef.current = [];
    turnCountRef.current = 0;
    awardedRef.current = false;
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
    if (startedRef.current || !lang || !situation) return;
    startedRef.current = true;
    startSession();
    // Intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, situation]);

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

  const totalScore = turns.reduce((sum, t) => sum + t.score, 0);

  useEffect(() => {
    if (ended && !awardedRef.current) {
      awardedRef.current = true;
      addPoints(langCode, situationPoints(totalScore, turns.length));
    }
  }, [ended, totalScore, turns.length, langCode, addPoints]);

  if (!lang || !situation) return <Navigate to="/" replace />;

  const backTo = `/${langCode}/situations`;
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

  function handleClose() {
    cancelSpeech();
    stopListening();
    if (turns.length > 0) {
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

  function scoreLabel(score) {
    if (score === 1) return "✅ Nice";
    if (score === 0.5) return "〰️ Close";
    return "❌ Off";
  }

  if (ended) {
    return (
      <>
        <AppHeader backTo={backTo} backLabel="Situations" />
        <div className="page">
          <header className="hero small">
            <h1>{situation.icon} {situation.title}</h1>
            <p>
              {lang.flag} Scenario complete · {totalScore}/{turns.length || 0} score
            </p>
          </header>

          {turns.length === 0 ? (
            <p>You left before saying anything — want to try again?</p>
          ) : (
            <div className="list-card">
              <ul className="recap-list">
                {turns.map((t, i) => (
                  <li key={i}>
                    <div className="recap-said">🗣️ {t.userText}</div>
                    <div className={t.score === 1 ? "recap-ok" : "recap-tip"}>
                      {scoreLabel(t.score)} — {t.score}/1
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="cta-stack">
            <button type="button" className="primary-button" onClick={startSession}>
              🔁 Try again
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
        <button type="button" className="voice-close" onClick={handleClose} aria-label="End simulation">
          ✕
        </button>
        <div className="voice-title">
          {lang.flag} <strong>{situation.title}</strong>
        </div>
        <div className="voice-tip-count">{turns.length}/{SITUATION_TURN_COUNT}</div>
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
          <button type="button" className="end-session-link" onClick={handleClose}>
            End early &amp; see score →
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
