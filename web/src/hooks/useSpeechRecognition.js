import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechRecognition({ lang, onFinalResult }) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const isSupported =
    typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  useEffect(() => {
    if (!isSupported) return undefined;
    const SpeechRecognitionImpl =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(interim);
      if (final.trim()) {
        onFinalResultRef.current?.(final.trim());
      }
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    };
  }, [lang, isSupported]);

  const start = useCallback(() => {
    if (!recognitionRef.current || listening) return;
    try {
      recognitionRef.current.start();
      // listening flips to true via the recognition's own onstart event,
      // not here — starting can fail asynchronously (e.g. mic permission
      // denied), and we shouldn't claim we're listening until it's real.
    } catch (e) {
      console.warn("Could not start recognition:", e);
    }
  }, [listening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { listening, interimTranscript, start, stop, isSupported };
}
