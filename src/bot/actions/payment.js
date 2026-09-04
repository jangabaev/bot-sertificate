const { t } = require("../../i18n");

async function sendCreateTestInvoice(bot, chatId, userId) {
  const payload = ["create_test", userId, Date.now()].join(":");

  return bot.sendInvoice(
    chatId,

    t(chatId, "invoiceTitle"),

    t(chatId, "invoiceDesc"),

    payload,

    "",

    "XTR",

    [
      {
        label: t(chatId, "invoiceLabel"),

        amount: 1,
      },
    ],
  );
}

module.exports = {
  sendCreateTestInvoice,
};
