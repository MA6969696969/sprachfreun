export function matchPoints(pairTotal, elapsedMs) {
  if (pairTotal <= 0) return 0;
  const perPair = elapsedMs / 1000 / pairTotal;
  let speedBonus = 0;
  if (perPair <= 2) speedBonus = 40;
  else if (perPair <= 4) speedBonus = 25;
  else if (perPair <= 7) speedBonus = 10;
  return pairTotal * 5 + speedBonus;
}

export function flashcardPoints(deckSize, rounds) {
  const perfectBonus = rounds === 1 ? 20 : rounds === 2 ? 8 : 0;
  return deckSize * 4 + perfectBonus;
}

export function conversationTurnPoints(hasCorrection) {
  return hasCorrection ? 3 : 8;
}

export function conversationSessionBonus(turns) {
  if (turns.length === 0) return 0;
  let longest = 0;
  let current = 0;
  for (const t of turns) {
    if (!t.hasCorrection) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  const allCorrect = turns.every((t) => !t.hasCorrection);
  let bonus = 0;
  if (longest >= 3) bonus += 15;
  if (longest >= 5) bonus += 15;
  if (allCorrect && turns.length >= 3) bonus += 30;
  return bonus;
}

export const TEST_PASS_RATIO = 0.7;

export function testPassed(correctCount, total) {
  return total > 0 && correctCount / total >= TEST_PASS_RATIO;
}

export function testPoints(correctCount, total) {
  return correctCount * 10 + (testPassed(correctCount, total) ? 40 : 0);
}
