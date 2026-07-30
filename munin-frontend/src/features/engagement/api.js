import { apiRequest, apiRequestSoft } from "../../shared/api/client";

export const engagementApi = {
  engagements: () =>
    apiRequest("/engagements"),

  createEngagement: (name, phase, details) =>
    apiRequest("/engagements", {
      method: "POST",
      body: JSON.stringify({
        name,
        phase,
        details,
      }),
    }),

  updateEngagement: (id, name, details) =>
    apiRequest(`/engagements/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name,
        details,
      }),
    }),

  deleteEngagement: (id) =>
    apiRequest(`/engagements/${id}`, {
      method: "DELETE",
    }),

  modules: (engagementId) =>
    apiRequest(
      `/modules?engagementId=${encodeURIComponent(
        engagementId ?? ""
      )}`
    ),

  createModule: (name, engagementId) =>
    apiRequest("/modules", {
      method: "POST",
      body: JSON.stringify({
        name,
        engagementId,
      }),
    }),

  updateModulePlan: async (
    name,
    plannedSessions,
    engagementId
  ) => {
    const response = await apiRequestSoft(`/modules/${encodeURIComponent(name)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plannedSessions,
        engagementId,
      }),
    });
    if (!response.ok) {
      throw new Error(response.data?.error || "Failed to update planned sessions.");
    }
    return response.data;
  },

  renameModule: (
    name,
    newName,
    engagementId
  ) =>
    apiRequest(`/modules/${encodeURIComponent(name)}`, {
      method: "PATCH",
      body: JSON.stringify({
        newName,
        engagementId,
      }),
    }),

  deleteModule: (name, engagementId) =>
    apiRequest(
      `/modules/${encodeURIComponent(
        name
      )}?engagementId=${encodeURIComponent(
        engagementId ?? ""
      )}`,
      {
        method: "DELETE",
      }
    ),
};
