"use client";

import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";
import { CopyButton } from "./copy-button";
import type { CollapsibleSectionProps } from "./types";

/**
 * Collapsible section component with optional copy and external link buttons
 */
export function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
  copyData,
  isError = false,
  externalLink,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  return (
    <div>
      <div className="mb-2 flex w-full items-center justify-between">
        <button
          className="flex items-center gap-1.5"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            {title}
          </span>
        </button>
        <div className="flex items-center gap-1">
          {externalLink && (
            <Button asChild className="h-7 px-2" size="sm" variant="ghost">
              <a href={externalLink} rel="noopener noreferrer" target="_blank">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
          {copyData !== undefined && (
            <CopyButton data={copyData} isError={isError} />
          )}
        </div>
      </div>
      {isOpen && children}
    </div>
  );
}
