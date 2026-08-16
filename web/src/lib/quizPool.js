import { shuffle } from "./deck.js";

export function buildCategoryPool(lang, category) {
  const items = [];
  for (const course of lang.courses) {
    if (course.category !== category) continue;
    for (const v of course.vocabulary) {
      items.push({ term: v.term, translation: v.translation });
    }
    for (const p of course.phrases) {
      items.push({ term: p.phrase, translation: p.translation });
    }
  }
  return items;
}

export function pickQuizItems(pool, count) {
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}
