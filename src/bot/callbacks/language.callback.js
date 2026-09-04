const { t, changeLanguage, getLanguageName } = require("../../i18n");

const { sendMainMenu } = require("../menus/main-menu");

const { safeAnswer } = require("./safe-answer");

async function handleLanguageCallback(bot, query) {
  const data = query.data;

  if (!data.startsWith("lang_")) {
    return false;
  }

  const chatId = query.message.chat.id;

  const messageId = query.message.message_id;

  const userId = query.from.id;

  const language = data.replace("lang_", "");

  const changed = changeLanguage(chatId, language);

  if (!changed) {
    await safeAnswer(bot, query.id, {
      text: "Invalid language",
      show_alert: true,
    });

    return true;
  }

  try {
    await bot.editMessageReplyMarkup(
      {
        inline_keyboard: [],
      },
      {
        chat_id: chatId,
        message_id: messageId,
      },
    );
  } catch {}

  await bot.sendMessage(
    chatId,
    t(chatId, "languageSet", {
      lang: getLanguageName(language),
    }),
    {
      parse_mode: "Markdown",
    },
  );

  await sendMainMenu(bot, chatId, userId);

  await safeAnswer(bot, query.id);

  return true;
}

module.exports = {
  handleLanguageCallback,
};
