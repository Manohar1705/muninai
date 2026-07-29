import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionsApi } from "../api";
import { invalidateEngagementScopedQueries } from "../../../shared/api/client";
export function useSessions(engagementId) {
  const queryClient = useQueryClient();
  const queryKey = ["sessions", engagementId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => sessionsApi.getSessions(engagementId),
    enabled: !!engagementId,
  });

  const sessions = data ?? [];

  const updateSessions = (updater) => {
    queryClient.setQueryData(queryKey, (prev) => updater(prev ?? []));
  };

  const handleRealUpload = async (data) => {
    const { session } = data;
    updateSessions((prev) => [
      ...prev,
      {
        ...session,
        date: new Date().toISOString().slice(0, 10),
        duration: "N/A",
        attendees: ["Document Upload"],
      },
    ]);
    try {
      invalidateEngagementScopedQueries(queryClient, engagementId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadComplete = async () => {
    try {
      const res = await sessionsApi.uploadSession(engagementId);
      if (res.alreadyUploaded) return true;
      updateSessions((prev) => [...prev, res.session]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["coverage"] }),
      ]);
      return false;
    } catch (err) {
      console.error(err);
      alert("Upload failed — is the backend running?");
      return true;
    }
  };

  return {
    sessions,
    isLoading,
    updateSessions,
    handleRealUpload,
    handleUploadComplete,
  };
}