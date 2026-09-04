const DEFAULT_LANGUAGE = "uz";

const languages = new Map();

function setUserLanguage(userId, language) {
  languages.set(String(userId), language);
}

function getUserLanguage(userId) {
  return languages.get(String(userId)) || DEFAULT_LANGUAGE;
}

function removeUserLanguage(userId) {
  languages.delete(String(userId));
}

module.exports = {
  DEFAULT_LANGUAGE,
  setUserLanguage,
  getUserLanguage,
  removeUserLanguage,
};
