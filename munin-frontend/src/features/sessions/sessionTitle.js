export const MAX_SESSION_TITLE_LENGTH = 200;

export function getSessionTitleError(value) {
  if (typeof value !== "string" || !value.trim()) {
    return "Session title is required.";
  }

  if (value.trim().length > MAX_SESSION_TITLE_LENGTH) {
    return `Session title must be ${MAX_SESSION_TITLE_LENGTH} characters or fewer.`;
  }

  return "";
}
