const { env } = require("../config/env");

async function isSubscribed(bot, userId) {
  if (!env.CHANNEL_ID) {
    return true;
  }

  const member = await bot.getChatMember(env.CHANNEL_ID, userId);

  return ["member", "administrator", "creator"].includes(member.status);
}

module.exports = {
  isSubscribed,
};
