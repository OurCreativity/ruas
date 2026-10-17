export interface PaymentResult {
  transactionId: string;
  status: "PAID" | "PENDING" | "FAILED";
  method: "QRIS" | "VIRTUAL_ACCOUNT";
  settledAt?: number;
}

export function chargeGateway(provider: string, amount: number): boolean {
  // Simulator gateway charge
  return amount > 0 && provider.length > 0;
}

export function prosesQRIS(transactionId: string, amount: number): PaymentResult {
  const success = chargeGateway("midtrans_qris", amount);
  return {
    transactionId,
    status: success ? "PAID" : "FAILED",
    method: "QRIS",
    settledAt: Date.now(),
  };
}

export function prosesVirtualAccount(transactionId: string, bank: string, amount: number): PaymentResult {
  const success = chargeGateway(`bca_va_${bank}`, amount);
  return {
    transactionId,
    status: success ? "PAID" : "FAILED",
    method: "VIRTUAL_ACCOUNT",
    settledAt: Date.now(),
  };
}
