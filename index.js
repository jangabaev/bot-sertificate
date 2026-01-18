const TelegramBot = require("node-telegram-bot-api");
const token = "8300584993:AAE4MCh5CbNwUWsKI6g534r47oAPVa_N3qo";

const bot = new TelegramBot(token, { polling: true });

let userLanguages = {}; // { chatId: "uz" }

// Matnlar
const messages = {
  uz: {
    start: "Salom! Bot ishga tushdi ✅",
    help: "Yordam uchun /help bosing",
    langSelected: "Siz O‘zbek tilini tanladingiz 🇺🇿",
  },
  ru: {
    start: "Привет! Бот запущен ✅",
    help: "Для помощи нажмите /help",
    langSelected: "Вы выбрали Русский язык 🇷🇺",
  },
  en: {
    start: "Hello! Bot started ✅",
    help: "Press /help for assistance",
    langSelected: "You selected English 🇬🇧",
  },
};

bot.setMyCommands([
  { command: "/start", description: "Botni boshlash" },
  { command: "/language", description: "Tilni tanlash" },
  { command: "/help", description: "Yordam olish" },
]);

bot.onText(/\/language/, (msg) => {
  bot.sendMessage(msg.chat.id, "Tilni tanlang:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🇺🇿 O‘zbekcha", callback_data: "lang_uz" },
          { text: "🇷🇺 Русский", callback_data: "lang_ru" },
          { text: "🇬🇧 English", callback_data: "lang_en" },
        ],
      ],
    },
  });
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;

  if (!query.data.startsWith("lang_")) return;

  const langCode = query.data.split("_")[1];
  userLanguages[chatId] = langCode;

  await bot.editMessageReplyMarkup(
    { inline_keyboard: [] },
    {
      chat_id: chatId,
      message_id: query.message.message_id,
    }
  );

  await bot.sendMessage(chatId, messages[langCode].langSelected);

  await sendStartMenu(chatId, langCode);

  bot.answerCallbackQuery(query.id);
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, "Bu yordam menyusi.");
});

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  if (msg.text === "/") {
    bot.sendMessage(
      chatId,
      "Mavjud komandalar:\n/start - Botni boshlash\n/language - Tilni tanlash\n/help - Yordam"
    );
  }
});

let createTest = false;
let testNameTrue = false;
let textName = "";
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  let testName = "";
  if (createTest) {
    testName = msg.text;
    testNameTrue = true;
    createTest = false;
    textName = msg.text;
    return bot.sendMessage(
      chatId,
      "Test nomi qabul qilindi endi javobni kirgizing"
    );
  }
  if (testNameTrue) {
    const testAnswer = msg.text;
    createTest = false;
    testNameTrue = false;
    try {
      const responce = await fetch("http://192.168.1.104:5000/api/exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: textName, currect_answer: testAnswer }),
      });
      if (responce.status === 201) {
        bot.sendMessage(chatId, `Test mufaqiyatli yaratildi: ${textName}`, {
          reply_markup: {
            keyboard: [
              [{ text: "✍️ Test yaratish" }, { text: "✅ Javobni tekshirish" }],
              [{ text: "📜 Sertifikatlar" }, { text: "⚙️ Sozlamalar" }],
              [{ text: "📦 Pullik kanallar" }, { text: "👑 Admin" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        });
      }
    } catch (error) {}
    return bot.sendMessage(
      chatId,
      `Test yaratildi!\nTest nomi: ${testName}\nJavob: ${testAnswer}`
    );
  }
  if (msg.text === "✍️ Test yaratish") {
    bot.sendMessage(chatId, "Test yaratish bo‘limiga xush kelibsiz!");
    bot.sendMessage(chatId, "Test nomini yozing", {
      reply_markup: {
        keyboard: [],
        resize_keyboard: true,
        remove_keyboard: true,
      },
    });
    createTest = true;
  } else if (msg.text === "✅ Javobni tekshirish") {
    bot.sendMessage(chatId, "Javobni tekshirish bo‘limiga xush kelibsiz!");
  }
});

//bottni start bosganda
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const lang = userLanguages[chatId] || "uz";
  bot.sendMessage(chatId, messages[lang].start, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🌐 Open Web App",
            web_app: { url: "https://sertificate-0jzs.onrender.com/" },
          },
        ],
      ],
    },
  });

  bot.sendMessage(chatId, "Menuni tanlang 👇", {
    reply_markup: {
      keyboard: [
        [{ text: "✍️ Test yaratish" }, { text: "✅ Javobni tekshirish" }],
        [{ text: "📜 Sertifikatlar" }, { text: "⚙️ Sozlamalar" }],
        [{ text: "📦 Pullik kanallar" }, { text: "👑 Admin" }],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  });

  // const userData = {
  //   user_id: msg.from.id,
  //   username: msg.from.username || "",
  //   first_name: msg.from.first_name || "",
  //   last_name: msg.from.last_name || "",
  // };

  // console.log("Yuborilayotgan ma'lumot:", userData);

  // // BACKENDga POST so‘rov yuborish
  // try {
  //   await fetch("http://192.168.1.104:5000/api/users/register", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify(userData),
  //   });

  //   bot.sendMessage(chatId, "Salom! Sizning ma'lumotlaringiz qayd qilindi ✅");
  // } catch (err) {
  //   console.error("POST xato:", err);
  //   bot.sendMessage(chatId, "Server bilan bog‘lanishda xatolik ❌");
  // }
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const lang = userLanguages[chatId] || "uz";
  sendStartMenu(chatId, lang);
});

async function sendStartMenu(chatId, lang) {
  await bot.sendMessage(chatId, messages[lang].start, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🌐 Open Web App",
            web_app: { url: "https://sertificate-0jzs.onrender.com/" },
          },
        ],
      ],
    },
  });

  await bot.sendMessage(chatId, "Menuni tanlang 👇", {
    reply_markup: {
      keyboard: [
        [{ text: "✍️ Test yaratish" }, { text: "✅ Javobni tekshirish" }],
        [{ text: "📜 Sertifikatlar" }, { text: "⚙️ Sozlamalar" }],
        [{ text: "📦 Pullik kanallar" }, { text: "👑 Admin" }],
      ],
      resize_keyboard: true,
    },
  });
}
