import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api";

export function useDashboard(engagementId) {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", engagementId],
    queryFn: () => dashboardApi.getDashboard(engagementId),
    enabled: !!engagementId,
  });

  return {
    stats: data?.stats ?? {},
    readiness: data?.readiness ?? {},
    activity: data?.activity ?? [],
    isLoading,
  };
}