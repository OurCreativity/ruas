using System;
using System.Collections.Generic;

namespace Ruas.Payment;

/// <summary>
/// Layanan pemrosesan pembayaran online
/// </summary>
public class PaymentService : BaseService, IPaymentService
{
    private readonly string _merchantId;

    public PaymentService(string merchantId)
    {
        _merchantId = merchantId;
    }

    /// <summary>
    /// Memproses pembayaran transaksi
    /// </summary>
    public bool ProcessPayment(string orderId, decimal amount)
    {
        if (amount <= 0)
        {
            return false;
        }
        ValidateOrder(orderId);
        PersistPayment(orderId, amount);
        return true;
    }

    private void ValidateOrder(string orderId)
    {
    }

    private void PersistPayment(string orderId, decimal amount)
    {
    }
}
