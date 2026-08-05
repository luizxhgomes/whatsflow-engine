"use client";

import { useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/builder/utils";
import { nodesAtom, selectedNodeAtom } from "@/lib/builder/workflow-store";
import { findActionById } from "@/lib/builder/plugins";
import type { CustomFieldDefinition } from "@/types";
import { customFieldService } from "@/services/customFieldService";
import { TemplateAutocomplete } from "./template-autocomplete";

export interface TemplateBadgeTextareaProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  rows?: number;
}

// Helper to check if a template references an existing node
function doesNodeExist(template: string, nodes: ReturnType<typeof useAtom<typeof nodesAtom>>[0]): boolean {
  const match = template.match(/\{\{@([^:]+):([^}]+)\}\}/);
  if (!match) return false;
  
  const nodeId = match[1];
  return nodes.some((n) => n.id === nodeId);
}

// Helper to get display text from template by looking up current node label
function getDisplayTextForTemplate(template: string, nodes: ReturnType<typeof useAtom<typeof nodesAtom>>[0]): string {
  // Extract nodeId and field from template: {{@nodeId:OldLabel.field}}
  const match = template.match(/\{\{@([^:]+):([^}]+)\}\}/);
  if (!match) return template;
  
  const nodeId = match[1];
  const rest = match[2]; // e.g., "OldLabel.field" or "OldLabel"
  
  // Find the current node
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) {
    // Node not found, return as-is
    return rest;
  }
  
  // Get display label: custom label > human-readable action label > fallback
  let displayLabel: string | undefined = node.data.label;
  if (!displayLabel && node.data.type === "action") {
    const actionType = node.data.config?.actionType as string | undefined;
    if (actionType) {
      const action = findActionById(actionType);
      displayLabel = action?.label;
    }
  }
  
  const dotIndex = rest.indexOf(".");
  
  if (dotIndex === -1) {
    // No field, just the node: {{@nodeId:Label}}
    return displayLabel ?? rest;
  }
  
  // Has field: {{@nodeId:Label.field}}
  const field = rest.substring(dotIndex + 1);
  
  // If no display label, fall back to the original label from the template
  if (!displayLabel) {
    return rest;
  }
  
  return `${displayLabel}.${field}`;
}

type TokenOption = {
  id: string;
  label: string;
  token: string;
  group: "Sistema" | "Personalizado";
};

type TokenAutocompleteProps = {
  isOpen: boolean;
  position: { top: number; left: number };
  options: TokenOption[];
  onSelect: (token: string) => void;
  onClose: () => void;
  filter?: string;
};

function TokenAutocomplete({
  isOpen,
  position,
  options,
  onSelect,
  onClose,
  filter = "",
}: TokenAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter, options.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (options[selectedIndex]) {
            onSelect(options[selectedIndex].token);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, options, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const selectedElement = menuRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen || options.length === 0 || !mounted) {
    return null;
  }

  const adjustedPosition = {
    top: Math.min(position.top, window.innerHeight - 300),
    left: Math.min(position.left, window.innerWidth - 320),
  };

  const menuContent = (
    <div
      className="fixed z-[9999] w-80 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
      ref={menuRef}
      style={{
        top: `${adjustedPosition.top}px`,
        left: `${adjustedPosition.left}px`,
      }}
    >
      <div className="max-h-60 overflow-y-auto">
        {options.map((option, index) => (
          <div
            className={cn(
              "flex cursor-pointer items-center justify-between rounded px-2 py-1.5 text-sm transition-colors",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            )}
            key={option.id}
            onClick={() => onSelect(option.token)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="flex-1">
              <div className="font-medium">{option.label}</div>
              <div className="text-muted-foreground text-xs">
                {option.token}
              </div>
            </div>
            <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
              {option.group}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return createPortal(menuContent, document.body);
}

/**
 * A textarea component that renders template variables as styled badges
 * Converts {{@nodeId:DisplayName.field}} to badges showing "DisplayName.field"
 */
export function TemplateBadgeTextarea({
  value = "",
  onChange,
  placeholder,
  disabled,
  className,
  id,
  rows = 3,
}: TemplateBadgeTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(value);
  const shouldUpdateDisplay = useRef(true);
  const [selectedNodeId] = useAtom(selectedNodeAtom);
  const [nodes] = useAtom(nodesAtom);
  const { data: customFields = [] } = useQuery<CustomFieldDefinition[]>({
    queryKey: ["customFields", "contact"],
    queryFn: () => customFieldService.getAll("contact"),
  });
  const systemTokenOptions = useMemo<TokenOption[]>(
    () => [
      {
        id: "contact.name",
        label: "Nome do contato",
        token: "{{contact.name}}",
        group: "Sistema",
      },
      {
        id: "contact.phone",
        label: "Telefone do contato",
        token: "{{contact.phone}}",
        group: "Sistema",
      },
      {
        id: "contact.email",
        label: "Email do contato",
        token: "{{contact.email}}",
        group: "Sistema",
      },
    ],
    []
  );
  const customTokenOptions = useMemo<TokenOption[]>(
    () => {
      const mapped: Array<TokenOption | null> = customFields.map((field) => {
        const key = String(field.key || "").trim();
        const label = String(field.label || key).trim();
        if (!key || !label) return null;
        return {
          id: `custom.${key}`,
          label,
          token: `{{${key}}}`,
          group: "Personalizado",
        };
      });
      return mapped.filter((field): field is TokenOption => Boolean(field));
    },
    [customFields]
  );
  const tokenOptions = useMemo(() => {
    const all = [...systemTokenOptions, ...customTokenOptions];
    return all.sort((a, b) => {
      if (a.group !== b.group) {
        return a.group === "Sistema" ? -1 : 1;
      }
      return a.label.localeCompare(b.label);
    });
  }, [systemTokenOptions, customTokenOptions]);
  const [tokenFilter, setTokenFilter] = useState("");
  const filteredTokenOptions = useMemo(() => {
    const trimmed = tokenFilter.trim().toLowerCase();
    if (!trimmed) return tokenOptions;
    return tokenOptions.filter((option) => {
      const label = option.label.toLowerCase();
      const token = option.token.toLowerCase();
      const id = option.id.toLowerCase();
      return (
        label.includes(trimmed) || token.includes(trimmed) || id.includes(trimmed)
      );
    });
  }, [tokenFilter, tokenOptions]);
  
  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [autocompleteFilter, setAutocompleteFilter] = useState("");
  const [atSignPosition, setAtSignPosition] = useState<number | null>(null);
  const [showTokenAutocomplete, setShowTokenAutocomplete] = useState(false);
  const [tokenAutocompletePosition, setTokenAutocompletePosition] = useState({ top: 0, left: 0 });
  const [bracePosition, setBracePosition] = useState<number | null>(null);
  const pendingCursorPosition = useRef<number | null>(null);

  // Update internal value when prop changes from outside
  useEffect(() => {
    if (value !== internalValue && !isFocused) {
      setInternalValue(value);
      shouldUpdateDisplay.current = true;
    }
  }, [value, isFocused, internalValue]);

  // Update display when nodes change (to reflect label updates)
  useEffect(() => {
    if (!isFocused && internalValue) {
      shouldUpdateDisplay.current = true;
    }
  }, [nodes, isFocused, internalValue]);

  // Save cursor position
  const saveCursorPosition = (): { offset: number } | null => {
    if (!contentRef.current) return null;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(contentRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    
    // Calculate offset considering badges as single characters
    let offset = 0;
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );
    
    let node;
    let found = false;
    while ((node = walker.nextNode()) && !found) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node === range.endContainer) {
          offset += range.endOffset;
          found = true;
        } else {
          const textLength = (node.textContent || "").length;
          offset += textLength;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const template = element.getAttribute("data-template");
        if (template) {
          if (element.contains(range.endContainer) || element === range.endContainer) {
            offset += template.length;
            found = true;
          } else {
            offset += template.length;
          }
        } else if (element.tagName === "BR") {
          if (element === range.endContainer || element.contains(range.endContainer)) {
            found = true;
          } else {
            offset += 1; // Count line break as 1 character
          }
        }
      }
    }
    
    return { offset };
  };
  
  // Restore cursor position
  const restoreCursorPosition = (cursorPos: { offset: number } | null) => {
    if (!contentRef.current || !cursorPos) return;
    
    let offset = 0;
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );
    
    let node;
    let targetNode: Node | null = null;
    let targetOffset = 0;
    
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = (node.textContent || "").length;
        if (offset + textLength >= cursorPos.offset) {
          targetNode = node;
          targetOffset = cursorPos.offset - offset;
          break;
        }
        offset += textLength;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const template = element.getAttribute("data-template");
        if (template) {
          if (offset + template.length >= cursorPos.offset) {
            // Position cursor after the badge
            targetNode = element.nextSibling;
            targetOffset = 0;
            if (!targetNode && element.parentNode) {
              // If no next sibling, create a text node
              targetNode = document.createTextNode("");
              element.parentNode.appendChild(targetNode);
            }
            break;
          }
          offset += template.length;
        } else if (element.tagName === "BR") {
          if (offset + 1 >= cursorPos.offset) {
            // Position cursor after the BR
            targetNode = element.nextSibling;
            targetOffset = 0;
            if (!targetNode && element.parentNode) {
              targetNode = document.createTextNode("");
              element.parentNode.appendChild(targetNode);
            }
            break;
          }
          offset += 1;
        }
      }
    }
    
    if (targetNode) {
      const range = document.createRange();
      const selection = window.getSelection();
      try {
        range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        contentRef.current.focus();
      } catch (e) {
        // If positioning fails, just focus the element
        contentRef.current.focus();
      }
    }
  };

  // Parse text and render with badges
  const updateDisplay = () => {
    if (!contentRef.current || !shouldUpdateDisplay.current) return;

    const container = contentRef.current;
    const text = internalValue || "";
    
    // Save cursor position before updating
    let cursorPos = isFocused ? saveCursorPosition() : null;

    // If we have a pending cursor position (from autocomplete), use that instead
    if (pendingCursorPosition.current !== null) {
      cursorPos = { offset: pendingCursorPosition.current };
      pendingCursorPosition.current = null;
    }

    // Clear current content
    container.innerHTML = "";

    if (!text && !isFocused) {
      // Show placeholder (using DOM API to prevent XSS)
      const placeholderSpan = document.createElement("span");
      placeholderSpan.className = "text-muted-foreground pointer-events-none";
      placeholderSpan.textContent = placeholder || "";
      container.appendChild(placeholderSpan);
      return;
    }

    // Match template patterns: {{@nodeId:DisplayName.field}} or {{@nodeId:DisplayName}}
    const pattern = /\{\{@([^:]+):([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const [fullMatch, , displayPart] = match;
      const matchStart = match.index;

      // Add text before the template (preserving line breaks)
      if (matchStart > lastIndex) {
        const textBefore = text.slice(lastIndex, matchStart);
        addTextWithLineBreaks(container, textBefore);
      }

      // Create badge for template
      const badge = document.createElement("span");
      const nodeExists = doesNodeExist(fullMatch, nodes);
      badge.className = nodeExists
        ? "inline-flex items-center gap-1 rounded bg-orange-500/10 px-1.5 py-0.5 text-orange-600 dark:text-orange-400 font-mono text-xs border border-orange-500/20 mx-0.5"
        : "inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-red-600 dark:text-red-400 font-mono text-xs border border-red-500/20 mx-0.5";
      badge.contentEditable = "false";
      badge.setAttribute("data-template", fullMatch);
      // Use current node label for display
      badge.textContent = getDisplayTextForTemplate(fullMatch, nodes);
      container.appendChild(badge);

      lastIndex = pattern.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const textAfter = text.slice(lastIndex);
      addTextWithLineBreaks(container, textAfter);
    }

    // If empty and focused, ensure we can type
    if (container.innerHTML === "" && isFocused) {
      container.innerHTML = "<br>";
    }

    shouldUpdateDisplay.current = false;
    
    // Restore cursor position after updating
    if (cursorPos) {
      // Use requestAnimationFrame to ensure DOM is fully updated
      requestAnimationFrame(() => restoreCursorPosition(cursorPos));
    }
  };

  // Helper to add text with line breaks preserved
  const addTextWithLineBreaks = (container: HTMLElement, text: string) => {
    const lines = text.split("\n");
    lines.forEach((line, index) => {
      if (line) {
        container.appendChild(document.createTextNode(line));
      }
      if (index < lines.length - 1) {
        container.appendChild(document.createElement("br"));
      }
    });
  };

  // Extract plain text from content
  const extractValue = (): string => {
    if (!contentRef.current) return "";

    let result = "";
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Check if this text node is inside a badge element
        let parent = node.parentElement;
        let isInsideBadge = false;
        while (parent && parent !== contentRef.current) {
          if (parent.getAttribute("data-template")) {
            isInsideBadge = true;
            break;
          }
          parent = parent.parentElement;
        }
        
        // Only add text if it's NOT inside a badge
        if (!isInsideBadge) {
          result += node.textContent;
        } else {
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const template = element.getAttribute("data-template");
        if (template) {
          result += template;
        } else if (element.tagName === "BR") {
          result += "\n";
        }
      }
    }

    return result;
  };

  const updateAutocompleteState = (newValue: string) => {
    const lastAtSign = newValue.lastIndexOf("@");
    const lastOpenBrace = newValue.lastIndexOf("{");
    const lastCloseBrace = newValue.lastIndexOf("}");

    const atFilter =
      lastAtSign !== -1 ? newValue.slice(lastAtSign + 1) : "";
    const braceFilter =
      lastOpenBrace !== -1 ? newValue.slice(lastOpenBrace + 1) : "";

    const hasAt =
      lastAtSign !== -1 &&
      !atFilter.includes(" ") &&
      !atFilter.includes("\n");
    const hasBrace =
      lastOpenBrace !== -1 &&
      lastOpenBrace > lastCloseBrace &&
      !braceFilter.includes(" ") &&
      !braceFilter.includes("\n");

    const position = contentRef.current
      ? (() => {
          const textareaRect = contentRef.current.getBoundingClientRect();
          return {
            top: textareaRect.bottom + window.scrollY + 4,
            left: textareaRect.left + window.scrollX,
          };
        })()
      : null;

    if (hasAt && (!hasBrace || lastAtSign > lastOpenBrace)) {
      setAutocompleteFilter(atFilter);
      setAtSignPosition(lastAtSign);
      setShowAutocomplete(true);
      setShowTokenAutocomplete(false);
      setBracePosition(null);
      setTokenFilter("");
      if (position) {
        setAutocompletePosition(position);
      }
      return;
    }

    if (hasBrace && (!hasAt || lastOpenBrace > lastAtSign)) {
      setTokenFilter(braceFilter);
      setBracePosition(lastOpenBrace);
      setShowTokenAutocomplete(true);
      setShowAutocomplete(false);
      setAtSignPosition(null);
      setAutocompleteFilter("");
      if (position) {
        setTokenAutocompletePosition(position);
      }
      return;
    }

    setShowAutocomplete(false);
    setAtSignPosition(null);
    setShowTokenAutocomplete(false);
    setBracePosition(null);
  };

  const handleInput = () => {
    // Extract the value from DOM
    const newValue = extractValue();
    
    
    // Check if the value has changed
    if (newValue === internalValue) {
      // No change, ignore (this can happen with badge clicks, etc)
      return;
    }
    
    // Count templates in old and new values
    const oldTemplates = (internalValue.match(/\{\{@([^:]+):([^}]+)\}\}/g) || []).length;
    const newTemplates = (newValue.match(/\{\{@([^:]+):([^}]+)\}\}/g) || []).length;
    
    
    if (newTemplates > oldTemplates) {
      // A new template was added, update display to show badge
      setInternalValue(newValue);
      onChange?.(newValue);
      shouldUpdateDisplay.current = true;
      setShowAutocomplete(false);
      setShowTokenAutocomplete(false);
      setBracePosition(null);
      setTokenFilter("");
      
      // Call updateDisplay immediately to render badges
      requestAnimationFrame(() => updateDisplay());
      return;
    }
    
    if (newTemplates === oldTemplates && newTemplates > 0) {
      // Same number of templates, just typing around existing badges
      // DON'T update display, just update the value
      setInternalValue(newValue);
      onChange?.(newValue);
      // Don't trigger display update - this prevents cursor reset!
      updateAutocompleteState(newValue);
      
      return;
    }
    
    if (newTemplates < oldTemplates) {
      // A template was removed (e.g., user deleted a badge or part of template text)
      setInternalValue(newValue);
      onChange?.(newValue);
      shouldUpdateDisplay.current = true;
      setShowTokenAutocomplete(false);
      setBracePosition(null);
      setTokenFilter("");
      requestAnimationFrame(() => updateDisplay());
      return;
    }
    
    // Normal typing (no badges present)
    setInternalValue(newValue);
    onChange?.(newValue);
    
    updateAutocompleteState(newValue);
  };

  const handleAutocompleteSelect = (template: string) => {
    if (!contentRef.current || atSignPosition === null) return;
    
    // Get current text
    const currentText = extractValue();
    
    // Replace from @ position to end of filter with the template
    const beforeAt = currentText.slice(0, atSignPosition);
    const afterFilter = currentText.slice(atSignPosition + 1 + autocompleteFilter.length);
    const newText = beforeAt + template + afterFilter;
    
    // Calculate where cursor should be after the template (right after the badge)
    const targetCursorPosition = beforeAt.length + template.length;

    setInternalValue(newText);
    onChange?.(newText);
    shouldUpdateDisplay.current = true;
    
    setShowAutocomplete(false);
    setAtSignPosition(null);
    setShowTokenAutocomplete(false);
    setBracePosition(null);
    setTokenFilter("");

    // Set pending cursor position for the next update
    pendingCursorPosition.current = targetCursorPosition;
    
    // Ensure we focus the input so the display update and cursor restoration works
    contentRef.current.focus();
  };

  const handleTokenAutocompleteSelect = (token: string) => {
    if (!contentRef.current || bracePosition === null) return;

    const currentText = extractValue();
    const beforeBrace = currentText.slice(0, bracePosition);
    const afterFilter = currentText.slice(bracePosition + 1 + tokenFilter.length);
    const newText = beforeBrace + token + afterFilter;

    const targetCursorPosition = beforeBrace.length + token.length;

    setInternalValue(newText);
    onChange?.(newText);
    shouldUpdateDisplay.current = true;

    setShowTokenAutocomplete(false);
    setBracePosition(null);
    setTokenFilter("");
    setShowAutocomplete(false);
    setAtSignPosition(null);

    pendingCursorPosition.current = targetCursorPosition;
    contentRef.current.focus();
  };

  const handleFocus = () => {
    setIsFocused(true);
    shouldUpdateDisplay.current = true;
  };

  const handleBlur = () => {
    // Delay to allow autocomplete click to register
    setTimeout(() => {
      if (document.activeElement === contentRef.current) {
        return;
      }
      setIsFocused(false);
      // Don't extract value on blur - it's already in sync from handleInput
      // Just trigger a display update to ensure everything renders correctly
      shouldUpdateDisplay.current = true;
      setShowAutocomplete(false);
      setShowTokenAutocomplete(false);
    }, 200);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter key to insert line breaks
    if (e.key === "Enter") {
      if (showAutocomplete || showTokenAutocomplete) {
        return;
      }
      e.preventDefault();
      document.execCommand("insertLineBreak");
    }
  };

  // Update display only when needed (not while typing)
  useEffect(() => {
    if (shouldUpdateDisplay.current) {
      updateDisplay();
    }
  }, [internalValue, isFocused]);

  // Calculate min height based on rows
  const minHeight = `${rows * 1.5}rem`;

  return (
    <>
      <div
        className={cn(
          "flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-within:outline-none focus-within:ring-1 focus-within:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
        style={{ minHeight }}
      >
        <div
          className="w-full outline-none whitespace-pre-wrap break-words"
          contentEditable={!disabled}
          id={id}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          ref={contentRef}
          role="textbox"
          suppressContentEditableWarning
        />
      </div>
      
      <TemplateAutocomplete
        currentNodeId={selectedNodeId || undefined}
        filter={autocompleteFilter}
        isOpen={showAutocomplete}
        onClose={() => setShowAutocomplete(false)}
        onSelect={handleAutocompleteSelect}
        position={autocompletePosition}
      />
      <TokenAutocomplete
        filter={tokenFilter}
        isOpen={showTokenAutocomplete}
        onClose={() => setShowTokenAutocomplete(false)}
        onSelect={handleTokenAutocompleteSelect}
        options={filteredTokenOptions}
        position={tokenAutocompletePosition}
      />
    </>
  );
}
