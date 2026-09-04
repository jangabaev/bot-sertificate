const { translations } = require("../../i18n");

async function setupCommands(bot) {
  const languages = ["uz", "ru", "en"];

  await bot.setMyCommands([
    {
      command: "start",
      description: translations.uz.cmdStart,
    },
    {
      command: "myid",
      description: translations.uz.cmdMyId,
    },
    {
      command: "test",
      description: translations.uz.cmdTest,
    },
    {
      command: "language",
      description: translations.uz.cmdLanguage,
    },
    {
      command: "help",
      description: translations.uz.cmdHelp,
    },
  ]);

  for (const language of languages) {
    await bot.setMyCommands(
      [
        {
          command: "start",
          description: translations[language].cmdStart,
        },
        {
          command: "myid",
          description: translations[language].cmdMyId,
        },
        {
          command: "test",
          description: translations[language].cmdTest,
        },
        {
          command: "language",
          description: translations[language].cmdLanguage,
        },
        {
          command: "help",
          description: translations[language].cmdHelp,
        },
      ],
      {
        language_code: language,
      },
    );
  }
}

module.exports = {
  setupCommands,
};
