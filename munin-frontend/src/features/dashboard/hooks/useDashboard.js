import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api";

export function useDashboard(engagementId) {
  const [readiness, setReadiness] = useState({});
  const [stats, setStats] = useState({});
  const [activity, setActivity] = useState([]);

  const { data } = useQuery({
    queryKey: ["dashboard", engagementId],
    queryFn: () => dashboardApi.getDashboard(engagementId),
    enabled: !!engagementId,
  });

  useEffect(() => {
    if (!data) return;

    setStats(data.stats);
    setReadiness(data.readiness);
    setActivity(data.activity);
  }, [data]);

  return {
    stats,
    readiness,
    activity,
  };
}