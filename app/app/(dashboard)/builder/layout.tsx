"use client";

import type { ReactNode } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { OverlayContainer } from "@/components/builder/overlays/overlay-container";
import { OverlayProvider } from "@/components/builder/overlays/overlay-provider";
import { OverlaySync } from "@/components/builder/overlays/overlay-sync";
import { PersistentCanvas } from "@/components/builder/workflow/persistent-canvas";
import { PageLayoutScope } from "@/components/providers/PageLayoutProvider";

type BuilderLayoutProps = {
  children: ReactNode;
};

export default function BuilderLayout({ children }: BuilderLayoutProps) {
  return (
    <PageLayoutScope
      value={{
        width: "full",
        overflow: "hidden",
        padded: false,
        height: "full",
        showAccountAlerts: false,
      }}
    >
      <ReactFlowProvider>
        <OverlayProvider>
          <OverlaySync />
          <PersistentCanvas />
          {children}
          <OverlayContainer />
        </OverlayProvider>
      </ReactFlowProvider>
    </PageLayoutScope>
  );
}
