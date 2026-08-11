import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { engagementApi } from "../api";
import { getPlanValidationError } from "../modulePlanning";
import { invalidateEngagementScopedQueries } from "../../../shared/api/client";
import { useToast } from "../../../shared/components/Toast";

export function useEngagementSetup(engagementId) {
  const queryClient = useQueryClient();
  const showToast = useToast();

  const { data: engagementsData } = useQuery({
    queryKey: ["engagements"],
    queryFn: engagementApi.engagements,
  });

  const { data: modulesData, refetch: refetchModules } = useQuery({
    queryKey: ["modules", engagementId],
    queryFn: () => engagementApi.modules(engagementId),
    enabled: !!engagementId,
  });

  const engagement = engagementsData?.find((r) => r.id === engagementId) || null;
  const modules = modulesData || [];

  const [saving, setSaving] = useState(false);
  const [deletingEngagement, setDeletingEngagement] = useState(false);

  const invalidate = () => invalidateEngagementScopedQueries(queryClient, engagementId);

  const save = async (name, details) => {
    if (!engagement) return;
    if (!name.trim()) {
      showToast("Engagement name is required.");
      return;
    }
    try {
      setSaving(true);
      await engagementApi.updateEngagement(engagement.id, name.trim(), details);
      invalidate();
    } catch (err) {
      console.error(err);
      showToast("Failed to save engagement");
    } finally {
      setSaving(false);
    }
  };

  const addModule = async (moduleName) => {
    const trimmed = moduleName.trim();
    if (!trimmed) return;
    if (modules.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) return;
    try {
      await engagementApi.createModule(trimmed, engagementId);
      invalidate();
      refetchModules();
    } catch (err) {
      console.error(err);
      showToast("Failed to create module");
    }
  };

  const updatePlan = async (moduleName, value) => {
    const currentModule = modules.find((module) => module.name === moduleName);
    const validationError = getPlanValidationError(
      value,
      currentModule?.completed_sessions || 0
    );
    if (validationError) throw new Error(validationError);

    const next = Number(value);
    try {
      await engagementApi.updateModulePlan(moduleName, next, engagementId);
      invalidate();
      await refetchModules();
    } catch (err) {
      console.error(err);
      await refetchModules();
      throw err;
    }
  };

  const renameModule = async (oldName, newName) => {
    await engagementApi.renameModule(oldName, newName, engagementId);
    invalidate();
    refetchModules();
  };

  const deleteModuleHandler = async (moduleName) => {
    await engagementApi.deleteModule(moduleName, engagementId);
    invalidate();
    refetchModules();
  };

  const deleteEngagementHandler = async () => {
    if (!engagement) return;
    if (!confirm(`Delete engagement "${engagement.name}"? This can't be undone.`)) return;
    setDeletingEngagement(true);
    try {
      await engagementApi.deleteEngagement(engagement.id);
      await queryClient.invalidateQueries({ queryKey: ["engagements"] });
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to delete engagement.");
    } finally {
      setDeletingEngagement(false);
    }
  };

  return {
    engagement,
    modules,
    saving,
    deletingEngagement,
    save,
    addModule,
    updatePlan,
    renameModule,
    deleteModuleHandler,
    deleteEngagementHandler,
  };
}
