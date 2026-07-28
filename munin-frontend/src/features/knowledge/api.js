import { apiRequest } from "../../shared/api/client";

export const knowledgeApi = {
  getKnowledgeObjects: (engagementId) =>
    apiRequest(`/knowledge-objects?engagementId=${encodeURIComponent(engagementId || "")}`),
};