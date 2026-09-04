const requiredEnvVariables = ["BOT_TOKEN", "CEO_ID", "BACKEND_URL", "SITE_URL"];

function validateEnv() {
  const missing = requiredEnvVariables.filter(
    (key) => !process.env[key]?.trim(),
  );

  if (missing.length) {
    throw new Error(`.env ichida qiymat topilmadi: ${missing.join(", ")}`);
  }

  if (Number.isNaN(Number(process.env.CEO_ID))) {
    throw new Error("CEO_ID raqam bo'lishi kerak");
  }

  try {
    new URL(process.env.BACKEND_URL);
  } catch {
    throw new Error("BACKEND_URL noto'g'ri URL");
  }

  try {
    new URL(process.env.SITE_URL);
  } catch {
    throw new Error("SITE_URL noto'g'ri URL");
  }
}

function normalizeUrl(value) {
  return value?.trim().replace(/\/+$/, "");
}

const env = {
  BOT_TOKEN: process.env.BOT_TOKEN,

  CEO_ID: Number(process.env.CEO_ID),

  BACKEND_URL: normalizeUrl(process.env.BACKEND_URL),

  SITE_URL: normalizeUrl(process.env.SITE_URL),

  CHANNEL_ID: process.env.CHANNEL_ID || null,

  CHANNEL_URL: process.env.CHANNEL_URL || null,

  NODE_ENV: process.env.NODE_ENV || "development",
  DEFAULT_ADMINS: (process.env.DEFAULT_ADMINS || "")
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isSafeInteger(id)),
};

module.exports = {
  env,
  validateEnv,
};
