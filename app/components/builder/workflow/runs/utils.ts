import {
  OUTPUT_DISPLAY_CONFIGS,
  type OutputDisplayConfig,
} from "@/lib/builder/output-display-configs";
import type { ExecutionLog, ExecutionLogsMap } from "./types";

/**
 * Get the output display config for a node type
 */
export function getOutputConfig(nodeType: string): OutputDisplayConfig | undefined {
  return OUTPUT_DISPLAY_CONFIGS.find(
    (config) => config.actionType === nodeType
  );
}

/**
 * Extract the displayable value from output based on config
 */
export function getOutputDisplayValue(
  output: unknown,
  config: { type: "image" | "video" | "url"; field: string }
): string | undefined {
  if (typeof output !== "object" || output === null) {
    return;
  }
  const value = (output as Record<string, unknown>)[config.field];
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return;
}

/**
 * Detect if output is a base64 image (for legacy support)
 */
export function isBase64ImageOutput(output: unknown): output is { base64: string } {
  return (
    typeof output === "object" &&
    output !== null &&
    "base64" in output &&
    typeof (output as { base64: unknown }).base64 === "string" &&
    (output as { base64: string }).base64.length > 100 // Base64 images are large
  );
}

/**
 * Convert execution logs to a map by nodeId for the global atom
 */
export function createExecutionLogsMap(logs: ExecutionLog[]): ExecutionLogsMap {
  const logsMap: ExecutionLogsMap = {};
  for (const log of logs) {
    logsMap[log.nodeId] = {
      nodeId: log.nodeId,
      nodeName: log.nodeName,
      nodeType: log.nodeType,
      status: log.status,
      output: log.output,
    };
  }
  return logsMap;
}

/**
 * Check if a string is a URL
 */
export function isUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Format duration for display
 */
export function formatDuration(duration: string): string {
  const ms = Number.parseInt(duration, 10);
  if (ms < 1000) {
    return `${duration}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Map raw log entries from API to ExecutionLog format
 */
export function mapNodeLabels(
  logEntries: Array<{
    id: string;
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    status: "pending" | "running" | "success" | "error" | "skipped";
    input: unknown;
    output: unknown;
    error: string | null;
    startedAt: Date;
    completedAt: Date | null;
    duration: string | null;
  }>
): ExecutionLog[] {
  return logEntries.map((log) => ({
    id: log.id,
    nodeId: log.nodeId,
    nodeName: log.nodeName,
    nodeType: log.nodeType,
    status: log.status,
    startedAt: new Date(log.startedAt),
    completedAt: log.completedAt ? new Date(log.completedAt) : null,
    duration: log.duration,
    input: log.input,
    output: log.output,
    error: log.error,
  }));
}

/**
 * Sort execution logs by startedAt time
 */
export function sortLogsByStartTime(logs: ExecutionLog[]): ExecutionLog[] {
  return [...logs].sort((a, b) => {
    return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
  });
}
