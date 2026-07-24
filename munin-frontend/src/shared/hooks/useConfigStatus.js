// src/shared/hooks/useConfigStatus.js

import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";

export function useConfigStatus() {
  const { data } = useQuery({
    queryKey: ["config-status"],
    queryFn: api.settingsStatus,
  });

  return data;
}