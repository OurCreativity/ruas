/**
 * Layanan kalkulasi diskon loyalitas member dan pelanggan setia.
 */

export function calculateMemberDiscount(customerId: string, subtotal: number): number {
  if (customerId.startsWith("VIP-")) {
    return subtotal * 0.20; // 20% diskon member VIP
  }
  if (subtotal >= 100000) {
    return 10000; // Potongan diskon flat 10rb
  }
  return 0;
}

export function getLoyaltyPoints(subtotal: number): number {
  return Math.floor(subtotal / 10000);
}
