const { handleSubscriptionCallback } = require("./subscription.callback");
const { handleLanguageCallback } = require("./language.callback");
const { handleTestCallback } = require("./test.callback");

function registerCallbacks(bot) {
  bot.on("callback_query", async (query) => {
    try {
      const data = query.data;
      if (!data) return;

      console.log(`📥 Kelgan callback data: "${data}"`); // Tekshirish uchun qulay log

      // 1. Agar tugma kodi "test:" bilan boshlansa, to'g'ri test fayliga yuborish
      if (data.startsWith("test:")) {
        console.log("-> Test handleriga yo'naltirildi");
        await handleTestCallback(bot, query);
        return;
      }

      // 2. Agar tugma kodi "lang:" (yoki tilga tegishli) bo'lsa, til fayliga yuborish
      if (data.startsWith("lang:") || data.startsWith("language:")) {
        console.log("-> Language handleriga yo'naltirildi");
        await handleLanguageCallback(bot, query);
        return;
      }

      // 3. Agar obunaga tegishli bo'lsa (masalan "sub:") obuna fayliga yuborish
      if (data.startsWith("sub:") || data.startsWith("subscription:")) {
        console.log("-> Subscription handleriga yo'naltirildi");
        await handleSubscriptionCallback(bot, query);
        return;
      }

      // 4. Agar yuqoridagi qoidalarga tushmasa, eski uslubda tekshirib ko'rish
      console.log(
        "-> Hech qaysi prefiksga tushmadi, umumiy zanjirdan o'tkazilmoqda...",
      );
      if (await handleSubscriptionCallback(bot, query)) return;
      if (await handleLanguageCallback(bot, query)) return;
      if (await handleTestCallback(bot, query)) return;
    } catch (error) {
      console.error("❌ Callback error:", error);
    }
  });
}

module.exports = registerCallbacks;
