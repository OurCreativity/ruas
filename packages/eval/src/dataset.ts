/**
 * Evaluation dataset containing 45 hand-labeled queries and realistic codebase files
 * across TypeScript and PHP for rigorous ablation testing.
 *
 * Models real-world production repositories (e.g. GoTo, Shopee, BCA) where
 * domain services use standard English identifiers while teams query in
 * Indonesian, English, or colloquial mixed terminology.
 */

export interface BenchmarkFile {
  readonly path: string;
  readonly lang: "typescript" | "php";
  readonly content: string;
}

export interface BenchmarkQuery {
  readonly id: string;
  readonly query: string;
  readonly lang: "id" | "en" | "mixed";
  readonly domain: string;
  readonly expectedSymbols: readonly string[];
  readonly description: string;
}

export const BENCHMARK_CODEBASE: readonly BenchmarkFile[] = [
  // 1. Payment QRIS Module (TypeScript)
  {
    path: "src/payment/qris.ts",
    lang: "typescript",
    content: `
import { calculateVatTax } from "../tax/pajak";

export interface QrisPayload {
  merchantId: string;
  amount: number;
  qrString: string;
}

/**
 * Generate standard QRIS QR Code string for customer payment.
 */
export function generateQrisQrCode(amount: number, merchantId: string): string {
  const ppn = calculateVatTax(amount);
  return \`00020101021226580016ID.CO.QRIS.WWW0118936009180000000000520458125303360540\${amount + ppn}5802ID5910MERCHANT6007JAKARTA6304\`;
}

/**
 * Memproses verifikasi dan settlement pembayaran QRIS transaksi.
 */
export function processQrisPayment(qrPayload: string, nominal: number): boolean {
  if (nominal <= 0) return false;
  return qrPayload.includes("ID.CO.QRIS");
}

/**
 * Cek status transaksi pembayaran QRIS ke payment gateway.
 */
export function checkQrisPaymentStatus(transaksiId: string): "PENDING" | "SUCCESS" | "FAILED" {
  return "SUCCESS";
}

/**
 * Webhook handler notifikasi callback pembayaran QRIS dari acquirer.
 */
export function handleQrisCallbackWebhook(payload: Record<string, unknown>, signature: string): boolean {
  return signature.length > 0;
}
`,
  },

  // 2. Virtual Account Payment (TypeScript)
  {
    path: "src/payment/virtual-account.ts",
    lang: "typescript",
    content: `
export class VirtualAccountService {
  /**
   * Membuat nomor virtual account bank untuk customer.
   */
  public createVirtualAccount(bankCode: string, customerId: string): string {
    return \`8808\${bankCode}\${customerId.padStart(8, "0")}\`;
  }

  /**
   * Verifikasi transaksi pembayaran virtual account dari bank partner.
   */
  public verifyVirtualAccountPayment(vaNumber: string, amount: number): boolean {
    return vaNumber.startsWith("8808") && amount > 0;
  }

  /**
   * Batalkan penagihan virtual account yang sudah kedaluwarsa.
   */
  public cancelVirtualAccount(vaNumber: string): boolean {
    return true;
  }
}
`,
  },

  // 3. Promotions & Discounts (TypeScript)
  {
    path: "src/promotions/discount.ts",
    lang: "typescript",
    content: `
import { fetchCustomerProfile } from "../customer/customer-profile";

/**
 * Menghitung diskon belanja pelanggan berdasarkan tier membership.
 */
export function calculateDiscount(customerId: string, amount: number): number {
  const customer = fetchCustomerProfile(customerId);
  return amount * 0.15;
}

/**
 * Validasi kupon voucher diskon belanja e-commerce.
 */
export function validatePromoCoupon(couponCode: string, totalBelanja: number): boolean {
  return couponCode.startsWith("HEMAT") && totalBelanja >= 50000;
}

/**
 * Kalkulasi harga promosi flash sale mingguan.
 */
export function calculateFlashSalePrice(productId: string, originalPrice: number): number {
  return originalPrice * 0.7;
}

/**
 * Hitung reward cashback poin loyalitas pelanggan.
 */
export function calculateLoyaltyCashback(userId: string, transactionTotal: number): number {
  return Math.floor(transactionTotal * 0.02);
}
`,
  },

  // 4. Logistics & Shipping (TypeScript)
  {
    path: "src/logistics/shipping.ts",
    lang: "typescript",
    content: `
export interface ShippingRate {
  courier: string;
  service: string;
  fee: number;
  etd: string;
}

/**
 * Hitung tarif ongkos kirim pengiriman barang ekspedisi kurir.
 */
export function calculateShippingFee(origin: string, destination: string, weightKg: number): number {
  const baseRate = 10000;
  return baseRate * Math.ceil(weightKg);
}

/**
 * Lacak status nomor resi pengiriman kurir logistik waybill.
 */
export function trackCourierWaybill(courierCode: string, resiNumber: string): string {
  return \`Delivered by \${courierCode} with AWB \${resiNumber}\`;
}

/**
 * Validasi format kelengkapan alamat pengiriman paket.
 */
export function validateDeliveryAddress(addressString: string): boolean {
  return addressString.trim().length >= 10;
}

/**
 * Pilih ekspedisi logistik dengan tarif paling murah.
 */
export function selectCheapestCourier(rates: readonly ShippingRate[]): ShippingRate | undefined {
  if (rates.length === 0) return undefined;
  return [...rates].sort((a, b) => a.fee - b.fee)[0];
}
`,
  },

  // 5. Auth & Session Management (TypeScript)
  {
    path: "src/auth/session.ts",
    lang: "typescript",
    content: `
export interface UserSession {
  userId: string;
  role: string;
  token: string;
}

/**
 * Autentikasi dan login pengguna dengan email dan kata sandi.
 */
export function authenticateUser(email: string, passwordHash: string): UserSession {
  return { userId: "usr_1", role: "customer", token: "jwt_token_sample" };
}

/**
 * Generate secure JWT authentication token for API access.
 */
export function generateJwtToken(userId: string, role: string): string {
  return \`eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.\${userId}.\${role}\`;
}

/**
 * Verifikasi keabsahan JWT auth token signature dan masa aktif.
 */
export function verifyJwtToken(token: string): boolean {
  return token.startsWith("eyJh");
}

/**
 * Refresh user session token using refresh token credentials.
 */
export function refreshUserSession(refreshToken: string): string {
  return "new_refreshed_access_token";
}

/**
 * Hash user password securely using Argon2 or BCrypt.
 */
export function hashUserPassword(plainPassword: string): string {
  return "hashed_password_" + plainPassword.length;
}

/**
 * Cabut semua sesi aktif pengguna yang terdaftar di database.
 */
export function revokeAllSessions(userId: string): boolean {
  return true;
}
`,
  },

  // 6. E-Commerce Order & Cart (TypeScript)
  {
    path: "src/ecommerce/order.ts",
    lang: "typescript",
    content: `
import { calculateShippingFee } from "../logistics/shipping";
import { calculateDiscount } from "../promotions/discount";

export interface CartItem {
  id: string;
  qty: number;
  price: number;
}

/**
 * Menghitung total nilai belanjaan di keranjang checkout.
 */
export function calculateCartTotal(items: readonly CartItem[]): number {
  return items.reduce((acc, item) => acc + item.price * item.qty, 0);
}

/**
 * Membuat pesanan transaksi baru pelanggan di sistem e-commerce.
 */
export function createCustomerOrder(pelangganId: string, items: readonly CartItem[]): string {
  const subtotal = calculateCartTotal(items);
  const diskon = calculateDiscount(pelangganId, subtotal);
  const ongkir = calculateShippingFee("JKT", "SMD", 2);
  return \`ORD-\${Date.now()}-\${subtotal - diskon + ongkir}\`;
}

/**
 * Proses checkout pesanan belanja dan alokasikan stok inventori.
 */
export function processOrderCheckout(orderId: string): boolean {
  return true;
}

/**
 * Batalkan pesanan transaksi e-commerce dan kembalikan stok.
 */
export function cancelCustomerOrder(orderId: string, alasan: string): boolean {
  return alasan.length > 0;
}

/**
 * Kurangi kuantitas stok produk inventori gudang saat checkout.
 */
export function reduceInventoryStock(productId: string, qty: number): boolean {
  return qty > 0;
}
`,
  },

  // 7. Customer Profile (TypeScript)
  {
    path: "src/customer/customer-profile.ts",
    lang: "typescript",
    content: `
export interface CustomerData {
  id: string;
  name: string;
  phone: string;
  email: string;
}

/**
 * Mengambil data profil pelanggan dari database pelanggan.
 */
export function fetchCustomerProfile(customerId: string): CustomerData {
  return { id: customerId, name: "Ghani", phone: "08123456789", email: "ghani@ruas.dev" };
}

/**
 * Validasi dan format nomor handphone Indonesia ke format E.164.
 */
export function normalizePhoneNumber(noHp: string): string {
  let cleaned = noHp.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  return cleaned;
}
`,
  },

  // 8. Taxation Service (PHP)
  {
    path: "app/Services/TaxationService.php",
    lang: "php",
    content: `<?php
namespace App\\Services;

class TaxationService {
    /**
     * Kalkulasi nilai pajak pertambahan nilai PPN transaksi barang kena pajak.
     */
    public function calculateVatTax($subtotal) {
        return $subtotal * 0.11;
    }

    /**
     * Hitung pemotongan pajak penghasilan PPH 21 gaji karyawan bulanan.
     */
    public function calculateIncomeTaxWithholding($gajiKotor) {
        if ($gajiKotor <= 5000000) {
            return 0;
        }
        return ($gajiKotor - 5000000) * 0.05;
    }

    /**
     * Buat nomor dan dokumen faktur pajak elektronik e-faktur.
     */
    public function generateElectronicTaxInvoice($transaksiId) {
        return "010.000-24." . rand(10000000, 99999999);
    }

    /**
     * Validasi 16 digit format Nomor Pokok Wajib Pajak NPWP perusahaan.
     */
    public function validateTaxIdNumber($npwp) {
        $clean = preg_replace('/[^0-9]/', '', $npwp);
        return strlen($clean) === 16;
    }
}
`,
  },

  // 9. Invoice & Billing Controller (PHP)
  {
    path: "app/Controllers/BillingController.php",
    lang: "php",
    content: `<?php
namespace App\\Controllers;

use App\\Services\\TaxationService;

class BillingController {
    /**
     * Cetak dokumen penagihan invoice tagihan pembayaran pelanggan.
     */
    public function generateCustomerInvoice($orderId) {
        $taxService = new TaxationService();
        return "INV-" . $orderId;
    }

    /**
     * Kirim email pengingat tagihan pembayaran yang sudah jatuh tempo.
     */
    public function sendPaymentReminderEmail($invoiceNumber) {
        return true;
    }

    /**
     * Rekapitulasi laporan mutasi keuangan rekening kas masuk dan keluar statement.
     */
    public function getAccountStatementSummary($periode) {
        return ["periode" => $periode, "total_mutasi" => 10000000];
    }

    /**
     * Hitung denda bunga keterlambatan pembayaran cicilan tagihan penalty.
     */
    public function calculateLatePaymentPenalty($daysLate, $nominal) {
        if ($daysLate <= 0) return 0;
        return $nominal * 0.005 * $daysLate;
    }
}
`,
  },
];

export const BENCHMARK_QUERIES: readonly BenchmarkQuery[] = [
  // --- INDONESIAN QUERIES (20) ---
  {
    id: "id_01",
    query: "fungsi bayar qris",
    lang: "id",
    domain: "payments",
    expectedSymbols: ["processQrisPayment", "checkQrisPaymentStatus", "generateQrisQrCode"],
    description: "Indonesian query for QRIS payment processing",
  },
  {
    id: "id_02",
    query: "fungsi hitung diskon pelanggan",
    lang: "id",
    domain: "promotions",
    expectedSymbols: ["calculateDiscount"],
    description: "Explicit acceptance criteria query matching calculateDiscount(customer)",
  },
  {
    id: "id_03",
    query: "kalkulasi ppn 11 persen",
    lang: "id",
    domain: "tax",
    expectedSymbols: ["calculateVatTax"],
    description: "Indonesian query for VAT calculation in PHP service",
  },
  {
    id: "id_04",
    query: "potongan pph 21 karyawan",
    lang: "id",
    domain: "tax",
    expectedSymbols: ["calculateIncomeTaxWithholding"],
    description: "Indonesian query for income tax withholding in PHP",
  },
  {
    id: "id_05",
    query: "cara buat nomor va bank",
    lang: "id",
    domain: "payments",
    expectedSymbols: ["createVirtualAccount"],
    description: "Indonesian query for virtual account generation",
  },
  {
    id: "id_06",
    query: "cek tarif ongkir jne",
    lang: "id",
    domain: "logistics",
    expectedSymbols: ["calculateShippingFee"],
    description: "Indonesian query for shipping fee lookup",
  },
  {
    id: "id_07",
    query: "lacak status resi pengiriman",
    lang: "id",
    domain: "logistics",
    expectedSymbols: ["trackCourierWaybill"],
    description: "Indonesian query for tracking airway bill / resi",
  },
  {
    id: "id_08",
    query: "validasi nomor handphone",
    lang: "id",
    domain: "customer",
    expectedSymbols: ["normalizePhoneNumber"],
    description: "Indonesian query for phone number normalization",
  },
  {
    id: "id_09",
    query: "rekap mutasi rekening keuangan",
    lang: "id",
    domain: "billing",
    expectedSymbols: ["getAccountStatementSummary"],
    description: "Indonesian query for account statement / mutasi in PHP",
  },
  {
    id: "id_10",
    query: "denda telat bayar tagihan",
    lang: "id",
    domain: "billing",
    expectedSymbols: ["calculateLatePaymentPenalty"],
    description: "Indonesian query for late payment penalty in PHP",
  },
  {
    id: "id_11",
    query: "ambil profil pembeli pelanggan",
    lang: "id",
    domain: "customer",
    expectedSymbols: ["fetchCustomerProfile"],
    description: "Indonesian query for retrieving customer data",
  },
  {
    id: "id_12",
    query: "batalkan pesanan transaksi",
    lang: "id",
    domain: "ecommerce",
    expectedSymbols: ["cancelCustomerOrder"],
    description: "Indonesian query for canceling an order",
  },
  {
    id: "id_13",
    query: "kurangi stok barang di gudang",
    lang: "id",
    domain: "ecommerce",
    expectedSymbols: ["reduceInventoryStock"],
    description: "Indonesian query for inventory reduction",
  },
  {
    id: "id_14",
    query: "login akun pengguna kata sandi",
    lang: "id",
    domain: "auth",
    expectedSymbols: ["authenticateUser"],
    description: "Indonesian query for user login authentication",
  },
  {
    id: "id_15",
    query: "verifikasi pembayaran va",
    lang: "id",
    domain: "payments",
    expectedSymbols: ["verifyVirtualAccountPayment"],
    description: "Indonesian query for virtual account verification",
  },
  {
    id: "id_16",
    query: "cetak invoice tagihan",
    lang: "id",
    domain: "billing",
    expectedSymbols: ["generateCustomerInvoice"],
    description: "Indonesian query for printing invoice in PHP",
  },
  {
    id: "id_17",
    query: "kupon voucher diskon belanja",
    lang: "id",
    domain: "promotions",
    expectedSymbols: ["validatePromoCoupon"],
    description: "Indonesian query for coupon voucher validation",
  },
  {
    id: "id_18",
    query: "cashback poin pelanggan",
    lang: "id",
    domain: "promotions",
    expectedSymbols: ["calculateLoyaltyCashback"],
    description: "Indonesian query for loyalty cashback calculation",
  },
  {
    id: "id_19",
    query: "hitung total belanjaan di keranjang",
    lang: "id",
    domain: "ecommerce",
    expectedSymbols: ["calculateCartTotal"],
    description: "Indonesian query for cart total calculation",
  },
  {
    id: "id_20",
    query: "ekspedisi kurir termurah",
    lang: "id",
    domain: "logistics",
    expectedSymbols: ["selectCheapestCourier"],
    description: "Indonesian query for cheapest courier selection",
  },

  // --- ENGLISH QUERIES (15) ---
  {
    id: "en_01",
    query: "calculate customer discount",
    lang: "en",
    domain: "promotions",
    expectedSymbols: ["calculateDiscount"],
    description: "English query for customer discount calculation",
  },
  {
    id: "en_02",
    query: "generate qris qr code",
    lang: "en",
    domain: "payments",
    expectedSymbols: ["generateQrisQrCode"],
    description: "English query for QRIS QR string generation",
  },
  {
    id: "en_03",
    query: "verify jwt token signature",
    lang: "en",
    domain: "auth",
    expectedSymbols: ["verifyJwtToken"],
    description: "English query for JWT verification",
  },
  {
    id: "en_04",
    query: "calculate shipping delivery fee",
    lang: "en",
    domain: "logistics",
    expectedSymbols: ["calculateShippingFee"],
    description: "English query for shipping cost calculation",
  },
  {
    id: "en_05",
    query: "track airway bill delivery package",
    lang: "en",
    domain: "logistics",
    expectedSymbols: ["trackCourierWaybill"],
    description: "English query for courier tracking",
  },
  {
    id: "en_06",
    query: "calculate vat tax value added",
    lang: "en",
    domain: "tax",
    expectedSymbols: ["calculateVatTax"],
    description: "English query for VAT tax calculation",
  },
  {
    id: "en_07",
    query: "refresh user session access token",
    lang: "en",
    domain: "auth",
    expectedSymbols: ["refreshUserSession"],
    description: "English query for refreshing session token",
  },
  {
    id: "en_08",
    query: "hash user password argon2",
    lang: "en",
    domain: "auth",
    expectedSymbols: ["hashUserPassword"],
    description: "English query for password hashing",
  },
  {
    id: "en_09",
    query: "generate customer invoice billing",
    lang: "en",
    domain: "billing",
    expectedSymbols: ["generateCustomerInvoice"],
    description: "English query for customer billing invoice",
  },
  {
    id: "en_10",
    query: "validate promo coupon discount",
    lang: "en",
    domain: "promotions",
    expectedSymbols: ["validatePromoCoupon"],
    description: "English query for coupon validation",
  },
  {
    id: "en_11",
    query: "reduce product inventory stock",
    lang: "en",
    domain: "ecommerce",
    expectedSymbols: ["reduceInventoryStock"],
    description: "English query for stock reduction",
  },
  {
    id: "en_12",
    query: "check payment status gateway",
    lang: "en",
    domain: "payments",
    expectedSymbols: ["checkQrisPaymentStatus"],
    description: "English query for payment status check",
  },
  {
    id: "en_13",
    query: "validate delivery address format",
    lang: "en",
    domain: "logistics",
    expectedSymbols: ["validateDeliveryAddress"],
    description: "English query for address validation",
  },
  {
    id: "en_14",
    query: "calculate flash sale promo price",
    lang: "en",
    domain: "promotions",
    expectedSymbols: ["calculateFlashSalePrice"],
    description: "English query for flash sale pricing",
  },
  {
    id: "en_15",
    query: "cancel expired virtual account",
    lang: "en",
    domain: "payments",
    expectedSymbols: ["cancelVirtualAccount"],
    description: "English query for VA cancellation",
  },

  // --- MIXED LOANWORD / COLLOQUIAL QUERIES (10) ---
  {
    id: "mix_01",
    query: "proses payment qris nominal",
    lang: "mixed",
    domain: "payments",
    expectedSymbols: ["processQrisPayment"],
    description: "Mixed English-Indonesian query for QRIS payment",
  },
  {
    id: "mix_02",
    query: "calculate diskon promo member",
    lang: "mixed",
    domain: "promotions",
    expectedSymbols: ["calculateDiscount"],
    description: "Mixed query for calculating member discount",
  },
  {
    id: "mix_03",
    query: "generate va number bca",
    lang: "mixed",
    domain: "payments",
    expectedSymbols: ["createVirtualAccount"],
    description: "Mixed query for virtual account generation",
  },
  {
    id: "mix_04",
    query: "cek shipping cost ongkir kurir",
    lang: "mixed",
    domain: "logistics",
    expectedSymbols: ["calculateShippingFee"],
    description: "Mixed query for shipping rate / ongkir",
  },
  {
    id: "mix_05",
    query: "validate tax id nomor npwp",
    lang: "mixed",
    domain: "tax",
    expectedSymbols: ["validateTaxIdNumber"],
    description: "Mixed query for NPWP validation in PHP",
  },
  {
    id: "mix_06",
    query: "checkout cart order belanja",
    lang: "mixed",
    domain: "ecommerce",
    expectedSymbols: ["processOrderCheckout", "createCustomerOrder"],
    description: "Mixed query for checkout order",
  },
  {
    id: "mix_07",
    query: "verify payment va transfer",
    lang: "mixed",
    domain: "payments",
    expectedSymbols: ["verifyVirtualAccountPayment"],
    description: "Mixed query for virtual account verification",
  },
  {
    id: "mix_08",
    query: "print invoice tagihan jatuh tempo",
    lang: "mixed",
    domain: "billing",
    expectedSymbols: ["generateCustomerInvoice"],
    description: "Mixed query for invoice generation",
  },
  {
    id: "mix_09",
    query: "send email reminder tagihan",
    lang: "mixed",
    domain: "billing",
    expectedSymbols: ["sendPaymentReminderEmail"],
    description: "Mixed query for invoice reminder email",
  },
  {
    id: "mix_10",
    query: "webhook callback payment qris",
    lang: "mixed",
    domain: "payments",
    expectedSymbols: ["handleQrisCallbackWebhook"],
    description: "Mixed query for QRIS webhook callback",
  },
];
