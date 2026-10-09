const { sendTestPanel } = require("../menus/test-menu");

const { handleStopTest } = require("../actions/stop-test");

const { sendUserTests, sendTestDetails } = require("../actions/tests");

const { sendCreateTest } = require("../actions/create-test");

const {
  startCertificateDelivery,
  getCertificateDeliveryStatus,
} = require("../../services/certificate.service");

const { setTestPending } = require("../../services/test.service");

const { getTestById } = require("../../services/test.service");

const { safeAnswer } = require("./safe-answer");

const { setState } = require("../../store/state.store");

const { t } = require("../../i18n");

const { getTestName } = require("../../utils/test");

const { escapeMarkdown } = require("../../utils/markdown");

// Bir vaqtda ikki marta bosilishdan himoya: "stop:<testId>" yoki "pending:<testId>"
const inProgress = new Set();

async function handleTestCallback(bot, query) {
  const data = query.data;

  if (!data.startsWith("test:")) {
    return false;
  }

  const chatId = query.message.chat.id;

  const userId = query.from.id;

  await safeAnswer(bot, query.id);

  if (data === "test:new") {
    try {
      await sendCreateTest(bot, chatId, userId);
    } catch (error) {
      console.error("sendCreateTest error:", error.message);
      await bot.sendMessage(
        chatId,
        "❌ Backend so'rovida xatolik: " + error.message,
      );
    }
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

  // test:stop-yes: AVVAL, keyin test:stop: (aralashmaslik uchun)
  if (data.startsWith("test:stop-yes:")) {
    const testId = data.split(":")[2];
    const progressKey = `stop:${testId}`;

    if (inProgress.has(progressKey)) {
      return true;
    }

    inProgress.add(progressKey);

    // Tasdiqlash xabaridagi tugmalarni olib tashla
    try {
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: query.message.message_id },
      );
    } catch { /* Xabar o'chirilgan yoki muddati o'tgan bo'lishi mumkin */ }

    try {
      await getTestById(testId, userId);
      await handleStopTest(bot, chatId, userId, testId);
    } catch (error) {
      console.error("stop-yes error:", error);
      if (error.status === 403 || error.status === 404) {
        await bot.sendMessage(chatId, t(chatId, "testNoPermission"));
      } else {
        await bot.sendMessage(chatId, t(chatId, "stopTestError"));
      }
    } finally {
      inProgress.delete(progressKey);
    }

    return true;
  }

  if (data.startsWith("test:stop:")) {
    const testId = data.split(":")[2];

    try {
      const test = await getTestById(testId, userId);
      const testName = escapeMarkdown(getTestName(test));

      await bot.sendMessage(
        chatId,
        t(chatId, "confirmStopTitle", { name: testName }),
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: t(chatId, "btnConfirmStopYes"),
                  callback_data: `test:stop-yes:${testId}`,
                },
                {
                  text: t(chatId, "btnConfirmNo"),
                  callback_data: `test:cancel:${testId}`,
                },
              ],
            ],
          },
        },
      );
    } catch (error) {
      console.error("stop confirm error:", error);
      await bot.sendMessage(chatId, t(chatId, "testNoPermission"));
    }

    return true;
  }

  // test:pending-yes: AVVAL, keyin test:pending:
  if (data.startsWith("test:pending-yes:")) {
    const testId = data.split(":")[2];
    const progressKey = `pending:${testId}`;

    if (inProgress.has(progressKey)) {
      return true;
    }

    inProgress.add(progressKey);

    try {
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: query.message.message_id },
      );
    } catch { /* ignore */ }

    try {
      await getTestById(testId, userId);
      await setTestPending(testId);
      await bot.sendMessage(chatId, t(chatId, "pendingSuccess"));
    } catch (error) {
      console.error("pending-yes error:", error);
      if (error.status === 403 || error.status === 404) {
        await bot.sendMessage(chatId, t(chatId, "testNoPermission"));
      } else {
        await bot.sendMessage(chatId, t(chatId, "pendingError"));
      }
    } finally {
      inProgress.delete(progressKey);
    }

    return true;
  }

  if (data.startsWith("test:pending:")) {
    const testId = data.split(":")[2];

    try {
      const test = await getTestById(testId, userId);
      const testName = escapeMarkdown(getTestName(test));

      await bot.sendMessage(
        chatId,
        t(chatId, "confirmPendingTitle", { name: testName }),
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: t(chatId, "btnConfirmYes"),
                  callback_data: `test:pending-yes:${testId}`,
                },
                {
                  text: t(chatId, "btnConfirmNo"),
                  callback_data: `test:cancel:${testId}`,
                },
              ],
            ],
          },
        },
      );
    } catch (error) {
      console.error("pending confirm error:", error);
      await bot.sendMessage(chatId, t(chatId, "testNoPermission"));
    }

    return true;
  }

  if (data.startsWith("test:cancel:")) {
    try {
      await bot.editMessageText(t(chatId, "actionCancelled"), {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: { inline_keyboard: [] },
      });
    } catch { /* ignore */ }
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
      await bot.sendMessage(chatId, t(chatId, "testNoPermission"));
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
