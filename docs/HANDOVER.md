# Dokumen Handover & Panduan Onboarding Arsitektur Sistem

> **Proyek:** ASEAN Commerce & Payment Core  
> **Waktu Pembuatan:** `2026-10-14T01:24:09.355Z`  
> **Total File:** 4 | **Total Simbol AST:** 10 | **Total Relasi:** 17 | **Sub-sistem Terdeteksi:** 7  
> **Prinsip Dokumentasi:** *Zero Uncited Claims* — Setiap klaim fungsional dan arsitektural wajib menyertakan tautan langsung ke nomor baris kode sumber asli.

---

## 1. Ringkasan Topologi & Sub-sistem Terdeteksi (Leiden Partitioning)

Melalui algoritma partisi graf modularitas terarah (Leiden) dan penamaan TF-IDF bebas LLM eksternal, basis kode ini secara otomatis terkelompokkan ke dalam beberapa sub-sistem fungsional berikut:

### Sub-sistem: `calculatememberdiscount:calculate:member` (Klaster #1)
- **Kepadatan Simbol:** 3 simbol.
- **Komponen Inti / Simbol Penghubung (Top Centrality Hubs):**
  - [`calculateMemberDiscount`](file://src/customer/member.ts#L5-L13) (`src/customer/member.ts:5-13`) [Tipe: `function`]
    - *Signature:* `(customerId: string, subtotal: number): number`
  - [`generateNomorResi`](file://src/shipping/kurir.ts#L5-L9) (`src/shipping/kurir.ts:5-9`) [Tipe: `function`]
    - *Signature:* `(ekspedisi: "JNE" | "SICEPAT", customerId: string): string`
  - [`handleCheckoutOrder`](file://src/order/checkout.ts#L15-L29) (`src/order/checkout.ts:15-29`) [Tipe: `function`]
    - *Signature:* `(req: CheckoutRequest): Promise<{ orderId: string; resi: string; total: number }>`

### Sub-sistem: `verifysignature:verify:signature` (Klaster #5)
- **Kepadatan Simbol:** 2 simbol.
- **Komponen Inti / Simbol Penghubung (Top Centrality Hubs):**
  - [`verifySignature`](file://src/payment/qris.ts#L24-L26) (`src/payment/qris.ts:24-26`) [Tipe: `function`]
    - *Signature:* `(trxId: string, amount: number): boolean`
  - [`processQrisSettlement`](file://src/payment/qris.ts#L16-L22) (`src/payment/qris.ts:16-22`) [Tipe: `function`]
    - *Signature:* `(trxId: string, amount: number): Promise<boolean>`

### Sub-sistem: `checkoutrequest:request:checkout` (Klaster #0)
- **Kepadatan Simbol:** 1 simbol.
- **Komponen Inti / Simbol Penghubung (Top Centrality Hubs):**
  - [`CheckoutRequest`](file://src/order/checkout.ts#L9-L13) (`src/order/checkout.ts:9-13`) [Tipe: `interface`]
    - *Signature:* `interface CheckoutRequest`

### Sub-sistem: `getloyaltypoints:get:loyalty` (Klaster #2)
- **Kepadatan Simbol:** 1 simbol.
- **Komponen Inti / Simbol Penghubung (Top Centrality Hubs):**
  - [`getLoyaltyPoints`](file://src/customer/member.ts#L15-L17) (`src/customer/member.ts:15-17`) [Tipe: `function`]
    - *Signature:* `(subtotal: number): number`

### Sub-sistem: `qristransaction:transaction:qris` (Klaster #3)
- **Kepadatan Simbol:** 1 simbol.
- **Komponen Inti / Simbol Penghubung (Top Centrality Hubs):**
  - [`QrisTransaction`](file://src/payment/qris.ts#L5-L10) (`src/payment/qris.ts:5-10`) [Tipe: `interface`]
    - *Signature:* `interface QrisTransaction`

### Sub-sistem: `generateqrpayload:payload:generate` (Klaster #4)
- **Kepadatan Simbol:** 1 simbol.
- **Komponen Inti / Simbol Penghubung (Top Centrality Hubs):**
  - [`generateQrPayload`](file://src/payment/qris.ts#L12-L14) (`src/payment/qris.ts:12-14`) [Tipe: `function`]
    - *Signature:* `(merchantId: string, amount: number): string`

### Sub-sistem: `hitungongkir:hitung:ongkir` (Klaster #6)
- **Kepadatan Simbol:** 1 simbol.
- **Komponen Inti / Simbol Penghubung (Top Centrality Hubs):**
  - [`hitungOngkir`](file://src/shipping/kurir.ts#L11-L15) (`src/shipping/kurir.ts:11-15`) [Tipe: `function`]
    - *Signature:* `(beratGram: number, kotaTujuan: string): number`

---

## 2. Titik Masuk Utama & Titik Interaksi Eksternal (Entry Points)

Berikut adalah simbol-simbol yang berfungsi sebagai pintu masuk (entry points, routes, atau pengendali utama) yang menerima pemicu dari luar atau CLI/HTTP:

*Tidak terdeteksi entry point publik spesifik; sistem kemungkinan berupa modul perpustakaan (library).*

---

## 3. Audit Titik Rawan Bencana ("Emotional Damage" Technical Debt Audit)

> [!WARNING]
> Analisis tanpa kompromi terhadap simpul-simpul berisiko tinggi. Jika salah satu komponen di bawah ini diubah tanpa mitigasi uji komprehensif, efek domino (*blast radius*) dapat melumpuhkan sistem.

### Titik Kemacetan Sentral (Single Points of Failure)
Komponen-komponen berikut dipanggil oleh banyak modul lain secara bersamaan:

- **Simbol Kritis:** [`calculateMemberDiscount`](file://src/customer/member.ts#L5-L13) (`src/customer/member.ts:5-13`)
  - **Beban Pemanggil (Blast Radius Inbound):** Dipanggil langsung oleh **3** modul/fungsi lain.
  - **Tingkat Keyakinan Relasi Bayesian:** `89.7%`
  - **Peringatan Dampak:** Setiap perubahan *signature* atau perilaku kembalian (*return type*) pada [`calculateMemberDiscount`](file://src/customer/member.ts#L5-L13) (`src/customer/member.ts:5-13`) berpotensi memicu galat runtime pada setidaknya 3 titik downstream.

- **Simbol Kritis:** [`processQrisSettlement`](file://src/payment/qris.ts#L16-L22) (`src/payment/qris.ts:16-22`)
  - **Beban Pemanggil (Blast Radius Inbound):** Dipanggil langsung oleh **3** modul/fungsi lain.
  - **Tingkat Keyakinan Relasi Bayesian:** `89.7%`
  - **Peringatan Dampak:** Setiap perubahan *signature* atau perilaku kembalian (*return type*) pada [`processQrisSettlement`](file://src/payment/qris.ts#L16-L22) (`src/payment/qris.ts:16-22`) berpotensi memicu galat runtime pada setidaknya 3 titik downstream.

- **Simbol Kritis:** [`generateNomorResi`](file://src/shipping/kurir.ts#L5-L9) (`src/shipping/kurir.ts:5-9`)
  - **Beban Pemanggil (Blast Radius Inbound):** Dipanggil langsung oleh **3** modul/fungsi lain.
  - **Tingkat Keyakinan Relasi Bayesian:** `89.7%`
  - **Peringatan Dampak:** Setiap perubahan *signature* atau perilaku kembalian (*return type*) pada [`generateNomorResi`](file://src/shipping/kurir.ts#L5-L9) (`src/shipping/kurir.ts:5-9`) berpotensi memicu galat runtime pada setidaknya 3 titik downstream.

- **Simbol Kritis:** [`verifySignature`](file://src/payment/qris.ts#L24-L26) (`src/payment/qris.ts:24-26`)
  - **Beban Pemanggil (Blast Radius Inbound):** Dipanggil langsung oleh **2** modul/fungsi lain.
  - **Tingkat Keyakinan Relasi Bayesian:** `93.9%`
  - **Peringatan Dampak:** Setiap perubahan *signature* atau perilaku kembalian (*return type*) pada [`verifySignature`](file://src/payment/qris.ts#L24-L26) (`src/payment/qris.ts:24-26`) berpotensi memicu galat runtime pada setidaknya 2 titik downstream.

---

## 4. Matriks Ketertelusuran Sitasi Kode (Zero Uncited Claims Audit)

Daftar lengkap seluruh simbol yang dikutip dalam dokumen ini beserta koordinat presisi berkas dan baris kodenya:

| Simbol | Tipe Simbol | Berkas Sumber | Baris Mulai | Baris Selesai |
| :--- | :--- | :--- | :--- | :--- |
| `calculateMemberDiscount` | `function` | [src/customer/member.ts](file://src/customer/member.ts#L5-L13) | `5` | `13` |
| `generateNomorResi` | `function` | [src/shipping/kurir.ts](file://src/shipping/kurir.ts#L5-L9) | `5` | `9` |
| `handleCheckoutOrder` | `function` | [src/order/checkout.ts](file://src/order/checkout.ts#L15-L29) | `15` | `29` |
| `verifySignature` | `function` | [src/payment/qris.ts](file://src/payment/qris.ts#L24-L26) | `24` | `26` |
| `processQrisSettlement` | `function` | [src/payment/qris.ts](file://src/payment/qris.ts#L16-L22) | `16` | `22` |
| `CheckoutRequest` | `interface` | [src/order/checkout.ts](file://src/order/checkout.ts#L9-L13) | `9` | `13` |
| `getLoyaltyPoints` | `function` | [src/customer/member.ts](file://src/customer/member.ts#L15-L17) | `15` | `17` |
| `QrisTransaction` | `interface` | [src/payment/qris.ts](file://src/payment/qris.ts#L5-L10) | `5` | `10` |
| `generateQrPayload` | `function` | [src/payment/qris.ts](file://src/payment/qris.ts#L12-L14) | `12` | `14` |
| `hitungOngkir` | `function` | [src/shipping/kurir.ts](file://src/shipping/kurir.ts#L11-L15) | `11` | `15` |
