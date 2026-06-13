const express = require("express");
const axios = require("axios");
const cors = require("cors");

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

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Pokemon backend running on http://localhost:${PORT}`);
});
