import { useQuery } from "@tanstack/react-query";
import { knowledgeApi } from "../api";

export function useKnowledge() {
  const { data, isLoading } = useQuery({
    queryKey: ["knowledge-objects"],
    queryFn: knowledgeApi.getKnowledgeObjects,
  });

  return {
    knowledgeObjects: data ?? [],
    isLoading,
  };
}