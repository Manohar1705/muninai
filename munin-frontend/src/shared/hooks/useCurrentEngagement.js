import { useState } from "react";

const STORAGE_KEY = "munin.currentEngagementId";

export function useCurrentEngagement() {
  const [currentEngagementId, setCurrentEngagementIdState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : null;
  });

  const setCurrentEngagementId = (id) => {
    setCurrentEngagementIdState(id || null);
    if (id) localStorage.setItem(STORAGE_KEY, String(id));
    else localStorage.removeItem(STORAGE_KEY);
  };

  return { currentEngagementId, setCurrentEngagementId };
}
