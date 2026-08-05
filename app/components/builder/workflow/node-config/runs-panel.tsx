"use client";

import { Eraser, RefreshCw } from "lucide-react";
import { Button } from "@/components/builder/ui/button";
import { WorkflowRuns } from "../workflow-runs";
import type { RunsPanelProps } from "./types";

export const RunsPanel = ({
  isActive,
  isRefreshing,
  onRefresh,
  onDeleteAll,
  refreshRunsRef,
}: RunsPanelProps) => {
  return (
    <>
      {/* Actions in content header */}
      <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <Button
          className="text-muted-foreground"
          disabled={isRefreshing}
          onClick={onRefresh}
          size="sm"
          variant="ghost"
        >
          <RefreshCw
            className={`mr-2 size-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Atualizar
        </Button>
        <Button
          className="text-muted-foreground"
          onClick={onDeleteAll}
          size="sm"
          variant="ghost"
        >
          <Eraser className="mr-2 size-4" />
          Limpar tudo
        </Button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <WorkflowRuns isActive={isActive} onRefreshRef={refreshRunsRef} />
      </div>
    </>
  );
};
