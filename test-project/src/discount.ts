export interface DiscountResult {
  discountAmount: number;
  finalPrice: number;
  voucherCode?: string;
}

export function calculateDirectDiscount(amount: number, percentage: number): number {
  return (amount * Math.min(percentage, 50)) / 100;
}

export function applyVoucher(code: string, amount: number): DiscountResult {
  if (code === "PROMO_LEBARAN") {
    const discount = calculateDirectDiscount(amount, 20);
    return {
      discountAmount: discount,
      finalPrice: amount - discount,
      voucherCode: code,
    };
  }

  const direct = calculateDirectDiscount(amount, 5);
  return {
    discountAmount: direct,
    finalPrice: amount - direct,
  };
}
