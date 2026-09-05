const { env } = require("../config/env");

function buildCreateTestUrl(telegramId, examId = null) {
  if (!telegramId) {
    throw new Error("telegramId kerak");
  }

  const pathname = examId
    ? `/createtest/${encodeURIComponent(
        telegramId,
      )}/${encodeURIComponent(examId)}`
    : `/createtest/${encodeURIComponent(telegramId)}`;

  return new URL(pathname, `${env.SITE_URL}/`).toString();
}

function getSiteUrl(path = "/") {
  return new URL(path, `${env.SITE_URL}/`).toString();
}

module.exports = {
  buildCreateTestUrl,
  getSiteUrl,
};
