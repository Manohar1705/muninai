import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../api/client";

export function useOpenGapsCount() {
  const { data } = useQuery({
    queryKey: ["coverage"],
    queryFn: () => apiRequest("/coverage"),
  });

  const gaps = data?.gaps ?? [];
  return gaps.filter((g) => g.status !== "Closed").length;
}