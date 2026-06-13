import React, { useState, useEffect } from "react";
import "./App.css";
import { searchCards } from "./api";

function App() {
  const [searchName, setSearchName] = useState("");
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [collection, setCollection] = useState(() => {
    try {
      const saved = localStorage.getItem("pokemonCollection");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.log("Failed to load collection:", e);
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(
      "pokemonCollection",
      JSON.stringify(collection)
    );
  }, [collection]);

  const fetchCard = async () => {
    if (!searchName.trim()) return;

    setLoading(true);
    setError("");
    setCards([]);
    setSelectedCard(null);

    try {
      const data = await searchCards(searchName);

      if (!data.length) {
        setError("No cards found");
      } else {
        setCards(data);
      }
    } catch (err) {
      setError(err.message || "Could not reach backend");
    } finally {
      setLoading(false);
    }
  };

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
        {
          card: selectedCard,
          quantity: 1,
          addedAt: Date.now(),
        },
      ];
    });
  };

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

  const totalCards = collection.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const totalValue = collection.reduce(
    (sum, item) =>
      sum + getCardValue(item.card) * item.quantity,
    0
  );

  return (
    <div className="app-layout">

      {/* LEFT MAIN CONTENT */}
      <div className="main-content">

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
          </div>
        </header>

        {/* SEARCH */}
        <section className="panel search-panel">
          <h2>🔍 Search Cards</h2>

          <div className="search-bar">
            <input
              type="text"
              value={searchName}
              placeholder="Search Pokémon card..."
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchCard()}
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

                <p>
                  <strong>Set:</strong>{" "}
                  {selectedCard.set?.name}
                </p>

                <p>
                  <strong>Number:</strong>{" "}
                  #{selectedCard.number}
                </p>

                <p>
                  <strong>Rarity:</strong>{" "}
                  {selectedCard.rarity}
                </p>

                <p>
                  <strong>Value:</strong>{" "}
                  {getCardValue(selectedCard)
                    ? `€${getCardValue(selectedCard).toFixed(2)}`
                    : "No price data"}
                </p>

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

        {/* RESULTS */}
        {cards.length > 0 && (
          <section className="panel">
            <h2>🃏 Search Results</h2>

            <div className="results-grid">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={`result-card ${
                    selectedCard?.id === card.id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedCard(card)}
                >
                  <img src={card.images.small} alt={card.name} />
                  <h4>{card.name}</h4>
                  <p>{card.rarity || "Unknown"}</p>
                  <small>{card.set?.name}</small>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* RIGHT SIDEBAR (STICKY COLLECTION) */}
      <aside className="collection-sidebar">
        <h2>📚 Collection</h2>

        {collection.length === 0 && (
          <p>No cards collected yet.</p>
        )}

        <div className="collection-list">
          {collection.map((item) => (
            <div key={item.card.id} className="collection-row">
              <img
                src={item.card.images.small}
                alt={item.card.name}
              />

              <div className="collection-info">
                <h4>{item.card.name}</h4>
                <p>{item.card.set?.name}</p>
              </div>

              <div className="qty-controls">
                <button onClick={() => decreaseQty(item.card.id)}>
                  −
                </button>

                <span>{item.quantity}</span>

                <button onClick={() => increaseQty(item.card.id)}>
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
                  getCardValue(item.card) * item.quantity
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