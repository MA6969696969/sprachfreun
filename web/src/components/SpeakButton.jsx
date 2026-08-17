export default function SpeakButton({ text, speak, className = "" }) {
  return (
    <button
      type="button"
      className={`speak-button ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label={`Play pronunciation`}
    >
      🔊
    </button>
  );
}
