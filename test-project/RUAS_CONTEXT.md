---
ruas_dialect: ai-native/v1
target: "Autonomous AI Coding Agents (Cursor, Claude, Antigravity, Cline)"
generated_at: "2026-10-15T05:29:42.721Z"
project_root: "/Users/kou/Project/Graph_Draft/test-project"
total_symbols: 26
total_edges: 35
vibe_session_id: "vibe-1792042142645-qay5j"
vibe_timestamp: 1792042142645
---

# 🌿 Ruas AI-Native Memory & Working Context
> **LLM NOTICE:** This document is pre-indexed semantic ground truth. Do NOT rescan ASTs or hallucinate unverified relationships.

## 🧠 Active Vibe Intent & Working Memory
- **Developer Intent:** `Testing e2e pipeline for test-project playground`
- **Session Tag:** `e2e-validation`
- **Active Files (2):**
  - `src/payment.ts`
  - `src/order.ts`
- **Architectural Notes / Invariants:**
  All modules must be pure functions

## 🏛️ Central Hub Symbols (God Nodes)
| Symbol | Kind | Inbound Callers | Outbound Calls | Risk Assessment |
| :--- | :--- | :---: | :---: | :--- |
| `checkoutOrder` | `function` | 0 | 4 | 🟡 MODERATE |
| `authorizeCheckout` | `function` | 2 | 1 | 🟡 MODERATE |
| `applyVoucher` | `function` | 2 | 1 | 🟡 MODERATE |
| `prosesQRIS` | `function` | 2 | 1 | 🟡 MODERATE |
| `prosesVirtualAccount` | `function` | 2 | 1 | 🟡 MODERATE |
| `calculateGrandTotal` | `function` | 1 | 1 | 🟡 MODERATE |
| `chargeGateway` | `function` | 2 | 0 | 🟡 MODERATE |
| `send_push_notification` | `function` | 1 | 0 | 🟡 MODERATE |
| `notify_payment_success` | `method` | 0 | 1 | 🟡 MODERATE |
| `verifySession` | `function` | 1 | 0 | 🟡 MODERATE |

## ⚡ Bayesian Critical Call Trajectories
- `[notify_payment_success] --(CALLS:89%)--> [send_push_notification]`
- `[authorizeCheckout] --(CALLS:89%)--> [verifySession]`
- `[applyVoucher] --(CALLS:89%)--> [calculateDirectDiscount]`
- `[order.ts] --(IMPORTS:95%)--> [authorizeCheckout]`
- `[order.ts] --(IMPORTS:95%)--> [applyVoucher]`
- `[order.ts] --(IMPORTS:95%)--> [prosesQRIS]`
- `[order.ts] --(IMPORTS:95%)--> [prosesVirtualAccount]`
- `[order.ts] --(IMPORTS:95%)--> [PaymentResult]`
- `[checkoutOrder] --(CALLS:89%)--> [calculateGrandTotal]`
- `[prosesQRIS] --(CALLS:89%)--> [chargeGateway]`
- `[prosesVirtualAccount] --(CALLS:89%)--> [chargeGateway]`

## 📐 Compact AST Signatures (Zero-Fluff Token Layout)
### `legacy/billing.php`
- [class] `InvoiceGenerator` :: class InvoiceGenerator (L3-L12)
- [method] `generateInvoiceNumber` :: function generateInvoiceNumber($orderId) (L4-L6)
- [method] `processTaxInvoice` :: function processTaxInvoice($amount) (L8-L11)

### `services/notifier.py`
- [function] `send_push_notification` :: def send_push_notification(user_id: str, message: str) -> bool (L1-L3)
- [class] `PaymentNotifier` :: class PaymentNotifier (L5-L12)
- [method] `__init__` :: def __init__(self, channel: str = "firebase") (L7-L8)
- [method] `notify_payment_success` :: def notify_payment_success(self, user_id: str, amount: float, trx_id: str) -> bool (L10-L12)

### `src/auth.ts`
- [interface] `UserSession` :: interface UserSession (L1-L5)
- [function] `verifySession` :: (token: string): UserSession | null (L7-L14)
- [function] `authorizeCheckout` :: (token: string): boolean (L16-L19)

### `src/discount.ts`
- [interface] `DiscountResult` :: interface DiscountResult (L1-L5)
- [function] `calculateDirectDiscount` :: (amount: number, percentage: number): number (L7-L9)
- [function] `applyVoucher` :: (code: string, amount: number): DiscountResult (L11-L26)

### `src/order.ts`
- [interface] `OrderRequest` :: interface OrderRequest (L5-L11)
- [function] `calculateGrandTotal` :: (subtotal: number, voucherCode?: string): number (L13-L19)
- [function] `checkoutOrder` :: (order: OrderRequest): PaymentResult (L21-L34)

### `src/payment.ts`
- [interface] `PaymentResult` :: interface PaymentResult (L1-L6)
- [function] `chargeGateway` :: (provider: string, amount: number): boolean (L8-L11)
- [function] `prosesQRIS` :: (transactionId: string, amount: number): PaymentResult (L13-L21)
- [function] `prosesVirtualAccount` :: (transactionId: string, bank: string, amount: number): PaymentResult (L23-L31)
