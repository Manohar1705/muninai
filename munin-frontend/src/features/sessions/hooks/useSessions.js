import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { sessionsApi } from "../api";

export function useSessions(engagementId) {
  const [sessions, setSessions] = useState([]);

  const { data } = useQuery({
    queryKey: ["sessions", engagementId],
    queryFn: () => sessionsApi.getSessions(engagementId),
    enabled: !!engagementId,
  });

  useEffect(() => {
    if (!data) return;
    setSessions(data);
  }, [data]);

  return {
    sessions,
    setSessions,
  };
}