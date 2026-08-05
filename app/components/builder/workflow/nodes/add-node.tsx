"use client";

import type { NodeProps } from "@xyflow/react";
import { MessageSquare, Plus, Zap } from "lucide-react";
import { Button } from "@/components/builder/ui/button";

type AddNodeData = {
  onClick?: () => void;
};

export function AddNode({ data }: NodeProps & { data?: AddNodeData }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-xl border border-border border-dashed bg-background/50 p-8 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
          <MessageSquare className="size-5" />
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
          <Zap className="size-5" />
        </div>
      </div>
      <div className="text-center">
        <h2 className="mb-1 font-semibold text-lg">
          Crie seu fluxo de automação
        </h2>
        <p className="max-w-sm text-muted-foreground text-sm">
          Adicione um gatilho para iniciar, depois conecte ações
          arrastando de um bloco ao outro.
        </p>
      </div>
      <Button className="gap-2 shadow-lg" onClick={data?.onClick} size="default">
        <Plus className="size-4" />
        Criar meu primeiro fluxo
      </Button>
    </div>
  );
}
