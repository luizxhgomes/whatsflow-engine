"use client";

import { Panel } from "../ai-elements/panel";
import { DeployButton } from "../deploy-button";
import { GitHubStarsButton } from "../github-stars-button";
import { UserMenu } from "../workflows/user-menu";

// Import from toolbar module
import {
  useWorkflowState,
  useWorkflowActions,
  ToolbarActions,
  WorkflowMenu,
  DuplicateButton,
  type WorkflowToolbarProps,
} from "./toolbar";

export const WorkflowToolbar = ({ workflowId }: WorkflowToolbarProps) => {
  const state = useWorkflowState();
  const actions = useWorkflowActions(state);

  return (
    <>
      <Panel
        className="flex flex-col gap-2 rounded-none border-none bg-transparent p-0 lg:flex-row lg:items-center"
        position="top-left"
      >
        <div className="flex items-center gap-2">
          <WorkflowMenu
            actions={actions}
            state={state}
            workflowId={workflowId}
          />
          {workflowId && !state.isOwner && (
            <span className="hidden text-muted-foreground text-xs uppercase lg:inline">
              Somente leitura
            </span>
          )}
        </div>
      </Panel>

      <div className="pointer-events-auto absolute top-4 right-4 z-10">
        <div className="flex flex-col-reverse items-end gap-2 lg:flex-row lg:items-center">
          <ToolbarActions
            actions={actions}
            state={state}
            workflowId={workflowId}
          />
          <div className="flex items-center gap-2">
            {workflowId && !state.isOwner && (
              <DuplicateButton
                isDuplicating={state.isDuplicating}
                onDuplicate={actions.handleDuplicate}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
