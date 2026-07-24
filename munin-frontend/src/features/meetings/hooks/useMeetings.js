import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { meetingsApi } from "../api";
import { normalizeMeeting } from "../../../shared/api/client";

export function useMeetings(engagementId) {
  const [meetings, setMeetings] = useState([]);

  const { data } = useQuery({
    queryKey: ["meetings", engagementId],
    queryFn: () => meetingsApi.getMeetings(engagementId),
    enabled: !!engagementId,
  });

  useEffect(() => {
    if (!data) return;

    setMeetings(
      (data.meetings || []).map(normalizeMeeting)
    );
  }, [data]);

  return {
    meetings,
    setMeetings,
  };
}