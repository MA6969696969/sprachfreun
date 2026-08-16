export function buildDeck(course) {
  const vocabCards = course.vocabulary.map((v) => ({
    front: v.term,
    romaji: v.romaji || null,
    back: v.translation,
    example: v.example || null,
  }));
  const phraseCards = course.phrases.map((p) => ({
    front: p.phrase,
    romaji: p.romaji || null,
    back: p.translation,
    example: null,
  }));
  return [...vocabCards, ...phraseCards];
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
