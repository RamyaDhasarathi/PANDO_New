/** 2_400_000 → "AED 2.4M", 185_000 → "AED 185K" */
export function formatAed(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `AED ${Number.isInteger(m) ? m : m.toFixed(m >= 10 ? 1 : 2).replace(/0$/, "")}M`;
  }
  if (value >= 1_000) return `AED ${Math.round(value / 1_000)}K`;
  return `AED ${value}`;
}

export function formatArea(sqft: number): string {
  return `${sqft.toLocaleString("en-US")} sq ft`;
}

export function bedroomLabel(n: number): string {
  if (n === 0) return "Studio";
  return `${n} Bedroom`;
}
