import React, { useState, useEffect } from "react";
import "./App.css";
import { searchCards } from "./api";
import CardStats from "./components/CardStats";
import CollectionView from "./components/CollectionView";

function App() {
  const [searchName, setSearchName] = useState("");
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [collection, setCollection] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showStickerBook, setShowStickerBook] = useState(false);

  // =========================
  // LOAD COLLECTION (localStorage)
  // =========================
  useEffect(() => {
    const saved = localStorage.getItem("pokemon-collection");

    if (saved) {
      try {
        setCollection(JSON.parse(saved));
      } catch (e) {
        console.log("Failed to load collection");
      }
    }
  }, []);

  // SAVE COLLECTION
  useEffect(() => {
    localStorage.setItem(
      "pokemon-collection",
      JSON.stringify(collection)
    );
  }, [collection]);

  // =========================
  // SEARCH CARDS
  // =========================
  const fetchCard = async () => {
    if (!searchName.trim()) return;

    setLoading(true);
    setError("");
    setCards([]);
    setSelectedCard(null);

    try {
      const data = await searchCards(searchName);
      if (!data.length) setError("No cards found");
      else setCards(data);
    } catch (err) {
      setError(err.message || "Could not reach backend");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // TAG SYSTEM
  // =========================
  const getCardTags = (card) => {
    const name = card.name?.toLowerCase();
    const tags = [];

    if (name.includes("vmax")) tags.push("VMAX");
    else if (name.includes("vstar")) tags.push("VSTAR");
    else if (card.subtypes?.includes("V")) tags.push("V");

    if (card.rarity?.toLowerCase().includes("secret")) {
      tags.push("SECRET RARE");
    } else if (card.rarity?.toLowerCase().includes("rare")) {
      tags.push("RARE");
    }

    return tags;
  };

  // =========================
  // CARD VALUE
  // =========================
  const getCardValue = (card) => {
    if (!card?.tcgplayer?.prices) return 0;

    const p = card.tcgplayer.prices;

    return (
      p.normal?.market ||
      p.holofoil?.market ||
      p.reverseHolofoil?.market ||
      p.firstEditionHolofoil?.market ||
      0
    );
  };

  // =========================
  // ADD TO COLLECTION
  // =========================
  const addToCollection = () => {
    if (!selectedCard) return;

    setCollection((prev) => {
      const existing = prev.find(
        (item) => item.card.id === selectedCard.id
      );

      if (existing) {
        return prev.map((item) =>
          item.card.id === selectedCard.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        { card: selectedCard, quantity: 1, addedAt: Date.now() },
      ];
    });
  };

  // =========================
  // QUANTITY CONTROLS
  // =========================
  const increaseQty = (cardId) => {
    setCollection((prev) =>
      prev.map((item) =>
        item.card.id === cardId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQty = (cardId) => {
    setCollection((prev) =>
      prev
        .map((item) =>
          item.card.id === cardId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCollection = (cardId) => {
    setCollection((prev) =>
      prev.filter((item) => item.card.id !== cardId)
    );
  };

  // =========================
  // STATS
  // =========================
  const totalCards = collection.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const totalValue = collection.reduce(
    (sum, item) =>
      sum + getCardValue(item.card) * item.quantity,
    0
  );

  const mostValuableCard = collection.reduce((best, item) => {
    const value = getCardValue(item.card);
    if (!best || value > getCardValue(best.card)) return item;
    return best;
  }, null);

  const totalVCards = collection.filter((item) =>
    item.card.subtypes?.includes("V")
  ).length;

  const totalVMAXCards = collection.filter((item) =>
    item.card.subtypes?.includes("VMAX")
  ).length;

  const secretRareCards = collection.filter((item) =>
    item.card.rarity?.toLowerCase().includes("secret")
  ).length;

  // =========================
  // UI
  // =========================
  return (
    <div className="app-layout">
      <div className="main-content">
        {showStickerBook ? (
          <CollectionView
            collection={collection}
            onClose={() => setShowStickerBook(false)}
          />
        ) : (
          <>
            {/* HEADER */}
            <header className="header">
              <h1>⚡ Dylan & Kevin's Pokémon Collection</h1>

              <div className="stats">
                <div className="stat-card">
                  <span>{totalCards}</span>
                  <small>Cards Owned</small>
                </div>

                <div className="stat-card">
                  <span>{collection.length}</span>
                  <small>Unique Cards</small>
                </div>

                <div className="stat-card">
                  <span>€{totalValue.toFixed(2)}</span>
                  <small>Total Value</small>
                </div>

                <div className="stat-card">
                  <span>{totalVCards}</span>
                  <small>V Cards</small>
                </div>

                <div className="stat-card">
                  <span>{totalVMAXCards}</span>
                  <small>VMAX Cards</small>
                </div>

                <div className="stat-card">
                  <span>{secretRareCards}</span>
                  <small>Secret Rares</small>
                </div>

                <div className="stat-card">
                  <small>Most Valuable</small>
                  <strong>
                    {mostValuableCard
                      ? mostValuableCard.card.name
                      : "-"}
                  </strong>
                </div>

                <button
                  className="sticker-book-btn"
                  onClick={() => setShowStickerBook(true)}
                >
                  📖<br />
                  <small>Sticker Book</small>
                </button>
              </div>
            </header>

            {/* SEARCH */}
            <section className="panel search-panel">
              <h2>🔍 Search Cards</h2>

              <div className="search-bar">
                <div className="filter-bar">
                  {[
                    "ALL",
                    "VMAX",
                    "VSTAR",
                    "V",
                    "RARE",
                    "SECRET RARE",
                  ].map((f) => (
                    <button
                      key={f}
                      className={`filter-btn ${
                        filter === f ? "active" : ""
                      }`}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={searchName}
                  placeholder="Search Pokémon card..."
                  onChange={(e) =>
                    setSearchName(e.target.value)
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" && fetchCard()
                  }
                />

                <button onClick={fetchCard}>Search</button>
              </div>

              {loading && <p>Searching...</p>}
              {error && <p className="error">{error}</p>}
            </section>

            {/* SELECTED CARD */}
            {selectedCard && (
              <section className="panel selected-panel">
                <h2>⭐ Card Details</h2>

                <div className="selected-content">
                  <img
                    src={
                      selectedCard.images.large ||
                      selectedCard.images.small
                    }
                    alt={selectedCard.name}
                    className="large-card"
                  />

                  <div className="card-details">
                    <h2>{selectedCard.name}</h2>
                    <CardStats card={selectedCard} />

                    <button
                      className="add-button"
                      onClick={addToCollection}
                    >
                      ➕ Add to Collection
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* SEARCH RESULTS */}
            {cards.length > 0 && (
              <section className="panel">
                <h2>🃏 Search Results</h2>

                <div className="results-grid">
                  {cards
                    .filter(
                      (card) =>
                        filter === "ALL" ||
                        getCardTags(card).includes(filter)
                    )
                    .map((card) => (
                      <div
                        key={card.id}
                        className={`result-card ${
                          selectedCard?.id === card.id
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          setSelectedCard(card)
                        }
                      >
                        <img
                          src={card.images.small}
                          alt={card.name}
                        />
                        <h4>{card.name}</h4>

                        <p className="snippet">
                          {getCardTags(card).map((tag) => (
                            <span
                              key={tag}
                              className={`tag tag-${tag.replace(
                                " ",
                                "-"
                              )}`}
                            >
                              {tag}
                            </span>
                          ))}
                          <span className="tag tag-set">
                            {card.set?.name}
                          </span>
                        </p>
                      </div>
                    ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* SIDEBAR */}
      <aside className="collection-sidebar">
        <h2>📚 Collection</h2>

        <div className="filter-bar">
          {[
            "ALL",
            "VMAX",
            "VSTAR",
            "V",
            "RARE",
            "SECRET RARE",
          ].map((f) => (
            <button
              key={f}
              className={`filter-btn ${
                filter === f ? "active" : ""
              }`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {collection.length === 0 && (
          <p>No cards collected yet.</p>
        )}

        <div className="collection-list">
          {collection
            .slice()
            .sort((a, b) =>
              a.card.name.localeCompare(b.card.name)
            )
            .filter(
              (item) =>
                filter === "ALL" ||
                getCardTags(item.card).includes(filter)
            )
            .map((item) => (
              <div
                key={item.card.id}
                className={`collection-row ${
                  selectedCard?.id === item.card.id
                    ? "selected"
                    : ""
                }`}
                onClick={(e) => {
                  if (e.target.closest("button")) return;
                  setSelectedCard(item.card);
                }}
              >
                <div className="collection-info">
                  <h4>{item.card.name}</h4>
                  <p>{item.card.set?.name}</p>
                </div>

                <div className="qty-controls">
                  <button
                    onClick={() =>
                      decreaseQty(item.card.id)
                    }
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() =>
                      increaseQty(item.card.id)
                    }
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() =>
                    removeFromCollection(item.card.id)
                  }
                >
                  🗑
                </button>

                <div className="value">
                  €
                  {(
                    getCardValue(item.card) *
                    item.quantity
                  ).toFixed(2)}
                </div>
              </div>
            ))}
        </div>
      </aside>
    </div>
  );
}

export default App;