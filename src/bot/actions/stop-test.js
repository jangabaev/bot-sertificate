const { stopTest, getTestById } = require("../../services/test.service");

const { getTestName } = require("../../utils/test");

const { buildResultsExcel } = require("../../excel/results");

const { formatStopResult } = require("../helpers/result-message");

const { t } = require("../../i18n");

async function handleStopTest(bot, chatId, userId, testId) {
  try {
    const test = await getTestById(testId, userId);

    const testName = getTestName(test);

    const result = await stopTest(testId, userId);

    await bot.sendMessage(chatId, formatStopResult(chatId, result, testName), {
      parse_mode: "Markdown",
    });

    await bot.sendMessage(chatId, t(chatId, "excelSending"));

    try {
      const buffer = await buildResultsExcel(result, testName);

      await bot.sendDocument(
        chatId,
        buffer,
        {
          caption: t(chatId, "resultsCaption", {
            name: testName,
          }),

          parse_mode: "Markdown",
        },
        {
          filename: `results-${testId}.xlsx`,

          contentType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      );
    } catch (error) {
      console.error("Excel build error:", error);

      await bot.sendMessage(chatId, t(chatId, "excelBuildError"));
    }

    return result;
  } catch (error) {
    console.error("Stop test error:", error);

    return bot.sendMessage(chatId, "❌ Testni to'xtatishda xatolik yuz berdi.");
  }
}

module.exports = {
  handleStopTest,
};
