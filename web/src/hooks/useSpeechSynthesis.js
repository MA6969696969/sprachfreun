import { useCallback } from "react";

export function useSpeechSynthesis(lang) {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback(
    (text, { onEnd } = {}) => {
      if (!isSupported || !text) {
        onEnd?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.95;
      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();
      window.speechSynthesis.speak(utterance);
    },
    [lang, isSupported]
  );

  const cancel = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
  }, [isSupported]);

  return { speak, cancel, isSupported };
}
