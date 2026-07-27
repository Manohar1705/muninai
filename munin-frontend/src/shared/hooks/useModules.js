import { useQuery } from "@tanstack/react-query";
import { engagementApi } from "../../features/engagement/api";

export function useModules(engagementId) {
  const { data } = useQuery({
    queryKey: ["modules", engagementId],
    queryFn: () => engagementApi.modules(engagementId),
    enabled: !!engagementId,
  });
  return data || [];
}