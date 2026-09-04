const { t } = require("../../i18n");

const { getActiveTests } = require("../../services/test.service");

const { getTestName } = require("../../utils/test");

const { escapeMarkdown } = require("../../utils/markdown");

const { env } = require("../../config/env");

async function sendActiveTests(bot, chatId) {
  try {
    const tests = await getActiveTests();

    if (!tests.length) {
      return bot.sendMessage(chatId, t(chatId, "noActiveTests"));
    }

    let message = t(chatId, "activeTestsTitle");

    tests.forEach((test, index) => {
      message += `${index + 1}. ` + `${escapeMarkdown(getTestName(test))}\n`;
    });

    return bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",

      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t(chatId, "btnGoSubmit"),

              web_app: {
                url: env.SITE_URL,
              },
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.error("Active tests error:", error);

    return bot.sendMessage(chatId, t(chatId, "fetchUserTestsError"));
  }
}

module.exports = {
  sendActiveTests,
};
