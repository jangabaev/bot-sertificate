const { env } = require("../config/env");

async function createOrUpdateUser(user) {
  const response = await fetch(`${env.BACKEND_URL}/users`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      user_id: user.id,
      username: user.username || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
    }),
  });

  if (!response.ok) {
    throw new Error(`User API error: ${response.status}`);
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

module.exports = {
  createOrUpdateUser,
};
