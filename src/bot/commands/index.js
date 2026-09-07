const { t } = require("../../i18n");

const { sendMainMenu } = require("../menus/main-menu");

const { sendTestPanel } = require("../menus/test-menu");

const { checkSubscription } = require("../actions/subscription");

const { isCEO } = require("../../utils/roles");

const adminStore = require("../../store/admin.store");

const { setupCommands } = require("./setup-commands");

const { createOrUpdateUser } = require("../../services/user.service");

function registerCommands(bot) {
  setupCommands(bot).catch((error) => {
    console.error("Telegram commandlarni o'rnatishda xatolik:", error);
  });

  bot.onText(/^\/start$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      await createOrUpdateUser(msg.from);
    } catch (error) {
      console.error("Userni backendga saqlashda xatolik:", error.message);
    }

    return sendMainMenu(bot, chatId, userId);
  });

  bot.onText(/^\/myid$/, async (msg) => {
    return bot.sendMessage(
      msg.chat.id,
      t(msg.chat.id, "myId", {
        id: msg.from.id,
      }),
      {
        parse_mode: "Markdown",
      },
    );
  });

  bot.onText(/^\/test$/, async (msg) => {
    return sendTestPanel(bot, msg.chat.id);
  });

  bot.onText(/^\/language$/, async (msg) => {
    const chatId = msg.chat.id;

    return bot.sendMessage(chatId, t(chatId, "chooseLanguage"), {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🇺🇿 O'zbekcha",
              callback_data: "lang_uz",
            },
          ],
          [
            {
              text: "🇷🇺 Русский",
              callback_data: "lang_ru",
            },
          ],
          [
            {
              text: "🇬🇧 English",
              callback_data: "lang_en",
            },
          ],
        ],
      },
    });
  });

  bot.onText(/^\/admin(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!isCEO(msg.from.id)) {
      return bot.sendMessage(chatId, t(chatId, "ceoOnly"));
    }

    const id = Number(match?.[1]);

    if (!Number.isInteger(id)) {
      return bot.sendMessage(chatId, "❌ Format: /admin 123456789");
    }

    if (isCEO(id)) {
      return bot.sendMessage(chatId, t(chatId, "ceoAlreadyTop"));
    }

    adminStore.addAdmin(id);

    await bot.sendMessage(chatId, t(chatId, "adminAdded", { id }), {
      parse_mode: "Markdown",
    });

    try {
      await bot.sendMessage(id, t(id, "adminAddedNotify"));
    } catch {
      // Bot foydalanuvchiga hali yozolmasligi mumkin.
    }
  });

  bot.onText(/^\/removeadmin(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (!isCEO(msg.from.id)) {
      return bot.sendMessage(chatId, t(chatId, "ceoOnly"));
    }

    const id = Number(match?.[1]);

    if (!Number.isInteger(id)) {
      return bot.sendMessage(chatId, "❌ Format: /removeadmin 123456789");
    }

    adminStore.removeAdmin(id);

    return bot.sendMessage(chatId, t(chatId, "adminRemoved", { id }), {
      parse_mode: "Markdown",
    });
  });

  bot.onText(/^\/admins$/, async (msg) => {
    const chatId = msg.chat.id;

    if (!isCEO(msg.from.id)) {
      return bot.sendMessage(chatId, t(chatId, "ceoOnly"));
    }

    const admins = adminStore.getAdmins();

    if (!admins.length) {
      return bot.sendMessage(chatId, t(chatId, "noAdmins"));
    }

    const list = admins.map((id) => `• \`${id}\``).join("\n");

    return bot.sendMessage(
      chatId,
      t(chatId, "adminsList", {
        list,
      }),
      {
        parse_mode: "Markdown",
      },
    );
  });

  bot.onText(/^\/help$/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    let text = t(chatId, "helpTitle");

    text += t(chatId, "helpStart");
    text += t(chatId, "helpMyId");
    text += t(chatId, "helpTest");
    text += t(chatId, "helpLanguage");

    if (isCEO(userId)) {
      text += t(chatId, "helpCeoTitle");
      text += t(chatId, "helpAdminAdd");
      text += t(chatId, "helpAdminRemove");
      text += t(chatId, "helpAdminsList");
    }

    return bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
    });
  });
}

module.exports = registerCommands;
