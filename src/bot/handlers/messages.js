const { t, translations } = require("../../i18n");

const { env } = require("../../config/env");

const { isCEO, isAdmin, isAdminOrCEO } = require("../../utils/roles");

const { getAdminCount } = require("../../store/admin.store");

const { getState, clearState } = require("../../store/state.store");

const { sendTestPanel } = require("../menus/test-menu");

const { sendActiveTests } = require("../actions/active-tests");

const { uploadExcel } = require("../../services/excel.service");

const { getTestById } = require("../../services/test.service");

const { getTestAnswers } = require("../../utils/test");

const { validateResultsExcel } = require("../../utils/excel-validator");

const { sendCreateTest } = require("../actions/create-test");

const MAX_EXCEL_SIZE = 10 * 1024 * 1024;

// Validator xatolarini foydalanuvchiga ko'rsatiladigan matnga o'girish
function formatValidationErrors(chatId, errors, tFn) {
  const shown = errors.slice(0, 10);
  const restCount = errors.length - shown.length;

  const lines = shown.map((err) => {
    switch (err.code) {
      case "excelErrBadCell":
        return tFn(chatId, "excelErrBadCell", { cell: err.cell, value: err.value });
      case "excelErrEmptyCell":
        return tFn(chatId, "excelErrEmptyCell", { cell: err.cell });
      case "excelErrDuplicateName":
        return tFn(chatId, "excelErrDuplicateName", { cell: err.cell, firstRow: err.firstRow });
      case "excelErrFormula":
        return tFn(chatId, "excelErrFormula", { cell: err.cell || "" });
      case "excelErrExtraData":
        return tFn(chatId, "excelErrExtraData", { cell: err.cell || "" });
      case "excelErrHeaderSeq":
        return tFn(chatId, "excelErrHeaderSeq", { cell: err.cell || "" });
      case "excelErrQuestionCount":
        return tFn(chatId, "excelErrQuestionCount", { value: err.value, expected: err.expected });
      case "excelErrMultiSheet":
        return tFn(chatId, "excelErrMultiSheet", { value: err.value });
      default:
        return tFn(chatId, err.code, err);
    }
  });

  if (restCount > 0) {
    lines.push(tFn(chatId, "excelErrMore", { count: restCount }));
  }

  lines.push("\n" + tFn(chatId, "excelErrFormatHint"));

  return lines.join("\n");
}

function getTranslationsForKey(key) {
  return Object.values(translations)
    .map((language) => language[key])
    .filter(Boolean);
}

function registerMessageHandlers(bot) {
  bot.on("message", async (msg) => {
    /*
     * Commands boshqa handlerda.
     * Payment boshqa handlerda.
     */

    if (msg.text?.startsWith("/")) {
      return;
    }

    if (msg.successful_payment) {
      return;
    }

    const chatId = msg.chat.id;

    const userId = msg.from.id;

    const state = getState(userId);

    // ======================
    // EXCEL
    // ======================

    if (state?.type === "awaiting_excel") {
      if (!msg.document) {
        return bot.sendMessage(chatId, t(chatId, "excelOnly"));
      }

      const document = msg.document;

      const filename = document.file_name || "results.xlsx";

      const lowerName = filename.toLowerCase();

      // Faqat .xlsx qabul qilinadi (.xls emas)
      if (!lowerName.endsWith(".xlsx")) {
        return bot.sendMessage(chatId, t(chatId, "excelErrNotXlsx"));
      }

      if (document.file_size && document.file_size > MAX_EXCEL_SIZE) {
        return bot.sendMessage(chatId, t(chatId, "excelFileTooLarge"));
      }

      try {
        // Ownership tekshiruvi + savol sonini olish
        const test = await getTestById(state.testId, userId);
        const expectedQuestionCount = getTestAnswers(test).length;

        const fileLink = await bot.getFileLink(document.file_id);

        const response = await fetch(fileLink);

        if (!response.ok) {
          throw new Error(`Telegram file download error: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();

        const buffer = Buffer.from(arrayBuffer);

        // Fayl tarkibini tekshirish
        const validation = await validateResultsExcel(buffer, {
          filename,
          expectedQuestionCount,
        });

        if (!validation.ok) {
          const msg = formatValidationErrors(chatId, validation.errors, t);
          // State saqlanadi — foydalanuvchi tuzatib qayta yuborishi mumkin
          return bot.sendMessage(chatId, msg);
        }

        // Tekshiruvdan o'tdi — backendga yuborish
        await bot.sendMessage(
          chatId,
          t(chatId, "excelValidated", {
            questions: validation.stats.questions,
            students: validation.stats.students,
          }),
        );

        await uploadExcel({
          buffer,
          filename,
          testId: state.testId,
          userId,
        });

        clearState(userId);

        return bot.sendMessage(chatId, t(chatId, "excelSuccess"));
      } catch (error) {
        console.error("Excel handler error:", error);

        if (error.status) {
          return bot.sendMessage(
            chatId,
            t(chatId, "excelServerError", {
              status: error.status,
            }),
          );
        }

        return bot.sendMessage(chatId, t(chatId, "excelUploadError"));
      }
    }

    if (!msg.text) {
      return;
    }

    const text = msg.text.trim();

    // ======================
    // TEST
    // ======================

    const makeTest = getTranslationsForKey("btnMakeTest");

    if (makeTest.includes(text)) {
      return sendCreateTest(bot, chatId, userId);
    }

    const activeTests = getTranslationsForKey("btnActiveTests");

    if (activeTests.includes(text)) {
      return sendActiveTests(bot, chatId);
    }

    // ======================
    // RESULTS
    // ======================

    const results = getTranslationsForKey("btnMyResults");

    if (results.includes(text)) {
      return bot.sendMessage(chatId, t(chatId, "goToSiteResults"), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: t(chatId, "btnGoSite"),

                web_app: {
                  url: env.SITE_URL,
                },
              },
            ],
          ],
        },
      });
    }

    // ======================
    // CERTIFICATE
    // ======================

    const certificates = [
      ...getTranslationsForKey("btnCertificates"),

      ...getTranslationsForKey("btnCertificatesAlt"),
    ];

    if (certificates.includes(text)) {
      return bot.sendMessage(chatId, t(chatId, "goToSiteCertificates"), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: t(chatId, "btnGoSite"),

                web_app: {
                  url: env.SITE_URL,
                },
              },
            ],
          ],
        },
      });
    }

    // ======================
    // SETTINGS
    // ======================

    const settings = getTranslationsForKey("btnSettings");

    if (settings.includes(text)) {
      return bot.sendMessage(chatId, t(chatId, "settingsText"), {
        parse_mode: "Markdown",
      });
    }

    // ======================
    // CEO / ADMIN PANEL
    // ======================

    const panelButtons = [
      ...getTranslationsForKey("btnCeoPanel"),

      ...getTranslationsForKey("btnAdminPanel"),
    ];

    if (panelButtons.includes(text)) {
      if (!isAdminOrCEO(userId)) {
        return;
      }

      const message = isCEO(userId)
        ? t(chatId, "ceoPanelText", {
            count: getAdminCount(),
          })
        : t(chatId, "adminPanelText");

      return bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
      });
    }
  });
}

module.exports = registerMessageHandlers;
