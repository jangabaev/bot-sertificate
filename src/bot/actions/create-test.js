const { isAdminOrCEO } = require("../../utils/roles");

const { buildCreateTestUrl } = require("../../utils/urls");

async function sendCreateTest(bot, chatId, userId) {
  if (!isAdminOrCEO(userId)) {
    return bot.sendMessage(
      chatId,
      "❌ Test yaratish faqat Admin va CEO uchun mavjud.",
    );
  }

  const url = buildCreateTestUrl();

  return bot.sendMessage(
    chatId,
    "📝 Yangi test yaratish uchun quyidagi tugmani bosing:",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "➕ Test yaratish",

              web_app: {
                url,
              },
            },
          ],
        ],
      },
    },
  );
}

module.exports = {
  sendCreateTest,
};
