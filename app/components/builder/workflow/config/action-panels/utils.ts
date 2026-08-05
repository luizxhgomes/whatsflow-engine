import type { Template, TemplateButton, TemplateComponent } from "@/types";

// Types
export type TemplateParamEntry = { key?: string; text?: string };
export type TemplateButtonEntry = { index?: number; params?: Array<{ text?: string }> };
export type TemplateSegment =
  | { type: "text"; value: string }
  | { type: "var"; key: string };
export type ButtonDefinition = { id: string; title: string };

export const BUTTON_PRESETS = [
  { id: "none", label: "Sem preset", titles: [] as string[] },
  { id: "yes_no", label: "Sim / Nao", titles: ["Sim", "Nao"] },
  { id: "learn_more", label: "Quero saber mais", titles: ["Quero saber mais"] },
  { id: "human", label: "Falar com humano", titles: ["Falar com humano"] },
];

// Parse JSON array safely
export function parseJsonArraySafe<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw !== "string" || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

// Convert button params to input string
export function buttonParamToInput(raw: unknown): string {
  const entries = parseJsonArraySafe<TemplateButtonEntry>(raw);
  const first = entries.find((entry) => entry?.params?.[0]?.text);
  const text = first?.params?.[0]?.text;
  return text ? String(text) : "";
}

// Convert params to map
export function paramsToMap(raw: unknown): Record<string, string> {
  const entries = parseJsonArraySafe<TemplateParamEntry>(raw);
  const map: Record<string, string> = {};
  entries.forEach((entry, index) => {
    const key = String(entry?.key || String(index + 1)).trim();
    const text = String(entry?.text || "").trim();
    if (!key || !text) return;
    map[key] = text;
  });
  return map;
}

// Build params from map
export function buildParamsFromMap(
  map: Record<string, string>,
  keys: string[],
  format: string
): TemplateParamEntry[] {
  const entries: TemplateParamEntry[] = [];
  if (format === "named") {
    for (const key of keys) {
      const value = String(map[key] || "").trim();
      if (!value) continue;
      entries.push({ key, text: value });
    }
    return entries;
  }

  for (const key of keys) {
    const value = String(map[key] || "").trim();
    if (!value) continue;
    entries.push({ key, text: value });
  }
  return entries;
}

// Split template text into segments
export function splitTemplateText(text: string, format: string): TemplateSegment[] {
  if (!text) return [];
  const pattern =
    format === "named"
      ? /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g
      : /\{\{\s*(\d+)\s*\}\}/g;
  const segments: TemplateSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const start = match.index;
    if (start > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    segments.push({ type: "var", key: match[1] });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }
  return segments;
}

// Build button params from input
export function buildButtonParamsFromInput(
  raw: string,
  index?: number | null
): TemplateButtonEntry[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return [
    {
      index: typeof index === "number" ? index : 0,
      params: [{ text: trimmed }],
    },
  ];
}

// Extract positional keys from template text
export function extractPositionalKeys(text?: string): string[] {
  if (!text || !text.includes("{{")) return [];
  const matches = text.match(/\{\{(\d+)\}\}/g) || [];
  const numbers = new Set<number>();
  for (const m of matches) {
    const n = Number(m.replace(/[{}]/g, ""));
    if (Number.isFinite(n)) numbers.add(n);
  }
  return Array.from(numbers)
    .sort((a, b) => a - b)
    .map((n) => String(n));
}

// Extract named keys from template text
export function extractNamedKeys(text?: string): string[] {
  if (!text || !text.includes("{{")) return [];
  const matches = text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
  const names = new Set<string>();
  for (const m of matches) {
    const name = m.replace(/[{}]/g, "");
    if (name) names.add(name);
  }
  return Array.from(names);
}

// Extract template keys based on format
export function extractTemplateKeys(
  text: string | undefined,
  format: string
): string[] {
  return format === "named"
    ? extractNamedKeys(text)
    : extractPositionalKeys(text);
}

// Get template component by type
export function getTemplateComponent(
  template: Template | undefined,
  type: TemplateComponent["type"]
): TemplateComponent | undefined {
  return template?.components?.find((component) => component.type === type);
}

// Check if button has dynamic param
export function buttonHasDynamicParam(button: TemplateButton): boolean {
  const hasPlaceholder = (value?: string | string[]) => {
    if (!value) return false;
    if (Array.isArray(value)) {
      return value.some((entry) => typeof entry === "string" && entry.includes("{{"));
    }
    return value.includes("{{");
  };
  if (button.type === "URL" && typeof button.url === "string") {
    return button.url.includes("{{");
  }
  return hasPlaceholder(button.example);
}

// Find first dynamic button index
export function findFirstDynamicButtonIndex(
  template: Template | undefined
): number | null {
  if (!template?.components?.length) return null;
  let globalIndex = 0;
  for (const component of template.components) {
    if (component.type !== "BUTTONS") continue;
    const buttons = component.buttons || [];
    for (const button of buttons) {
      if (buttonHasDynamicParam(button)) {
        return globalIndex;
      }
      globalIndex += 1;
    }
  }
  return null;
}

// Get button label by index
export function getButtonLabelByIndex(
  template: Template | undefined,
  targetIndex: number | null
): string {
  if (!template?.components?.length || targetIndex === null) return "";
  let globalIndex = 0;
  for (const component of template.components) {
    if (component.type !== "BUTTONS") continue;
    const buttons = component.buttons || [];
    for (const button of buttons) {
      if (globalIndex === targetIndex) {
        return String(button.text || "").trim();
      }
      globalIndex += 1;
    }
  }
  return "";
}

// Normalize button titles from config
export function normalizeButtonTitles(raw: unknown): string[] {
  const fallback: string[] = [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (item && typeof item === "object" ? (item as any).title : ""))
      .filter((title) => typeof title === "string")
      .slice(0, 3) as string[];
  }
  if (typeof raw !== "string" || raw.trim().length === 0) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed
      .map((item) => (item && typeof item === "object" ? (item as any).title : ""))
      .filter((title) => typeof title === "string")
      .slice(0, 3) as string[];
  } catch {
    return fallback;
  }
}

// Slugify button ID
export function slugifyButtonId(title: string): string {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized;
}

// Build buttons from titles
export function buildButtonsFromTitles(titles: string[]): ButtonDefinition[] {
  const used = new Map<string, number>();
  const cleaned = titles
    .map((title) => String(title || "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return cleaned.map((title, index) => {
    const base = slugifyButtonId(title);
    const key = base || `button_${index + 1}`;
    const count = (used.get(key) ?? 0) + 1;
    used.set(key, count);
    const id = count > 1 ? `${key}_${count}` : key;
    return { id, title };
  });
}
