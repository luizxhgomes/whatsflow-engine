"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { toast } from "sonner";
import { api } from "@/lib/builder/api-client";
import { authClient, useSession } from "@/lib/builder/auth-client";
import { integrationsAtom } from "@/lib/builder/integrations-store";
import {
  addNodeAtom,
  canRedoAtom,
  canUndoAtom,
  clearWorkflowAtom,
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
  currentWorkflowVisibilityAtom,
  edgesAtom,
  hasUnsavedChangesAtom,
  isExecutingAtom,
  isGeneratingAtom,
  isSavingAtom,
  isWorkflowOwnerAtom,
  nodesAtom,
  propertiesPanelActiveTabAtom,
  redoAtom,
  selectedExecutionIdAtom,
  selectedNodeAtom,
  triggerExecuteAtom,
  undoAtom,
  updateNodeDataAtom,
  type WorkflowVisibility,
} from "@/lib/builder/workflow-store";
import { useOverlay } from "../../overlays/overlay-provider";
import { ConfirmOverlay } from "../../overlays/confirm-overlay";
import { MakePublicOverlay } from "../../overlays/make-public-overlay";
import { WorkflowIssuesOverlay } from "../../overlays/workflow-issues-overlay";
import type { WorkflowHandlerParams, WorkflowState, WorkflowActions } from "./types";
import {
  executeTestWorkflow,
  getBrokenTemplateReferences,
  getMissingRequiredFields,
  getMissingIntegrations,
} from "./utils";

// Hook for workflow handlers
export function useWorkflowHandlers({
  currentWorkflowId,
  nodes,
  edges,
  updateNodeData,
  isExecuting,
  setIsExecuting,
  setIsSaving,
  setHasUnsavedChanges,
  setActiveTab,
  setNodes,
  setEdges,
  setSelectedNodeId,
  setSelectedExecutionId,
  userIntegrations,
}: WorkflowHandlerParams) {
  const { open: openOverlay } = useOverlay();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling interval on unmount
  useEffect(
    () => () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    },
    []
  );

  const handleSave = async () => {
    if (!currentWorkflowId) {
      return;
    }

    setIsSaving(true);
    try {
      await api.workflow.update(currentWorkflowId, { nodes, edges });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Falha ao salvar o fluxo:", error);
      toast.error("Falha ao salvar o fluxo. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const executeWorkflow = async () => {
    if (!currentWorkflowId) {
      toast.error("Salve o fluxo antes de executar");
      return;
    }

    // Switch to Runs tab when starting a test run
    setActiveTab("runs");

    // Deselect all nodes and edges
    setNodes(nodes.map((node) => ({ ...node, selected: false })));
    setEdges(edges.map((edge) => ({ ...edge, selected: false })));
    setSelectedNodeId(null);

    let input: Record<string, unknown> | undefined;
    const triggerNode = nodes.find((node) => node.data.type === "trigger");
    const triggerType = triggerNode?.data.config?.triggerType as
      | string
      | undefined;

    if (triggerType === "Manual") {
      const to = window.prompt("Telefone do destinatário (E.164)", "");
      if (!to) {
        toast.error("Destinatário obrigatório para execução manual");
        return;
      }

      const firstMessageNode = nodes.find(
        (node) => node.data.type === "action"
      );
      const defaultMessage = firstMessageNode?.data.config?.message as
        | string
        | undefined;
      const message = window.prompt(
        "Mensagem (opcional)",
        defaultMessage || ""
      );

      input = { to };
      if (message) {
        input.message = message;
      }
    }

    setIsExecuting(true);
    await executeTestWorkflow({
      workflowId: currentWorkflowId,
      nodes,
      updateNodeData,
      pollingIntervalRef,
      setIsExecuting,
      setSelectedExecutionId,
      input,
    });
    // Don't set executing to false here - let polling handle it
  };

  const handleGoToStep = (nodeId: string, fieldKey?: string) => {
    setSelectedNodeId(nodeId);
    setActiveTab("properties");

    // Focus on the specific field after a short delay to allow the panel to render
    if (fieldKey) {
      setTimeout(() => {
        const element = document.getElementById(fieldKey);
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  };

  const handleExecute = async () => {
    // Guard against concurrent executions
    if (isExecuting) {
      return;
    }

    // Collect all workflow issues at once
    const brokenRefs = getBrokenTemplateReferences(nodes);
    const missingFields = getMissingRequiredFields(nodes);
    const missingIntegrations = getMissingIntegrations(nodes, userIntegrations);

    // If there are any issues, show the workflow issues overlay
    if (
      brokenRefs.length > 0 ||
      missingFields.length > 0 ||
      missingIntegrations.length > 0
    ) {
      openOverlay(WorkflowIssuesOverlay, {
        issues: {
          brokenReferences: brokenRefs,
          missingRequiredFields: missingFields,
          missingIntegrations,
        },
        onGoToStep: handleGoToStep,
        onRunAnyway: executeWorkflow,
      });
      return;
    }

    await executeWorkflow();
  };

  return {
    handleSave,
    handleExecute,
  };
}

// Hook for workflow state management
export function useWorkflowState(): WorkflowState {
  const [nodes, setNodes] = useAtom(nodesAtom);
  const [edges, setEdges] = useAtom(edgesAtom);
  const [isExecuting, setIsExecuting] = useAtom(isExecutingAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const clearWorkflow = useSetAtom(clearWorkflowAtom);
  const updateNodeData = useSetAtom(updateNodeDataAtom);
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [workflowName, setCurrentWorkflowName] = useAtom(
    currentWorkflowNameAtom
  );
  const [workflowVisibility, setWorkflowVisibility] = useAtom(
    currentWorkflowVisibilityAtom
  );
  const isOwner = useAtomValue(isWorkflowOwnerAtom);
  const router = useRouter();
  const [isSaving, setIsSaving] = useAtom(isSavingAtom);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useAtom(
    hasUnsavedChangesAtom
  );
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);
  const addNode = useSetAtom(addNodeAtom);
  const [canUndo] = useAtom(canUndoAtom);
  const [canRedo] = useAtom(canRedoAtom);
  const { data: session } = useSession();
  const setActiveTab = useSetAtom(propertiesPanelActiveTabAtom);
  const setSelectedNodeId = useSetAtom(selectedNodeAtom);
  const setSelectedExecutionId = useSetAtom(selectedExecutionIdAtom);
  const userIntegrations = useAtomValue(integrationsAtom);
  const [triggerExecute, setTriggerExecute] = useAtom(triggerExecuteAtom);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [versions, setVersions] = useState<
    Array<{ id: string; version: number; status: string }>
  >([]);
  const [allWorkflows, setAllWorkflows] = useState<
    Array<{
      id: string;
      name: string;
      updatedAt: string;
    }>
  >([]);

  // Load all workflows on mount
  useEffect(() => {
    const loadAllWorkflows = async () => {
      try {
        const workflows = await api.workflow.getAll();
        setAllWorkflows(workflows);
      } catch (error) {
        console.error("Falha ao carregar fluxos:", error);
      }
    };
    loadAllWorkflows();
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadVersions = async () => {
      if (!currentWorkflowId) return;
      try {
        const data = await api.workflow.getVersions(currentWorkflowId);
        if (!isActive) return;
        setVersions(
          data.map((version) => ({
            id: version.id,
            version: version.version,
            status: version.status,
          }))
        );
      } catch (error) {
        console.error("Falha ao carregar versões do fluxo:", error);
      }
    };
    loadVersions();
    return () => {
      isActive = false;
    };
  }, [currentWorkflowId]);

  return {
    nodes,
    edges,
    isExecuting,
    setIsExecuting,
    isGenerating,
    clearWorkflow,
    updateNodeData,
    currentWorkflowId,
    workflowName,
    setCurrentWorkflowName,
    workflowVisibility,
    setWorkflowVisibility,
    isOwner,
    router,
    isSaving,
    setIsSaving,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    undo,
    redo,
    addNode,
    canUndo,
    canRedo,
    session,
    isDownloading,
    setIsDownloading,
    isDuplicating,
    setIsDuplicating,
    isPublishing,
    setIsPublishing,
    isRollingBack,
    setIsRollingBack,
    versions,
    setVersions,
    allWorkflows,
    setAllWorkflows,
    setActiveTab,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setSelectedExecutionId,
    userIntegrations,
    triggerExecute,
    setTriggerExecute,
  };
}

// Hook for workflow actions
export function useWorkflowActions(state: WorkflowState): WorkflowActions {
  const { open: openOverlay } = useOverlay();
  const {
    currentWorkflowId,
    workflowName,
    nodes,
    edges,
    updateNodeData,
    isExecuting,
    setIsExecuting,
    setIsSaving,
    setHasUnsavedChanges,
    clearWorkflow,
    setWorkflowVisibility,
    setAllWorkflows,
    setIsDownloading,
    setIsDuplicating,
    setIsPublishing,
    setIsRollingBack,
    versions,
    setVersions,
    setActiveTab,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setSelectedExecutionId,
    userIntegrations,
    triggerExecute,
    setTriggerExecute,
    router,
    session,
  } = state;

  const { handleSave, handleExecute } = useWorkflowHandlers({
    currentWorkflowId,
    nodes,
    edges,
    updateNodeData,
    isExecuting,
    setIsExecuting,
    setIsSaving,
    setHasUnsavedChanges,
    setActiveTab,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setSelectedExecutionId,
    userIntegrations,
  });

  // Listen for execute trigger from keyboard shortcut
  useEffect(() => {
    if (triggerExecute) {
      setTriggerExecute(false);
      handleExecute();
    }
  }, [triggerExecute, setTriggerExecute, handleExecute]);

  const handleClearWorkflow = () => {
    openOverlay(ConfirmOverlay, {
      title: "Limpar fluxo",
      message:
        "Tem certeza que deseja limpar todos os nodes e conexões? Esta ação não pode ser desfeita.",
      confirmLabel: "Limpar fluxo",
      confirmVariant: "destructive" as const,
      destructive: true,
      onConfirm: () => {
        clearWorkflow();
      },
    });
  };

  const handleDeleteWorkflow = () => {
    openOverlay(ConfirmOverlay, {
      title: "Excluir fluxo",
      message: `Tem certeza que deseja excluir "${workflowName}"? Isso vai remover o fluxo permanentemente. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir fluxo",
      confirmVariant: "destructive" as const,
      destructive: true,
      onConfirm: async () => {
        if (!currentWorkflowId) return;
        try {
          await api.workflow.delete(currentWorkflowId);
          toast.success("Fluxo excluido com sucesso");
          window.location.href = "/";
        } catch (error) {
          console.error("Falha ao excluir o fluxo:", error);
          toast.error("Falha ao excluir o fluxo. Tente novamente.");
        }
      },
    });
  };

  const handleDownload = async () => {
    if (!currentWorkflowId) {
      toast.error("Salve o fluxo antes de baixar");
      return;
    }

    setIsDownloading(true);
    toast.info("Preparando arquivos do fluxo para download...");

    try {
      const result = await api.workflow.download(currentWorkflowId);

      if (!result.success) {
        throw new Error(result.error || "Falha ao preparar download");
      }

      if (!result.files) {
        throw new Error("Nenhum arquivo para baixar");
      }

      // Import JSZip dynamically
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Add all files to the zip
      for (const [path, content] of Object.entries(result.files)) {
        zip.file(path, content);
      }

      // Generate the zip file
      const blob = await zip.generateAsync({ type: "blob" });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${workflowName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-fluxo.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Fluxo baixado com sucesso!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao baixar o fluxo"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const loadWorkflows = async () => {
    try {
      const workflows = await api.workflow.getAll();
      setAllWorkflows(workflows);
    } catch (error) {
      console.error("Falha ao carregar fluxos:", error);
    }
  };

  const handlePublish = async () => {
    if (!currentWorkflowId) return;
    setIsPublishing(true);
    try {
      await api.workflow.publish(currentWorkflowId);
      toast.success("Fluxo publicado");
      const data = await api.workflow.getVersions(currentWorkflowId);
      setVersions(
        data.map((version) => ({
          id: version.id,
          version: version.version,
          status: version.status,
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao publicar");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!currentWorkflowId) return;
    setIsRollingBack(true);
    try {
      await api.workflow.rollback(currentWorkflowId, versionId);
      toast.success("Reversão aplicada");
      const data = await api.workflow.getVersions(currentWorkflowId);
      setVersions(
        data.map((version) => ({
          id: version.id,
          version: version.version,
          status: version.status,
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no rollback");
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleToggleVisibility = async (newVisibility: WorkflowVisibility) => {
    if (!currentWorkflowId) {
      return;
    }

    // Show confirmation overlay when making public
    if (newVisibility === "public") {
      openOverlay(MakePublicOverlay, {
        onConfirm: async () => {
          try {
            await api.workflow.update(currentWorkflowId, {
              visibility: "public",
            });
            setWorkflowVisibility("public");
            toast.success("Fluxo agora é público");
          } catch (error) {
            console.error("Falha ao atualizar visibilidade:", error);
            toast.error("Falha ao atualizar visibilidade. Tente novamente.");
          }
        },
      });
      return;
    }

    // Switch to private immediately (no risks)
    try {
      await api.workflow.update(currentWorkflowId, {
        visibility: newVisibility,
      });
      setWorkflowVisibility(newVisibility);
      toast.success("Fluxo agora e privado");
    } catch (error) {
      console.error("Falha ao atualizar visibilidade:", error);
      toast.error("Falha ao atualizar visibilidade. Tente novamente.");
    }
  };

  const handleDuplicate = async () => {
    if (!currentWorkflowId) {
      return;
    }

    setIsDuplicating(true);
    try {
      // Auto-sign in as anonymous if user has no session
      if (!session?.user) {
        await authClient.signIn.anonymous();
        // Wait for session to be established
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const newWorkflow = await api.workflow.duplicate(currentWorkflowId);
      toast.success("Fluxo duplicado com sucesso");
      router.push(`/builder/${newWorkflow.id}`);
    } catch (error) {
      console.error("Falha ao duplicar o fluxo:", error);
      toast.error("Falha ao duplicar o fluxo. Tente novamente.");
    } finally {
      setIsDuplicating(false);
    }
  };

  return {
    handleSave,
    handleExecute,
    handleClearWorkflow,
    handleDeleteWorkflow,
    handleDownload,
    loadWorkflows,
    handlePublish,
    handleRollback,
    handleToggleVisibility,
    handleDuplicate,
    versions,
    isPublishing: state.isPublishing,
    isRollingBack: state.isRollingBack,
  };
}
