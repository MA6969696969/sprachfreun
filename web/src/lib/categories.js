export const CATEGORY_ORDER = ["Foundations", "Out and About", "Life & Interests", "Everyday Life"];

export function categorySlug(category) {
  return category
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryFromSlug(slug) {
  return CATEGORY_ORDER.find((c) => categorySlug(c) === slug) || null;
}
