"use client";

import Image from "next/image";
import { findActionById } from "@/lib/builder/plugins";
import { CollapsibleSection } from "./collapsible-section";
import { JsonWithLinks } from "./json-with-links";
import type { OutputDisplayProps } from "./types";
import {
  getOutputConfig,
  getOutputDisplayValue,
  isBase64ImageOutput,
} from "./utils";

/**
 * Component for rendering output with rich display support
 */
export function OutputDisplay({
  output,
  input,
  actionType,
}: OutputDisplayProps) {
  // Look up action from plugin registry to get outputConfig (including custom components)
  const action = actionType ? findActionById(actionType) : undefined;
  const pluginConfig = action?.outputConfig;

  // Fall back to auto-generated config for legacy support (only built-in types)
  const builtInConfig = actionType ? getOutputConfig(actionType) : undefined;

  // Get the effective built-in config (only plugin configs with direct fields)
  const effectiveBuiltInConfig =
    pluginConfig && pluginConfig.type !== "component" ? pluginConfig : undefined;

  // Get display value for built-in types (image/video/url)
  const displayValue = effectiveBuiltInConfig
    ? getOutputDisplayValue(output, effectiveBuiltInConfig)
    : undefined;

  // Check for legacy base64 image
  const isLegacyBase64 =
    !pluginConfig && !builtInConfig && isBase64ImageOutput(output);

  const renderRichResult = () => {
    // Priority 1: Custom component from plugin outputConfig
    if (pluginConfig?.type === "component") {
      const CustomComponent = pluginConfig.component;
      return (
        <div className="overflow-hidden rounded-lg border bg-muted/50 p-3">
          <CustomComponent input={input} output={output} />
        </div>
      );
    }

    // Priority 2: Built-in output config (image/video/url)
    if (effectiveBuiltInConfig && displayValue) {
      switch (effectiveBuiltInConfig.type) {
        case "image": {
          // Handle base64 images by adding data URI prefix if needed
          const imageSrc =
            effectiveBuiltInConfig.field === "base64" &&
            !displayValue.startsWith("data:")
              ? `data:image/png;base64,${displayValue}`
              : displayValue;
          return (
            <div className="overflow-hidden rounded-lg border bg-muted/50 p-3">
              <Image
                alt="Generated image"
                className="max-h-96 w-auto rounded"
                height={384}
                src={imageSrc}
                unoptimized
                width={384}
              />
            </div>
          );
        }
        case "video":
          return (
            <div className="overflow-hidden rounded-lg border bg-muted/50 p-3">
              <video
                className="max-h-96 w-auto rounded"
                controls
                src={displayValue}
              >
                <track kind="captions" />
              </video>
            </div>
          );
        case "url":
          return (
            <div className="overflow-hidden rounded-lg border bg-muted/50">
              <iframe
                className="h-96 w-full rounded"
                sandbox="allow-scripts allow-same-origin"
                src={displayValue}
                title="Preview de saida"
              />
            </div>
          );
        default:
          return null;
      }
    }

    // Fallback: legacy base64 image detection
    if (isLegacyBase64) {
      return (
        <div className="overflow-hidden rounded-lg border bg-muted/50 p-3">
          <Image
            alt="AI generated output"
            className="max-h-96 w-auto rounded"
            height={384}
            src={`data:image/png;base64,${(output as { base64: string }).base64}`}
            unoptimized
            width={384}
          />
        </div>
      );
    }

    return null;
  };

  const richResult = renderRichResult();
  const hasRichResult = richResult !== null;

  // Determine external link for URL type configs
  const externalLink =
    effectiveBuiltInConfig?.type === "url" && displayValue
      ? displayValue
      : undefined;

  return (
    <>
      {/* Always show JSON output */}
      <CollapsibleSection copyData={output} title="Saida">
        <pre className="overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
          <JsonWithLinks data={output} />
        </pre>
      </CollapsibleSection>

      {/* Show rich result if available */}
      {hasRichResult && (
        <CollapsibleSection
          defaultExpanded
          externalLink={externalLink}
          title="Resultado"
        >
          {richResult}
        </CollapsibleSection>
      )}
    </>
  );
}
