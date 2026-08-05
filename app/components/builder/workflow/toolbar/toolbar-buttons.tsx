"use client";

import {
  Check,
  Download,
  Globe,
  Loader2,
  Lock,
  Play,
  Save,
  Settings2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/builder/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/builder/ui/dropdown-menu";
import { useOverlay } from "../../overlays/overlay-provider";
import { ExportWorkflowOverlay } from "../../overlays/export-workflow-overlay";
import type { WorkflowState, WorkflowActions } from "./types";

// Props for SaveButton
export type SaveButtonProps = {
  state: WorkflowState;
  handleSave: () => Promise<void>;
};

// Save Button Component
export function SaveButton({ state, handleSave }: SaveButtonProps) {
  return (
    <Button
      className="relative border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
      disabled={
        !state.currentWorkflowId || state.isGenerating || state.isSaving
      }
      onClick={handleSave}
      size="icon"
      title={state.isSaving ? "Salvando..." : "Salvar fluxo"}
      variant="secondary"
    >
      {state.isSaving ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Save className="size-4" />
      )}
      {state.hasUnsavedChanges && !state.isSaving && (
        <div className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
      )}
    </Button>
  );
}

// Props for DownloadButton
export type DownloadButtonProps = {
  state: WorkflowState;
  actions: WorkflowActions;
};

// Download Button Component
export function DownloadButton({ state, actions }: DownloadButtonProps) {
  const { open: openOverlay } = useOverlay();

  const handleClick = () => {
    openOverlay(ExportWorkflowOverlay, {
      onExport: actions.handleDownload,
      isDownloading: state.isDownloading,
    });
  };

  return (
    <Button
      className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
      disabled={
        state.isDownloading ||
        state.nodes.length === 0 ||
        state.isGenerating ||
        !state.currentWorkflowId
      }
      onClick={handleClick}
      size="icon"
      title={
        state.isDownloading
          ? "Preparando download..."
          : "Exportar fluxo como código"
      }
      variant="secondary"
    >
      {state.isDownloading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
    </Button>
  );
}

// Props for PublishButton
export type PublishButtonProps = {
  onPublish: () => void;
  isPublishing: boolean;
  disabled?: boolean;
};

// Publish Button Component
export function PublishButton({
  onPublish,
  isPublishing,
  disabled,
}: PublishButtonProps) {
  return (
    <Button
      className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
      disabled={disabled || isPublishing}
      onClick={onPublish}
      size="icon"
      title="Publicar fluxo"
      variant="secondary"
    >
      {isPublishing ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Check className="size-4" />
      )}
    </Button>
  );
}

// Props for VersionsButton
export type VersionsButtonProps = {
  versions: Array<{ id: string; version: number; status: string }>;
  onRollback: (versionId: string) => void;
  disabled?: boolean;
  isRollingBack: boolean;
};

// Versions Button Component
export function VersionsButton({
  versions,
  onRollback,
  disabled,
  isRollingBack,
}: VersionsButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
          disabled={disabled}
          size="icon"
          title="Versões"
          variant="secondary"
        >
          <Settings2 className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {versions.length === 0 && (
          <DropdownMenuItem disabled>Nenhuma versão</DropdownMenuItem>
        )}
        {versions.map((version) => (
          <DropdownMenuItem
            key={version.id}
            onClick={() => onRollback(version.id)}
            disabled={isRollingBack || version.status === "published"}
          >
            v{version.version} · {version.status}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Props for VisibilityButton
export type VisibilityButtonProps = {
  state: WorkflowState;
  actions: WorkflowActions;
};

// Visibility Button Component
export function VisibilityButton({ state, actions }: VisibilityButtonProps) {
  const isPublic = state.workflowVisibility === "public";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="border hover:bg-black/5 dark:hover:bg-white/5"
          disabled={!state.currentWorkflowId || state.isGenerating}
          size="icon"
          title={isPublic ? "Fluxo público" : "Fluxo privado"}
          variant="secondary"
        >
          {isPublic ? (
            <Globe className="size-4" />
          ) : (
            <Lock className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={() => actions.handleToggleVisibility("private")}
        >
          <Lock className="size-4" />
          Privado
          {!isPublic && <Check className="ml-auto size-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="flex items-center gap-2"
          onClick={() => actions.handleToggleVisibility("public")}
        >
          <Globe className="size-4" />
          Público
          {isPublic && <Check className="ml-auto size-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Props for RunButtonGroup
export type RunButtonGroupProps = {
  state: WorkflowState;
  actions: WorkflowActions;
};

// Run Button Group Component
export function RunButtonGroup({ state, actions }: RunButtonGroupProps) {
  return (
    <Button
      className="border hover:bg-black/5 disabled:opacity-100 dark:hover:bg-white/5 disabled:[&>svg]:text-muted-foreground"
      disabled={
        state.isExecuting || state.nodes.length === 0 || state.isGenerating
      }
      onClick={() => actions.handleExecute()}
      size="icon"
      title="Executar fluxo"
      variant="secondary"
    >
      {state.isExecuting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Play className="size-4" />
      )}
    </Button>
  );
}

// Props for DuplicateButton
export type DuplicateButtonProps = {
  isDuplicating: boolean;
  onDuplicate: () => void;
};

// Duplicate Button Component - placed next to Sign In for non-owners
export function DuplicateButton({
  isDuplicating,
  onDuplicate,
}: DuplicateButtonProps) {
  return (
    <Button
      className="h-9 border hover:bg-black/5 dark:hover:bg-white/5"
      disabled={isDuplicating}
      onClick={onDuplicate}
      size="sm"
      title="Duplicar para seus fluxos"
      variant="secondary"
    >
      {isDuplicating ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <Copy className="mr-2 size-4" />
      )}
      Duplicar
    </Button>
  );
}
