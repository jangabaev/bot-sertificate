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

function getStudents(result) {
  if (Array.isArray(result?.students)) {
    return result.students;
  }

  if (Array.isArray(result?.results)) {
    return result.results;
  }

  if (Array.isArray(result?.data)) {
    return result.data;
  }

  return [];
}

function formatStopResult(chatId, result, testName) {
  const students = getStudents(result);

  const total = students.length;

  let text = t(chatId, "testFinished");

  text += t(chatId, "testLabel", {
    name: escapeMarkdown(testName),
  });

  text += t(chatId, "totalParticipants", {
    count: total,
  });

  text += t(chatId, "gradeDistribution");

  for (const grade of GRADE_ORDER) {
    const count = students.filter(
      (student) => String(student.grade || student.degree) === grade,
    ).length;

    const percent = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";

    text +=
      `${GRADE_EMOJIS[grade]} ` +
      `*${grade}*: ` +
      `${count} ` +
      `(${percent}%)\n`;

    text += `${buildProgressBar(Number(percent))}\n`;
  }

  const delivered =
    result?.delivered ?? result?.sent ?? result?.success_count ?? 0;

  const failed = result?.failed ?? result?.failed_count ?? 0;

  text += t(chatId, "delivered", {
    count: delivered,
  });

  if (failed > 0) {
    text += t(chatId, "deliveryFailed", {
      count: failed,
    });
  }

  const top5 = [...students]
    .sort(
      (a, b) =>
        Number(b.total_ball ?? b.score ?? 0) -
        Number(a.total_ball ?? a.score ?? 0),
    )
    .slice(0, 5);

  if (top5.length) {
    text += t(chatId, "top5Title");

    top5.forEach((student, index) => {
      const name = escapeMarkdown(
        student.name || student.full_name || student.fio || "Noma'lum",
      );

      const score = Number(student.total_ball ?? student.score ?? 0);

      text += `${index + 1}. ` + `${name} — ` + `*${score}%*\n`;
    });
  }

  return text;
}

module.exports = {
  formatStopResult,
  getStudents,
};
