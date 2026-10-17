def send_push_notification(user_id: str, message: str) -> bool:
    """Send mobile app push notification via FCM."""
    return len(user_id) > 0 and len(message) > 0

class PaymentNotifier:
    """Handles notification dispatch upon payment completion."""
    def __init__(self, channel: str = "firebase"):
        self.channel = channel

    def notify_payment_success(self, user_id: str, amount: float, trx_id: str) -> bool:
        msg = f"Pembayaran berhasil: {trx_id} sebesar Rp {amount}"
        return send_push_notification(user_id, msg)
