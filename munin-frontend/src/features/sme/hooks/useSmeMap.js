import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { smeApi } from "../api";

export function useSmeMap(engagementId) {
  const [sme, setSme] = useState({});
  const [keyPersonRisk, setKeyPersonRisk] = useState(new Set());

  const { data } = useQuery({
    queryKey: ["sme-map", engagementId],
    queryFn: () => smeApi.getSmeMap(engagementId),
    enabled: !!engagementId,
  });

  useEffect(() => {
    if (!data) return;

    const byModule = {};
    const risky = new Set();

    for (const m of data.modules) {
      byModule[m.module] = m.contributors;
      if (m.keyPersonRisk) risky.add(m.module);
    }

    setSme(byModule);
    setKeyPersonRisk(risky);
  }, [data]);

  return { sme, keyPersonRisk };
}