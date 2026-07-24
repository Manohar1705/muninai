import { apiRequest } from "../../shared/api/client";

export const coverageApi = {
  getCoverage: () => apiRequest("/coverage"),
};