<?php

class InvoiceGenerator {
    public function generateInvoiceNumber($orderId) {
        return "INV-" . date("Ymd") . "-" . $orderId;
    }

    public function processTaxInvoice($amount) {
        $tax = $amount * 0.11;
        return $amount + $tax;
    }
}
