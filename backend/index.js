const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data", "pokemon.json");
const app = express();

app.use(cors());
app.use(express.json());

const POKEMON_API = "https://api.pokemontcg.io/v2";

/**
 * Search cards by name
 * Example:
 * http://localhost:4000/api/card?name=pikachu
 */
app.get("/api/card", async (req, res) => {
  const name = req.query.name?.trim();

  if (!name) {
    return res.status(400).json({
      error: "Missing card name"
    });
  }

  try {
    const response = await axios.get(`${POKEMON_API}/cards`, {
      params: {
        q: `name:*${name}*`,
        pageSize: 50,
        orderBy: "name"
      }
    });

    const cards = response.data.data;

    if (!cards || cards.length === 0) {
      return res.status(404).json({
        error: "No cards found"
      });
    }

    res.json(cards);

  } catch (error) {
    console.error("Card search failed:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to fetch card data"
    });
  }
});

/**
 * Get a single card by ID
 * Example:
 * http://localhost:4000/api/card/id/sv3-58
 */
app.get("/api/card/id/:id", async (req, res) => {
  try {
    const response = await axios.get(`${POKEMON_API}/cards/${req.params.id}`);

    res.json(response.data.data);

  } catch (error) {
    console.error("Card lookup failed:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to fetch card"
    });
  }
});

/**
 * Health check
 * Example:
 * http://localhost:4000/health
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "pokemon-card-api"
  });
});

app.get("/api/saved", (req, res) => {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    res.json(JSON.parse(data));
  } catch (err) {
    res.json([]);
  }
});

const PORT = process.env.PORT || 4000;

app.post("/api/saved", (req, res) => {
  const data = req.body;

  // 🚨 safety check: NEVER overwrite with empty array on startup glitch
  if (!data || data.length === 0) {
    console.log("Blocked empty overwrite ❌");
    return res.json({ status: "ignored-empty" });
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

  console.log("Saved Pokémon:", data.length);
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Pokemon backend running on http://localhost:${PORT}`);
});
