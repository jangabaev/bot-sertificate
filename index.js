require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const CEO_ID = parseInt(process.env.CEO_ID);
const CHANNEL_ID = process.env.CHANNEL_ID;
const BACKEND_URL = process.env.BACKEND_URL;
const SITE_URL = process.env.SITE_URL;

// Admin ro'yxati (xotira ichida; restart bo'lsa tozalanadi)
const admins = new Set();

// Har bir foydalanuvchining holati (test yaratish jarayoni uchun)
const userStates = new Map();

// Til sozlamalari
const userLanguages = {};

const isCEO = (id) => id === CEO_ID;
const isAdminOrCEO = (id) => isCEO(id) || admins.has(id);

// ─── BOT KOMANDALAR ───────────────────────────────────────────────────────────

bot.setMyCommands([
  { command: "/start", description: "Botni boshlash" },
  { command: "/myid", description: "Telegram ID ni ko'rish" },
  { command: "/language", description: "Tilni tanlash" },
  { command: "/help", description: "Yordam" },
]);

// /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const subscribed = await checkSubscription(chatId, userId);
  if (!subscribed) return;

  // Backendga registratsiya
  try {
    await fetch(`${BACKEND_URL}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: msg.from.id,
        username: msg.from.username || "",
        first_name: msg.from.first_name || "",
        last_name: msg.from.last_name || "",
      }),
    });
  } catch {
    // server ishlamasa ham bot ishlashda davom etsin
  }

  await sendMainMenu(chatId, userId);
});

// /myid — o'z Telegram ID sini bilish uchun
bot.onText(/\/myid/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `🆔 Sizning Telegram ID ingiz: \`${msg.from.id}\``,
    { parse_mode: "Markdown" }
  );
});

// /admin <userId> — faqat CEO ishlatishi mumkin
bot.onText(/\/admin (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isCEO(userId)) {
    return bot.sendMessage(chatId, "❌ Bu buyruq faqat CEO uchun.");
  }

  const targetId = parseInt(match[1]);

  if (targetId === CEO_ID) {
    return bot.sendMessage(chatId, "⚠️ CEO allaqachon eng yuqori huquqqa ega.");
  }

  admins.add(targetId);
  bot.sendMessage(chatId, `✅ Foydalanuvchi \`${targetId}\` admin qilib tayinlandi.`, {
    parse_mode: "Markdown",
  });

  try {
    await bot.sendMessage(
      targetId,
      "🎉 Siz admin qilib tayinlandingiz!\n\n/start bosing."
    );
  } catch {
    // foydalanuvchi botni ishga tushirmagan bo'lishi mumkin
  }
});

// /removeadmin <userId> — CEO admin o'chirishi uchun
bot.onText(/\/removeadmin (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!isCEO(userId)) {
    return bot.sendMessage(chatId, "❌ Bu buyruq faqat CEO uchun.");
  }

  const targetId = parseInt(match[1]);
  admins.delete(targetId);
  bot.sendMessage(chatId, `✅ \`${targetId}\` adminlikdan olindi.`, {
    parse_mode: "Markdown",
  });
});

// /admins — admin ro'yxatini ko'rish (CEO uchun)
bot.onText(/\/admins/, (msg) => {
  if (!isCEO(msg.from.id)) return;

  if (admins.size === 0) {
    return bot.sendMessage(msg.chat.id, "Hozircha adminlar yo'q.");
  }

  const list = [...admins].map((id) => `• \`${id}\``).join("\n");
  bot.sendMessage(msg.chat.id, `👑 Adminlar ro'yxati:\n\n${list}`, {
    parse_mode: "Markdown",
  });
});

// /language
bot.onText(/\/language/, (msg) => {
  bot.sendMessage(msg.chat.id, "Tilni tanlang:", {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🇺🇿 O'zbekcha", callback_data: "lang_uz" },
          { text: "🇷🇺 Русский", callback_data: "lang_ru" },
          { text: "🇬🇧 English", callback_data: "lang_en" },
        ],
      ],
    },
  });
});

// /help
bot.onText(/\/help/, (msg) => {
  const userId = msg.from.id;
  let text = "ℹ️ *Yordam*\n\n";
  text += "/start — Botni boshlash\n";
  text += "/myid — Telegram ID ni ko'rish\n";
  text += "/language — Tilni o'zgartirish\n";

  if (isCEO(userId)) {
    text += "\n*CEO buyruqlari:*\n";
    text += "/admin <id> — Admin qo'shish\n";
    text += "/removeadmin <id> — Adminni o'chirish\n";
    text += "/admins — Adminlar ro'yxati\n";
  }

  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// ─── CALLBACK QUERY (bitta handler) ──────────────────────────────────────────

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const messageId = query.message.message_id;
  const data = query.data;

  // Kanalga obuna tekshiruvi
  if (data === "check_sub") {
    try {
      const member = await bot.getChatMember(CHANNEL_ID, userId);
      const subscribed = ["member", "administrator", "creator"].includes(member.status);

      if (subscribed) {
        await bot.answerCallbackQuery(query.id, {
          text: "✅ Muvaffaqiyatli tekshirildi!",
        });
        await bot.deleteMessage(chatId, messageId);
        await sendMainMenu(chatId, userId);
      } else {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Siz hali kanalga a'zo emassiz!",
          show_alert: true,
        });
      }
    } catch {
      await bot.answerCallbackQuery(query.id, {
        text: "❌ Tekshiruvda xatolik.",
        show_alert: true,
      });
    }
    return;
  }

  // Til tanlash
  if (data.startsWith("lang_")) {
    const langCode = data.split("_")[1];
    userLanguages[chatId] = langCode;

    const langNames = { uz: "O'zbek tili 🇺🇿", ru: "Русский язык 🇷🇺", en: "English 🇬🇧" };

    await bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: chatId, message_id: messageId }
    );

    await bot.sendMessage(chatId, `✅ Til tanlandi: *${langNames[langCode]}*`, {
      parse_mode: "Markdown",
    });

    await sendMainMenu(chatId, userId);
    await bot.answerCallbackQuery(query.id);
    return;
  }

  await bot.answerCallbackQuery(query.id);
});

// ─── XABAR HANDLER ───────────────────────────────────────────────────────────

bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  const state = userStates.get(chatId);

  // ── Test yaratish holat mashina ──
  if (state?.step === "awaiting_test_name") {
    userStates.set(chatId, { step: "awaiting_test_answers", testName: text });
    return bot.sendMessage(
      chatId,
      `📝 Test nomi qabul qilindi: *${text}*\n\nEndi javob variantlarini kiriting (vergul bilan ajrating):\nMasalan: \`A,B,C,D\``,
      { parse_mode: "Markdown" }
    );
  }

  if (state?.step === "awaiting_test_answers") {
    const answers = text.split(",").map((a) => a.trim()).filter(Boolean);
    userStates.delete(chatId);

    try {
      const res = await fetch(`${BACKEND_URL}/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: state.testName, responce: answers }),
      });

      if (res.ok || res.status === 201) {
        await bot.sendMessage(
          chatId,
          `✅ Test muvaffaqiyatli yaratildi!\n📝 Nom: *${state.testName}*\n📋 Javoblar: ${answers.join(", ")}`,
          { parse_mode: "Markdown" }
        );
      } else {
        await bot.sendMessage(chatId, "❌ Server xatolik qaytardi. Test saqlanmadi.");
      }
    } catch {
      await bot.sendMessage(chatId, "❌ Serverga ulanib bo'lmadi.");
    }

    return sendMainMenu(chatId, userId);
  }

  // ── Menyu tugmalari ──

  if (text === "✍️ Test yaratish") {
    if (!isAdminOrCEO(userId)) {
      return bot.sendMessage(chatId, "❌ Bu funksiya faqat Admin/CEO uchun.");
    }
    userStates.set(chatId, { step: "awaiting_test_name" });
    return bot.sendMessage(chatId, "Test nomini kiriting:", {
      reply_markup: { remove_keyboard: true },
    });
  }

  if (text === "📋 Active testlar") {
    try {
      const res = await fetch(`${BACKEND_URL}/api/tests/active`);
      const tests = await res.json();

      if (!Array.isArray(tests) || tests.length === 0) {
        return bot.sendMessage(chatId, "📭 Hozircha active testlar mavjud emas.");
      }

      let message = "📋 *Active testlar:*\n\n";
      tests.forEach((t, i) => {
        message += `${i + 1}. ${t.name}\n`;
      });

      return bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🌐 Saytga o'tib test topshirish", url: SITE_URL }],
          ],
        },
      });
    } catch {
      return bot.sendMessage(chatId, "❌ Testlarni olishda xatolik yuz berdi.");
    }
  }

  if (text === "📜 Natijalarim" || text === "📜 Sertifikatlar") {
    return bot.sendMessage(chatId, "📊 Natijalarni ko'rish uchun saytga o'ting:", {
      reply_markup: {
        inline_keyboard: [[{ text: "🌐 Saytga o'tish", url: SITE_URL }]],
      },
    });
  }

  if (text === "🏆 Sertifikatlarim") {
    return bot.sendMessage(chatId, "🏆 Sertifikatlarni ko'rish uchun saytga o'ting:", {
      reply_markup: {
        inline_keyboard: [[{ text: "🌐 Saytga o'tish", url: SITE_URL }]],
      },
    });
  }

  if (text === "⚙️ Sozlamalar") {
    return bot.sendMessage(chatId, "⚙️ *Sozlamalar*\n\nTilni o'zgartirish uchun /language bosing.", {
      parse_mode: "Markdown",
    });
  }

  if (text === "👑 CEO Panel" || text === "👑 Admin Panel") {
    if (!isAdminOrCEO(userId)) return;

    let info = isCEO(userId)
      ? `👑 *CEO Panel*\n\nAdminlar soni: ${admins.size}\n\n` +
        `*Buyruqlar:*\n/admin <id> — admin qo'shish\n/removeadmin <id> — o'chirish\n/admins — ro'yxat`
      : `👑 *Admin Panel*\n\nSiz admin sifatida test yaratishingiz mumkin.\n✍️ Test yaratish tugmasini bosing.`;

    return bot.sendMessage(chatId, info, { parse_mode: "Markdown" });
  }
});

// ─── YORDAMCHI FUNKSIYALAR ────────────────────────────────────────────────────

async function sendMainMenu(chatId, userId) {
  const ceoKeyboard = [
    [{ text: "✍️ Test yaratish" }],
  ];

  const adminKeyboard = [
    [{ text: "✍️ Test yaratish" }, { text: "📋 Active testlar" }],
    [{ text: "📜 Sertifikatlar" }, { text: "⚙️ Sozlamalar" }],
    [{ text: "📦 Pullik kanallar" }, { text: "👑 Admin Panel" }],
  ];

  const userKeyboard = [
    [{ text: "📋 Active testlar" }, { text: "📜 Natijalarim" }],
    [{ text: "🏆 Sertifikatlarim" }, { text: "⚙️ Sozlamalar" }],
  ];

  let keyboard;
  if (isCEO(userId)) keyboard = ceoKeyboard;
  else if (admins.has(userId)) keyboard = adminKeyboard;
  else keyboard = userKeyboard;

  await bot.sendMessage(chatId, "Menuni tanlang 👇", {
    reply_markup: { keyboard, resize_keyboard: true },
  });
}

async function checkSubscription(chatId, userId) {
  try {
    const member = await bot.getChatMember(CHANNEL_ID, userId);
    if (["member", "administrator", "creator"].includes(member.status)) {
      return true;
    }

    await bot.sendMessage(
      chatId,
      "📢 Botdan foydalanish uchun avval kanalga a'zo bo'ling:",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📢 Kanalga o'tish", url: "https://t.me/the_mukhtar" }],
            [{ text: "✅ A'zo bo'ldim, tekshirish", callback_data: "check_sub" }],
          ],
        },
      }
    );
    return false;
  } catch {
    await bot.sendMessage(
      chatId,
      "❌ Kanalga a'zo bo'ling: https://t.me/the_mukhtar"
    );
    return false;
  }
}
