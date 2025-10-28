const TelegramBot = require("node-telegram-bot-api");
const token = "8300584993:AAE4MCh5CbNwUWsKI6g534r47oAPVa_N3qo";

const bot = new TelegramBot(token, { polling: true });

let userLanguages = {};  // { chatId: "uz" }

// Matnlar
const messages = {
  uz: {
    start: "Salom! Bot ishga tushdi ✅",
    help: "Yordam uchun /help bosing",
    langSelected: "Siz O‘zbek tilini tanladingiz 🇺🇿"
  },
  ru: {
    start: "Привет! Бот запущен ✅",
    help: "Для помощи нажмите /help",
    langSelected: "Вы выбрали Русский язык 🇷🇺"
  },
  en: {
    start: "Hello! Bot started ✅",
    help: "Press /help for assistance",
    langSelected: "You selected English 🇬🇧"
  }
};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const lang = userLanguages[chatId] || "uz";

  bot.sendMessage(chatId, messages[lang].start, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🌐 Open Web App",
            web_app: { url: "https://sertificate-0jzs.onrender.com/" } // o'z web sayt URL'ingni yoz
          }
        ]
      ]
    }
  });
});
bot.setMyCommands([
  { command: "/start", description: "Botni boshlash" },
  { command: "/language", description: "Tilni tanlash" },
  { command: "/help", description: "Yordam olish" },
]);

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Salom! Bot ishga tushdi ✅");
});

bot.onText(/\/language/, (msg) => {
  bot.sendMessage(msg.chat.id, "Tilni tanlang:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🇺🇿 O‘zbekcha", callback_data: "lang_uz" },
          { text: "🇷🇺 Русский", callback_data: "lang_ru" },
          { text: "🇬🇧 English", callback_data: "lang_en" }
        ]
      ]
    }
  });
});

bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;

  if (query.data === "lang_uz") {
    bot.sendMessage(chatId, "Siz 🇺🇿 O‘zbek tilini tanladingiz.");
    la
  } else if (query.data === "lang_ru") {
    bot.sendMessage(chatId, "Вы выбрали 🇷🇺 Русский язык.");
  } else if (query.data === "lang_en") {
    bot.sendMessage(chatId, "You selected 🇬🇧 English language.");
  }
 if (query.data.startsWith("lang_")) {
    const langCode = query.data.split("_")[1];
    userLanguages[chatId] = langCode;
    bot.sendMessage(chatId, messages[langCode].langSelected);
  }
  bot.answerCallbackQuery(query.id);
});


bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, "Bu yordam menyusi.");
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  if (msg.text === "/") {
    bot.sendMessage(chatId, "Mavjud komandalar:\n/start - Botni boshlash\n/language - Tilni tanlash\n/help - Yordam");
  }
});

