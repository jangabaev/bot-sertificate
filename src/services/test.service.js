const api = require("./api.service");

const { normalizeTests, getTestId, getTestOwnerId } = require("../utils/test");

function assertTestOwner(test, userId) {
  if (!test) {
    const error = new Error("Test topilmadi");
    error.status = 404;
    throw error;
  }

  const ownerId = getTestOwnerId(test);

  if (!ownerId) {
    const error = new Error("Test egasini aniqlab bo'lmadi");

    error.status = 403;

    throw error;
  }

  if (String(ownerId) !== String(userId)) {
    const error = new Error("Bu test sizga tegishli emas");

    error.status = 403;

    throw error;
  }

  return true;
}

async function getUserTests(userId) {
  const data = await api.get(`/test?admin_id=${encodeURIComponent(userId)}`);

  return normalizeTests(data)
    .filter((test) => getTestId(test))
    .filter((test) => {
      const ownerId = getTestOwnerId(test);

      return ownerId && String(ownerId) === String(userId);
    });
}

async function getActiveTests() {
  const data = await api.get("/test?sort_by=ACTIVE");

  return normalizeTests(data).filter((test) => getTestId(test));
}

async function getTestById(testId, userId) {
  const test = await api.get(`/test/${encodeURIComponent(testId)}`);

  assertTestOwner(test, userId);

  return test;
}

async function stopTest(testId, userId) {
  if (!userId) {
    throw new Error("stopTest uchun userId kerak");
  }

  await getTestById(testId, userId);

  console.log("STOP TEST:");
  console.log("testId:", testId);
  console.log("userId:", userId);

  return api.post(
    `/rash/stop/${encodeURIComponent(testId)}`,
    {},
    {
      headers: {
        "user-id": String(userId),
      },
    },
  );
}

async function getSubmissionCount(testId) {
  try {
    const data = await api.get(`/rash/test/${encodeURIComponent(testId)}`);

    if (Array.isArray(data)) {
      return data.length;
    }

    if (Array.isArray(data?.data)) {
      return data.data.length;
    }

    if (typeof data?.count === "number") {
      return data.count;
    }

    if (typeof data?.total === "number") {
      return data.total;
    }

    return 0;
  } catch {
    return 0;
  }
}

async function setTestPending(testId) {
  return api.get(`/test/pennding/${encodeURIComponent(testId)}`);
}

module.exports = {
  getUserTests,
  getActiveTests,
  getTestById,
  stopTest,
  getSubmissionCount,
  assertTestOwner,
  setTestPending,
};
