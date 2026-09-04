const { t } = require("../../i18n");

async function sendTestPanel(bot, chatId) {
  return bot.sendMessage(chatId, t(chatId, "testSectionTitle"), {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: t(chatId, "btnNewTest"),
            callback_data: "test:new",
          },
        ],
        [
          {
            text: t(chatId, "btnMyTests"),
            callback_data: "test:list",
          },
        ],
      ],
    },
  });
}

module.exports = {
  sendTestPanel,
};
