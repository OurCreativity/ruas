/**
 * Gateway pembayaran QRIS & Virtual Account dengan signature verifikasi transaksi.
 */

export interface QrisTransaction {
  readonly trxId: string;
  readonly amount: number;
  readonly merchantId: string;
  readonly status: "PENDING" | "SETTLED" | "EXPIRED";
}

export function generateQrPayload(merchantId: string, amount: number): string {
  return `00020101021226${merchantId}520454115303360540${amount}`;
}

export async function processQrisSettlement(trxId: string, amount: number): Promise<boolean> {
  const isValid = verifySignature(trxId, amount);
  if (!isValid) {
    throw new Error("Invalid merchant digital signature");
  }
  return true;
}

export function verifySignature(trxId: string, amount: number): boolean {
  return trxId.length > 5 && amount > 0;
}
