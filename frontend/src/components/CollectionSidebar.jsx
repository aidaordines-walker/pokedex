import React from "react";
import { RarityBadge } from "./rarityUtils";

export default function CollectionSidebar({
  collection,
  sidebarItems,
  selectedCard,
  setSelectedCard,
  sidebarNameSearch,
  setSidebarNameSearch,
  sidebarRarity,
  setSidebarRarity,
  sidebarSort,
  setSidebarSort,
  sidebarDuplicatesOnly,
  setSidebarDuplicatesOnly,
  increaseQty,
  decreaseQty,
  removeFromCollection,
}) {
  return (
    <aside className="collection-sidebar">
      <h2>📚 Collection</h2>

      {/* SEARCH */}
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
          >
            ×
          </button>
        )}
      </div>

      {/* RARITY FILTERS */}
      <div className="sidebar-section-label">Rarity</div>

      <div className="sidebar-pills">
        {[
          { key: "ALL", label: "All" },
          { key: "COMMON", label: "● Common" },
          { key: "UNCOMMON", label: "◆ Uncommon" },
          { key: "RARE", label: "★ Rare" },
          { key: "ULTRA", label: "★★ Ultra" },
          { key: "ILLUSTRATION", label: "★★★ Illus." },
          { key: "SECRET", label: "✦ Secret" },
          { key: "PROMO", label: "⬛ Promo" },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`sidebar-pill ${
              sidebarRarity === key ? "active" : ""
            }`}
            onClick={() => setSidebarRarity(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* SORT */}
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
          className={`sidebar-toggle ${
            sidebarDuplicatesOnly ? "active" : ""
          }`}
          onClick={() =>
            setSidebarDuplicatesOnly((v) => !v)
          }
        >
          ⧉ Dupes
        </button>
      </div>

      {/* RESULT COUNT */}
      <div className="sidebar-result-count">
        {sidebarItems.length} card
        {sidebarItems.length !== 1 ? "s" : ""}
        {sidebarDuplicatesOnly && " · duplicates only"}
        {sidebarRarity !== "ALL" &&
          ` · ${sidebarRarity.toLowerCase()}`}
        {sidebarNameSearch &&
          ` · "${sidebarNameSearch}"`}
      </div>

      {collection.length === 0 && (
        <p className="sidebar-empty">
          No cards collected yet.
        </p>
      )}

      {collection.length > 0 &&
        sidebarItems.length === 0 && (
          <p className="sidebar-empty">
            No cards match these filters.
          </p>
        )}

      {/* CARD LIST */}
      <div className="collection-list">
        {sidebarItems.map((item) => (
          <div
            key={item.card.id}
            className={`collection-row ${
              selectedCard?.id === item.card.id
                ? "selected"
                : ""
            } ${
              item.quantity > 1
                ? "has-dupes"
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

              {item.card.rarity && (
                <div style={{ marginTop: "3px" }}>
                  <RarityBadge
                    card={item.card}
                    size="sm"
                  />
                </div>
              )}
            </div>

            <div className="qty-controls">
              <button
                onClick={() =>
                  decreaseQty(item.card.id)
                }
              >
                −
              </button>

              <span
                className={
                  item.quantity > 1
                    ? "qty-highlight"
                    : ""
                }
              >
                {item.quantity}
              </span>

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
              €{item.value.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}