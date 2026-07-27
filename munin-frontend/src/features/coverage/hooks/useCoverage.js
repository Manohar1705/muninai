import { useQuery } from "@tanstack/react-query";
import { coverageApi } from "../api";

export function useCoverage() {
  const { data, isLoading } = useQuery({
    queryKey: ["coverage"],
    queryFn: coverageApi.getCoverage,
  });

  return {
    topics: data?.topics ?? [],
    gaps: data?.gaps ?? [],
    isLoading,
  };
}