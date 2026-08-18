import { apiRequest } from "../../shared/api/client";

export const teamApi = {
  members: (engagementId) => apiRequest(`/engagements/${engagementId}/team`),

  invite: (engagementId, email, role) =>
    apiRequest(`/engagements/${engagementId}/team`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  updateRole: (engagementId, userId, role) =>
    apiRequest(`/engagements/${engagementId}/team/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  removeMember: (engagementId, userId) =>
    apiRequest(`/engagements/${engagementId}/team/${userId}`, { method: "DELETE" }),

  resetMemberPassword: (engagementId, userId) =>
    apiRequest(`/engagements/${engagementId}/team/${userId}/reset-password`, { method: "POST" }),
};
