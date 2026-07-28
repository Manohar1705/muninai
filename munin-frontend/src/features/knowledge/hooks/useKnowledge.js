import { useQuery } from "@tanstack/react-query";
import { knowledgeApi } from "../api";

export function useKnowledge(engagementId) {
  const { data, isLoading } = useQuery({
    queryKey: ["knowledge-objects", engagementId],
    queryFn: () => knowledgeApi.getKnowledgeObjects(engagementId),
    enabled: !!engagementId,
  });

  return {
    knowledgeObjects: data ?? [],
    isLoading,
  };
}