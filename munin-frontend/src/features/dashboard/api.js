import { apiRequest } from "../../shared/api/client";

export const dashboardApi = {
  getDashboard: (engagementId) =>
    apiRequest(
      `/dashboard?engagementId=${encodeURIComponent(
        engagementId ?? ""
      )}`
    ),
};
export default dashboardApi;