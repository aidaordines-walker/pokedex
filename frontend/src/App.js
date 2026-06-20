import React, { useState, useEffect } from "react";
import "./App.css";
import { searchCards } from "./api";
import CardStats from "./components/CardStats";
import CollectionView from "./components/CollectionView";

import { RarityBadge } from "./components/rarityUtils";

function App() {
  const [searchName, setSearchName] = useState("");
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [collection, setCollection] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showStickerBook, setShowStickerBook] = useState(false);

  // Sidebar-specific filters (independent from main search filter)
  const [sidebarNameSearch, setSidebarNameSearch] = useState("");
  const [sidebarRarity, setSidebarRarity] = useState("ALL");
  const [sidebarDuplicatesOnly, setSidebarDuplicatesOnly] = useState(false);
  const [sidebarSort, setSidebarSort] = useState("name"); // name | value | rarity | newest

  // =========================
  // LOAD COLLECTION (backend)
  // =========================
useEffect(() => {
  fetch("http://localhost:4000/api/saved")
    .then((res) => res.json())
    .then((data) => {
      if (Array.isArray(data)) {
        setCollection(data);
      }
    })
    .catch((err) =>
      console.log("Backend load failed:", err)
    );
}, []);

  // SAVE COLLECTION
useEffect(() => {
  if (collection.length === 0) return;

  fetch("http://localhost:4000/api/saved", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
  collection.map((item) => ({
    id: item.card.id,
    quantity: item.quantity,
    addedAt: item.addedAt,
  }))
),
  }).catch((err) =>
    console.log("Backend save failed:", err)
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
  // RARITY TIER (for sort)
  // =========================
  const RARITY_TIER = {
    "Common": 1, "Uncommon": 2,
    "Rare": 3, "Rare Holo": 3, "Rare BREAK": 3,
    "Rare Holo EX": 4, "Rare Holo GX": 4, "Rare Holo V": 4,
    "Rare Holo VMAX": 4, "Rare Holo VSTAR": 4,
    "Double Rare": 5, "Ultra Rare": 5, "Rare Ultra": 5,
    "ACE SPEC Rare": 5, "Trainer Gallery Rare Holo": 5,
    "Illustration Rare": 6, "Classic Collection": 6,
    "Special Illustration Rare": 7,
    "Hyper Rare": 8, "Secret Rare": 8, "Rare Secret": 8,
    "Rainbow Rare": 8, "Rare Rainbow": 8,
    "Shiny Rare": 8, "Shiny Ultra Rare": 9,
  };

  const getRarityTier = (card) => RARITY_TIER[card?.rarity] || 0;

  // =========================
  // SIDEBAR FILTERED + SORTED LIST
  // =========================
  const sidebarItems = (() => {
    let items = collection.slice();

    // Name search
    if (sidebarNameSearch.trim()) {
      const q = sidebarNameSearch.trim().toLowerCase();
      items = items.filter((item) =>
        // Match on the base Pokémon name (strip " V", " VMAX" etc.)
        item.card.name.toLowerCase().includes(q)
      );
    }

    // Rarity filter
    if (sidebarRarity !== "ALL") {
      items = items.filter((item) => {
        const r = item.card.rarity || "";
        if (sidebarRarity === "COMMON")    return r === "Common";
        if (sidebarRarity === "UNCOMMON")  return r === "Uncommon";
        if (sidebarRarity === "RARE")      return r.startsWith("Rare") && !r.toLowerCase().includes("secret") && !r.toLowerCase().includes("ultra") && !r.toLowerCase().includes("rainbow");
        if (sidebarRarity === "ULTRA")     return r === "Ultra Rare" || r === "Rare Ultra" || r === "Double Rare" || r === "ACE SPEC Rare";
        if (sidebarRarity === "ILLUSTRATION") return r === "Illustration Rare" || r === "Special Illustration Rare" || r === "Classic Collection";
        if (sidebarRarity === "SECRET")    return r.toLowerCase().includes("secret") || r.toLowerCase().includes("rainbow") || r.toLowerCase().includes("hyper") || r.toLowerCase().includes("shiny");
        if (sidebarRarity === "PROMO")     return r === "Promo" || r === "Black Star Promo";
        return true;
      });
    }

    // Duplicates only
    if (sidebarDuplicatesOnly) {
      items = items.filter((item) => item.quantity > 1);
    }

    // Sort
    items.sort((a, b) => {
      if (sidebarSort === "name")    return a.card.name.localeCompare(b.card.name);
      if (sidebarSort === "value")   return getCardValue(b.card) - getCardValue(a.card);
      if (sidebarSort === "rarity")  return getRarityTier(b.card) - getRarityTier(a.card);
      if (sidebarSort === "newest")  return (b.addedAt || 0) - (a.addedAt || 0);
      return 0;
    });

    return items;
  })();
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

                    {selectedCard.rarity && (
                      <div style={{ margin: "6px 0 12px" }}>
                        <RarityBadge card={selectedCard} size="lg" />
                      </div>
                    )}

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

                        <div style={{ margin: "4px 0" }}>
                          <RarityBadge card={card} size="sm" />
                        </div>

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

        {/* ── NAME SEARCH ── */}
        <div className="sidebar-search-wrap">
          <input
            className="sidebar-search"
            type="text"
            placeholder="🔎 Filter by name…"
            value={sidebarNameSearch}
            onChange={(e) => setSidebarNameSearch(e.target.value)}
          />
          {sidebarNameSearch && (
            <button
              className="sidebar-search-clear"
              onClick={() => setSidebarNameSearch("")}
            >×</button>
          )}
        </div>

        {/* ── RARITY PILLS ── */}
        <div className="sidebar-section-label">Rarity</div>
        <div className="sidebar-pills">
          {[
            { key: "ALL",          label: "All" },
            { key: "COMMON",       label: "● Common" },
            { key: "UNCOMMON",     label: "◆ Uncommon" },
            { key: "RARE",         label: "★ Rare" },
            { key: "ULTRA",        label: "★★ Ultra" },
            { key: "ILLUSTRATION", label: "★★★ Illus." },
            { key: "SECRET",       label: "✦ Secret" },
            { key: "PROMO",        label: "⬛ Promo" },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`sidebar-pill ${sidebarRarity === key ? "active" : ""}`}
              onClick={() => setSidebarRarity(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── SORT + DUPLICATES ROW ── */}
        <div className="sidebar-controls-row">
          <select
            className="sidebar-sort"
            value={sidebarSort}
            onChange={(e) => setSidebarSort(e.target.value)}
          >
            <option value="name">A → Z</option>
            <option value="rarity">Rarity ↓</option>
            <option value="value">Value ↓</option>
            <option value="newest">Newest first</option>
          </select>

          <button
            className={`sidebar-toggle ${sidebarDuplicatesOnly ? "active" : ""}`}
            onClick={() => setSidebarDuplicatesOnly((v) => !v)}
            title="Show only cards you have more than one of"
          >
            ⧉ Dupes
          </button>
        </div>

        {/* ── RESULT COUNT ── */}
        <div className="sidebar-result-count">
          {sidebarItems.length} card{sidebarItems.length !== 1 ? "s" : ""}
          {sidebarDuplicatesOnly && " · duplicates only"}
          {sidebarRarity !== "ALL" && ` · ${sidebarRarity.toLowerCase()}`}
          {sidebarNameSearch && ` · "${sidebarNameSearch}"`}
        </div>

        {collection.length === 0 && (
          <p className="sidebar-empty">No cards collected yet.</p>
        )}

        {collection.length > 0 && sidebarItems.length === 0 && (
          <p className="sidebar-empty">No cards match these filters.</p>
        )}

        {/* ── CARD LIST ── */}
        <div className="collection-list">
          {sidebarItems.map((item) => (
            <div
              key={item.card.id}
              className={`collection-row ${
                selectedCard?.id === item.card.id ? "selected" : ""
              } ${item.quantity > 1 ? "has-dupes" : ""}`}
              onClick={(e) => {
                if (e.target.closest("button")) return;
                setSelectedCard(item.card);
              }}
            >
              <div className="collection-info">
                <h4>{item.card.name}</h4>
                <p>{item.card.set?.name}</p>
                {item.card.rarity && (
                  <div style={{ marginTop: "3px" }}>
                    <RarityBadge card={item.card} size="sm" />
                  </div>
                )}
              </div>

              <div className="qty-controls">
                <button onClick={() => decreaseQty(item.card.id)}>−</button>
                <span className={item.quantity > 1 ? "qty-highlight" : ""}>
                  {item.quantity}
                </span>
                <button onClick={() => increaseQty(item.card.id)}>+</button>
              </div>

              <button onClick={() => removeFromCollection(item.card.id)}>
                🗑
              </button>

              <div className="value">
                €{(getCardValue(item.card) * item.quantity).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default App;