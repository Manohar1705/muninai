import { useState } from "react";
import { useConfigStatus } from "./useConfigStatus";

export function useConfigBanner() {
  const configStatus = useConfigStatus();
  const [dismissed, setDismissed] = useState(false);

  const showBanner =
    !!configStatus &&
    !dismissed &&
    (!configStatus.groqConfigured ||
      !configStatus.recallConfigured ||
      !configStatus.meetingWebhookConfigured);

  return { configStatus, showBanner, dismissBanner: () => setDismissed(true) };
}