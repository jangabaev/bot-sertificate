const { env } = require("../config/env");
const adminStore = require("../store/admin.store");

function isCEO(userId) {
  return Number(userId) === env.CEO_ID;
}

function isAdmin(userId) {
  return adminStore.isAdmin(userId);
}

function isAdminOrCEO(userId) {
  return isCEO(userId) || isAdmin(userId);
}

module.exports = {
  isCEO,
  isAdmin,
  isAdminOrCEO,
};
