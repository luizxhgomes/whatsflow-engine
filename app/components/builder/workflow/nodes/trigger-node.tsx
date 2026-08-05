"use client";

import type { NodeProps } from "@xyflow/react";
import {
  Check,
  Clock,
  Hash,
  MessageSquare,
  Play,
  Webhook,
  XCircle,
} from "lucide-react";
import { memo } from "react";
import {
  Node,
  NodeDescription,
  NodeTitle,
} from "@/components/builder/ai-elements/node";
import { cn } from "@/lib/builder/utils";
import type { WorkflowNodeData } from "@/lib/builder/workflow-store";

const TRIGGER_META: Record<
  string,
  {
    icon: typeof Play;
    color: string;
    label: string;
    description: string;
  }
> = {
  Manual: {
    icon: Play,
    color: "text-orange-500",
    label: "Manual",
    description: "Execução manual",
  },
  Schedule: {
    icon: Clock,
    color: "text-blue-400",
    label: "Agendamento",
    description: "Executa por horário",
  },
  Webhook: {
    icon: Webhook,
    color: "text-purple-400",
    label: "Webhook",
    description: "Chamada externa",
  },
  Keywords: {
    icon: Hash,
    color: "text-amber-400",
    label: "Palavras-chave",
    description: "Responde a keywords",
  },
  MessageReceived: {
    icon: MessageSquare,
    color: "text-emerald-400",
    label: "Mensagem Recebida",
    description: "Qualquer mensagem",
  },
};

type TriggerNodeProps = NodeProps & {
  data?: WorkflowNodeData;
};

export const TriggerNode = memo(({ data, selected }: TriggerNodeProps) => {
  if (!data) {
    return null;
  }

  const triggerType = (data.config?.triggerType as string) || "Manual";
  const meta = TRIGGER_META[triggerType] || TRIGGER_META.Manual;
  const TriggerIcon = meta.icon;

  const displayTitle = data.label || meta.label;
  const displayDescription = data.description || meta.description;
  const status = data.status;

  // Build config preview text
  let configPreview: string | null = null;
  if (triggerType === "Keywords") {
    const keywords = (data.config?.keywordList as string) || "";
    const list = keywords
      .split(/\r?\n/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (list.length > 0) {
      configPreview =
        list.length <= 3
          ? list.join(", ")
          : `${list.slice(0, 3).join(", ")} +${list.length - 3}`;
    }
  } else if (triggerType === "Schedule") {
    const cron = (data.config?.scheduleCron as string) || "";
    if (cron) configPreview = cron;
  } else if (triggerType === "MessageReceived") {
    const filter = (data.config?.messageTypeFilter as string) || "any";
    const bodyMatch = (data.config?.bodyMatch as string) || "";
    const parts: string[] = [];
    if (filter !== "any") parts.push(filter);
    if (bodyMatch) parts.push(`"${bodyMatch}"`);
    if (parts.length > 0) configPreview = parts.join(" | ");
  }

  return (
    <Node
      className={cn(
        "flex h-48 w-48 flex-col items-center justify-center shadow-none transition-all duration-150 ease-out border-l-[3px]",
        triggerType === "MessageReceived" && "border-l-emerald-400",
        triggerType === "Keywords" && "border-l-amber-400",
        triggerType === "Schedule" && "border-l-blue-400",
        triggerType === "Webhook" && "border-l-purple-400",
        triggerType === "Manual" && "border-l-orange-500",
        selected && "border-primary"
      )}
      handles={{ target: false, source: true }}
      status={status}
    >
      {/* Status indicator badge in top right */}
      {status && status !== "idle" && status !== "running" && (
        <div
          className={cn(
            "absolute top-2 right-2 rounded-full p-1",
            status === "success" && "bg-green-500/50",
            status === "error" && "bg-red-500/50"
          )}
        >
          {status === "success" && (
            <Check className="size-3.5 text-white" strokeWidth={2.5} />
          )}
          {status === "error" && (
            <XCircle className="size-3.5 text-white" strokeWidth={2.5} />
          )}
        </div>
      )}

      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <TriggerIcon className={cn("size-12", meta.color)} strokeWidth={1.5} />
        <div className="flex flex-col items-center gap-1 text-center">
          <NodeTitle className="text-base">{displayTitle}</NodeTitle>
          {displayDescription && (
            <NodeDescription className="text-xs">
              {displayDescription}
            </NodeDescription>
          )}
          {/* Config preview badge */}
          {configPreview && (
            <div className="mt-1 max-w-[160px] truncate rounded-full border border-muted-foreground/30 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {configPreview}
            </div>
          )}
        </div>
      </div>
    </Node>
  );
});

TriggerNode.displayName = "TriggerNode";
