"use client";

import {
  Check,
  ChevronRight,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import type { JSX } from "react";

/**
 * Get the status icon component for a given status
 */
export function getStatusIcon(status: string): JSX.Element {
  switch (status) {
    case "success":
      return <Check className="h-3 w-3 text-white" />;
    case "error":
      return <X className="h-3 w-3 text-white" />;
    case "running":
      return <Loader2 className="h-3 w-3 animate-spin text-white" />;
    case "skipped":
      return <ChevronRight className="h-3 w-3 text-white" />;
    default:
      return <Clock className="h-3 w-3 text-white" />;
  }
}

/**
 * Get the CSS class for the status dot background
 */
export function getStatusDotClass(status: string): string {
  switch (status) {
    case "success":
      return "bg-green-600";
    case "error":
      return "bg-red-600";
    case "running":
      return "bg-orange-600";
    case "skipped":
      return "bg-gray-500";
    default:
      return "bg-muted-foreground";
  }
}
