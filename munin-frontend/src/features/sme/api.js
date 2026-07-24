import { apiRequest } from "../../shared/api/client";

export const smeApi = {
  getSmeMap: (engagementId) =>
    apiRequest(
      `/sme-map?engagementId=${encodeURIComponent(
        engagementId ?? ""
      )}`
    ),
};