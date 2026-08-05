import type { JSX } from "react";

export type ExecutionLog = {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: "pending" | "running" | "success" | "error" | "skipped";
  startedAt: Date;
  completedAt: Date | null;
  duration: string | null;
  input?: unknown;
  output?: unknown;
  error: string | null;
};

export type WorkflowExecution = {
  id: string;
  workflowId: string;
  status: "pending" | "running" | "success" | "error" | "cancelled" | "skipped";
  startedAt: Date;
  completedAt: Date | null;
  duration: string | null;
  error: string | null;
};

export type WorkflowRunsProps = {
  isActive?: boolean;
  onRefreshRef?: React.MutableRefObject<(() => Promise<void>) | null>;
  onStartRun?: (executionId: string) => void;
};

export type ExecutionLogEntryProps = {
  log: ExecutionLog;
  isExpanded: boolean;
  onToggle: () => void;
  getStatusIcon: (status: string) => JSX.Element;
  getStatusDotClass: (status: string) => string;
  isFirst: boolean;
  isLast: boolean;
};

export type RunListItemProps = {
  execution: WorkflowExecution;
  executionIndex: number;
  totalExecutions: number;
  isExpanded: boolean;
  isSelected: boolean;
  executionLogs: ExecutionLog[];
  expandedLogs: Set<string>;
  onToggleRun: (executionId: string) => void;
  onSelectRun: (executionId: string) => void;
  onToggleLog: (logId: string) => void;
  getStatusIcon: (status: string) => JSX.Element;
  getStatusDotClass: (status: string) => string;
};

export type CollapsibleSectionProps = {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  copyData?: unknown;
  isError?: boolean;
  externalLink?: string;
};

export type CopyButtonProps = {
  data: unknown;
  isError?: boolean;
};

export type OutputDisplayProps = {
  output: unknown;
  input?: unknown;
  actionType?: string;
};

export type ExecutionLogsMap = Record<
  string,
  {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    status: "pending" | "running" | "success" | "error" | "skipped";
    output?: unknown;
  }
>;
