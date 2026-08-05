"use client";

import { useState } from "react";
import { Eraser, Trash2 } from "lucide-react";
import { Button } from "@/components/builder/ui/button";
import { Input } from "@/components/builder/ui/input";
import { Label } from "@/components/builder/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { CodePanel } from "./code-panel";
import { DeleteDialog } from "./delete-dialog";
import { RunsPanel } from "./runs-panel";
import type { WorkspacePropertiesPanelProps } from "./types";

export const WorkspacePropertiesPanel = ({
  workflowId,
  workflowName,
  isOwner,
  activeTab,
  onTabChange,
  onUpdateWorkflowName,
  onClear,
  onDelete,
  onDeleteAllRuns,
  onRefreshRuns,
  isRefreshing,
  refreshRunsRef,
  workflowCode,
  onCopyWorkflowCode,
}: WorkspacePropertiesPanelProps) => {
  const [showDeleteRunsAlert, setShowDeleteRunsAlert] = useState(false);

  const handleDeleteAllRuns = async () => {
    await onDeleteAllRuns();
    setShowDeleteRunsAlert(false);
  };

  // Generate filename for code panel
  const filename = `builder/${
    workflowName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "") || "workflow"
  }.ts`;

  return (
    <>
      <Tabs
        className="size-full"
        defaultValue="properties"
        onValueChange={onTabChange}
        value={activeTab}
      >
        <TabsList className="h-14 w-full shrink-0 rounded-none border-b bg-transparent px-4 py-2.5">
          <TabsTrigger
            className="bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
            value="properties"
          >
            Propriedades
          </TabsTrigger>
          <TabsTrigger
            className="bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
            value="code"
          >
            Código
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger
              className="bg-transparent text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none"
              value="runs"
            >
              Execuções
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent className="flex flex-col overflow-hidden" value="properties">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="space-y-2">
              <Label className="ml-1" htmlFor="workflow-name">
                Nome do fluxo
              </Label>
              <Input
                disabled={!isOwner}
                id="workflow-name"
                onChange={(e) => onUpdateWorkflowName(e.target.value)}
                value={workflowName}
              />
            </div>
            <div className="space-y-2">
              <Label className="ml-1" htmlFor="workflow-id">
                ID do fluxo
              </Label>
              <Input
                disabled
                id="workflow-id"
                value={workflowId || "Não salvo"}
              />
            </div>
            {!isOwner && (
              <div className="rounded-lg border border-muted bg-muted/30 p-3">
                <p className="text-muted-foreground text-sm">
                  Você está vendo um fluxo público. Duplique para editar.
                </p>
              </div>
            )}
            {isOwner && (
              <div className="flex items-center gap-2 pt-4">
                <Button
                  className="text-muted-foreground"
                  onClick={onClear}
                  size="sm"
                  variant="ghost"
                >
                  <Eraser className="mr-2 size-4" />
                  Limpar
                </Button>
                <Button
                  className="text-muted-foreground"
                  onClick={onDelete}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="mr-2 size-4" />
                  Excluir
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {isOwner && (
          <TabsContent className="flex flex-col overflow-hidden" value="runs">
            <RunsPanel
              isActive={activeTab === "runs"}
              isRefreshing={isRefreshing}
              onDeleteAll={() => setShowDeleteRunsAlert(true)}
              onRefresh={onRefreshRuns}
              refreshRunsRef={refreshRunsRef}
            />
          </TabsContent>
        )}

        <TabsContent
          className="flex flex-col overflow-hidden data-[state=inactive]:hidden"
          forceMount
          value="code"
        >
          <CodePanel
            code={workflowCode}
            filename={filename}
            language="typescript"
            onCopy={onCopyWorkflowCode}
          />
        </TabsContent>
      </Tabs>

      <DeleteDialog
        description="Tem certeza que deseja excluir todas as execuções? Essa ação não pode ser desfeita."
        onConfirm={handleDeleteAllRuns}
        onOpenChange={setShowDeleteRunsAlert}
        open={showDeleteRunsAlert}
        title="Excluir todas as execuções"
      />
    </>
  );
};
