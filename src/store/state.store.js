const states = new Map();

function setState(userId, state) {
  states.set(String(userId), {
    ...state,
    createdAt: Date.now(),
  });
}

function getState(userId) {
  return states.get(String(userId)) || null;
}

function clearState(userId) {
  states.delete(String(userId));
}

function hasState(userId) {
  return states.has(String(userId));
}

/*
 * 30 minutdan eski
 * vaqtinchalik statelarni
 * tozalaydi.
 */
function cleanupStates() {
  const MAX_AGE = 30 * 60 * 1000;

  const now = Date.now();

  for (const [userId, state] of states) {
    if (now - state.createdAt > MAX_AGE) {
      states.delete(userId);
    }
  }
}

setInterval(cleanupStates, 5 * 60 * 1000).unref();

module.exports = {
  setState,
  getState,
  clearState,
  hasState,
};
