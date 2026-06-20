// ─────────────────────────────────────────────
// RARITY UTILITIES
// Shared across CardStats, CollectionView, App
// ─────────────────────────────────────────────

export const RARITY_CONFIG = {
  // Common rarities
  "Common":                      { symbol: "●",    label: "Common",                      tier: 1, color: "#9e9e9e", bg: "#f5f5f5" },
  "Uncommon":                    { symbol: "◆",    label: "Uncommon",                    tier: 2, color: "#4caf50", bg: "#f1f8e9" },

  // Rare family
  "Rare":                        { symbol: "★",    label: "Rare",                        tier: 3, color: "#ff9800", bg: "#fff8e1" },
  "Rare Holo":                   { symbol: "★",    label: "Rare Holo",                   tier: 3, color: "#ff9800", bg: "#fff8e1" },
  "Rare Holo EX":                { symbol: "★",    label: "Rare Holo EX",                tier: 4, color: "#f44336", bg: "#ffebee" },
  "Rare Holo GX":                { symbol: "★",    label: "Rare Holo GX",                tier: 4, color: "#f44336", bg: "#ffebee" },
  "Rare Holo V":                 { symbol: "★",    label: "Rare Holo V",                 tier: 4, color: "#f44336", bg: "#ffebee" },
  "Rare Holo VMAX":              { symbol: "★",    label: "Rare Holo VMAX",              tier: 4, color: "#f44336", bg: "#ffebee" },
  "Rare Holo VSTAR":             { symbol: "★",    label: "Rare Holo VSTAR",             tier: 4, color: "#f44336", bg: "#ffebee" },
  "Rare Ultra":                  { symbol: "★★",   label: "Ultra Rare",                  tier: 5, color: "#9c27b0", bg: "#f3e5f5" },
  "Ultra Rare":                  { symbol: "★★",   label: "Ultra Rare",                  tier: 5, color: "#9c27b0", bg: "#f3e5f5" },
  "Double Rare":                 { symbol: "★★",   label: "Double Rare",                 tier: 5, color: "#9c27b0", bg: "#f3e5f5" },

  // Illustration rares
  "Illustration Rare":           { symbol: "★★★",  label: "Illustration Rare",           tier: 6, color: "#2196f3", bg: "#e3f2fd" },
  "Special Illustration Rare":   { symbol: "★★★",  label: "Special Illustration Rare",   tier: 7, color: "#3f51b5", bg: "#e8eaf6" },

  // Top tier
  "Hyper Rare":                  { symbol: "★★★",  label: "Hyper Rare",                  tier: 8, color: "#ff6f00", bg: "#fff3e0" },
  "Rare Secret":                 { symbol: "✦",    label: "Secret Rare",                 tier: 8, color: "#ff6f00", bg: "#fff3e0" },
  "Secret Rare":                 { symbol: "✦",    label: "Secret Rare",                 tier: 8, color: "#ff6f00", bg: "#fff3e0" },
  "Rare Rainbow":                { symbol: "✦",    label: "Rainbow Rare",                tier: 8, color: "#e91e63", bg: "#fce4ec" },
  "Rainbow Rare":                { symbol: "✦",    label: "Rainbow Rare",                tier: 8, color: "#e91e63", bg: "#fce4ec" },
  "Rare Shining":                { symbol: "✦",    label: "Shining Rare",                tier: 8, color: "#e91e63", bg: "#fce4ec" },
  "Shiny Rare":                  { symbol: "✦",    label: "Shiny Rare",                  tier: 8, color: "#00bcd4", bg: "#e0f7fa" },
  "Shiny Ultra Rare":            { symbol: "✦✦",   label: "Shiny Ultra Rare",            tier: 9, color: "#00bcd4", bg: "#e0f7fa" },

  // Promo
  "Promo":                       { symbol: "⬛",   label: "Promo",                       tier: 0, color: "#607d8b", bg: "#eceff1" },
  "Black Star Promo":            { symbol: "⬛",   label: "Black Star Promo",            tier: 0, color: "#607d8b", bg: "#eceff1" },

  // LEGEND / old-school
  "Rare BREAK":                  { symbol: "★",    label: "Rare BREAK",                  tier: 4, color: "#ff9800", bg: "#fff8e1" },
  "Legend":                      { symbol: "✦",    label: "Legend",                      tier: 7, color: "#ff6f00", bg: "#fff3e0" },
  "Classic Collection":          { symbol: "★★★",  label: "Classic Collection",          tier: 6, color: "#2196f3", bg: "#e3f2fd" },
  "Trainer Gallery Rare Holo":   { symbol: "★★",   label: "Trainer Gallery Rare",        tier: 5, color: "#9c27b0", bg: "#f3e5f5" },
  "ACE SPEC Rare":               { symbol: "★★",   label: "ACE SPEC Rare",               tier: 5, color: "#9c27b0", bg: "#f3e5f5" },
};

/**
 * Get rarity config for a card. Falls back gracefully for unknown strings.
 */
export function getRarityInfo(card) {
  const rarity = card?.rarity;
  if (!rarity) return null;
  return (
    RARITY_CONFIG[rarity] || {
      symbol: "★",
      label: rarity,
      tier: 3,
      color: "#ff9800",
      bg: "#fff8e1",
    }
  );
}

/**
 * Inline badge — use anywhere you have a card object.
 * size: "sm" | "md" | "lg"
 */
export function RarityBadge({ card, size = "md" }) {
  const info = getRarityInfo(card);
  if (!info) return null;

  const sizes = {
    sm: { fontSize: "9px",  padding: "1px 5px",  symbolSize: "10px" },
    md: { fontSize: "11px", padding: "3px 8px",  symbolSize: "13px" },
    lg: { fontSize: "13px", padding: "5px 10px", symbolSize: "16px" },
  };

  const s = sizes[size] || sizes.md;

  return (
    <span
      title={info.label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        background: info.bg,
        color: info.color,
        border: `1px solid ${info.color}40`,
        borderRadius: "99px",
        padding: s.padding,
        fontWeight: 700,
        whiteSpace: "nowrap",
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: s.symbolSize, lineHeight: 1 }}>{info.symbol}</span>
      <span style={{ fontSize: s.fontSize }}>{info.label}</span>
    </span>
  );
}
