"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/builder/ui/alert-dialog";
import { Button } from "@/components/builder/ui/button";
import { Label } from "@/components/builder/ui/label";
import type { MultiSelectionPanelProps } from "./types";

export const MultiSelectionPanel = ({
  selectedNodes,
  selectedEdges,
  onDelete,
}: MultiSelectionPanelProps) => {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  const nodeText = selectedNodes.length === 1 ? "node" : "nodes";
  const edgeText = selectedEdges.length === 1 ? "linha" : "linhas";
  const selectionParts: string[] = [];

  if (selectedNodes.length > 0) {
    selectionParts.push(`${selectedNodes.length} ${nodeText}`);
  }
  if (selectedEdges.length > 0) {
    selectionParts.push(`${selectedEdges.length} ${edgeText}`);
  }

  const selectionText = selectionParts.join(" e ");

  const handleDelete = () => {
    onDelete();
    setShowDeleteAlert(false);
  };

  return (
    <>
      <div className="flex size-full flex-col">
        <div className="flex h-14 w-full shrink-0 items-center border-b bg-transparent px-4">
          <h2 className="font-semibold text-foreground">Propriedades</h2>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <Label>Seleção</Label>
            <p className="text-muted-foreground text-sm">
              {selectionText} selecionado
            </p>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button
              className="text-muted-foreground"
              onClick={() => setShowDeleteAlert(true)}
              size="sm"
              variant="ghost"
            >
              <Trash2 className="mr-2 size-4" />
              Excluir
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog onOpenChange={setShowDeleteAlert} open={showDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir itens selecionados</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectionText}? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
