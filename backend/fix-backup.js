const fs = require("fs");

let raw = fs.readFileSync("./data/pokemon-backup-2026-06-13.json", "utf8");

// STEP 1: remove weird BOM/backticks if any
raw = raw.replace(/^\uFEFF/, "").replace(/`/g, "");

// STEP 2: fix obvious trailing commas before } or ]
raw = raw.replace(/,(\s*[}\]])/g, "$1");

// STEP 3: try parsing whole file
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.log("❌ still broken JSON, attempting structural salvage...");

  // fallback: extract top-level arrays manually
  const collection = extractArray(raw, "collection");
  const chunk2 = extractArray(raw, "pokemonCollectionChunk2");
  const chunk3 = extractArray(raw, "pokemonCollectionChunk3");

  data = {
    collection,
    pokemonCollectionChunk2: chunk2,
    pokemonCollectionChunk3: chunk3
  };
}

function extractArray(text, key) {
  const start = text.indexOf(`"${key}"`);
  if (start === -1) return [];

  const slice = text.slice(start);

  const match = slice.match(/\[\s*([\s\S]*?)\s*\]/);
  if (!match) return [];

  try {
    return JSON.parse("[" + match[1] + "]");
  } catch (e) {
    return [];
  }
}

fs.writeFileSync(
  "./data/pokemon-fixed.json",
  JSON.stringify(data, null, 2)
);

console.log("✅ rebuilt with structure salvage");