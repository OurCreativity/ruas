package payment

import (
	"context"
	"fmt"
)

// PaymentGateway memproses pembayaran online
type PaymentGateway struct {
	MerchantID string
}

// PaymentContract adalah antarmuka gateway pembayaran
type PaymentContract interface {
	Pay(ctx context.Context, orderID string, amount int64) (string, error)
}

// Pay memproses transaksi pembayaran pelanggan
func (p *PaymentGateway) Pay(ctx context.Context, orderID string, amount int64) (string, error) {
	if amount <= 0 {
		return "", fmt.Errorf("invalid amount: %d", amount)
	}
	trxID := fmt.Sprintf("TRX-%s-%d", orderID, amount)
	return trxID, nil
}

// CalculateFee menghitung biaya transaksi
func CalculateFee(amount int64) int64 {
	return amount * 2 / 100
}
