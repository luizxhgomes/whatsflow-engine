"use client";

import { Globe } from "lucide-react";
import { Overlay } from "./overlay";
import { useOverlay } from "./overlay-provider";
import type { OverlayComponentProps } from "./types";

type MakePublicOverlayProps = OverlayComponentProps<{
  onConfirm: () => void;
}>;

export function MakePublicOverlay({
  overlayId,
  onConfirm,
}: MakePublicOverlayProps) {
  const { closeAll } = useOverlay();

  const handleConfirm = () => {
    closeAll();
    onConfirm();
  };

  return (
    <Overlay
      actions={[
        { label: "Cancelar", variant: "outline", onClick: closeAll },
        { label: "Tornar público", onClick: handleConfirm },
      ]}
      overlayId={overlayId}
      title="Tornar fluxo público?"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Globe className="size-5 shrink-0" />
        <p className="text-sm">
          Tornar este fluxo público significa que qualquer pessoa com o link pode:
        </p>
      </div>

      <ul className="mt-3 list-inside list-disc space-y-1 text-muted-foreground text-sm">
        <li>Ver a estrutura e as etapas do fluxo</li>
        <li>Ver tipos de ação e configurações</li>
        <li>Duplicar o fluxo para a propria conta</li>
      </ul>

      <p className="mt-4 font-medium text-foreground text-sm">
        O que continua privado:
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground text-sm">
        <li>Suas credenciais de integração (chaves de API, tokens)</li>
        <li>Logs de execução e histórico de execuções</li>
      </ul>
    </Overlay>
  );
}
