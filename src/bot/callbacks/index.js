const { handleSubscriptionCallback } = require("./subscription.callback");

const { handleLanguageCallback } = require("./language.callback");

const { handleTestCallback } = require("./test.callback");

function registerCallbacks(bot) {
  bot.on("callback_query", async (query) => {
    try {
      if (await handleSubscriptionCallback(bot, query)) {
        return;
      }

      if (await handleLanguageCallback(bot, query)) {
        return;
      }

      if (await handleTestCallback(bot, query)) {
        return;
      }
    } catch (error) {
      console.error("Callback error:", error);
    }
  });
}

module.exports = registerCallbacks;
