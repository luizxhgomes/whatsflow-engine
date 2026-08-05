"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/builder/ui/dropdown-menu";
import { WorkflowIcon } from "../../ui/workflow-icon";
import type { WorkflowState, WorkflowActions } from "./types";

// Props for WorkflowMenu
export type WorkflowMenuProps = {
  workflowId?: string;
  state: WorkflowState;
  actions: WorkflowActions;
};

// Workflow Menu Component
export function WorkflowMenu({
  workflowId,
  state,
  actions,
}: WorkflowMenuProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex h-9 max-w-[200px] items-center overflow-hidden rounded-md border bg-secondary text-secondary-foreground sm:max-w-[280px] lg:max-w-none">
        <DropdownMenu onOpenChange={(open) => open && actions.loadWorkflows()}>
          <DropdownMenuTrigger className="flex h-full cursor-pointer items-center gap-2 px-3 font-medium text-sm transition-all hover:bg-black/5 dark:hover:bg-white/5">
            <WorkflowIcon className="size-4 shrink-0" />
            <p className="truncate font-medium text-sm">
              {workflowId ? (
                state.workflowName
              ) : (
                <>
                  <span className="sm:hidden">Novo</span>
                  <span className="hidden sm:inline">Novo fluxo</span>
                </>
              )}
            </p>
            <ChevronDown className="size-3 shrink-0 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem
              asChild
              className="flex items-center justify-between"
            >
              <Link href="/">
                Novo fluxo{" "}
                {!workflowId && <Check className="size-4 shrink-0" />}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {state.allWorkflows.length === 0 ? (
              <DropdownMenuItem disabled>Nenhum fluxo encontrado</DropdownMenuItem>
            ) : (
              state.allWorkflows
                .filter((w) => w.name !== "__current__")
                .map((workflow) => (
                  <DropdownMenuItem
                    className="flex items-center justify-between"
                    key={workflow.id}
                    onClick={() =>
                      state.router.push(`/builder/${workflow.id}`)
                    }
                  >
                    <span className="truncate">{workflow.name}</span>
                    {workflow.id === state.currentWorkflowId && (
                      <Check className="size-4 shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {workflowId && !state.isOwner && (
        <span className="text-muted-foreground text-xs uppercase lg:hidden">
          Somente leitura
        </span>
      )}
    </div>
  );
}
