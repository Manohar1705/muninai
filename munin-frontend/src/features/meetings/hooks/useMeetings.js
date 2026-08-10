import { useEffect } from "react";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import { meetingsApi, normalizeMeeting } from "../api";

const MEETING_TERMINAL = new Set(["call_ended", "done", "error", "fatal"]);

export function useMeetings(engagementId) {
  const queryClient = useQueryClient();
  const queryKey = ["meetings", engagementId];
 

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await meetingsApi.getMeetings(engagementId);
      return (res.meetings || []).map(normalizeMeeting);
    },
    enabled: !!engagementId,
  });

  const meetings = data ?? [];
  const activeIds = meetings.filter((m) => !MEETING_TERMINAL.has(m.status)).map((m) => m.id);

  const statusResults = useQueries({
    queries: activeIds.map((id) => ({
      queryKey: ["meeting-status", id],
      queryFn: () => meetingsApi.meetingStatus(id),
      // Each meeting's own status check drives its own interval —
      // this is the call that actually asks Recall.ai for the real
      // status and updates the backend, not just a read.
      refetchInterval: (query) => {
        const status = query.state.data?.data?.meeting?.status;
        return status && MEETING_TERMINAL.has(status) ? false : 4000;
      },
    })),
  });

  useEffect(() => {
    statusResults.forEach((result) => {
      const meeting = result.data?.data?.meeting;
      if (!meeting) return;
      const merged = normalizeMeeting(meeting);
      queryClient.setQueryData(queryKey, (prev) =>
        (prev ?? []).map((m) => (m.id === merged.id ? { ...m, ...merged, warning: result.data.data.warning || null } : m))
      );
      if (merged.sessionId) {
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusResults.map((r) => r.dataUpdatedAt).join(",")]);
  const updateMeetings = (updater) => {
    queryClient.setQueryData(queryKey, (prev) => updater(prev ?? []));
  };

  const handleJoin = async (url, botName, meetingTitle) => {
    if (!engagementId) {
      return { ok: false, error: "No engagement selected." };
    }
    const res = await meetingsApi.joinMeeting(url.trim(), botName.trim() || "Munin", meetingTitle.trim(), engagementId);
    const meeting = res.data?.meeting ? normalizeMeeting(res.data.meeting) : null;
    if (meeting) {
      updateMeetings((prev) => [meeting, ...prev]);
    }
    if (!res.ok) {
      return { ok: false, error: res.data?.error || `Failed to send Munin to the meeting (${res.status}).` };
    }
    return { ok: true };
  };
  const handleLeave = async (id) => {
    try {
      const res = await meetingsApi.leaveMeeting(id);
      if (res.ok && res.data?.meeting) {
        updateMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...normalizeMeeting(res.data.meeting) } : m)));
        return { ok: true };
      }
      if (!res.ok) {
        return { ok: false, error: res.data?.error || `Couldn't remove Munin from the call (${res.status}).` };
      }
    } catch (err) {
      return { ok: false, error: err.message || "Couldn't remove Munin from the call." };
    }
  };


  return {
    meetings,
    isLoading,
    updateMeetings,
    handleJoin,
    handleLeave,
  };
}