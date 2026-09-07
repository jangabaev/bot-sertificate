const { t } = require("../../i18n");
const { escapeMarkdown } = require("../../utils/markdown");
const { GRADE_ORDER, buildProgressBar } = require("../../excel/results");

const GRADE_EMOJIS = {
  "A+": "🏆",
  A: "🥇",
  "B+": "🥈",
  B: "🥉",
  "C+": "🟢",
  C: "🟡",
  NC: "🔴",
};

function formatStopResult(chatId, result, testName) {
  const gradeStats = result?.grade_stats ?? {};
  const total = Number(result?.new_students.length ?? 0);

  let text = t(chatId, "testFinished");

  text += t(chatId, "testLabel", {
    name: escapeMarkdown(testName),
  });

  text += t(chatId, "totalParticipants", {
    count: total,
  });

  text += t(chatId, "gradeDistribution");

  for (const grade of GRADE_ORDER) {
    const count = Number(gradeStats[grade] ?? 0);

    const percent = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";

    text +=
      `${GRADE_EMOJIS[grade]} ` + `*${grade}*: ` + `${count} (${percent}%)\n`;

    text += `${buildProgressBar(Number(percent))}\n`;
  }

  const delivered = Number(result?.delivered ?? 0);
  const failed = Number(result?.failed ?? 0);

  text += t(chatId, "delivered", {
    count: delivered,
  });

  if (failed > 0) {
    text += t(chatId, "deliveryFailed", {
      count: failed,
    });
  }

  return text;
}

module.exports = {
  formatStopResult,
};
