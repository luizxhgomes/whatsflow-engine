"use client";

import { useAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/builder/api-client";
import {
  currentWorkflowIdAtom,
  executionLogsAtom,
  selectedExecutionIdAtom,
} from "@/lib/builder/workflow-store";
import { Spinner } from "../../ui/spinner";
import { EmptyState } from "./empty-state";
import { RunListItem } from "./run-list-item";
import { getStatusDotClass, getStatusIcon } from "./status-helpers";
import type { ExecutionLog, WorkflowExecution, WorkflowRunsProps } from "./types";
import { createExecutionLogsMap, mapNodeLabels, sortLogsByStartTime } from "./utils";

/**
 * Main workflow runs component - orchestrates the run list and execution details
 */
export function WorkflowRuns({
  isActive = false,
  onRefreshRef,
  onStartRun,
}: WorkflowRunsProps) {
  const [currentWorkflowId] = useAtom(currentWorkflowIdAtom);
  const [selectedExecutionId, setSelectedExecutionId] = useAtom(
    selectedExecutionIdAtom
  );
  const [, setExecutionLogs] = useAtom(executionLogsAtom);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [logs, setLogs] = useState<Record<string, ExecutionLog[]>>({});
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Track which execution we've already auto-expanded to prevent loops
  const autoExpandedExecutionRef = useRef<string | null>(null);

  const loadExecutions = useCallback(
    async (showLoading = true) => {
      if (!currentWorkflowId) {
        setLoading(false);
        return;
      }

      try {
        if (showLoading) {
          setLoading(true);
        }
        const data = await api.workflow.getExecutions(currentWorkflowId);
        setExecutions(data as WorkflowExecution[]);
      } catch (error) {
        console.error("Falha ao carregar execuções:", error);
        setExecutions([]);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [currentWorkflowId]
  );

  // Expose refresh function via ref
  useEffect(() => {
    if (onRefreshRef) {
      onRefreshRef.current = () => loadExecutions(false);
    }
  }, [loadExecutions, onRefreshRef]);

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  const loadExecutionLogs = useCallback(
    async (executionId: string) => {
      try {
        const data = await api.workflow.getExecutionLogs(executionId);
        const mappedLogs = mapNodeLabels(data.logs);
        setLogs((prev) => ({
          ...prev,
          [executionId]: mappedLogs,
        }));

        // Update global execution logs atom if this is the selected execution
        if (executionId === selectedExecutionId) {
          setExecutionLogs(createExecutionLogsMap(mappedLogs));
        }
      } catch (error) {
        console.error("Falha ao carregar logs de execução:", error);
        setLogs((prev) => ({ ...prev, [executionId]: [] }));
      }
    },
    [selectedExecutionId, setExecutionLogs]
  );

  // Notify parent when a new execution starts and auto-expand it
  useEffect(() => {
    if (executions.length === 0) {
      return;
    }

    const latestExecution = executions[0];

    // Check if this is a new running execution that we haven't auto-expanded yet
    if (
      latestExecution.status === "running" &&
      latestExecution.id !== autoExpandedExecutionRef.current
    ) {
      // Mark this execution as auto-expanded
      autoExpandedExecutionRef.current = latestExecution.id;

      // Auto-select the new running execution
      setSelectedExecutionId(latestExecution.id);

      // Auto-expand the run
      setExpandedRuns((prev) => {
        const newExpanded = new Set(prev);
        newExpanded.add(latestExecution.id);
        return newExpanded;
      });

      // Load logs for the new execution
      loadExecutionLogs(latestExecution.id);

      // Notify parent
      if (onStartRun) {
        onStartRun(latestExecution.id);
      }
    }
  }, [executions, setSelectedExecutionId, loadExecutionLogs, onStartRun]);

  // Helper to refresh logs for a single execution
  const refreshExecutionLogs = useCallback(
    async (executionId: string) => {
      try {
        const logsData = await api.workflow.getExecutionLogs(executionId);
        const mappedLogs = mapNodeLabels(logsData.logs);
        setLogs((prev) => ({
          ...prev,
          [executionId]: mappedLogs,
        }));

        // Update global execution logs atom if this is the selected execution
        if (executionId === selectedExecutionId) {
          setExecutionLogs(createExecutionLogsMap(mappedLogs));
        }
      } catch (error) {
        console.error(`Falha ao atualizar logs para ${executionId}:`, error);
      }
    },
    [selectedExecutionId, setExecutionLogs]
  );

  // Poll for new executions when tab is active
  useEffect(() => {
    if (!(isActive && currentWorkflowId)) {
      return;
    }

    const pollExecutions = async () => {
      try {
        const data = await api.workflow.getExecutions(currentWorkflowId);
        setExecutions(data as WorkflowExecution[]);

        // Also refresh logs for expanded runs
        for (const executionId of expandedRuns) {
          await refreshExecutionLogs(executionId);
        }
      } catch (error) {
        console.error("Falha ao monitorar execuções:", error);
      }
    };

    const interval = setInterval(pollExecutions, 2000);
    return () => clearInterval(interval);
  }, [isActive, currentWorkflowId, expandedRuns, refreshExecutionLogs]);

  const toggleRun = async (executionId: string) => {
    const newExpanded = new Set(expandedRuns);
    if (newExpanded.has(executionId)) {
      newExpanded.delete(executionId);
    } else {
      newExpanded.add(executionId);
      // Load logs when expanding
      await loadExecutionLogs(executionId);
    }
    setExpandedRuns(newExpanded);
  };

  const selectRun = (executionId: string) => {
    // If already selected, deselect it
    if (selectedExecutionId === executionId) {
      setSelectedExecutionId(null);
      setExecutionLogs({});
      return;
    }

    // Select the run without toggling expansion
    setSelectedExecutionId(executionId);

    // Update global execution logs atom with logs for this execution
    const executionLogEntries = logs[executionId] || [];
    setExecutionLogs(createExecutionLogsMap(executionLogEntries));
  };

  const toggleLog = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (executions.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-3">
      {executions.map((execution, index) => {
        const isExpanded = expandedRuns.has(execution.id);
        const isSelected = selectedExecutionId === execution.id;
        const executionLogs = sortLogsByStartTime(logs[execution.id] || []);

        return (
          <RunListItem
            key={execution.id}
            execution={execution}
            executionIndex={index}
            totalExecutions={executions.length}
            isExpanded={isExpanded}
            isSelected={isSelected}
            executionLogs={executionLogs}
            expandedLogs={expandedLogs}
            onToggleRun={toggleRun}
            onSelectRun={selectRun}
            onToggleLog={toggleLog}
            getStatusIcon={getStatusIcon}
            getStatusDotClass={getStatusDotClass}
          />
        );
      })}
    </div>
  );
}
