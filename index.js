require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const ExcelJS = require("exceljs");
const FormData = require("form-data");
const { Readable } = require("stream");
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
bot.on("polling_error", () => {});
const CEO_ID = parseInt(process.env.CEO_ID);
const CHANNEL_ID = process.env.CHANNEL_ID;
const BACKEND_URL = process.env.BACKEND_URL;
const SITE_URL = process.env.SITE_URL;
const CREATE_TEST_URL = `${SITE_URL}createtest`;

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
  const subscribed = await checkSubscription(chatId, userId);
  if (!subscribed) return;

  // Backendga registratsiya


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

async function safeAnswer(queryId, opts = {}) {
  try {
    await bot.answerCallbackQuery(queryId, opts);
  } catch {
    // query muddati o'tgan bo'lsa jim o'tkazib yuboramiz
  }
}

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
        await safeAnswer(query.id, { text: "✅ Muvaffaqiyatli tekshirildi!" });
        await bot.deleteMessage(chatId, messageId);
        await sendMainMenu(chatId, userId);
      } else {
        await safeAnswer(query.id, {
          text: "❌ Siz hali kanalga a'zo emassiz!",
          show_alert: true,
        });
      }
    } catch {
      await safeAnswer(query.id, {
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
    await safeAnswer(query.id);
    return;
  }

  if (data === "test:new") {
    await safeAnswer(query.id);
    return sendCreateTestInvoice(chatId, userId);
  }

  if (data === "test:list") {
    await safeAnswer(query.id);
    return sendUserTests(chatId, userId);
  }

  if (data === "test:back") {
    await safeAnswer(query.id);
    return sendTestPanel(chatId);
  }

  if (data.startsWith("test:show:")) {
    const testId = data.split(":")[2];
    await safeAnswer(query.id);
    return sendTestDetails(chatId, userId, testId);
  }

  if (data.startsWith("test:stop:")) {
    const testId = data.split(":")[2];
    await safeAnswer(query.id);
    try {
      const test = await getTestById(testId, userId).catch(() => null);
      const result = await stopTest(testId, userId);
      const testName = test ? getTestName(test) : null;
      const creatorId = test?.createdByUserId || test?.user_id || userId;
      await sendStopResults(chatId, result, testName, creatorId);
      return sendTestDetails(chatId, userId, testId);
    } catch {
      await bot.sendMessage(chatId, "❌ Testni to'xtatishda xatolik.");
      return;
    }
  }

  if (data.startsWith("test:excel:")) {
    const testId = data.split(":")[2];
    await safeAnswer(query.id);
    userStates.set(chatId, { step: "awaiting_excel", testId });

    return bot.sendMessage(
      chatId,
      `📊 *Excel orqali student javoblarini yuborish*\n\n` +
      `Excel fayli *quyidagi formatda* bo'lishi kerak:\n\n` +
      `*1-qator (sarlavha):*\n` +
      `\`Ism | 1 | 2 | 3 | 4 | ... | N\`\n\n` +
      `*2-qatordan boshlab (har bir student):*\n` +
      `\`Ali Valiyev | 1 | 0 | 1 | 1 | ... \`\n` +
      `\`Vali Aliyev | 0 | 1 | 1 | 0 | ... \`\n\n` +
      `📌 *Qoidalar:*\n` +
      `• A ustun: student to'liq ismi\n` +
      `• B, C, D... ustunlar: savol raqamlari (1, 2, 3...)\n` +
      `• Javob to'g'ri bo'lsa: \`1\` yoki \`to'g'ri\`\n` +
      `• Javob noto'g'ri bo'lsa: \`0\` yoki boshqa qiymat\n\n` +
      `Faylni tayyorlagandan so'ng shu yerga yuboring (.xlsx formatda)`,
      { parse_mode: "Markdown" }
    );
  }

  await safeAnswer(query.id);
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

  // Excel fayl qabul qilish
  if (msg.document) {
    const state = userStates.get(chatId);
    if (state?.step === "awaiting_excel") {
      const doc = msg.document;
      console.log(doc)
      const isExcel =
        doc.mime_type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        doc.mime_type === "application/vnd.ms-excel" ||
        doc.file_name?.endsWith(".xlsx") ||
        doc.file_name?.endsWith(".xls");

      if (!isExcel) {
        return bot.sendMessage(chatId, "❌ Faqat Excel fayl (.xlsx yoki .xls) qabul qilinadi. Qaytadan yuboring.");
      }

      userStates.delete(chatId);

      try {
        const fileLink = await bot.getFileLink(doc.file_id);
        const fileRes = await fetch(fileLink);
        const fileBuffer = await fileRes.arrayBuffer();

        const buf = Buffer.from(fileBuffer);
        const form = new FormData();
        form.append("file", buf, {
          filename: doc.file_name || "answers.xlsx",
          contentType: doc.mime_type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          knownLength: buf.length,
        });
        form.append("test_id", String(state.testId));
        form.append("user_id", String(userId));

        // form'ni avval to'liq buffer'ga o'giramiz — Content-Length aniq bo'lsin
        const formBuffer = await new Promise((resolve, reject) => {
          form.getLength((err, length) => {
            if (err) return reject(err);
            const chunks = [];
            form.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            form.on("end", () => resolve({ buf: Buffer.concat(chunks), length }));
            form.on("error", reject);
            form.resume();
          });
        });

        const uploadRes = await fetch(
          `${BACKEND_URL}/test/import-excel`,
          {
            method: "POST",
            body: formBuffer.buf,
            headers: {
              ...form.getHeaders(),
              "Content-Length": String(formBuffer.length),
            },
          }
        );

        if (uploadRes.ok || uploadRes.status === 201) {
          return bot.sendMessage(chatId, "✅ Excel fayl muvaffaqiyatli yuborildi! Natijalar tez orada qayta ishlanadi.");
        } else {
          const errText = await uploadRes.text().catch(() => "");
          return bot.sendMessage(chatId, `❌ Server xatolik qaytardi (${uploadRes.status}).${errText ? "\n" + errText : ""}`);
        }
      } catch (err) {
        console.error("EXCEL UPLOAD ERROR:", err);
        return bot.sendMessage(chatId, "❌ Faylni yuborishda xatolik yuz berdi. Qaytadan urinib ko'ring.");
      }
    }
    return;
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
    const submissionCount = await getSubmissionCount(id);

    return bot.sendMessage(chatId, formatTestDetails(test, id, submissionCount), {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "⛔ Testni tugatish", callback_data: `test:stop:${id}` }],
          [{ text: "✏️ Javobni o'zgartirish", url: editUrl }],
          [{ text: "📊 Excel orqali javob yuborish", callback_data: `test:excel:${id}` }],
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
  const response = await fetch(`${BACKEND_URL}/rash/stop/${testId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "user_id": String(userId),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
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

async function sendStopResults(chatId, result, testName, creatorUserId) {
  if (!result || typeof result !== "object") return;

  const gradeStats = result.grade_stats;
  const newStudents = result.new_students;
  const delivery = result.delivery;

  if (!gradeStats && !newStudents) return;

  const gradeOrder = ["A+", "A", "B+", "B", "C+", "C", "NC"];
  const gradeEmoji = { "A+": "🥇", "A": "🥈", "B+": "🏅", "B": "🎖️", "C+": "📗", "C": "📘", "NC": "❌" };

  const totalParticipants =
    result.total ||
    (gradeStats ? Object.values(gradeStats).reduce((a, b) => a + b, 0) : 0);

  // ── Xabar matni ──────────────────────────────────────────────────
  let text = `📊 *Test yakunlandi!*\n`;
  if (testName) text += `📝 Test: *${testName}*\n`;
  text += `👥 Jami qatnashdi: *${totalParticipants} ta*\n\n`;

  if (gradeStats) {
    text += `📈 *Baholar taqsimoti:*\n`;
    for (const grade of gradeOrder) {
      if (gradeStats[grade] !== undefined) {
        const count = gradeStats[grade];
        const pct = totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0;
        const filled = Math.round(pct / 10);
        const bar = "█".repeat(filled) + "░".repeat(10 - filled);
        text += `${gradeEmoji[grade]} *${grade}*: ${count} ta (${pct}%) \`${bar}\`\n`;
      }
    }
  }

  if (delivery) {
    text += `\n📬 Yuborildi: *${delivery.sent_count || 0}*`;
    if (delivery.failed_students?.length > 0)
      text += ` | ❌ Xato: *${delivery.failed_students.length}*`;
    text += "\n";
  }

  if (Array.isArray(newStudents) && newStudents.length > 0) {
    const top5 = [...newStudents]
      .sort((a, b) => (b.total_ball || 0) - (a.total_ball || 0))
      .slice(0, 5);
    text += `\n🏆 *Top 5:*\n`;
    top5.forEach((s, i) => {
      const medal = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i];
      text += `${medal} ${s.name} — ${gradeEmoji[s.degree] || ""}*${s.degree}* (${(s.total_ball || 0).toFixed(1)}%)\n`;
    });
  }

  text += `\n📎 Excel natijalar fayli yuborilmoqda...`;
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });

  // ── Excel fayl xotirada yaratish ──────────────────────────────────
  try {
    const buffer = await buildResultsExcel(result, testName);
    const target = creatorUserId || chatId;
    const filename = `natijalar_${(testName || "test").replace(/\s+/g, "_")}_${Date.now()}.xlsx`;

    const stream = Readable.from(buffer);
    stream.path = filename;

    await bot.sendDocument(
      target,
      stream,
      { caption: `📊 *${testName || "Test"}* natijalari`, parse_mode: "Markdown" },
      { filename, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    );
  } catch (err) {
    await bot.sendMessage(chatId, "⚠️ Excel faylni yaratishda xatolik yuz berdi.");
  }
}

async function buildResultsExcel(result, testName) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Test Bot";
  workbook.created = new Date();

  const gradeOrder = ["A+", "A", "B+", "B", "C+", "C", "NC"];
  const gradeColors = {
    "A+": "FF2E7D32", "A": "FF388E3C", "B+": "FF1565C0", "B": "FF1976D2",
    "C+": "FFEF6C00", "C": "FFF57C00", "NC": "FFC62828",
  };

  // ── 1-varaq: Talabalar natijalari ─────────────────────────────────
  const sheet1 = workbook.addWorksheet("Natijalar", { views: [{ state: "frozen", ySplit: 1 }] });

  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1565C0" } };
  const headerFont = { color: { argb: "FFFFFFFF" }, bold: true, size: 12 };
  const borderStyle = { style: "thin", color: { argb: "FFBDBDBD" } };
  const allBorders = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };

  sheet1.columns = [
    { header: "№", key: "num", width: 6 },
    { header: "Ism Familiya", key: "name", width: 28 },
    { header: "Baho", key: "degree", width: 10 },
    { header: "Ball (%)", key: "ball", width: 12 },
    { header: "To'g'ri", key: "correct", width: 10 },
    { header: "Noto'g'ri", key: "incorrect", width: 12 },
    { header: "User ID", key: "user_id", width: 28 },
  ];

  // Header styling
  sheet1.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = allBorders;
  });
  sheet1.getRow(1).height = 22;

  const students = Array.isArray(result.new_students) ? result.new_students : [];
  const sorted = [...students].sort((a, b) => (b.total_ball || 0) - (a.total_ball || 0));

  sorted.forEach((s, i) => {
    const row = sheet1.addRow({
      num: i + 1,
      name: s.name || "",
      degree: s.degree || "",
      ball: parseFloat((s.total_ball || 0).toFixed(2)),
      correct: s.currect !== undefined ? parseFloat(s.currect.toFixed(1)) : "",
      incorrect: s.incorect !== undefined ? parseFloat(s.incorect.toFixed(1)) : "",
      user_id: s.user_id || "",
    });

    row.height = 18;
    const degreeColor = gradeColors[s.degree] || "FF757575";

    row.eachCell((cell) => {
      cell.border = allBorders;
      cell.alignment = { vertical: "middle" };
    });

    // Baho ustunini rangli qilish
    const degreeCell = row.getCell("degree");
    degreeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: degreeColor } };
    degreeCell.font = { color: { argb: "FFFFFFFF" }, bold: true };
    degreeCell.alignment = { horizontal: "center", vertical: "middle" };

    row.getCell("num").alignment = { horizontal: "center", vertical: "middle" };
    row.getCell("ball").alignment = { horizontal: "center", vertical: "middle" };

    // Juft qatorlar uchun och fon
    if (i % 2 === 1) {
      ["num", "name", "ball", "correct", "incorrect", "user_id"].forEach((key) => {
        row.getCell(key).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
      });
    }
  });

  // ── 2-varaq: Statistika ───────────────────────────────────────────
  const sheet2 = workbook.addWorksheet("Statistika");
  const gradeStats = result.grade_stats || {};
  const total = Object.values(gradeStats).reduce((a, b) => a + b, 0);

  // Sarlavha
  sheet2.mergeCells("A1:D1");
  const titleCell = sheet2.getCell("A1");
  titleCell.value = `${testName || "Test"} — Statistika`;
  titleCell.font = { size: 14, bold: true, color: { argb: "FF1565C0" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet2.getRow(1).height = 30;

  sheet2.getRow(3).values = ["Baho", "Soni", "Foizi (%)", "Grafik"];
  sheet2.getRow(3).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = allBorders;
  });
  sheet2.getRow(3).height = 22;

  sheet2.columns = [
    { key: "grade", width: 12 },
    { key: "count", width: 10 },
    { key: "pct", width: 12 },
    { key: "bar", width: 30 },
  ];

  let rowIdx = 4;
  for (const grade of gradeOrder) {
    if (gradeStats[grade] === undefined) continue;
    const count = gradeStats[grade];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    const bar = "■".repeat(Math.round(pct / 5));

    const row = sheet2.getRow(rowIdx);
    row.values = [grade, count, `${pct}%`, bar];
    row.height = 18;

    const color = gradeColors[grade] || "FF757575";
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    row.getCell(1).font = { color: { argb: "FFFFFFFF" }, bold: true };
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.eachCell((cell) => { cell.border = allBorders; });
    rowIdx++;
  }

  // Jami qator
  const totalRow = sheet2.getRow(rowIdx + 1);
  totalRow.values = ["JAMI", total, "100%", ""];
  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEEE" } };
    cell.border = allBorders;
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // Buffer sifatida qaytarish (fayl saqlanmaydi)
  return workbook.xlsx.writeBuffer();
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

async function getSubmissionCount(testId) {
  try {
    const data = await requestFirstOk([
      { url: `${BACKEND_URL}/test/${testId}/submissions/count` },
      { url: `${BACKEND_URL}/test/${testId}/submissions` },
      { url: `${BACKEND_URL}/test/${testId}/results` },
    ]);
    return data?.count ?? data?.total ?? (Array.isArray(data) ? data.length : null);
  } catch {
    return null;
  }
}

function formatTestDetails(test, fallbackId, submissionCount) {
  const id = getTestId(test) || fallbackId;
  const name = getTestName(test);
  const status = test?.status || (test?.active === false ? "INACTIVE" : "ACTIVE");
  const answers = getTestAnswers(test);
  const answersText = Array.isArray(answers) && answers.length
    ? answers.join(", ")
    : "Kiritilmagan";

  const countLine = submissionCount !== null && submissionCount !== undefined
    ? `\n👥 Topshirganlar: *${submissionCount} ta*`
    : "";

  return (
    `🧪 *Test ma'lumotlari*\n\n` +
    `ID: \`${id}\`\n` +
    `Nomi: *${name}*\n` +
    `Holati: *${status}*${countLine}\n` +
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
