const uz = require("./uz");
const ru = require("./ru");
const en = require("./en");

const {
  DEFAULT_LANGUAGE,
  getUserLanguage,
  setUserLanguage,
} = require("../store/language.store");

const translations = {
  uz,
  ru,
  en,
};

const languageNames = {
  uz: "O'zbek tili 🇺🇿",
  ru: "Русский язык 🇷🇺",
  en: "English 🇬🇧",
};

function t(userId, key, variables = {}) {
  const language = getUserLanguage(userId);

  let text =
    translations[language]?.[key] ??
    translations[DEFAULT_LANGUAGE]?.[key] ??
    key;

  return text.replace(/\{(\w+)\}/g, (_, name) => {
    return variables[name] !== undefined ? String(variables[name]) : "";
  });
}

function changeLanguage(userId, language) {
  if (!translations[language]) {
    return false;
  }

  setUserLanguage(userId, language);

  return true;
}

function getLanguageName(language) {
  return languageNames[language] || language;
}

module.exports = {
  t,
  translations,
  languageNames,
  changeLanguage,
  getLanguageName,
};
