"use client";

import { Copy, FileCode } from "lucide-react";
import { Button } from "@/components/builder/ui/button";
import { CodeEditor } from "@/components/builder/ui/code-editor";
import type { CodePanelProps } from "./types";

export const CodePanel = ({
  code,
  filename,
  language,
  onCopy,
}: CodePanelProps) => {
  return (
    <>
      {filename && (
        <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-3 pb-2">
          <div className="flex items-center gap-2">
            <FileCode className="size-3.5 text-muted-foreground" />
            <code className="text-muted-foreground text-xs">{filename}</code>
          </div>
          <Button
            className="text-muted-foreground"
            onClick={onCopy}
            size="sm"
            variant="ghost"
          >
            <Copy className="mr-2 size-4" />
            Copiar
          </Button>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <CodeEditor
          height="100%"
          language={language}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: "on",
            folding: language === "typescript",
            wordWrap: "off",
            padding: { top: 16, bottom: 16 },
          }}
          value={code}
        />
      </div>
    </>
  );
};
