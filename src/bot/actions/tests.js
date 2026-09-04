const { t } = require("../../i18n");

const {
  getUserTests,
  getTestById,
  getSubmissionCount,
} = require("../../services/test.service");

const { getTestId, getTestName } = require("../../utils/test");

const { buildCreateTestUrl } = require("../../utils/urls");

const { formatTestDetails } = require("../helpers/test-message");

async function sendUserTests(bot, chatId, userId) {
  try {
    const tests = await getUserTests(userId);

    if (!tests.length) {
      return bot.sendMessage(chatId, t(chatId, "noUserTests"), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: t(chatId, "btnNewTest"),
                callback_data: "test:new",
              },
            ],
          ],
        },
      });
    }

    return bot.sendMessage(chatId, t(chatId, "myTestsTitle"), {
      parse_mode: "Markdown",

      reply_markup: {
        inline_keyboard: [
          ...tests.map((test, index) => [
            {
              text: `${index + 1}. ${getTestName(test)}`,
              callback_data: `test:show:${getTestId(test)}`,
            },
          ]),

          [
            {
              text: t(chatId, "btnBack"),
              callback_data: "test:back",
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.error("getUserTests error:", error);

    return bot.sendMessage(chatId, t(chatId, "fetchUserTestsError"));
  }
}

async function sendTestDetails(bot, chatId, userId, testId) {
  try {
    const test = await getTestById(testId, userId);

    const id = getTestId(test) || testId;

    const submissionCount = await getSubmissionCount(id);

    const editUrl = buildCreateTestUrl(id);

    return bot.sendMessage(
      chatId,
      formatTestDetails(chatId, test, id, submissionCount),
      {
        parse_mode: "Markdown",

        reply_markup: {
          inline_keyboard: [
            [
              {
                text: t(chatId, "btnStopTest"),

                callback_data: `test:stop:${id}`,
              },
            ],
            [
              {
                text: "📜 Send certificate",
                callback_data: `test:certificate:${testId}`,
              },
            ],

            [
              {
                text: t(chatId, "btnEditAnswer"),

                web_app: {
                  url: editUrl,
                },
              },
            ],

            [
              {
                text: t(chatId, "btnSendExcel"),

                callback_data: `test:excel:${id}`,
              },
            ],

            [
              {
                text: t(chatId, "btnTestsList"),

                callback_data: "test:list",
              },
            ],
          ],
        },
      },
    );
  } catch (error) {
    console.error("sendTestDetails error:", error);

    return bot.sendMessage(chatId, t(chatId, "fetchTestDetailsError"));
  }
}

module.exports = {
  sendUserTests,
  sendTestDetails,
};
