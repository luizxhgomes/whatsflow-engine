"use client";

import dynamic from "next/dynamic";
import { type EditorProps, type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { vercelDarkTheme } from "@/lib/builder/monaco-theme";

// Lazy load Monaco Editor (~800KB - 1.2MB reduction in initial bundle)
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse bg-zinc-800 rounded-lg flex items-center justify-center">
        <span className="text-zinc-500 text-sm">Carregando editor...</span>
      </div>
    ),
  }
);

/**
 * Props for the CodeEditor component.
 * Extends Monaco Editor props with automatic theme support.
 */
export interface CodeEditorProps extends EditorProps {}

export function CodeEditor(props: CodeEditorProps) {
  const { resolvedTheme } = useTheme();

  const handleEditorMount: OnMount = (editor, monaco) => {
    monaco.editor.defineTheme("vercel-dark", vercelDarkTheme);
    monaco.editor.setTheme(resolvedTheme === "dark" ? "vercel-dark" : "light");

    if (props.onMount) {
      props.onMount(editor, monaco);
    }
  };

  return (
    <MonacoEditor
      {...props}
      onMount={handleEditorMount}
      theme={resolvedTheme === "dark" ? "vercel-dark" : "light"}
    />
  );
}

