const { sendTestPanel } = require("../menus/test-menu");

const { handleStopTest } = require("../actions/stop-test");

const { sendUserTests, sendTestDetails } = require("../actions/tests");

const { sendCreateTest } = require("../actions/create-test");

const { sendCertificate } = require("../../services/test.service");

const { stopTest, getTestById } = require("../../services/test.service");

const { safeAnswer } = require("./safe-answer");

const { setState } = require("../../store/state.store");

async function handleTestCallback(bot, query) {
  const data = query.data;

  if (!data.startsWith("test:")) {
    return false;
  }

  const chatId = query.message.chat.id;

  const userId = query.from.id;

  await safeAnswer(bot, query.id);

  if (data === "test:new") {
    await sendCreateTest(bot, chatId, userId);

    return true;
  }

  if (data === "test:list") {
    await sendUserTests(bot, chatId, userId);

    return true;
  }

  if (data === "test:back") {
    await sendTestPanel(bot, chatId);

    return true;
  }

  if (data.startsWith("test:show:")) {
    const testId = data.split(":")[2];

    await sendTestDetails(bot, chatId, userId, testId);

    return true;
  }

  if (data.startsWith("test:stop:")) {
    const testId = data.split(":")[2];

    await handleStopTest(bot, chatId, userId, testId);

    return true;
  }

  if (data.startsWith("test:excel:")) {
    const testId = data.split(":")[2];

    try {
      await getTestById(testId, userId);

      setState(userId, {
        type: "awaiting_excel",

        testId,
      });

      await bot.sendMessage(chatId, "📊 Excel faylni yuboring.");
    } catch {
      await bot.sendMessage(chatId, "❌ Bu test uchun ruxsat yo'q.");
    }

    return true;
  }

  if (data.startsWith("test:certificate:")) {
    const examId = data.split(":")[2];

    try {
      await safeAnswer(bot, query.id, "Sertifikat yuborilmoqda...");

      await sendCertificate(examId);

      await bot.sendMessage(
        chatId,
        "✅ Sertifikatlar muvaffaqiyatli yuborildi.",
      );
    } catch (error) {
      console.error("Send certificate error:", error);

      await bot.sendMessage(
        chatId,
        "❌ Sertifikatlarni yuborishda xatolik yuz berdi.",
      );
    }

    return true;
  }

  return false;
}

module.exports = {
  handleTestCallback,
};
