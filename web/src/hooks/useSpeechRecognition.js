import { useCallback, useEffect, useRef, useState } from "react";

export function useSpeechRecognition({ lang, onFinalResult }) {
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
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
    // Continuous + manual stop (rather than auto-stop on a short pause) so
    // learners get unlimited time to think mid-sentence without getting cut
    // off. The user taps the orb again when they're actually done.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang;

    recognition.onstart = () => {
      finalTranscriptRef.current = "";
      setListening(true);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += `${result[0].transcript} `;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(`${finalTranscriptRef.current}${interim}`.trim());
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      // Let onend (which always fires after onerror) handle cleanup and
      // submit whatever was already captured, instead of dropping it here.
    };

    recognition.onend = () => {
      setListening(false);
      setInterimTranscript("");
      const text = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = "";
      if (text) onFinalResultRef.current?.(text);
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
