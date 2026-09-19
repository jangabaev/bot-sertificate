const { sendTestPanel } = require("../menus/test-menu");

const { handleStopTest } = require("../actions/stop-test");

const { sendUserTests, sendTestDetails } = require("../actions/tests");

const { sendCreateTest } = require("../actions/create-test");

const {
  startCertificateDelivery,
  getCertificateDeliveryStatus,
} = require("../../services/certificate.service");

const { setTestPending } = require("../../services/test.service");

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
      await safeAnswer(bot, query.id, "Sertifikat yuborish boshlandi...");

      const result = await startCertificateDelivery(examId);

      await bot.sendMessage(
        chatId,
        `🚀 Sertifikat yuborish boshlandi!\n\n` +
          `👥 Jami: ${result.total ?? 0}\n` +
          `📨 Yuborildi: ${result.sent_count ?? 0}\n\n` +
          `Sertifikatlar fonda yuboriladi.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📊 Yuborish holati",
                  callback_data: `test:certificate-status:${examId}`,
                },
              ],
            ],
          },
        },
      );
    } catch (error) {
      console.error("Send certificate error:", error);

      await bot.sendMessage(
        chatId,
        `❌ Sertifikatlarni yuborishni boshlashda xatolik:\n${error.message}`,
      );
    }

    return true;
  }

  if (data.startsWith("test:pending:")) {
    const testId = data.split(":")[2];

    try {
      await bot.answerCallbackQuery(query.id);

      await setTestPending(testId);

      await bot.sendMessage(
        chatId,
        "⏰ Vaqt tugadi. Test statusi PENDING holatiga o'tkazildi.",
      );
    } catch (error) {
      console.error("Set pending error:", error);

      await bot.sendMessage(
        chatId,
        "❌ Test statusini PENDING qilishda xatolik yuz berdi.",
      );
    }

    return true;
  }

  if (data.startsWith("test:certificate-status:")) {
    const examId = data.split(":")[2];

    try {
      const status = await getCertificateDeliveryStatus(examId);

      const total = Number(status.total ?? 0);
      const sent = Number(status.sent_count ?? 0);
      const failed = Number(status.failed_count ?? 0);
      const pending = Number(status.pending ?? 0);

      const completed = sent + failed;

      const percent = total > 0 ? Math.floor((completed / total) * 100) : 0;

      await bot.sendMessage(
        chatId,
        `📨 *Sertifikat yuborish holati*\n\n` +
          `👥 Jami: *${total}*\n` +
          `✅ Yuborildi: *${sent}*\n` +
          `❌ Xato: *${failed}*\n` +
          `⏳ Qolgan: *${pending}*\n\n` +
          `📊 Progress: *${percent}%*`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔄 Yangilash",
                  callback_data: `test:certificate-status:${examId}`,
                },
              ],
            ],
          },
        },
      );
    } catch (error) {
      if (error.status === 409) {
        await bot.sendMessage(chatId, "⏳ Sertifikatlar hozir yuborilmoqda.");

        return true;

        // boshqa error
      }
      console.error("Certificate status error:", error);

      await bot.sendMessage(chatId, "❌ Sertifikat holatini olishda xatolik.");
    }

    return true;
  }
  return false;
}

module.exports = {
  handleTestCallback,
};
