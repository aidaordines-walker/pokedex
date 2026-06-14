export function normalizeCardName(name = "") {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // removes symbols like V, VMAX punctuation, etc.
    .replace(/\s+/g, " ")        // collapse multiple spaces
    .trim();
}