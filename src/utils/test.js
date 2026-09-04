function getTestId(test) {
  return test?.id ?? test?._id ?? test?.test_id ?? null;
}

function getTestName(test) {
  return test?.name || test?.title || test?.test_name || "Nomsiz test";
}

function getTestStatus(test) {
  return test?.status || test?.test_status || "unknown";
}

function getTestOwnerId(test) {
  return (
    test?.createdByUserId ??
    test?.user_id ??
    test?.telegram_id ??
    test?.creator_id ??
    test?.owner_id ??
    null
  );
}

function getTestAnswers(test) {
  const answers =
    test?.responce || test?.response || test?.answers || test?.answer;

  if (!answers) {
    return [];
  }

  if (Array.isArray(answers)) {
    return answers;
  }

  if (typeof answers === "string") {
    return answers
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeTests(data) {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  if (Array.isArray(data.tests)) {
    return data.tests;
  }

  if (Array.isArray(data.result)) {
    return data.result;
  }

  return [];
}

module.exports = {
  getTestId,
  getTestName,
  getTestStatus,
  getTestOwnerId,
  getTestAnswers,
  normalizeTests,
};
