"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Download,
  Headphones,
  LayoutTemplate,
  Megaphone,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Star,
  TrendingUp,
  Upload,
  Workflow as WorkflowIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/builder/api-client";
import { cn } from "@/lib/utils";

type TemplateItem = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  popularity: number;
};

type WorkflowItem = Awaited<ReturnType<typeof api.workflow.getAll>>[number];

function formatDate(date?: string) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function StatusBadge({ status }: { status?: string }) {
  const normalized = (status || "draft").toLowerCase();
  if (normalized === "published") {
    return (
      <span className="inline-flex items-center rounded-md border border-ring/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        Publicado
      </span>
    );
  }
  if (normalized === "archived") {
    return (
      <span className="inline-flex items-center rounded-md border border-zinc-500/20 bg-zinc-500/10 px-2.5 py-1 text-xs font-medium text-zinc-400">
        Arquivado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
      Rascunho
    </span>
  );
}

function getTriggerLabel(workflow: WorkflowItem): string {
  const triggerNode = workflow.nodes.find((node) => node?.data?.type === "trigger");
  const triggerType = triggerNode?.data?.config?.triggerType;
  if (typeof triggerType === "string" && triggerType.trim()) {
    const trimmed = triggerType.trim();
    const labels: Record<string, string> = {
      Manual: "Manual",
      Keywords: "Palavras-chave",
      Webhook: "Webhook",
      Schedule: "Agendamento",
      MessageReceived: "Mensagem Recebida",
    };
    return labels[trimmed] || trimmed;
  }
  return "Manual";
}

export default function WorkflowsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [isSettingDefault, setIsSettingDefault] = useState(false);
  const [defaultWorkflowId, setDefaultWorkflowId] = useState<string | null>(null);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["builder-workflows"],
    queryFn: api.workflow.getAll,
    staleTime: 5000,
  });

  const metricsQuery = useQuery({
    queryKey: ["builder-workflows-metrics"],
    queryFn: () => api.workflow.getMetrics(),
    staleTime: 5000,
  });

  const defaultWorkflowQuery = useQuery({
    queryKey: ["builder-default-workflow"],
    queryFn: async () => {
      const response = await fetch("/api/settings/workflow-builder");
      if (!response.ok) throw new Error("Falha ao buscar fluxo padrão");
      return response.json() as Promise<{ defaultWorkflowId: string }>;
    },
    staleTime: 5000,
  });

  useEffect(() => {
    if (defaultWorkflowQuery.data?.defaultWorkflowId) {
      setDefaultWorkflowId(defaultWorkflowQuery.data.defaultWorkflowId);
    }
  }, [defaultWorkflowQuery.data?.defaultWorkflowId]);

  const workflows = (data || []).filter((workflow) => {
    if (!search.trim()) return true;
    return workflow.name.toLowerCase().includes(search.toLowerCase());
  });

  const sortedWorkflows = [...workflows].sort((a, b) => {
    if (a.id === defaultWorkflowId) return -1;
    if (b.id === defaultWorkflowId) return 1;
    return 0;
  });

  const selectedWorkflowId = searchParams?.get("workflowId");
  const versionsQuery = useQuery({
    queryKey: ["builder-workflow-versions", selectedWorkflowId],
    queryFn: () =>
      selectedWorkflowId
        ? api.workflow.getVersions(selectedWorkflowId)
        : Promise.resolve([]),
    enabled: Boolean(selectedWorkflowId),
  });

  const handleCreate = async () => {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const name = `Fluxo ${stamp}`;
    try {
      const created = await api.workflow.create({ name, nodes: [], edges: [] });
      router.push(`/builder/${encodeURIComponent(created.id)}`);
    } catch (error) {
      console.error("Failed to create workflow:", error);
      toast.error("Falha ao criar fluxo");
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!selectedWorkflowId) return;
    const confirmed = window.confirm("Confirmar rollback dessa versão?");
    if (!confirmed) return;
    setIsRollingBack(true);
    setRollingBackId(versionId);
    try {
      await api.workflow.rollback(selectedWorkflowId, versionId);
      toast.success("Reversão aplicada");
      await Promise.all([versionsQuery.refetch(), refetch()]);
    } catch (error) {
      console.error("Failed to rollback workflow:", error);
      toast.error("Falha ao reverter");
    } finally {
      setIsRollingBack(false);
      setRollingBackId(null);
    }
  };

  const handlePublish = async (workflowId: string) => {
    setIsPublishing(true);
    setPublishingId(workflowId);
    try {
      await api.workflow.publish(workflowId);
      toast.success("Fluxo publicado");
      await Promise.all([refetch(), versionsQuery.refetch()]);
    } catch (error) {
      console.error("Failed to publish workflow:", error);
      toast.error("Falha ao publicar");
    } finally {
      setIsPublishing(false);
      setPublishingId(null);
    }
  };

  const handleDuplicate = async (workflowId: string) => {
    setIsDuplicating(true);
    setDuplicatingId(workflowId);
    try {
      const created = await api.workflow.duplicate(workflowId);
      toast.success("Fluxo duplicado");
      router.push(`/builder/${encodeURIComponent(created.id)}`);
    } catch (error) {
      console.error("Failed to duplicate workflow:", error);
      toast.error("Falha ao duplicar fluxo");
    } finally {
      setIsDuplicating(false);
      setDuplicatingId(null);
    }
  };

  const handleDelete = async (workflowId: string) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este fluxo? Essa ação não pode ser desfeita."
    );
    if (!confirmed) return;
    try {
      await api.workflow.delete(workflowId);
      if (defaultWorkflowId === workflowId) {
        await fetch("/api/settings/workflow-builder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ defaultWorkflowId: "" }),
        });
        setDefaultWorkflowId(null);
      }
      toast.success("Fluxo excluído");
      await Promise.all([refetch(), defaultWorkflowQuery.refetch()]);
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      toast.error("Falha ao excluir fluxo");
    }
  };
  const handleSetDefault = async (workflowId: string) => {
    setIsSettingDefault(true);
    try {
      const response = await fetch("/api/settings/workflow-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultWorkflowId: workflowId }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "Falha ao definir fluxo padrão");
      }
      setDefaultWorkflowId(workflowId);
      toast.success("Fluxo padrão atualizado");
      await defaultWorkflowQuery.refetch();
    } catch (error) {
      console.error("Failed to set default workflow:", error);
      toast.error("Falha ao definir fluxo padrão");
    } finally {
      setIsSettingDefault(false);
    }
  };

  // Template gallery state
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string | null>(null);
  const templatesQuery = useQuery({
    queryKey: ["workflow-templates", templateCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (templateCategory) params.set("category", templateCategory);
      const res = await fetch(`/api/builder/workflows/templates?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao buscar templates");
      return res.json() as Promise<{ templates: TemplateItem[]; categories: string[] }>;
    },
    enabled: showTemplates,
    staleTime: 30000,
  });

  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const res = await fetch("/api/builder/workflows/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) throw new Error("Falha ao criar workflow do template");
      const templateData = await res.json();

      const created = await api.workflow.create({
        name: templateData.name,
        nodes: templateData.nodes,
        edges: templateData.edges,
      });
      toast.success("Fluxo criado a partir do template");
      router.push(`/builder/${encodeURIComponent(created.id)}`);
    } catch (error) {
      console.error("Failed to create from template:", error);
      toast.error("Falha ao criar fluxo do template");
    }
  };

  // Import workflow
  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const res = await fetch("/api/builder/workflows/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Falha ao importar");
        const result = await res.json();
        toast.success(`Fluxo "${result.name}" importado com sucesso`);
        router.push(`/builder/${encodeURIComponent(result.workflowId)}`);
      } catch (error) {
        console.error("Failed to import workflow:", error);
        toast.error("Falha ao importar fluxo. Verifique se o arquivo JSON é válido.");
      }
    };
    input.click();
  };

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Fluxos</PageTitle>
          <PageDescription>
            Crie e gerencie os fluxos do builder.
          </PageDescription>
        </div>
        <PageActions className="flex-wrap">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="border-border bg-zinc-950/40 hover:bg-muted text-gray-200"
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            onClick={handleImport}
            className="border-border bg-zinc-950/40 hover:bg-muted text-gray-200"
          >
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTemplates(!showTemplates)}
            className={cn(
              "border-border bg-zinc-950/40 hover:bg-muted text-gray-200",
              showTemplates && "border-ring/40 bg-primary/10"
            )}
          >
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4 text-primary-foreground" />
            Novo fluxo
          </Button>
        </PageActions>
      </PageHeader>

      {/* Template Gallery */}
      {showTemplates && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <LayoutTemplate className="h-4 w-4 text-primary" />
              Templates Prontos
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplates(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Category filter */}
          {templatesQuery.data?.categories && templatesQuery.data.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => setTemplateCategory(null)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition",
                  !templateCategory
                    ? "bg-primary/20 text-primary border border-ring/30"
                    : "bg-muted text-muted-foreground border border-border hover:border-white/20"
                )}
              >
                Todos
              </button>
              {templatesQuery.data.categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setTemplateCategory(templateCategory === cat ? null : cat)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition",
                    templateCategory === cat
                      ? "bg-primary/20 text-primary border border-ring/30"
                      : "bg-muted text-muted-foreground border border-border hover:border-white/20"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Template cards */}
          {templatesQuery.isLoading && (
            <div className="text-sm text-muted-foreground">Carregando templates...</div>
          )}
          {!templatesQuery.isLoading && (templatesQuery.data?.templates || []).length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum template encontrado.</div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(templatesQuery.data?.templates || []).map((tpl) => (
              <button
                type="button"
                key={tpl.id}
                onClick={() => handleCreateFromTemplate(tpl.id)}
                className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 text-left transition hover:border-ring/40 hover:bg-[var(--ds-bg-hover)]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {tpl.category === "Atendimento" && <Headphones className="h-4 w-4 text-emerald-400" />}
                    {tpl.category === "Vendas" && <TrendingUp className="h-4 w-4 text-amber-400" />}
                    {tpl.category === "Marketing" && <Megaphone className="h-4 w-4 text-primary" />}
                    <span className="text-sm font-semibold text-foreground">{tpl.name}</span>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{tpl.category}</span>
                </div>
                {tpl.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                )}
                {tpl.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tpl.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <WorkflowIcon className="h-4 w-4 text-primary" />
            {workflows.length} fluxos encontrados
          </div>
          <div className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar fluxo..."
              className="h-11 md:h-7 border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {isLoading && (
            <div className="rounded-xl border border-border bg-background p-6 text-sm text-muted-foreground">
              Carregando fluxos...
            </div>
          )}

          {!isLoading && workflows.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center text-muted-foreground">
              Nenhum fluxo criado ainda.
            </div>
          )}

          {!isLoading &&
            sortedWorkflows.map((workflow) => (
              <button
                key={workflow.id}
                className={cn(
                  "group flex w-full min-w-0 flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center rounded-xl border border-border bg-background px-4 py-4 text-left transition hover:border-ring/40 hover:bg-[var(--ds-bg-hover)]",
                  workflow.id === defaultWorkflowId &&
                    "border-ring/30 bg-primary/5 ring-1 ring-ring/15"
                )}
                onClick={() =>
                  router.push(`/builder/${encodeURIComponent(workflow.id)}`)
                }
                type="button"
              >
                <div className="min-w-0 flex-1 space-y-1 break-words">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="ds-icon-tile" data-size="sm" aria-hidden="true">
                  <WorkflowIcon className="size-1/2" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    <span className="inline-flex max-w-full items-center gap-2 break-words">
                      {workflow.name}
                      {workflow.id === defaultWorkflowId && (
                        <Star className="h-3.5 w-3.5 text-primary" />
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Atualizado em {formatDate(workflow.updatedAt)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Gatilho: {getTriggerLabel(workflow)}
                  </div>
                  {workflow.id === defaultWorkflowId && (
                    <div className="text-xs text-primary/80">
                      Fluxo padrão
                    </div>
                    )}
                    {workflow.lastPublishedVersion && (
                      <div className="text-xs text-primary/70">
                        Última publicada: v{workflow.lastPublishedVersion}
                      </div>
                    )}
                  </div>
                </div>
                  {workflow.description && (
                    <div className="text-xs text-muted-foreground">
                      {workflow.description}
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      Execuções:{" "}
                      {metricsQuery.data?.byWorkflow?.[workflow.id]?.runs ?? 0}
                    </span>
                    <span>
                      Erros:{" "}
                      {metricsQuery.data?.byWorkflow?.[workflow.id]?.failed ?? 0}
                    </span>
                  </div>
                  <StatusBadge status={workflow.status} />
                  {workflow.status !== "published" && (
                    <Button
                      className="border-border bg-zinc-950/40 hover:bg-muted text-gray-200"
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePublish(workflow.id);
                      }}
                      size="sm"
                      variant="outline"
                      disabled={isPublishing || publishingId === workflow.id}
                    >
                      {publishingId === workflow.id ? "Publicando..." : "Publicar"}
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="border-border bg-zinc-950/40 hover:bg-muted text-gray-200"
                        size="sm"
                        variant="outline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {defaultWorkflowId !== workflow.id && (
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSetDefault(workflow.id);
                          }}
                          disabled={isSettingDefault}
                        >
                          Marcar como padrão
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDuplicate(workflow.id);
                        }}
                        disabled={isDuplicating || duplicatingId === workflow.id}
                      >
                        {duplicatingId === workflow.id
                          ? "Duplicando..."
                          : "Duplicar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          router.push(`/workflows?workflowId=${encodeURIComponent(workflow.id)}`);
                        }}
                      >
                        Versões
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async (event) => {
                          event.stopPropagation();
                          try {
                            const data = await api.workflow.download(workflow.id);
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${workflow.name.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success("Fluxo exportado");
                          } catch {
                            toast.error("Falha ao exportar fluxo");
                          }
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-400"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(workflow.id);
                        }}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:text-foreground" />
                </div>
              </button>
            ))}
        </div>

        {selectedWorkflowId && (
          <div className="mt-6 rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">
                Versões do fluxo
              </div>
              <Button
                variant="ghost"
                onClick={() => router.push("/workflows")}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Fechar
              </Button>
            </div>
            {!versionsQuery.isLoading &&
              versionsQuery.data &&
              versionsQuery.data.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Última publicada:{" "}
                  {versionsQuery.data.find((version) => version.status === "published")
                    ? `v${versionsQuery.data.find((version) => version.status === "published")?.version}`
                    : "—"}
                </div>
              )}
            <div className="mt-3 space-y-2">
              {versionsQuery.isLoading && (
                <div className="text-xs text-muted-foreground">Carregando versões...</div>
              )}
              {!versionsQuery.isLoading &&
                (versionsQuery.data || []).map((version) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2 text-xs text-[var(--ds-text-secondary)]"
                    key={version.id}
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-3">
                      <span>v{version.version}</span>
                      <span className="text-muted-foreground">{version.status}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border bg-zinc-950/40 hover:bg-muted text-gray-200"
                      disabled={
                        isRollingBack ||
                        rollingBackId === version.id ||
                        version.status === "published"
                      }
                      onClick={() => handleRollback(version.id)}
                    >
                      {rollingBackId === version.id
                        ? "Aplicando..."
                        : "Reverter"}
                    </Button>
                  </div>
                ))}
              {!versionsQuery.isLoading &&
                (versionsQuery.data || []).length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    Nenhuma versão encontrada.
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
