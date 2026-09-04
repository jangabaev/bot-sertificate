const { env } = require("../config/env");

async function uploadExcel({ buffer, filename, testId, userId }) {
  const formData = new FormData();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  formData.append("file", blob, filename);
  formData.append("test_id", String(testId));
  formData.append("user_id", String(userId));

  let response;

  try {
    response = await fetch(`${env.BACKEND_URL}/test/import-excel`, {
      method: "POST",

      // BU YERDA headers QO'YMANG
      body: formData,
    });
  } catch (error) {
    throw new Error(`Excel request error: ${error.message}`);
  }

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    const error = new Error(
      data?.message || `Excel upload error: ${response.status}`,
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

module.exports = {
  uploadExcel,
};
