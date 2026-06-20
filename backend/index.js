const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data", "pokemon.json");
const SEARCH_CACHE_FILE = path.join(__dirname, "data", "search-cache.json");
const SETS_CACHE_FILE = path.join(__dirname, "data", "sets-list.json");
const SETS_DIR = path.join(__dirname, "data", "sets");

// Ensure sets directory exists
if (!fs.existsSync(SETS_DIR)) fs.mkdirSync(SETS_DIR, { recursive: true });
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const POKEMON_API = "https://api.pokemontcg.io/v2";

// How long before we consider cached card data stale (30 days in ms)
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Search results stay fresh for 7 days (new sets drop occasionally)
const SEARCH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Sets list: 30 days (new sets don't drop that often)
const SETS_LIST_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Individual set cards: 7 days (promos / corrections can appear)
const SET_CARDS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────
// FILE HELPERS
// ─────────────────────────────────────────────

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Cache a full card object into the saved data file.
 * Adds or updates the `cardData` and `cachedAt` fields on the matching entry.
 * Safe to call fire-and-forget.
 */
function cacheCardData(cardId, cardObject) {
  try {
    const data = readData();
    const idx = data.findIndex((item) => item.id === cardId);
    if (idx !== -1) {
      data[idx].cardData = cardObject;
      data[idx].cachedAt = Date.now();
      writeData(data);
    }
  } catch (err) {
    console.warn("cacheCardData failed:", err.message);
  }
}

// ─────────────────────────────────────────────
// SEARCH CACHE HELPERS
// Stored in data/search-cache.json as:
// { "pikachu": { cachedAt: 123456789, results: [...] }, ... }
// ─────────────────────────────────────────────

function readSearchCache() {
  try {
    return JSON.parse(fs.readFileSync(SEARCH_CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeSearchCache(cache) {
  fs.writeFileSync(SEARCH_CACHE_FILE, JSON.stringify(cache, null, 2));
}

function getSearchCacheEntry(name) {
  const cache = readSearchCache();
  const key = name.toLowerCase();
  const entry = cache[key];
  if (!entry) return null;
  const isStale = Date.now() - entry.cachedAt > SEARCH_TTL_MS;
  return isStale ? null : entry.results;
}

function setSearchCacheEntry(name, results) {
  const cache = readSearchCache();
  cache[name.toLowerCase()] = { cachedAt: Date.now(), results };
  writeSearchCache(cache);
}

/**
 * Fetch a single card from the TCG API and immediately cache it.
 */
async function fetchAndCache(item) {
  const response = await axios.get(`${POKEMON_API}/cards/${item.id}`);
  const card = response.data.data;
  cacheCardData(item.id, card);
  return { card, quantity: item.quantity, addedAt: item.addedAt };
}

// ─────────────────────────────────────────────
// SETS LIST CACHE HELPERS
// Stored in data/sets-list.json
// ─────────────────────────────────────────────

function readSetsListCache() {
  try {
    return JSON.parse(fs.readFileSync(SETS_CACHE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function writeSetsListCache(data) {
  fs.writeFileSync(SETS_CACHE_FILE, JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────────
// SET CARDS CACHE HELPERS
// Each set stored in data/sets/<setId>.json
// ─────────────────────────────────────────────

function readSetCardsCache(setId) {
  try {
    const file = path.join(SETS_DIR, `${setId}.json`);
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

function writeSetCardsCache(setId, data) {
  const file = path.join(SETS_DIR, `${setId}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ─────────────────────────────────────────────
// SEARCH CARDS
// GET /api/card?name=pikachu
// ─────────────────────────────────────────────
app.get("/api/card", async (req, res) => {
  const name = req.query.name?.trim();

  if (!name) {
    return res.status(400).json({ error: "Missing card name" });
  }

  // ✅ Return from search cache if fresh
  const cached = getSearchCacheEntry(name);
  if (cached) {
    console.log(`Search cache hit for "${name}" (${cached.length} cards)`);
    return res.json(cached);
  }

  // 🌐 Not cached — fetch from API
  try {
    const response = await axios.get(`${POKEMON_API}/cards`, {
      params: {
        q: `name:*${name}*`,
        pageSize: 250,
        orderBy: "-set.releaseDate",
      },
    });

    const cards = response.data.data;

    if (!cards || cards.length === 0) {
      return res.status(404).json({ error: "No cards found" });
    }

    // Save to search cache
    setSearchCacheEntry(name, cards);
    console.log(`Search cache saved for "${name}" (${cards.length} cards)`);

    // Opportunistically update collection card cache too
    const saved = readData();
    const savedIds = new Set(saved.map((s) => s.id));
    cards.forEach((card) => {
      if (savedIds.has(card.id)) {
        cacheCardData(card.id, card);
      }
    });

    res.json(cards);
  } catch (error) {
    console.error("Card search failed:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch card data" });
  }
});

// ─────────────────────────────────────────────
// GET SINGLE CARD BY ID
// GET /api/card/id/sv3-58
// ─────────────────────────────────────────────
app.get("/api/card/id/:id", async (req, res) => {
  try {
    const response = await axios.get(`${POKEMON_API}/cards/${req.params.id}`);
    const card = response.data.data;

    // Cache it in case it's a collection card
    cacheCardData(req.params.id, card);

    res.json(card);
  } catch (error) {
    console.error("Card lookup failed:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch card" });
  }
});

// ─────────────────────────────────────────────
// GET ALL SETS (for the sticker book dropdown)
// GET /api/sets
// Cached locally for 30 days
// ─────────────────────────────────────────────
app.get("/api/sets", async (req, res) => {
  const cached = readSetsListCache();
  if (cached && Date.now() - cached.cachedAt < SETS_LIST_TTL_MS) {
    console.log(`Sets list cache hit (${cached.data.length} sets)`);
    return res.json(cached.data);
  }

  try {
    // Fetch all sets — paginate if needed (there are ~100 sets currently)
    const response = await axios.get(`${POKEMON_API}/sets`, {
      params: { orderBy: "-releaseDate", pageSize: 250 },
    });

    const sets = response.data.data;
    writeSetsListCache({ cachedAt: Date.now(), data: sets });
    console.log(`Sets list fetched and cached (${sets.length} sets)`);
    res.json(sets);
  } catch (err) {
    console.error("Sets fetch failed:", err.message);
    // Fall back to stale cache rather than failing completely
    if (cached) return res.json(cached.data);
    res.status(500).json({ error: "Failed to fetch sets" });
  }
});

// ─────────────────────────────────────────────
// GET ALL CARDS IN A SET (for the sticker book grid)
// GET /api/sets/:id/cards
// Cached locally per set for 7 days
// ─────────────────────────────────────────────
app.get("/api/sets/:id/cards", async (req, res) => {
  const setId = req.params.id;
  const cached = readSetCardsCache(setId);

  if (cached && Date.now() - cached.cachedAt < SET_CARDS_TTL_MS) {
    console.log(`Set cards cache hit for "${setId}" (${cached.data.length} cards)`);
    return res.json(cached.data);
  }

  try {
    // Some sets have >250 cards (promos etc.), so paginate properly
    let allCards = [];
    let page = 1;
    let totalCount = null;

    while (true) {
      const response = await axios.get(`${POKEMON_API}/cards`, {
        params: {
          q: `set.id:${setId}`,
          orderBy: "number",
          pageSize: 250,
          page,
        },
      });

      const batch = response.data.data || [];
      allCards = allCards.concat(batch);
      if (totalCount === null) totalCount = response.data.totalCount;

      if (allCards.length >= totalCount || batch.length < 250) break;
      page++;
    }

    writeSetCardsCache(setId, { cachedAt: Date.now(), data: allCards });
    console.log(`Set "${setId}" cached (${allCards.length} cards)`);
    res.json(allCards);
  } catch (err) {
    console.error(`Set cards fetch failed for "${setId}":`, err.message);
    // Fall back to stale cache rather than failing completely
    if (cached) return res.json(cached.data);
    res.status(500).json({ error: "Failed to fetch set cards" });
  }
});

// ─────────────────────────────────────────────
// HEALTH CHECK
// GET /health
// ─────────────────────────────────────────────
app.get("/health", (req, res) => {
  const searchCache = readSearchCache();
  const searchEntries = Object.keys(searchCache);
  const collectionData = readData();
  const setsListCache = readSetsListCache();
  const cachedSetFiles = fs.existsSync(SETS_DIR)
    ? fs.readdirSync(SETS_DIR).filter((f) => f.endsWith(".json"))
    : [];

  res.json({
    status: "ok",
    service: "pokemon-card-api",
    cache: {
      collectionCards: collectionData.length,
      collectionCached: collectionData.filter((c) => c.cardData).length,
      searchTermsCached: searchEntries.length,
      searchTerms: searchEntries,
      setsListCached: !!setsListCache,
      setsListCount: setsListCache?.data?.length || 0,
      setCardsCached: cachedSetFiles.length,
      cachedSets: cachedSetFiles.map((f) => f.replace(".json", "")),
    },
  });
});

// ─────────────────────────────────────────────
// CLEAR SEARCH CACHE
// DELETE /api/search-cache
// Clears all cached search results (or one term via ?name=pikachu)
// ─────────────────────────────────────────────
app.delete("/api/search-cache", (req, res) => {
  const name = req.query.name?.trim().toLowerCase();

  if (name) {
    const cache = readSearchCache();
    delete cache[name];
    writeSearchCache(cache);
    console.log(`Search cache cleared for "${name}"`);
    return res.json({ status: "ok", cleared: name });
  }

  writeSearchCache({});
  console.log("Search cache fully cleared");
  res.json({ status: "ok", cleared: "all" });
});

// ─────────────────────────────────────────────
// LOAD COLLECTION
// GET /api/saved
//
// Returns cached card data immediately.
// Only hits the TCG API for cards with no cache or stale cache (>30 days).
// ─────────────────────────────────────────────
app.get("/api/saved", async (req, res) => {
  try {
    const data = readData();
    const now = Date.now();

    const results = await Promise.all(
      data.map(async (item) => {
        const age = now - (item.cachedAt || 0);
        const isStale = age > CACHE_TTL_MS;

        // ✅ Serve from cache if fresh
        if (item.cardData && !isStale) {
          return {
            card: item.cardData,
            quantity: item.quantity,
            addedAt: item.addedAt,
          };
        }

        // 🌐 Cache missing or stale — fetch from API and save
        console.log(`Refreshing cache for ${item.id} (${isStale ? "stale" : "no cache"})`);
        return await fetchAndCache(item);
      })
    );

    res.json(results);
  } catch (err) {
    console.log("Load failed:", err.message);
    res.json([]);
  }
});

// ─────────────────────────────────────────────
// SAVE COLLECTION
// POST /api/saved
//
// Accepts the collection from the frontend.
// Preserves existing cardData + cachedAt so we never lose the cache.
// ─────────────────────────────────────────────
app.post("/api/saved", (req, res) => {
  const incoming = req.body;

  if (!incoming || incoming.length === 0) {
    console.log("Blocked empty overwrite ❌");
    return res.json({ status: "ignored-empty" });
  }

  // Load existing data so we can carry over cached card objects
  const existing = readData();
  const existingMap = new Map(existing.map((e) => [e.id, e]));

  const merged = incoming.map((item) => {
    const prev = existingMap.get(item.id) || {};
    return {
      id: item.id,
      quantity: item.quantity,
      addedAt: item.addedAt,
      // Preserve cached card data from the previous save
      cardData: prev.cardData || null,
      cachedAt: prev.cachedAt || null,
    };
  });

  writeData(merged);
  console.log("Saved Pokémon:", merged.length);
  res.json({ status: "ok" });
});

// ─────────────────────────────────────────────
// FORCE REFRESH CACHE FOR ALL CARDS
// POST /api/saved/refresh
//
// Useful if card prices or images need a manual update.
// ─────────────────────────────────────────────
app.post("/api/saved/refresh", async (req, res) => {
  try {
    const data = readData();

    const refreshed = await Promise.all(
      data.map(async (item) => {
        const response = await axios.get(`${POKEMON_API}/cards/${item.id}`);
        return {
          ...item,
          cardData: response.data.data,
          cachedAt: Date.now(),
        };
      })
    );

    writeData(refreshed);
    console.log("Force-refreshed cache for", refreshed.length, "cards");
    res.json({ status: "ok", refreshed: refreshed.length });
  } catch (err) {
    console.error("Refresh failed:", err.message);
    res.status(500).json({ error: "Refresh failed" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Pokemon backend running on http://localhost:${PORT}`);
});