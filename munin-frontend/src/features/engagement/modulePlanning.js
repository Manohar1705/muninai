export function getPlanValidationError(value, completedSessions) {
  if (String(value).trim() === "") {
    return "Planned sessions is required.";
  }

  const planned = Number(value);
  if (!Number.isInteger(planned) || planned < 0) {
    return "Planned sessions must be a non-negative whole number.";
  }

  const completed = Number(completedSessions || 0);
  if (planned < completed) {
    return `Planned sessions cannot be less than completed sessions (${completed}).`;
  }

  return null;
}
