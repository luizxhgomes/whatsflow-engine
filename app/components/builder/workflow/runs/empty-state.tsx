"use client";

import { Play } from "lucide-react";

/**
 * Empty state component shown when there are no executions
 */
export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-3 rounded-lg border border-dashed p-4">
        <Play className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="font-medium text-foreground text-sm">
        Nenhuma execução ainda
      </div>
      <div className="mt-1 text-muted-foreground text-xs">
        Execute o fluxo para ver execuções aqui
      </div>
    </div>
  );
}
