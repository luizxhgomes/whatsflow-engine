"use client";

import { Download, FlaskConical } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/builder/ui/alert";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";
import type { OverlayComponentProps } from "./types";

type ExportWorkflowOverlayProps = OverlayComponentProps<{
  onExport: () => void;
  isDownloading?: boolean;
}>;

export function ExportWorkflowOverlay({
  overlayId,
  onExport,
  isDownloading,
}: ExportWorkflowOverlayProps) {
  const { closeAll } = useOverlay();

  const handleExport = () => {
    closeAll();
    onExport();
  };

  return (
    <Overlay
      actions={[
        { label: "Cancelar", variant: "outline", onClick: closeAll },
        {
          label: isDownloading ? "Exportando..." : "Exportar projeto",
          onClick: handleExport,
          loading: isDownloading,
        },
      ]}
      overlayId={overlayId}
      title="Exportar fluxo como código"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Download className="size-5" />
        <p className="text-sm">
          Exporte seu fluxo como um projeto Next.js independente.
        </p>
      </div>

      <p className="mt-4 text-muted-foreground text-sm">
        Isso gera um projeto Next.js completo com o código do fluxo. Depois de
        exportar, você pode executá-lo fora do Builder, publicar na Vercel ou
        integrar em outras aplicações.
      </p>

      <Alert className="mt-4">
        <FlaskConical className="size-4" />
        <AlertTitle>Recurso experimental</AlertTitle>
        <AlertDescription className="block">
          Este recurso e experimental e pode ter limitações. Se encontrar
          problemas,{" "}
          <a
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
            href="https://github.com/vercel-labs/workflow-builder-template/issues"
            rel="noopener noreferrer"
            target="_blank"
          >
            reporte no GitHub
          </a>
          .
        </AlertDescription>
      </Alert>
    </Overlay>
  );
}
