const { t } = require("../../i18n");

const {
  getTestName,
  getTestStatus,
  getTestAnswers,
} = require("../../utils/test");

const { escapeMarkdown } = require("../../utils/markdown");

function formatTestDetails(chatId, test, testId, submissions = 0) {
  const name = escapeMarkdown(getTestName(test));

  const status = escapeMarkdown(getTestStatus(test));

  const answers = getTestAnswers(test);

  const answersText = answers.length
    ? answers.map((answer) => escapeMarkdown(answer)).join(", ")
    : t(chatId, "answersNotEntered");

  return (
    t(chatId, "testDetailsTitle") +
    `🆔 *${t(chatId, "labelId")}:* ${testId}\n` +
    `📝 *${t(chatId, "labelName")}:* ${name}\n` +
    `📌 *${t(chatId, "labelStatus")}:* ${status}\n` +
    `✅ *${t(chatId, "labelAnswers")}:* ${answersText}\n` +
    `👥 *${t(chatId, "labelSubmissions")}:* ${submissions}`
  );
}

module.exports = {
  formatTestDetails,
};
