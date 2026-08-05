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
import { Input } from "@/components/builder/ui/input";
import { Label } from "@/components/builder/ui/label";
import type { EdgePropertiesPanelProps } from "./types";

export const EdgePropertiesPanel = ({
  selectedEdge,
  isOwner,
  onDelete,
}: EdgePropertiesPanelProps) => {
  const [showDeleteEdgeAlert, setShowDeleteEdgeAlert] = useState(false);

  const handleDeleteEdge = () => {
    onDelete();
    setShowDeleteEdgeAlert(false);
  };

  return (
    <>
      <div className="flex size-full flex-col">
        <div className="flex h-14 w-full shrink-0 items-center border-b bg-transparent px-4">
          <h2 className="font-semibold text-foreground">Propriedades</h2>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <Label className="ml-1" htmlFor="edge-id">
              ID da conexão
            </Label>
            <Input disabled id="edge-id" value={selectedEdge.id} />
          </div>
          <div className="space-y-2">
            <Label className="ml-1" htmlFor="edge-source">
              Origem
            </Label>
            <Input disabled id="edge-source" value={selectedEdge.source} />
          </div>
          <div className="space-y-2">
            <Label className="ml-1" htmlFor="edge-target">
              Destino
            </Label>
            <Input disabled id="edge-target" value={selectedEdge.target} />
          </div>

          {isOwner && (
            <div className="flex items-center gap-2 pt-4">
              <Button
                className="text-muted-foreground"
                onClick={() => setShowDeleteEdgeAlert(true)}
                size="sm"
                variant="ghost"
              >
                <Trash2 className="mr-2 size-4" />
                Excluir
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        onOpenChange={setShowDeleteEdgeAlert}
        open={showDeleteEdgeAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conexão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conexão? Essa ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEdge}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
