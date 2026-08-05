"use client";

import type { IntegrationType } from "@/lib/builder/types/integration";
import type { WorkflowNode, WorkflowEdge, WorkflowVisibility } from "@/lib/builder/workflow-store";

// Auth session type (matches the one from auth-client.ts)
type AuthSession = {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
} | null;

// Types for missing integration info
export type MissingIntegrationInfo = {
  integrationType: IntegrationType;
  integrationLabel: string;
  nodeNames: string[];
};

// Type for broken template reference info
export type BrokenTemplateReferenceInfo = {
  nodeId: string;
  nodeLabel: string;
  brokenReferences: Array<{
    fieldKey: string;
    fieldLabel: string;
    referencedNodeId: string;
    displayText: string;
  }>;
};

// Type for missing required fields info
export type MissingRequiredFieldInfo = {
  nodeId: string;
  nodeLabel: string;
  missingFields: Array<{
    fieldKey: string;
    fieldLabel: string;
  }>;
};

// Workflow toolbar props
export type WorkflowToolbarProps = {
  workflowId?: string;
};

// Execute test workflow params
export type ExecuteTestWorkflowParams = {
  workflowId: string;
  nodes: WorkflowNode[];
  updateNodeData: (update: {
    id: string;
    data: { status?: "idle" | "running" | "success" | "error" };
  }) => void;
  pollingIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
  setIsExecuting: (value: boolean) => void;
  setSelectedExecutionId: (value: string | null) => void;
  input?: Record<string, unknown>;
};

// Workflow handler params
export type WorkflowHandlerParams = {
  currentWorkflowId: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  updateNodeData: (update: {
    id: string;
    data: { status?: "idle" | "running" | "success" | "error" };
  }) => void;
  isExecuting: boolean;
  setIsExecuting: (value: boolean) => void;
  setIsSaving: (value: boolean) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  setActiveTab: (value: string) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedExecutionId: (id: string | null) => void;
  userIntegrations: Array<{ id: string; type: IntegrationType }>;
};

// Workflow state type
export type WorkflowState = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isExecuting: boolean;
  setIsExecuting: (value: boolean) => void;
  isGenerating: boolean;
  clearWorkflow: () => void;
  updateNodeData: (update: {
    id: string;
    data: { status?: "idle" | "running" | "success" | "error" };
  }) => void;
  currentWorkflowId: string | null;
  workflowName: string;
  setCurrentWorkflowName: (name: string) => void;
  workflowVisibility: WorkflowVisibility;
  setWorkflowVisibility: (visibility: WorkflowVisibility) => void;
  isOwner: boolean;
  router: ReturnType<typeof import("next/navigation").useRouter>;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  undo: () => void;
  redo: () => void;
  addNode: (node: WorkflowNode) => void;
  canUndo: boolean;
  canRedo: boolean;
  session: AuthSession;
  isDownloading: boolean;
  setIsDownloading: (value: boolean) => void;
  isDuplicating: boolean;
  setIsDuplicating: (value: boolean) => void;
  isPublishing: boolean;
  setIsPublishing: (value: boolean) => void;
  isRollingBack: boolean;
  setIsRollingBack: (value: boolean) => void;
  versions: Array<{ id: string; version: number; status: string }>;
  setVersions: (versions: Array<{ id: string; version: number; status: string }>) => void;
  allWorkflows: Array<{ id: string; name: string; updatedAt: string }>;
  setAllWorkflows: (workflows: Array<{ id: string; name: string; updatedAt: string }>) => void;
  setActiveTab: (value: string) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedExecutionId: (id: string | null) => void;
  userIntegrations: Array<{ id: string; type: IntegrationType }>;
  triggerExecute: boolean;
  setTriggerExecute: (value: boolean) => void;
};

// Workflow actions type
export type WorkflowActions = {
  handleSave: () => Promise<void>;
  handleExecute: () => Promise<void>;
  handleClearWorkflow: () => void;
  handleDeleteWorkflow: () => void;
  handleDownload: () => Promise<void>;
  loadWorkflows: () => Promise<void>;
  handlePublish: () => Promise<void>;
  handleRollback: (versionId: string) => Promise<void>;
  handleToggleVisibility: (newVisibility: WorkflowVisibility) => Promise<void>;
  handleDuplicate: () => Promise<void>;
  versions: Array<{ id: string; version: number; status: string }>;
  isPublishing: boolean;
  isRollingBack: boolean;
};
