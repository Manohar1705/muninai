import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { engagementApi } from "../api";

export function useEngagement(currentEngagementId) {
  const [engagements, setEngagements] = useState([]);
  const [modules, setModules] = useState([]);

  const { data: engagementsData } = useQuery({
    queryKey: ["engagements"],
    queryFn: engagementApi.engagements,
  });

  const { data: modulesData } = useQuery({
    queryKey: ["modules", currentEngagementId],
    queryFn: () => engagementApi.modules(currentEngagementId),
    enabled: !!currentEngagementId,
  });

  useEffect(() => {
    if (!engagementsData) return;
    setEngagements(engagementsData);
  }, [engagementsData]);

  useEffect(() => {
    if (!modulesData) return;
    setModules(modulesData.map((m) => m.name));
  }, [modulesData]);

  return {
    engagements,
    setEngagements,
    modules,
  };
}