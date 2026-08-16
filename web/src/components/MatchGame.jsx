import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import AppHeader from "./AppHeader.jsx";
import { buildDeck, shuffle } from "../lib/deck.js";

const PAIR_COUNT = 6;

function buildRound(deck) {
  const chosen = shuffle(deck).slice(0, Math.min(PAIR_COUNT, deck.length));
  const cards = [];
  chosen.forEach((item, i) => {
    cards.push({ id: `${i}-f`, pairId: i, text: item.front, sub: item.romaji, side: "front" });
    cards.push({ id: `${i}-b`, pairId: i, text: item.back, sub: null, side: "back" });
  });
  return { cards: shuffle(cards), pairTotal: chosen.length };
}

export default function MatchGame({ courses }) {
  const { lang: langCode, courseId } = useParams();
  const lang = courses[langCode];
  const course = lang?.courses.find((c) => c.id === courseId);
  const deck = useMemo(() => (course ? buildDeck(course) : []), [course]);

  const [round, setRound] = useState(() => buildRound(deck));
  const [selected, setSelected] = useState([]);
  const [wrongIds, setWrongIds] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState(new Set());
  const [startTime, setStartTime] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const lockRef = useRef(false);

  const finished = round.pairTotal > 0 && matchedPairs.size === round.pairTotal;

  useEffect(() => {
    if (!startTime || finished) return;
    const id = setInterval(() => setElapsedMs(Date.now() - startTime), 100);
    return () => clearInterval(id);
  }, [startTime, finished]);

  if (!lang || !course) return <Navigate to="/" replace />;

  const backTo = `/${langCode}/course/${courseId}`;
  const seconds = (elapsedMs / 1000).toFixed(1);

  function handleCardClick(card) {
    if (lockRef.current || matchedPairs.has(card.pairId)) return;
    if (selected.some((s) => s.id === card.id)) return;
    if (!startTime) setStartTime(Date.now());

    const next = [...selected, card];
    if (next.length === 1) {
      setSelected(next);
      return;
    }
    const [a, b] = next;
    if (a.pairId === b.pairId && a.side !== b.side) {
      setMatchedPairs((prev) => new Set(prev).add(a.pairId));
      setSelected([]);
    } else {
      lockRef.current = true;
      setSelected(next);
      setWrongIds([a.id, b.id]);
      setTimeout(() => {
        setWrongIds([]);
        setSelected([]);
        lockRef.current = false;
      }, 500);
    }
  }

  function handleReplay() {
    setRound(buildRound(deck));
    setSelected([]);
    setWrongIds([]);
    setMatchedPairs(new Set());
    setStartTime(null);
    setElapsedMs(0);
    lockRef.current = false;
  }

  return (
    <>
      <AppHeader backTo={backTo} backLabel={course.title} />
      <div className="page match-page">
        <header className="hero small">
          <h1>{course.icon} Match</h1>
          <p>
            {finished
              ? `Matched all ${round.pairTotal} pairs!`
              : `Tap a term, then its match — ${matchedPairs.size}/${round.pairTotal} found.`}
          </p>
        </header>

        {!finished && <div className="match-timer">⏱ {seconds}s</div>}

        {finished ? (
          <div className="flashcard-complete">
            <div className="flashcard-complete-icon">🏆</div>
            <p>
              You matched all {round.pairTotal} pairs in {seconds} seconds.
            </p>
            <div className="cta-stack">
              <button type="button" className="primary-button" onClick={handleReplay}>
                🔁 Play again
              </button>
              <Link to={backTo} className="secondary-button">
                Done
              </Link>
            </div>
          </div>
        ) : (
          <div className="match-grid">
            {round.cards.map((card) => {
              const isMatched = matchedPairs.has(card.pairId);
              const isSelected = selected.some((s) => s.id === card.id);
              const isWrong = wrongIds.includes(card.id);
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`match-card ${isMatched ? "matched" : ""} ${
                    isSelected ? "selected" : ""
                  } ${isWrong ? "wrong" : ""}`}
                  onClick={() => handleCardClick(card)}
                  disabled={isMatched}
                >
                  <span>{card.text}</span>
                  {card.sub && <span className="romaji">{card.sub}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
