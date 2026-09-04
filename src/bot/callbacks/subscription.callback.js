const { t } = require("../../i18n");

const { safeAnswer } = require("./safe-answer");

const { sendMainMenu } = require("../menus/main-menu");

const { isSubscribed } = require("../../services/subscription.service");

async function handleSubscriptionCallback(bot, query) {
  if (query.data !== "check_sub") {
    return false;
  }

  const chatId = query.message.chat.id;

  const userId = query.from.id;

  try {
    const subscribed = await isSubscribed(bot, userId);

    if (!subscribed) {
      await safeAnswer(bot, query.id, {
        text: t(chatId, "checkSubFail"),

        show_alert: true,
      });

      return true;
    }

    await safeAnswer(bot, query.id, {
      text: t(chatId, "checkSubSuccess"),
    });

    try {
      await bot.deleteMessage(chatId, query.message.message_id);
    } catch {}

    await sendMainMenu(bot, chatId, userId);

    return true;
  } catch (error) {
    console.error("Subscription check:", error);

    await safeAnswer(bot, query.id, {
      text: t(chatId, "checkSubError"),

      show_alert: true,
    });

    return true;
  }
}

module.exports = {
  handleSubscriptionCallback,
};
