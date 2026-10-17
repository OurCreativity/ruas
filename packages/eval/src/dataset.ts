import type { SupportedLanguage } from "@ruas/core";

/**
 * Evaluation dataset containing 90 hand-labeled queries and realistic codebase files
 * across TypeScript, PHP, Python, Go, Rust, and Java for rigorous ablation testing.
 *
 * Models real-world production repositories (e.g. GoTo, Shopee, BCA) where
 * domain services use standard English identifiers while teams query in
 * Indonesian, English, or colloquial mixed terminology.
 */

export interface BenchmarkFile {
  readonly path: string;
  readonly lang: SupportedLanguage;
  readonly content: string;
}

export interface BenchmarkQuery {
  readonly id: string;
  readonly query: string;
  readonly lang: "id" | "en" | "mixed";
  readonly domain: string;
  readonly targetLang?: SupportedLanguage;
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

  // 10. Fraud Detection & Behavior Analysis (Python)
  {
    path: "src/fraud/detector.py",
    lang: "python",
    content: `
import math

class FraudDetector:
    """
    Sistem deteksi penipuan transaksi dan analisis perilaku mencurigakan.
    """
    def __init__(self, threshold: float = 0.85):
        self.threshold = threshold

    def detect_fraud_transaction(self, user_id: str, amount: float, device_ip: str) -> bool:
        """
        Deteksi transaksi anomali atau indikasi fraud penipuan kartu kredit.
        """
        risk_score = self.calculate_risk_score(amount, device_ip)
        return risk_score > self.threshold

    def calculate_risk_score(self, amount: float, device_ip: str) -> float:
        """
        Kalkulasi skor risiko transaksi keuangan pelanggan.
        """
        if amount > 10000000:
            return 0.95
        return 0.1

    def flag_suspicious_account(self, account_id: str, reason: str) -> bool:
        """
        Blokir dan tandai akun pengguna yang mencurigakan.
        """
        return True
`,
  },

  // 11. Payment Gateway & Webhook (Go)
  {
    path: "src/gateway/payment_gateway.go",
    lang: "go",
    content: `
package gateway

import (
	"context"
	"fmt"
)

// PaymentGateway memproses gateway pembayaran kartu dan e-wallet
type PaymentGateway struct {
	MerchantID string
}

// ProcessGatewayTransaction mengeksekusi proses transaksi pembayaran ke bank mitra
func (g *PaymentGateway) ProcessGatewayTransaction(ctx context.Context, orderID string, nominal int64) (string, error) {
	if nominal <= 0 {
		return "", fmt.Errorf("nominal tidak valid")
	}
	return fmt.Sprintf("TRX-%s", orderID), nil
}

// VerifyWebhookSignature memverifikasi tanda tangan signature webhook acquirer
func (g *PaymentGateway) VerifyWebhookSignature(payload string, signature string) bool {
	return len(signature) > 10
}

// RefundCustomerPayment memproses pengembalian dana atau refund transaksi belanja
func (g *PaymentGateway) RefundCustomerPayment(transactionID string, amount int64) bool {
	return amount > 0
}
`,
  },

  // 12. Cryptographic Security & Hashing (Rust)
  {
    path: "src/crypto/hasher.rs",
    lang: "rust",
    content: `
use std::collections::HashMap;

/// Modul enkripsi keamanan dan hash token otentikasi
pub struct SecurityHasher {
    pub salt: String,
}

impl SecurityHasher {
    pub fn new(salt: String) -> Self {
        Self { salt }
    }

    /// Enkripsi data sensitif nomor kartu kredit atau rekening
    pub fn encrypt_sensitive_card(card_number: &str) -> String {
        format!("ENC-{}", card_number)
    }

    /// Verifikasi tanda tangan digital HMAC hash transaksi
    pub fn verify_hmac_signature(message: &str, expected_hash: &str) -> bool {
        !message.is_empty() && !expected_hash.is_empty()
    }

    /// Buat token sesi otentikasi aman pengguna
    pub fn generate_auth_session_token(user_id: &str) -> String {
        format!("TOK-{}-{}", user_id, 12345)
    }
}
`,
  },

  // 13. Core Accounting & Ledger Engine (Java)
  {
    path: "src/core/AccountingEngine.java",
    lang: "java",
    content: `
package com.ruas.accounting;

import java.util.Date;

/**
 * Mesin pembukuan akuntansi dan rekonsiliasi buku besar keuangan
 */
public class AccountingEngine {
    /**
     * Rekonsiliasi transaksi pembukuan kas masuk dan saldo buku besar harian
     */
    public boolean reconcileDailyLedger(String accountId, Date date) {
        return accountId != null && !accountId.isEmpty();
    }

    /**
     * Catat jurnal penyesuaian debit dan kredit transaksi keuangan
     */
    public String postJournalEntry(String debitAccount, String creditAccount, long amount) {
        return "JRN-" + System.currentTimeMillis();
    }

    /**
     * Hitung total saldo fiskal tahunan perusahaan
     */
    public long calculateFiscalBalance(String companyId, int year) {
        return 500000000L;
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

  // --- EXPANDED MULTI-LANGUAGE QUERIES (45 ADDITIONAL: TOTAL 90) ---
  // Indonesian (id_21 - id_35)
  {
    id: "id_21",
    query: "deteksi penipuan transaksi mencurigakan",
    lang: "id",
    domain: "fraud",
    targetLang: "python",
    expectedSymbols: ["detect_fraud_transaction", "FraudDetector"],
    description: "Indonesian query for transaction fraud detection in Python",
  },
  {
    id: "id_22",
    query: "hitung skor risiko transaksi",
    lang: "id",
    domain: "fraud",
    targetLang: "python",
    expectedSymbols: ["calculate_risk_score"],
    description: "Indonesian query for risk score calculation in Python",
  },
  {
    id: "id_23",
    query: "tandai akun pengguna mencurigakan",
    lang: "id",
    domain: "fraud",
    targetLang: "python",
    expectedSymbols: ["flag_suspicious_account"],
    description: "Indonesian query for flagging suspicious accounts",
  },
  {
    id: "id_24",
    query: "proses transaksi gateway pembayaran",
    lang: "id",
    domain: "gateway",
    targetLang: "go",
    expectedSymbols: ["ProcessGatewayTransaction", "PaymentGateway"],
    description: "Indonesian query for Go gateway transaction processing",
  },
  {
    id: "id_25",
    query: "verifikasi signature webhook acquirer",
    lang: "id",
    domain: "gateway",
    targetLang: "go",
    expectedSymbols: ["VerifyWebhookSignature"],
    description: "Indonesian query for webhook signature verification in Go",
  },
  {
    id: "id_26",
    query: "pengembalian dana transaksi refund",
    lang: "id",
    domain: "gateway",
    targetLang: "go",
    expectedSymbols: ["RefundCustomerPayment"],
    description: "Indonesian query for refunding payments in Go",
  },
  {
    id: "id_27",
    query: "enkripsi nomor kartu kredit sensitif",
    lang: "id",
    domain: "crypto",
    targetLang: "rust",
    expectedSymbols: ["encrypt_sensitive_card", "SecurityHasher"],
    description: "Indonesian query for credit card encryption in Rust",
  },
  {
    id: "id_28",
    query: "verifikasi tanda tangan digital hmac hash",
    lang: "id",
    domain: "crypto",
    targetLang: "rust",
    expectedSymbols: ["verify_hmac_signature"],
    description: "Indonesian query for HMAC signature verification in Rust",
  },
  {
    id: "id_29",
    query: "buat token sesi otentikasi login",
    lang: "id",
    domain: "crypto",
    targetLang: "rust",
    expectedSymbols: ["generate_auth_session_token"],
    description: "Indonesian query for session token generation in Rust",
  },
  {
    id: "id_30",
    query: "rekonsiliasi saldo buku besar harian kas",
    lang: "id",
    domain: "accounting",
    targetLang: "java",
    expectedSymbols: ["reconcileDailyLedger", "AccountingEngine"],
    description: "Indonesian query for daily ledger reconciliation in Java",
  },
  {
    id: "id_31",
    query: "catat jurnal penyesuaian debit kredit",
    lang: "id",
    domain: "accounting",
    targetLang: "java",
    expectedSymbols: ["postJournalEntry"],
    description: "Indonesian query for posting journal entries in Java",
  },
  {
    id: "id_32",
    query: "hitung total saldo fiskal tahunan",
    lang: "id",
    domain: "accounting",
    targetLang: "java",
    expectedSymbols: ["calculateFiscalBalance"],
    description: "Indonesian query for fiscal balance calculation in Java",
  },
  {
    id: "id_33",
    query: "cetak faktur tagihan pelanggan",
    lang: "id",
    domain: "billing",
    targetLang: "php",
    expectedSymbols: ["generateCustomerInvoice"],
    description: "Indonesian query for invoice printing",
  },
  {
    id: "id_34",
    query: "laporan mutasi rekening keuangan",
    lang: "id",
    domain: "billing",
    targetLang: "php",
    expectedSymbols: ["getAccountStatementSummary"],
    description: "Indonesian query for account statement summary",
  },
  {
    id: "id_35",
    query: "perhitungan denda keterlambatan cicilan",
    lang: "id",
    domain: "billing",
    targetLang: "php",
    expectedSymbols: ["calculateLatePaymentPenalty"],
    description: "Indonesian query for late penalty calculation",
  },

  // English (en_16 - en_30)
  {
    id: "en_16",
    query: "detect anomalous fraud transaction",
    lang: "en",
    domain: "fraud",
    targetLang: "python",
    expectedSymbols: ["detect_fraud_transaction"],
    description: "English query for anomaly and fraud detection",
  },
  {
    id: "en_17",
    query: "evaluate transaction risk score",
    lang: "en",
    domain: "fraud",
    targetLang: "python",
    expectedSymbols: ["calculate_risk_score"],
    description: "English query for transaction risk calculation",
  },
  {
    id: "en_18",
    query: "block suspicious user account",
    lang: "en",
    domain: "fraud",
    targetLang: "python",
    expectedSymbols: ["flag_suspicious_account"],
    description: "English query for flagging suspicious account",
  },
  {
    id: "en_19",
    query: "execute payment gateway transaction",
    lang: "en",
    domain: "gateway",
    targetLang: "go",
    expectedSymbols: ["ProcessGatewayTransaction"],
    description: "English query for gateway transaction execution",
  },
  {
    id: "en_20",
    query: "validate webhook signature security",
    lang: "en",
    domain: "gateway",
    targetLang: "go",
    expectedSymbols: ["VerifyWebhookSignature"],
    description: "English query for webhook signature validation",
  },
  {
    id: "en_21",
    query: "process customer payment refund",
    lang: "en",
    domain: "gateway",
    targetLang: "go",
    expectedSymbols: ["RefundCustomerPayment"],
    description: "English query for customer payment refund",
  },
  {
    id: "en_22",
    query: "encrypt credit card number",
    lang: "en",
    domain: "crypto",
    targetLang: "rust",
    expectedSymbols: ["encrypt_sensitive_card"],
    description: "English query for credit card encryption",
  },
  {
    id: "en_23",
    query: "verify hmac digital signature",
    lang: "en",
    domain: "crypto",
    targetLang: "rust",
    expectedSymbols: ["verify_hmac_signature"],
    description: "English query for digital HMAC verification",
  },
  {
    id: "en_24",
    query: "generate secure auth session token",
    lang: "en",
    domain: "crypto",
    targetLang: "rust",
    expectedSymbols: ["generate_auth_session_token"],
    description: "English query for authentication session token",
  },
  {
    id: "en_25",
    query: "reconcile daily general ledger",
    lang: "en",
    domain: "accounting",
    targetLang: "java",
    expectedSymbols: ["reconcileDailyLedger"],
    description: "English query for ledger reconciliation",
  },
  {
    id: "en_26",
    query: "post debit credit journal entry",
    lang: "en",
    domain: "accounting",
    targetLang: "java",
    expectedSymbols: ["postJournalEntry"],
    description: "English query for posting journal entries",
  },
  {
    id: "en_27",
    query: "calculate annual fiscal balance",
    lang: "en",
    domain: "accounting",
    targetLang: "java",
    expectedSymbols: ["calculateFiscalBalance"],
    description: "English query for fiscal balance",
  },
  {
    id: "en_28",
    query: "generate customer billing statement",
    lang: "en",
    domain: "billing",
    targetLang: "php",
    expectedSymbols: ["getAccountStatementSummary"],
    description: "English query for statement summary",
  },
  {
    id: "en_29",
    query: "compute late payment penalty fee",
    lang: "en",
    domain: "billing",
    targetLang: "php",
    expectedSymbols: ["calculateLatePaymentPenalty"],
    description: "English query for late fee calculation",
  },
  {
    id: "en_30",
    query: "send overdue payment notification email",
    lang: "en",
    domain: "billing",
    targetLang: "php",
    expectedSymbols: ["sendPaymentReminderEmail"],
    description: "English query for overdue payment email",
  },

  // Mixed / Colloquial (mix_11 - mix_25)
  {
    id: "mix_11",
    query: "cek fraud transaksi kartu kredit anomali",
    lang: "mixed",
    domain: "fraud",
    targetLang: "python",
    expectedSymbols: ["detect_fraud_transaction"],
    description: "Mixed query for checking credit card fraud",
  },
  {
    id: "mix_12",
    query: "hitung risk score transaksi user",
    lang: "mixed",
    domain: "fraud",
    targetLang: "python",
    expectedSymbols: ["calculate_risk_score"],
    description: "Mixed query for risk scoring",
  },
  {
    id: "mix_13",
    query: "flag akun user mencurigakan fraud",
    lang: "mixed",
    domain: "fraud",
    targetLang: "python",
    expectedSymbols: ["flag_suspicious_account"],
    description: "Mixed query for flagging accounts",
  },
  {
    id: "mix_14",
    query: "process payment via gateway mitra",
    lang: "mixed",
    domain: "gateway",
    targetLang: "go",
    expectedSymbols: ["ProcessGatewayTransaction"],
    description: "Mixed query for gateway payment processing",
  },
  {
    id: "mix_15",
    query: "verify signature webhook notif callback",
    lang: "mixed",
    domain: "gateway",
    targetLang: "go",
    expectedSymbols: ["VerifyWebhookSignature"],
    description: "Mixed query for webhook verification",
  },
  {
    id: "mix_16",
    query: "refund payment transaksi belanja customer",
    lang: "mixed",
    domain: "gateway",
    targetLang: "go",
    expectedSymbols: ["RefundCustomerPayment"],
    description: "Mixed query for payment refunds",
  },
  {
    id: "mix_17",
    query: "enkripsi data credit card sensitif",
    lang: "mixed",
    domain: "crypto",
    targetLang: "rust",
    expectedSymbols: ["encrypt_sensitive_card"],
    description: "Mixed query for credit card encryption",
  },
  {
    id: "mix_18",
    query: "validasi hmac signature hash digital",
    lang: "mixed",
    domain: "crypto",
    targetLang: "rust",
    expectedSymbols: ["verify_hmac_signature"],
    description: "Mixed query for HMAC verification",
  },
  {
    id: "mix_19",
    query: "generate token auth sesi login",
    lang: "mixed",
    domain: "crypto",
    targetLang: "rust",
    expectedSymbols: ["generate_auth_session_token"],
    description: "Mixed query for auth token generation",
  },
  {
    id: "mix_20",
    query: "rekonsiliasi mutasi daily ledger kas",
    lang: "mixed",
    domain: "accounting",
    targetLang: "java",
    expectedSymbols: ["reconcileDailyLedger"],
    description: "Mixed query for ledger reconciliation",
  },
  {
    id: "mix_21",
    query: "post jurnal penyesuaian debit credit",
    lang: "mixed",
    domain: "accounting",
    targetLang: "java",
    expectedSymbols: ["postJournalEntry"],
    description: "Mixed query for posting journal entry",
  },
  {
    id: "mix_22",
    query: "hitung balance fiskal tahunan company",
    lang: "mixed",
    domain: "accounting",
    targetLang: "java",
    expectedSymbols: ["calculateFiscalBalance"],
    description: "Mixed query for fiscal balance",
  },
  {
    id: "mix_23",
    query: "bikin invoice tagihan pembayaran order",
    lang: "mixed",
    domain: "billing",
    targetLang: "php",
    expectedSymbols: ["generateCustomerInvoice"],
    description: "Mixed query for generating customer invoice",
  },
  {
    id: "mix_24",
    query: "rekap mutasi rekening bank statement",
    lang: "mixed",
    domain: "billing",
    targetLang: "php",
    expectedSymbols: ["getAccountStatementSummary"],
    description: "Mixed query for account statement summary",
  },
  {
    id: "mix_25",
    query: "kalkulasi denda late payment cicilan",
    lang: "mixed",
    domain: "billing",
    targetLang: "php",
    expectedSymbols: ["calculateLatePaymentPenalty"],
    description: "Mixed query for late penalty calculation",
  },
];
