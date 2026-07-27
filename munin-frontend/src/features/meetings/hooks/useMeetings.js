import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { meetingsApi, normalizeMeeting } from "../api";

const MEETING_TERMINAL = new Set(["call_ended", "done", "error", "fatal"]);

export function useMeetings(engagementId) {
  const queryClient = useQueryClient();
  const queryKey = ["meetings", engagementId];
  const pollTimers = useRef({});

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await meetingsApi.getMeetings(engagementId);
      return (res.meetings || []).map(normalizeMeeting);
    },
    enabled: !!engagementId,
  });

  const meetings = data ?? [];

  const updateMeetings = (updater) => {
    queryClient.setQueryData(queryKey, (prev) => updater(prev ?? []));
  };

  const schedulePoll = (id, delay = 4000) => {
    clearTimeout(pollTimers.current[id]);
    pollTimers.current[id] = setTimeout(() => pollMeeting(id), delay);
  };

  const pollMeeting = async (id) => {
    const res = await meetingsApi.meetingStatus(id);
    if (res.ok && res.data?.meeting) {
      const merged = normalizeMeeting(res.data.meeting);
      updateMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...merged, warning: res.data.warning || null } : m)));
      if (merged.sessionId) {
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
      if (!MEETING_TERMINAL.has(merged.status)) schedulePoll(id);
    } else {
      schedulePoll(id, 6000);
    }
  };
  const handleJoin = async (url, botName, meetingTitle) => {
    if (!engagementId) {
      return { ok: false, error: "No engagement selected." };
    }
    const res = await meetingsApi.joinMeeting(url.trim(), botName.trim() || "Munin", meetingTitle.trim(), engagementId);
    const meeting = res.data?.meeting ? normalizeMeeting(res.data.meeting) : null;
    if (meeting) {
      updateMeetings((prev) => [meeting, ...prev]);
      if (res.ok) schedulePoll(meeting.id, 3000);
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

  useEffect(() => {
    meetings.forEach((m) => {
      if (!MEETING_TERMINAL.has(m.status) && !pollTimers.current[m.id]) schedulePoll(m.id, 3000);
    });
    return () => { Object.values(pollTimers.current).forEach(clearTimeout); pollTimers.current = {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return {
    meetings,
    isLoading,
    updateMeetings,
    schedulePoll,
    handleJoin,
    handleLeave,
  };
}