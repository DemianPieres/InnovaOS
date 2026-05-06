import type { CustomerLevel, CustomerSegment } from "@/models/Customer";

interface LevelTier {
  level: CustomerLevel;
  threshold: number;
  label: string;
}

const tiers: LevelTier[] = [
  { level: "bronce", threshold: 0, label: "Bronce" },
  { level: "plata", threshold: 5_000, label: "Plata" },
  { level: "oro", threshold: 25_000, label: "Oro" },
  { level: "platino", threshold: 75_000, label: "Platino" },
];

/**
 * Calcula el nivel del cliente en función del gasto acumulado.
 */
export function calculateLevel(totalSpent: number): CustomerLevel {
  let result: CustomerLevel = "bronce";
  for (const tier of tiers) {
    if (totalSpent >= tier.threshold) result = tier.level;
  }
  return result;
}

/**
 * Calcula el segmento del cliente en función de visitas y recencia.
 */
export function calculateSegment(
  visitsCount: number,
  lastVisitAt?: Date
): CustomerSegment {
  if (visitsCount === 0) return "nuevo";
  const days = lastVisitAt
    ? Math.floor((Date.now() - lastVisitAt.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;
  if (days > 90) return "inactivo";
  if (visitsCount >= 20) return "vip";
  if (visitsCount >= 5) return "habitual";
  return "ocasional";
}

export const loyaltyTiers = tiers;
