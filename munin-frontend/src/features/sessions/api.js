import { apiRequest } from "../../shared/api/client";

export const sessionsApi = {
  getSessions: (engagementId) =>
    apiRequest(
      `/sessions?engagementId=${encodeURIComponent(
        engagementId ?? ""
      )}`
    ),

  getSession: (id) =>
    apiRequest(`/sessions/${id}`),

  updateSessionModule: (id, module) =>
    apiRequest(`/sessions/${id}/module`, {
      method: "PATCH",
      body: JSON.stringify({ module }),
    }),

  uploadSession: (engagementId) =>
    apiRequest("/sessions/upload", {
      method: "POST",
      body: JSON.stringify({ engagementId }),
    }),
};