import React, { useState, useEffect, useRef, useMemo } from "react";
import "./CollectionView.css";

const SETS_API =
  "https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate&pageSize=50";

const CARDS_API = (setId) =>
  `https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&orderBy=number&pageSize=500`;

export default function CollectionView({ collection = [], onClose }) {
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [setCards, setSetCards] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔥 cache so we never re-fetch same set
  const cardsCache = useRef({});

  // =========================
  // LOAD SETS (SAFE)
  // =========================
  useEffect(() => {
    let cancelled = false;

    fetch(SETS_API)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setSets(Array.isArray(d?.data) ? d.data : []);
      })
      .catch((err) => {
        console.log("Failed to load sets:", err);
        setSets([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================
  // LOAD SET CARDS (WITH CACHE)
  // =========================
  useEffect(() => {
    if (!selectedSetId) return;

    const cached = cardsCache.current[selectedSetId];

    if (cached) {
      setSetCards(cached);
      return;
    }

    setLoading(true);
    setSetCards([]);

    let cancelled = false;

    fetch(CARDS_API(selectedSetId))
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;

        const cards = Array.isArray(d?.data) ? d.data : [];

        cardsCache.current[selectedSetId] = cards;
        setSetCards(cards);
        setLoading(false);
      })
      .catch((err) => {
        console.log("Failed to load set cards:", err);
        setSetCards([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSetId]);

  // =========================
  // SAFE COLLECTION MAPS
  // =========================
  const ownedMap = useMemo(() => {
    const map = {};
    (collection || []).forEach((item) => {
      if (item?.card?.id) {
        map[item.card.id] = item;
      }
    });
    return map;
  }, [collection]);

  const ownedBySet = useMemo(() => {
    const map = {};
    (collection || []).forEach((item) => {
      const setId = item?.card?.set?.id;
      if (!setId) return;
      map[setId] = (map[setId] || 0) + (item.quantity || 1);
    });
    return map;
  }, [collection]);

  // =========================
  // FILTER SETS (ONLY THOSE YOU OWN)
  // =========================
  const ownedSets = useMemo(() => {
    return (sets || [])
      .filter((s) => (ownedBySet[s.id] || 0) > 0)
      .sort(
        (a, b) =>
          (ownedBySet[b.id] || 0) - (ownedBySet[a.id] || 0)
      );
  }, [sets, ownedBySet]);

  const ownedCount = useMemo(() => {
    return setCards.filter((c) => ownedMap[c.id]).length;
  }, [setCards, ownedMap]);

  // =========================
  // UI
  // =========================
  return (
    <div className="cv-page">
      {/* TOP BAR */}
      <div className="cv-topbar">
        <div className="cv-topbar-left">
          <button className="cv-back" onClick={onClose}>
            ← Back
          </button>

          <h2 className="cv-title">
            📖 Card Sets
          </h2>

          {selectedSetId && setCards.length > 0 && (
            <span className="cv-count">
              {ownedCount} / {setCards.length} collected
            </span>
          )}
        </div>

        <div className="cv-topbar-right">
          <select
            className="cv-set-select"
            value={selectedSetId}
            onChange={(e) => setSelectedSetId(e.target.value)}
          >
            <option value="">Pick a set…</option>

            {ownedSets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({ownedBySet[s.id] || 0} / {s.total})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PROGRESS */}
      {selectedSetId && setCards.length > 0 && (
        <div className="cv-progress-wrap">
          <div
            className="cv-progress-fill"
            style={{
              width: `${(ownedCount / setCards.length) * 100}%`,
            }}
          />
        </div>
      )}

      {/* EMPTY STATE */}
      {!selectedSetId && (
        <div className="cv-empty">
          <p>
            🎴 Pick a set above to see your collection
          </p>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="cv-empty">
          <p>Loading cards…</p>
        </div>
      )}

      {/* GRID */}
      {!loading && setCards.length > 0 && (
        <div className="cv-grid">
          {setCards.map((card) => {
            const item = ownedMap[card.id];
            const owned = !!item;

            return (
              <div
                key={card.id}
                className={`cv-slot ${
                  owned
                    ? "cv-slot--owned"
                    : "cv-slot--missing"
                }`}
              >
                {owned ? (
                  <>
                    <img
                      src={card.images?.small}
                      alt={card.name}
                      className="cv-img"
                    />
                    {item.quantity > 1 && (
                      <span className="cv-qty">
                        ×{item.quantity}
                      </span>
                    )}
                  </>
                ) : (
                  <div className="cv-blank">
                    <span className="cv-num">
                      #{card.number}
                    </span>
                    <span className="cv-q">?</span>
                  </div>
                )}

                <p className="cv-name">
                  {card.name}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}