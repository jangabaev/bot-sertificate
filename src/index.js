require("dotenv").config();

const { validateEnv } = require("./config/env");

validateEnv();

const bot = require("./bot/bot");

const registerCommands = require("./bot/commands");
const registerCallbacks = require("./bot/callbacks");
const registerMessageHandlers = require("./bot/handlers/messages");

process.on("unhandledRejection", (error) => {
  const code = error?.response?.body?.error_code;
  if (code === 403) {
    // foydalanuvchi botni bloklagan, e'tibor bermaymiz
    return;
  }
  console.error("❌ Unhandled rejection:", error?.message || error);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
});

async function bootstrap() {
  try {
    await registerCommands(bot);

    registerCallbacks(bot);
    registerMessageHandlers(bot);

    console.log("✅ Telegram bot ishga tushdi");
  } catch (error) {
    console.error("❌ Bot start error:", error);

    process.exit(1);
  }
}

bootstrap();

async function shutdown(signal) {
  console.log(`\n🛑 ${signal}`);

  try {
    await bot.stopPolling();
  } catch (error) {
    console.error("Polling stop error:", error.message);
  }

  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));

process.on("SIGTERM", () => shutdown("SIGTERM"));
