import { apiRequest, apiUpload } from "../../shared/api/client";

export const sessionsApi = {
  getSessions: (engagementId) =>
    apiRequest(
      `/sessions?engagementId=${encodeURIComponent(
        engagementId ?? ""
      )}`
    ),

  getSession: (id) =>
    apiRequest(`/sessions/${encodeURIComponent(id)}`),

  updateSessionTitle: (id, title) =>
    apiRequest(`/sessions/${encodeURIComponent(id)}/title`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }),

  updateSessionModule: (id, module) =>
    apiRequest(`/sessions/${encodeURIComponent(id)}/module`, {
      method: "PATCH",
      body: JSON.stringify({ module }),
    }),

  uploadSession: (engagementId) =>
    apiRequest("/sessions/upload", {
      method: "POST",
      body: JSON.stringify({ engagementId }),
    }),

  uploadDocument: (file, engagementId) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("engagementId", engagementId);
    return apiUpload("/documents/upload", fd);
  },

  uploadMedia: (file, engagementId) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("engagementId", engagementId);
    return apiUpload("/media/upload", fd);
  },

};
