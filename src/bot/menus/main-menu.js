const { t } = require("../../i18n");
const { isCEO, isAdmin } = require("../../utils/roles");

async function sendMainMenu(bot, chatId, userId) {
  let keyboard;

  if (isCEO(userId)) {
    keyboard = [
      [t(chatId, "btnMakeTest"), t(chatId, "btnActiveTests")],
      [t(chatId, "btnMyResults"), t(chatId, "btnCertificates")],
      [t(chatId, "btnSettings"), t(chatId, "btnCeoPanel")],
    ];
  } else if (isAdmin(userId)) {
    keyboard = [
      [t(chatId, "btnMakeTest"), t(chatId, "btnActiveTests")],
      [t(chatId, "btnCertificatesAlt"), t(chatId, "btnPaidChannels")],
      [t(chatId, "btnSettings"), t(chatId, "btnAdminPanel")],
    ];
  } else {
    keyboard = [
      [t(chatId, "btnActiveTests"), t(chatId, "btnMyResults")],
      [t(chatId, "btnCertificates"), t(chatId, "btnSettings")],
    ];
  }

  return bot.sendMessage(chatId, t(chatId, "chooseMenu"), {
    reply_markup: {
      keyboard,
      resize_keyboard: true,
    },
  });
}

module.exports = {
  sendMainMenu,
};
