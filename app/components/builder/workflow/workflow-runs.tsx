"use client";

/**
 * Re-export from the refactored runs module for backward compatibility.
 * The component has been refactored into smaller, focused components
 * located in ./runs/
 */
export { WorkflowRuns } from "./runs";
export type { WorkflowRunsProps, ExecutionLog, WorkflowExecution } from "./runs";
