const MAX_SESSION_TITLE_LENGTH = 200;

function validateSessionTitle(value) {
  if (typeof value !== "string" || !value.trim()) {
    return { error: "Session title is required." };
  }

  const title = value.trim();
  if (title.length > MAX_SESSION_TITLE_LENGTH) {
    return {
      error: `Session title must be ${MAX_SESSION_TITLE_LENGTH} characters or fewer.`,
    };
  }

  return { title };
}

module.exports = {
  MAX_SESSION_TITLE_LENGTH,
  validateSessionTitle,
};
