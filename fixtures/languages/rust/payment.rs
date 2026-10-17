use std::collections::HashMap;

/// Gateway pembayaran digital
pub struct PaymentGateway {
    pub merchant_id: String,
    pub config: HashMap<String, String>,
}

/// Kontrak pembayaran universal
pub trait PaymentContract {
    fn pay(&self, order_id: &str, amount: u64) -> Result<String, String>;
}

impl PaymentGateway {
    pub fn new(merchant_id: String) -> Self {
        Self {
            merchant_id,
            config: HashMap::new(),
        }
    }
}

impl PaymentContract for PaymentGateway {
    fn pay(&self, order_id: &str, amount: u64) -> Result<String, String> {
        if amount == 0 {
            return Err("Nominal tidak boleh 0".to_string());
        }
        let trx_id = format!("TRX-{}-{}", order_id, amount);
        Ok(trx_id)
    }
}

pub fn calculate_fee(amount: u64) -> u64 {
    amount * 2 / 100
}
