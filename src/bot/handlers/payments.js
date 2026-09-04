const { t } = require("../../i18n");

const { buildCreateTestUrl } = require("../../utils/urls");

const { savePayment } = require("../../services/payment.service");

function registerPaymentHandlers(bot) {
  bot.on("pre_checkout_query", async (query) => {
    try {
      const payload = query.invoice_payload;

      const parts = payload.split(":");

      const type = parts[0];

      const userId = Number(parts[1]);

      if (type !== "create_test") {
        return bot.answerPreCheckoutQuery(query.id, false, {
          error_message: "Noto'g'ri to'lov turi.",
        });
      }

      if (Number(query.from.id) !== userId) {
        return bot.answerPreCheckoutQuery(query.id, false, {
          error_message: "To'lov foydalanuvchisi mos emas.",
        });
      }

      await bot.answerPreCheckoutQuery(query.id, true);
    } catch (error) {
      console.error("pre_checkout error:", error);

      try {
        await bot.answerPreCheckoutQuery(query.id, false, {
          error_message: "To'lovni tekshirishda xatolik.",
        });
      } catch {}
    }
  });

  bot.on("successful_payment", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const payment = msg.successful_payment;

    try {
      const [type, payloadUserId] = payment.invoice_payload.split(":");

      // if (type !== "create_test") {
      //   throw new Error("Invalid payment type");
      // }

      // if (String(payloadUserId) !== String(userId)) {
      //   throw new Error("Invalid payment user");
      // }

      // if (payment.currency !== "XTR") {
      //   throw new Error("Invalid currency");
      // }

      // if (Number(payment.total_amount) !== 10) {
      //   throw new Error("Invalid amount");
      // }

      const createTestUrl = buildCreateTestUrl();

      return bot.sendMessage(
        chatId,
        "✅ To'lov muvaffaqiyatli qabul qilindi.\n\nEndi test yaratishingiz mumkin.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "➕ Test yaratish",
                  web_app: {
                    url: createTestUrl,
                  },
                },
              ],
            ],
          },
        },
      );
    } catch (error) {
      console.error("Successful payment error:", error);

      return bot.sendMessage(
        chatId,
        "❌ To'lov ma'lumotlarini tekshirishda xatolik yuz berdi.",
      );
    }
  });
}

module.exports = registerPaymentHandlers;
