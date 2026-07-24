import { apiRequest } from "../../shared/api/client";

export const knowledgeApi = {
  getKnowledgeObjects: () =>
    apiRequest("/knowledge-objects"),
};