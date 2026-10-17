import { authorizeCheckout } from "./auth.js";
import { applyVoucher } from "./discount.js";
import { prosesQRIS, prosesVirtualAccount, type PaymentResult } from "./payment.js";

export interface OrderRequest {
  orderId: string;
  token: string;
  subtotal: number;
  voucherCode?: string;
  paymentMethod: "QRIS" | "VA";
}

export function calculateGrandTotal(subtotal: number, voucherCode?: string): number {
  if (voucherCode) {
    const disc = applyVoucher(voucherCode, subtotal);
    return disc.finalPrice;
  }
  return subtotal;
}

export function checkoutOrder(order: OrderRequest): PaymentResult {
  const isAuthorized = authorizeCheckout(order.token);
  if (!isAuthorized) {
    throw new Error("Unauthorized checkout attempt");
  }

  const grandTotal = calculateGrandTotal(order.subtotal, order.voucherCode);

  if (order.paymentMethod === "QRIS") {
    return prosesQRIS(order.orderId, grandTotal);
  }

  return prosesVirtualAccount(order.orderId, "bca", grandTotal);
}
