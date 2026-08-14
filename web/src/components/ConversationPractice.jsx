import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { sendChat } from "../api.js";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";

export default function ConversationPractice({ courses, mode }) {
  const { lang: langCode, courseId, level } = useParams();
  const lang = courses[langCode];
  const course = mode === "course" ? lang?.courses.find((c) => c.id === courseId) : null;

  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [caption, setCaption] = useState("");
  const [captionFaint, setCaptionFaint] = useState(true);
  const [correctionBanner, setCorrectionBanner] = useState(null);
  const [error, setError] = useState(null);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [textInput, setTextInput] = useState("");

  const startedRef = useRef(false);
  const historyRef = useRef([]);
  const pausedRef = useRef(false);
  const correctionTimeoutRef = useRef(null);
  pausedRef.current = paused;

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

  const showCorrection = useCallback((text) => {
    if (!text) return;
    clearTimeout(correctionTimeoutRef.current);
    setCorrectionBanner({ key: Date.now(), text });
    correctionTimeoutRef.current = setTimeout(() => setCorrectionBanner(null), 7000);
  }, []);

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
        setLoading(false);
        if (result.has_correction && result.correction) {
          showCorrection(result.correction);
        }
        setCaption(result.reply);
        setCaptionFaint(false);
        setSpeaking(true);
        speak(result.reply, {
          onEnd: () => {
            setSpeaking(false);
            if (!pausedRef.current) startListening();
          },
        });
      } catch (e) {
        setLoading(false);
        setError(e.message);
      }
    },
    [callApi, speak, stopListening, startListening, showCorrection]
  );

  useEffect(() => {
    if (startedRef.current || !lang) return;
    if (mode === "course" && !course) return;
    startedRef.current = true;
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
            if (!pausedRef.current) startListening();
          },
        });
      })
      .catch((e) => {
        setLoading(false);
        setError(e.message);
      });
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
      clearTimeout(correctionTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!lang) return <Navigate to="/" replace />;
  if (mode === "course" && !course) return <Navigate to={`/${langCode}`} replace />;

  const title = mode === "course" ? course.title : `Playground · ${capitalize(level)}`;
  const backTo = mode === "course" ? `/${langCode}/course/${courseId}` : `/${langCode}/playground`;
  const orbState = listening ? "listening" : loading ? "thinking" : speaking ? "speaking" : "idle";

  function statusLabel() {
    switch (orbState) {
      case "listening":
        return "Listening…";
      case "thinking":
        return "Thinking…";
      case "speaking":
        return "Tap to interrupt";
      default:
        return paused ? "Paused — tap to resume" : "Tap to talk";
    }
  }

  function handleOrbTap() {
    if (orbState === "listening") {
      setPaused(true);
      stopListening();
    } else if (orbState === "speaking") {
      cancelSpeech();
      setSpeaking(false);
      setPaused(false);
      startListening();
    } else if (orbState === "idle") {
      setPaused(false);
      startListening();
    }
  }

  function handleTextSubmit(e) {
    e.preventDefault();
    if (!textInput.trim()) return;
    submitTurn(textInput);
    setTextInput("");
  }

  return (
    <div className="voice-session">
      <div className="voice-topbar">
        <Link to={backTo} className="voice-close" aria-label="Back">
          ✕
        </Link>
        <div className="voice-title">
          {lang.flag} <strong>{title}</strong>
        </div>
        <div className="voice-spacer" />
      </div>

      {!sttSupported && (
        <p className="voice-warning">
          Voice input isn't supported in this browser — try Chrome. Use "Type instead" below.
        </p>
      )}
      {!ttsSupported && (
        <p className="voice-warning">This browser can't read replies aloud, but text still works.</p>
      )}

      {correctionBanner && (
        <div className="correction-banner" key={correctionBanner.key}>
          💡 {correctionBanner.text}
        </div>
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
