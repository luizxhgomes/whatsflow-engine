"use client";

import { useState } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/builder/ui/button";
import { Input } from "@/components/builder/ui/input";
import { Label } from "@/components/builder/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { ActionConfig } from "../config/action-config";
import { ActionGrid } from "../config/action-grid";
import { TriggerConfig } from "../config/trigger-config";
import { generateNodeCode } from "../utils/code-generators";
import { CodePanel } from "./code-panel";
import { DeleteDialog } from "./delete-dialog";
import { RunsPanel } from "./runs-panel";
import type { NodePropertiesPanelProps, WorkflowNode } from "./types";

function getNodeCodeInfo(selectedNode: WorkflowNode): {
  filename: string;
  language: string;
} {
  const triggerType = selectedNode.data.config?.triggerType as string;

  if (selectedNode.data.type === "trigger") {
    if (triggerType === "Schedule") {
      return { filename: "vercel.json", language: "json" };
    }
    if (triggerType === "Webhook") {
      const webhookPath =
        (selectedNode.data.config?.webhookPath as string) || "/webhook";
      return { filename: `app/api${webhookPath}/route.ts`, language: "typescript" };
    }
  }

  const actionType = (selectedNode.data.config?.actionType as string) || "action";
  const filename = `steps/${actionType
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")}-step.ts`;

  return { filename, language: "typescript" };
}

export const NodePropertiesPanel = ({
  selectedNode,
  isOwner,
  isGenerating,
  newlyCreatedNodeId,
  workflowId,
  activeTab,
  onTabChange,
  onUpdateConfig,
  onUpdateLabel,
  onUpdateDescription,
  onToggleEnabled,
  onDelete,
  onDeleteAllRuns,
  onRefreshRuns,
  isRefreshing,
  refreshRunsRef,
  onCopyCode,
  onClearNewlyCreatedNode,
}: NodePropertiesPanelProps) => {
  const [showDeleteNodeAlert, setShowDeleteNodeAlert] = useState(false);
  const [showDeleteRunsAlert, setShowDeleteRunsAlert] = useState(false);

  const handleDelete = () => {
    onDelete();
    setShowDeleteNodeAlert(false);
  };

  const handleDeleteAllRuns = async () => {
    await onDeleteAllRuns();
    setShowDeleteRunsAlert(false);
  };

  const isConditionAction = selectedNode.data.config?.actionType === "Condition";
  const isManualTrigger =
    selectedNode.data.type === "trigger" &&
    selectedNode.data.config?.triggerType === "Manual";
  const showCodeTab = !isConditionAction && !isManualTrigger;

  const { filename, language } = getNodeCodeInfo(selectedNode);

  return (
    <>
      <Tabs
        className="size-full"
        data-testid="properties-panel"
        defaultValue="properties"
        onValueChange={onTabChange}
        value={activeTab}
      >
        <TabsList className="h-12 w-full shrink-0 rounded-none border-b bg-transparent px-2 py-2">
          <TabsTrigger
            className="bg-transparent text-xs text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none sm:text-sm"
            value="properties"
          >
            Propriedades
          </TabsTrigger>
          {showCodeTab && (
            <TabsTrigger
              className="bg-transparent text-xs text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none sm:text-sm"
              value="code"
            >
              Código
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger
              className="bg-transparent text-xs text-muted-foreground data-[state=active]:text-foreground data-[state=active]:shadow-none sm:text-sm"
              value="runs"
            >
              Execuções
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent className="flex flex-col overflow-hidden" value="properties">
          {/* Action selection - full height flex layout */}
          {selectedNode.data.type === "action" &&
            !selectedNode.data.config?.actionType &&
            isOwner && (
              <div className="flex min-h-0 flex-1 flex-col px-4 pt-4">
                <div className="mb-3 rounded-lg border border-muted bg-muted/30 p-3">
                  <p className="text-muted-foreground text-sm">
                    Selecione uma ação para configurar esta etapa do fluxo.
                  </p>
                </div>
                <ActionGrid
                  disabled={isGenerating}
                  isNewlyCreated={selectedNode?.id === newlyCreatedNodeId}
                  onSelectAction={(actionType) => {
                    onUpdateConfig("actionType", actionType);
                    if (selectedNode?.id === newlyCreatedNodeId) {
                      onClearNewlyCreatedNode();
                    }
                  }}
                />
              </div>
            )}

          {/* Other content - scrollable */}
          {!(
            selectedNode.data.type === "action" &&
            !selectedNode.data.config?.actionType &&
            isOwner
          ) && (
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {selectedNode.data.type === "trigger" && (
                <TriggerConfig
                  config={selectedNode.data.config || {}}
                  disabled={isGenerating || !isOwner}
                  onUpdateConfig={onUpdateConfig}
                  workflowId={workflowId ?? undefined}
                />
              )}

              {selectedNode.data.type === "action" &&
                !selectedNode.data.config?.actionType &&
                !isOwner && (
                  <div className="rounded-lg border border-muted bg-muted/30 p-3">
                    <p className="text-muted-foreground text-sm">
                      Nenhuma ação configurada para esta etapa.
                    </p>
                  </div>
                )}

              {selectedNode.data.type === "action" &&
              selectedNode.data.config?.actionType ? (
                <ActionConfig
                  config={selectedNode.data.config || {}}
                  disabled={isGenerating || !isOwner}
                  isOwner={isOwner}
                  onUpdateConfig={onUpdateConfig}
                />
              ) : null}

              {selectedNode.data.type !== "action" ||
              selectedNode.data.config?.actionType ? (
                <>
                  <div className="space-y-2">
                    <Label className="ml-1" htmlFor="label">
                      Nome da etapa
                    </Label>
                    <Input
                      disabled={isGenerating || !isOwner}
                      id="label"
                      onChange={(e) => onUpdateLabel(e.target.value)}
                      placeholder="Ex: Enviar boas-vindas"
                      value={selectedNode.data.label}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="ml-1" htmlFor="description">
                      Descrição
                    </Label>
                    <Input
                      disabled={isGenerating || !isOwner}
                      id="description"
                      onChange={(e) => onUpdateDescription(e.target.value)}
                      placeholder="Nota interna sobre esta etapa"
                      value={selectedNode.data.description || ""}
                    />
                  </div>
                </>
              ) : null}

              {!isOwner && (
                <div className="rounded-lg border border-muted bg-muted/30 p-3">
                  <p className="text-muted-foreground text-sm">
                    Você está vendo um fluxo público. Duplique para editar.
                  </p>
                </div>
              )}

              {/* Actions moved into content */}
              {isOwner && (
                <div className="flex items-center gap-2 pt-4">
                  {selectedNode.data.type === "action" && (
                    <Button
                      className="text-muted-foreground"
                      onClick={onToggleEnabled}
                      size="sm"
                      variant="ghost"
                    >
                      {selectedNode.data.enabled === false ? (
                        <>
                          <EyeOff className="mr-2 size-4" />
                          Desativado
                        </>
                      ) : (
                        <>
                          <Eye className="mr-2 size-4" />
                          Ativo
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    className="text-muted-foreground"
                    onClick={() => setShowDeleteNodeAlert(true)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Excluir
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent
          className="flex flex-col overflow-hidden data-[state=inactive]:hidden"
          forceMount
          value="code"
        >
          <CodePanel
            code={generateNodeCode(selectedNode)}
            filename={filename}
            language={language}
            onCopy={onCopyCode}
          />
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
      </Tabs>

      <DeleteDialog
        description="Tem certeza que deseja excluir todas as execuções? Essa ação não pode ser desfeita."
        onConfirm={handleDeleteAllRuns}
        onOpenChange={setShowDeleteRunsAlert}
        open={showDeleteRunsAlert}
        title="Excluir todas as execuções"
      />

      <DeleteDialog
        description={`Remover "${selectedNode.data.label || "esta etapa"}" do fluxo? Você pode desfazer com Ctrl+Z.`}
        onConfirm={handleDelete}
        onOpenChange={setShowDeleteNodeAlert}
        open={showDeleteNodeAlert}
        title="Excluir etapa"
      />
    </>
  );
};
