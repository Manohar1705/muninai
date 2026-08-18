import { useQuery } from "@tanstack/react-query";
import { engagementApi } from "../api";

export function useEngagement(currentEngagementId, enabled = true) {
  const { data: engagements, isLoading } = useQuery({
    queryKey: ["engagements"],
    queryFn: engagementApi.engagements,
    enabled,
  });

  return {
    engagements: engagements ?? [],
    isLoading,
  };
}
