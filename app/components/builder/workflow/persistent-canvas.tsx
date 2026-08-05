"use client";

import { usePathname } from "next/navigation";
import { WorkflowCanvas } from "./workflow-canvas";

export function PersistentCanvas() {
  const pathname = usePathname();

  // Show canvas on homepage and workflow pages
  const showCanvas = pathname.startsWith("/builder/");

  if (!showCanvas) {
    return null;
  }

  return (
    <div
      className="fixed inset-y-0 right-0 z-0"
      style={{ left: "var(--builder-sidebar-width, 0px)" }}
    >
      <WorkflowCanvas />
    </div>
  );
}
