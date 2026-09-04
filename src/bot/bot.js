const TelegramBot = require("node-telegram-bot-api");

const { env } = require("../config/env");

const bot = new TelegramBot(env.BOT_TOKEN, {
  polling: true,
});

bot.on("polling_error", (error) => {
  console.error("❌ Telegram polling:", error.message);
});

bot.on("webhook_error", (error) => {
  console.error("❌ Telegram webhook:", error.message);
});

module.exports = bot;
