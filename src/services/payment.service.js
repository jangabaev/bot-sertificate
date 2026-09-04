const api = require("./api.service");

async function savePayment({
  userId,
  telegramPaymentChargeId,
  providerPaymentChargeId,
  invoicePayload,
  currency,
  totalAmount,
}) {
  return api.post("/payments/telegram-stars", {
    user_id: userId,

    telegram_payment_charge_id: telegramPaymentChargeId,

    provider_payment_charge_id: providerPaymentChargeId,

    invoice_payload: invoicePayload,

    currency,

    amount: totalAmount,

    type: "create_test",
  });
}

module.exports = {
  savePayment,
};
