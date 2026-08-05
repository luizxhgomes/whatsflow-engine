"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/builder/utils";
import { CollapsibleSection } from "./collapsible-section";
import { JsonWithLinks } from "./json-with-links";
import { OutputDisplay } from "./output-display";
import type { ExecutionLogEntryProps } from "./types";
import { formatDuration } from "./utils";

/**
 * Component for rendering individual execution log entries
 */
export function ExecutionLogEntry({
  log,
  isExpanded,
  onToggle,
  getStatusIcon,
  getStatusDotClass,
  isFirst,
  isLast,
}: ExecutionLogEntryProps) {
  return (
    <div className="relative flex gap-3" key={log.id}>
      {/* Timeline connector */}
      <div className="relative -ml-px flex flex-col items-center pt-2">
        {!isFirst && (
          <div className="absolute bottom-full h-2 w-px bg-border" />
        )}
        <div
          className={cn(
            "z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-0",
            getStatusDotClass(log.status)
          )}
        >
          {getStatusIcon(log.status)}
        </div>
        {!isLast && (
          <div className="absolute top-[calc(0.5rem+1.25rem)] bottom-0 w-px bg-border" />
        )}
      </div>

      {/* Step content */}
      <div className="min-w-0 flex-1">
        <button
          className="group w-full rounded-lg py-2 text-left transition-colors hover:bg-muted/50"
          onClick={onToggle}
          type="button"
        >
          <div className="flex items-center gap-3">
            {/* Step content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate font-medium text-sm transition-colors group-hover:text-foreground">
                  {log.nodeName || log.nodeType}
                </span>
              </div>
            </div>

            {log.duration && (
              <span className="shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
                {formatDuration(log.duration)}
              </span>
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="mt-2 mb-2 space-y-3 px-3">
            {log.input !== null && log.input !== undefined && (
              <CollapsibleSection copyData={log.input} title="Entrada">
                <pre className="overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                  <JsonWithLinks data={log.input} />
                </pre>
              </CollapsibleSection>
            )}
            {log.output !== null && log.output !== undefined && (
              <OutputDisplay
                actionType={log.nodeType}
                input={log.input}
                output={log.output}
              />
            )}
            {log.error && (
              <CollapsibleSection
                copyData={log.error}
                defaultExpanded
                isError
                title="Erro"
              >
                <pre className="overflow-auto rounded-lg border border-red-500/20 bg-red-500/5 p-3 font-mono text-red-600 text-xs leading-relaxed">
                  {log.error}
                </pre>
              </CollapsibleSection>
            )}
            {!(log.input || log.output || log.error) && (
              <div className="rounded-lg border bg-muted/30 py-4 text-center text-muted-foreground text-xs">
                Nenhum dado registrado
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
