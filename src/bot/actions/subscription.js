const { t } = require("../../i18n");

const { env } = require("../../config/env");

const { isSubscribed } = require("../../services/subscription.service");

async function checkSubscription(bot, chatId, userId) {
  if (!env.CHANNEL_ID) {
    return true;
  }

  try {
    const subscribed = await isSubscribed(bot, userId);

    if (subscribed) {
      return true;
    }

    await sendSubscribeMessage(bot, chatId);

    return false;
  } catch (error) {
    console.error("Subscription error:", error);

    /*
     * Telegram API vaqtincha ishlamasa,
     * foydalanuvchini bloklamaymiz.
     */
    return true;
  }
}

async function sendSubscribeMessage(bot, chatId) {
  const channelUrl = env.CHANNEL_URL;

  const inlineKeyboard = [];

  if (channelUrl) {
    inlineKeyboard.push([
      {
        text: t(chatId, "btnGoChannel"),

        url: channelUrl,
      },
    ]);
  }

  inlineKeyboard.push([
    {
      text: t(chatId, "btnCheckSub"),

      callback_data: "check_sub",
    },
  ]);

  return bot.sendMessage(chatId, t(chatId, "subscribeText"), {
    reply_markup: {
      inline_keyboard: inlineKeyboard,
    },
  });
}

module.exports = {
  checkSubscription,
  sendSubscribeMessage,
};
