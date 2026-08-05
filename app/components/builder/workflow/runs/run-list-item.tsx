"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/builder/utils";
import { getRelativeTime } from "@/lib/builder/utils/time";
import { ExecutionLogEntry } from "./execution-log-entry";
import type { RunListItemProps } from "./types";
import { formatDuration } from "./utils";

/**
 * Component for rendering a single execution run item
 */
export function RunListItem({
  execution,
  executionIndex,
  totalExecutions,
  isExpanded,
  isSelected,
  executionLogs,
  expandedLogs,
  onToggleRun,
  onSelectRun,
  onToggleLog,
  getStatusIcon,
  getStatusDotClass,
}: RunListItemProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card transition-all",
        isSelected &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex w-full items-center gap-3 p-4">
        <button
          className="flex size-5 shrink-0 items-center justify-center rounded-full border-0 transition-colors hover:bg-muted"
          onClick={() => onToggleRun(execution.id)}
          type="button"
        >
          <div
            className={cn(
              "flex size-5 items-center justify-center rounded-full border-0",
              getStatusDotClass(execution.status)
            )}
          >
            {getStatusIcon(execution.status)}
          </div>
        </button>

        <button
          className="min-w-0 flex-1 text-left transition-colors hover:opacity-80"
          onClick={() => onSelectRun(execution.id)}
          type="button"
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="font-semibold text-sm">
              Execução #{totalExecutions - executionIndex}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-muted-foreground text-xs">
            <span>{getRelativeTime(execution.startedAt)}</span>
            {execution.duration && (
              <>
                <span>•</span>
                <span className="tabular-nums">
                  {formatDuration(execution.duration)}
                </span>
              </>
            )}
            {executionLogs.length > 0 && (
              <>
                <span>•</span>
                <span>
                  {executionLogs.length}{" "}
                  {executionLogs.length === 1 ? "etapa" : "etapas"}
                </span>
              </>
            )}
          </div>
        </button>

        <button
          className="flex shrink-0 items-center justify-center rounded p-1 transition-colors hover:bg-muted"
          onClick={() => onToggleRun(execution.id)}
          type="button"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t bg-muted/20">
          {executionLogs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs">
              Nenhuma etapa registrada
            </div>
          ) : (
            <div className="p-4">
              {executionLogs.map((log, logIndex) => (
                <ExecutionLogEntry
                  getStatusDotClass={getStatusDotClass}
                  getStatusIcon={getStatusIcon}
                  isExpanded={expandedLogs.has(log.id)}
                  isFirst={logIndex === 0}
                  isLast={logIndex === executionLogs.length - 1}
                  key={log.id}
                  log={log}
                  onToggle={() => onToggleLog(log.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
