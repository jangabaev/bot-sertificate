require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const CEO_ID = parseInt(process.env.CEO_ID);
const CHANNEL_ID = process.env.CHANNEL_ID;
const BACKEND_URL = process.env.BACKEND_URL;
const SITE_URL = process.env.SITE_URL;
const CREATE_TEST_URL = `${SITE_URL}/create`;

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
  { command: "/test", description: "Test yaratish va boshqarish" },
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
    await fetch(`${BACKEND_URL}/users`, {
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

// /test — hamma foydalanuvchi test yaratishi va o'z testlarini boshqarishi uchun
bot.onText(/^\/test(?:\s|$)/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const subscribed = await checkSubscription(chatId, userId);
  if (!subscribed) return;

  return sendTestPanel(chatId);
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
  text += "/test — Test yaratish va boshqarish\n";
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

  if (data === "test:new") {
    await bot.answerCallbackQuery(query.id);
    return sendCreateTestInvoice(chatId, userId);
  }

  if (data === "test:list") {
    await bot.answerCallbackQuery(query.id);
    return sendUserTests(chatId, userId);
  }

  if (data === "test:back") {
    await bot.answerCallbackQuery(query.id);
    return sendTestPanel(chatId);
  }

  if (data.startsWith("test:show:")) {
    const testId = data.split(":")[2];
    await bot.answerCallbackQuery(query.id);
    return sendTestDetails(chatId, userId, testId);
  }

  if (data.startsWith("test:stop:")) {
    const testId = data.split(":")[2];

    try {
      await stopTest(testId, userId);
      await bot.answerCallbackQuery(query.id, {
        text: "Test to'xtatildi.",
      });
      return sendTestDetails(chatId, userId, testId);
    } catch {
      await bot.answerCallbackQuery(query.id, {
        text: "Testni to'xtatishda xatolik.",
        show_alert: true,
      });
      return;
    }
  }

  await bot.answerCallbackQuery(query.id);
});


bot.on("pre_checkout_query", async (query) => {
  await bot.answerPreCheckoutQuery(query.id, true);
});
// ─── XABAR HANDLER ───────────────────────────────────────────────────────────

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (msg.successful_payment) {
    await bot.sendMessage(chatId, "✅ To'lov qabul qilindi.");

    return bot.sendMessage(chatId, "📝 Test yaratish uchun saytga o'ting:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌐 Test yaratish", url: buildCreateTestUrl(null, userId) }],
        ],
      },
    });
  }

  if (!msg.text || msg.text.startsWith("/")) return;

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
    return sendCreateTestInvoice(chatId, userId);
  }

  if (text === "📋 Active testlar") {
    try {
      const res = await fetch(`${BACKEND_URL}/test?sort_by=ACTIVE`);
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

async function sendTestPanel(chatId) {
  return bot.sendMessage(chatId, "🧪 Test bo'limi:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Yangi test", callback_data: "test:new" }],
        [{ text: "📚 Yaratilgan testlar", callback_data: "test:list" }],
      ],
    },
  });
}

async function sendCreateTestInvoice(chatId, userId) {
  return bot.sendInvoice(
    chatId,
    "Test yaratish",
    "10 Telegram Stars evaziga yangi test yarating",
    `create_test:${userId}:${Date.now()}`,
    "",
    "XTR",
    [
      {
        label: "Yangi test yaratish",
        amount: 10,
      },
    ]
  );
}

async function sendUserTests(chatId, userId) {
  try {
    const tests = await getUserTests(userId);

    if (!tests.length) {
      return bot.sendMessage(chatId, "📭 Sizda hali yaratilgan testlar yo'q.", {
        reply_markup: {
          inline_keyboard: [[{ text: "➕ Yangi test", callback_data: "test:new" }]],
        },
      });
    }

    return bot.sendMessage(chatId, "📚 Yaratilgan testlaringiz:", {
      reply_markup: {
        inline_keyboard: [
          ...tests.map((test, index) => [
            {
              text: `${index + 1}. ${getTestName(test)}`,
              callback_data: `test:show:${getTestId(test)}`,
            },
          ]),
          [{ text: "⬅️ Orqaga", callback_data: "test:back" }],
        ],
      },
    });
  } catch {
    return bot.sendMessage(chatId, "❌ Testlaringizni olishda xatolik yuz berdi.");
  }
}

async function sendTestDetails(chatId, userId, testId) {
  try {
    const test = await getTestById(testId, userId);
    if (!isUserTest(test, userId)) {
      throw new Error("Forbidden");
    }

    const id = getTestId(test) || testId;
    const editUrl = buildCreateTestUrl(id, userId);

    return bot.sendMessage(chatId, formatTestDetails(test, id), {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "⛔ Testni tugatish", callback_data: `test:stop:${id}` }],
          [{ text: "✏️ Javobni o'zgartirish", url: editUrl }],
          [{ text: "⬅️ Testlar ro'yxati", callback_data: "test:list" }],
        ],
      },
    });
  } catch {
    return bot.sendMessage(chatId, "❌ Test ma'lumotlarini olishda xatolik yuz berdi.");
  }
}

async function getUserTests(userId) {
  const data = await requestFirstOk([
    { url: `${BACKEND_URL}/test?user_id=${userId}` },
    { url: `${BACKEND_URL}/test?telegram_id=${userId}` },
    { url: `${BACKEND_URL}/test?creator_id=${userId}` },
    { url: `${BACKEND_URL}/tests?user_id=${userId}` },
    { url: `${BACKEND_URL}/user/${userId}/tests` },
  ]);

  return normalizeTests(data)
    .filter((test) => getTestId(test))
    .filter((test) => isUserTest(test, userId));
}

async function getTestById(testId, userId) {
  try {
    return await requestFirstOk([
      { url: `${BACKEND_URL}/test/${testId}` },
      { url: `${BACKEND_URL}/tests/${testId}` },
      { url: `${BACKEND_URL}/user/${testId}` },
    ]);
  } catch {
    const tests = await getUserTests(userId);
    const test = tests.find((item) => String(getTestId(item)) === String(testId));
    if (!test) throw new Error("Test not found");
    return test;
  }
}

async function stopTest(testId, userId) {
  const test = await getTestById(testId, userId);
  if (!isUserTest(test, userId)) {
    throw new Error("Forbidden");
  }

  return requestFirstOk([
    {
      url: `${BACKEND_URL}/test/${testId}`,
      options: {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INACTIVE", active: false, user_id: userId }),
      },
    },
    {
      url: `${BACKEND_URL}/test/${testId}/stop`,
      options: {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      },
    },
    {
      url: `${BACKEND_URL}/test/${testId}/stop`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      },
    },
  ]);
}

async function requestFirstOk(requests) {
  let lastError;

  for (const request of requests) {
    try {
      const response = await fetch(request.url, request.options || {});
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }

      const text = await response.text();
      if (!text) return {};

      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Request failed");
}

function normalizeTests(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.tests)) return data.tests;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (data && typeof data === "object") return [data];
  return [];
}

function getTestId(test) {
  return test?._id || test?.id || test?.test_id;
}

function getTestName(test) {
  return test?.name || test?.title || "Nomsiz test";
}

function getTestAnswers(test) {
  return test?.responce || test?.response || test?.answers || [];
}

function isUserTest(test, userId) {
  const ownerId = test?.user_id || test?.telegram_id || test?.creator_id || test?.owner_id;
  if (!ownerId) return true;
  return String(ownerId) === String(userId);
}

function buildCreateTestUrl(testId, userId) {
  const baseUrl = testId ? `${CREATE_TEST_URL}/${testId}` : CREATE_TEST_URL;
  return `${baseUrl}?telegram_id=${userId}`;
}

function formatTestDetails(test, fallbackId) {
  const id = getTestId(test) || fallbackId;
  const name = getTestName(test);
  const status = test?.status || (test?.active === false ? "INACTIVE" : "ACTIVE");
  const answers = getTestAnswers(test);
  const answersText = Array.isArray(answers) && answers.length
    ? answers.join(", ")
    : "Kiritilmagan";

  return (
    `🧪 *Test ma'lumotlari*\n\n` +
    `ID: \`${id}\`\n` +
    `Nomi: *${name}*\n` +
    `Holati: *${status}*\n` +
    `Javoblar: ${answersText}`
  );
}

async function sendMainMenu(chatId, userId) {
  const ceoKeyboard = [
    [{ text: "📋 Active testlar" }, { text: "⚙️ Sozlamalar" }],
    [{ text: "👑 CEO Panel" }],
  ];

  const adminKeyboard = [
    [{ text: "📋 Active testlar" }],
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
