import { processQrisSettlement } from "../payment/qris.js";
import { calculateMemberDiscount } from "../customer/member.js";
import { generateNomorResi } from "../shipping/kurir.js";

/**
 * Alur checkout pesanan pelanggan dan kalkulasi diskon voucher belanja.
 */

export interface CheckoutRequest {
  readonly customerId: string;
  readonly items: readonly { id: string; price: number; qty: number }[];
  readonly voucherCode?: string;
}

export async function handleCheckoutOrder(req: CheckoutRequest): Promise<{ orderId: string; resi: string; total: number }> {
  let subtotal = 0;
  for (const item of req.items) {
    subtotal += item.price * item.qty;
  }

  const discount = calculateMemberDiscount(req.customerId, subtotal);
  const finalAmount = subtotal - discount;

  const orderId = `ORD-${Date.now()}`;
  await processQrisSettlement(orderId, finalAmount);
  const resi = generateNomorResi("JNE", req.customerId);

  return { orderId, resi, total: finalAmount };
}
