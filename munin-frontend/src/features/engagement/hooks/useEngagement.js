import { useQuery } from "@tanstack/react-query";
import { engagementApi } from "../api";

export function useEngagement(currentEngagementId) {
  const { data: engagements, isLoading } = useQuery({
    queryKey: ["engagements"],
    queryFn: engagementApi.engagements,
  });

  return {
    engagements: engagements ?? [],
    isLoading,
  };
}