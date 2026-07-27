import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { smeApi } from "../api";

export function useSmeMap(engagementId) {
  const { data, isLoading } = useQuery({
    queryKey: ["sme-map", engagementId],
    queryFn: () => smeApi.getSmeMap(engagementId),
    enabled: !!engagementId,
  });

  const { sme, keyPersonRisk } = useMemo(() => {
    const byModule = {};
    const risky = new Set();

    for (const m of data?.modules || []) {
      byModule[m.module] = m.contributors;
      if (m.keyPersonRisk) risky.add(m.module);
    }

    return { sme: byModule, keyPersonRisk: risky };
  }, [data]);

  return { sme, keyPersonRisk, isLoading };
}