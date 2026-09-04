async function safeAnswer(bot, queryId, options = {}) {
  try {
    await bot.answerCallbackQuery(queryId, options);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("answerCallbackQuery:", error.message);
    }
  }
}

module.exports = {
  safeAnswer,
};
