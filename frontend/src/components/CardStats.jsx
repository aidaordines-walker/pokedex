import React from "react";

export default function CardStats({ card }) {
  if (!card) return null;

  const market =
    card.tcgplayer?.prices?.holofoil?.market ??
    card.tcgplayer?.prices?.normal?.market ??
    card.tcgplayer?.prices?.reverseHolofoil?.market;

  const priceInsight = market > 5
    ? "🔥 Strong value"
    : market > 2
    ? "⭐ Mid value"
    : market
    ? "📦 Low value"
    : null;

  return (
    <div className="card-stats">
      <div className="card-grid">

        {/* LEFT COLUMN */}
        <div className="card-col left">

          {/* Name + meta — no duplicate, subtitle handles set/number */}
          <div className="card-left">
            <p className="card-subtitle">
              {card.set?.name} • #{card.number}
            </p>
            <div className="card-badges">
              {card.subtypes?.map(t => (
                <span key={t} className="badge">{t}</span>
              ))}
              {card.types?.[0] && (
                <span className="badge">{card.types[0]}</span>
              )}
              {card.hp && (
                <span className="badge">HP {card.hp}</span>
              )}
              {card.rarity && (
                <span className="badge">{card.rarity}</span>
              )}
            </div>
          </div>

          {/* Price block — only shown when a price exists */}
          {market != null ? (
            <div className="card-value">
              <span className="value-main">€{market.toFixed(2)}</span>
              <span className="value-label">Market value</span>
              {priceInsight && (
                <span className="value-insight">{priceInsight}</span>
              )}
            </div>
          ) : (
            <div className="card-value">
              <span className="value-label no-price">No price listed</span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="card-col right">
          {card.abilities?.length > 0 && (
            <div className="card-section">
              <h4>Ability</h4>
              {card.abilities.map(a => (
                <p key={a.name}>
                  <strong>{a.name}</strong> — {a.text}
                </p>
              ))}
            </div>
          )}

          {card.attacks?.length > 0 && (
            <div className="card-section">
              <h4>Attacks</h4>
              {card.attacks.slice(0, 3).map(a => (
                <p key={a.name}>
                  <strong>{a.name}</strong>
                  {a.damage ? ` — ${a.damage}` : ""}
                </p>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}