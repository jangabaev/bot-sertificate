const { env } = require("../config/env");

function buildCreateTestUrl(testId = null) {
  const url = new URL(
    testId ? `/createtest/${testId}` : "/createtest",
    env.SITE_URL,
  );

  return url.toString();
}

function getSiteUrl(path = "/") {
  return new URL(path, env.SITE_URL).toString();
}

module.exports = {
  buildCreateTestUrl,
  getSiteUrl,
};
