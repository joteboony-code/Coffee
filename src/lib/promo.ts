export type PromoLite = {
  id: string;
  name: string;
  type: "FIXED_AMOUNT" | "PERCENT" | "BUY_X_GET_Y" | "HAPPY_HOUR";
  value: number;
  minSpend: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

/** Is the promotion currently usable for the given subtotal? */
export function isPromoEligible(promo: PromoLite, subtotal: number, now = new Date()): boolean {
  if (!promo.isActive) return false;
  if (subtotal < promo.minSpend) return false;
  if (promo.startsAt && new Date(promo.startsAt) > now) return false;
  if (promo.endsAt && new Date(promo.endsAt) < now) return false;
  // Only FIXED_AMOUNT and PERCENT are supported in this MVP
  return promo.type === "FIXED_AMOUNT" || promo.type === "PERCENT";
}

/** Compute the discount amount (baht, integer) for a promotion against a subtotal. */
export function promoDiscount(promo: PromoLite, subtotal: number): number {
  if (promo.type === "FIXED_AMOUNT") return Math.min(promo.value, subtotal);
  if (promo.type === "PERCENT") return Math.floor((subtotal * promo.value) / 100);
  return 0;
}

export const PROMO_TYPE_LABEL: Record<string, string> = {
  FIXED_AMOUNT: "ลดเป็นจำนวนเงิน",
  PERCENT: "ลดเป็นเปอร์เซ็นต์",
  BUY_X_GET_Y: "ซื้อ X แถม Y",
  HAPPY_HOUR: "แฮปปี้อาวร์",
};
