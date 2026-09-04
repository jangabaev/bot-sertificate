const { env } = require("../config/env");

async function request(path, options = {}) {
  const url = `${env.BACKEND_URL}${path}`;

  const config = {
    method: options.method || "GET",
    headers: {
      ...(options.body && {
        "Content-Type": "application/json",
      }),
      ...options.headers,
    },
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  let response;

  try {
    response = await fetch(url, config);
  } catch (error) {
    throw new Error(`Backend bilan bog'lanib bo'lmadi: ${error.message}`);
  }

  const text = await response.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const error = new Error(
      data?.message || `Backend error: ${response.status}`,
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

function get(path, options = {}) {
  return request(path, {
    ...options,
    method: "GET",
  });
}

function post(path, body, options = {}) {
  return request(path, {
    ...options,
    method: "POST",
    body,
  });
}

function patch(path, body, options = {}) {
  return request(path, {
    ...options,
    method: "PATCH",
    body,
  });
}

function remove(path, options = {}) {
  return request(path, {
    ...options,
    method: "DELETE",
  });
}

module.exports = {
  request,
  get,
  post,
  patch,
  remove,
};
