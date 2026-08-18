import { apiRequest } from "../../shared/api/client";

export const authApi = {
  login: (email, password) =>
    apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  register: (teamName, email, password) =>
    apiRequest("/auth/register", { method: "POST", body: JSON.stringify({ teamName, email, password }) }),

  me: () => apiRequest("/auth/me"),

  resetPassword: (currentPassword, newPassword) =>
    apiRequest("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  forgotPassword: (email) =>
    apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
};
