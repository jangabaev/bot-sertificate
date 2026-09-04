const { env } = require("../config/env");

const admins = new Set(env.DEFAULT_ADMINS);

function addAdmin(userId) {
  admins.add(Number(userId));
}

function removeAdmin(userId) {
  admins.delete(Number(userId));
}

function isAdmin(userId) {
  return admins.has(Number(userId));
}

function getAdmins() {
  return Array.from(admins);
}

function getAdminCount() {
  return admins.size;
}

module.exports = {
  addAdmin,
  removeAdmin,
  isAdmin,
  getAdmins,
  getAdminCount,
};
