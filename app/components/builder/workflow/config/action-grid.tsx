"use client";

import {
  Bot,
  ChevronRight,
  Clock,
  Code,
  Database,
  Eye,
  EyeOff,
  GitBranch,
  Grid3X3,
  Hand,
  Layers,
  List,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Search,
  Settings,
  Shuffle,
  Tags,
  UserPen,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/builder/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/builder/ui/dropdown-menu";
import { Input } from "@/components/builder/ui/input";
import { IntegrationIcon } from "@/components/builder/ui/integration-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/builder/ui/tooltip";
import { useIsTouch } from "@/hooks/use-touch";
import { cn } from "@/lib/builder/utils";
import { getAllActions } from "@/lib/builder/plugins";

type ActionType = {
  id: string;
  label: string;
  description: string;
  category: string;
  integration?: string;
};

// System actions that don't have plugins
const SYSTEM_ACTIONS: ActionType[] = [
  {
    id: "HTTP Request",
    label: "Requisição HTTP",
    description: "Fazer requisição HTTP para qualquer API",
    category: "Sistema",
  },
  {
    id: "Database Query",
    label: "Consulta ao banco",
    description: "Consultar seu banco de dados",
    category: "Sistema",
  },
  {
    id: "Condition",
    label: "Condição",
    description: "Desviar fluxo com base em condição",
    category: "Sistema",
  },
  {
    id: "Delay",
    label: "Delay",
    description: "Aguardar por um tempo",
    category: "Sistema",
  },
  {
    id: "Set Variable",
    label: "Definir variável",
    description: "Guardar um valor para etapas futuras",
    category: "Sistema",
  },
  {
    id: "Get Variable",
    label: "Obter variável",
    description: "Ler uma variável armazenada",
    category: "Sistema",
  },
];

// Combine System actions with plugin actions
function useAllActions(): ActionType[] {
  return useMemo(() => {
    const pluginActions = getAllActions();

    // Map plugin actions to ActionType format
    const mappedPluginActions: ActionType[] = pluginActions.map((action) => ({
      id: action.id,
      label: action.label,
      description: action.description,
      category: action.category,
      integration: action.integration,
    }));

    return [...SYSTEM_ACTIONS, ...mappedPluginActions];
  }, []);
}

type ActionGridProps = {
  onSelectAction: (actionType: string) => void;
  disabled?: boolean;
  isNewlyCreated?: boolean;
};

// Category-level icon+color mapping
const CATEGORY_ICONS: Record<string, { icon: typeof Zap; color: string }> = {
  Sistema: { icon: Settings, color: "text-muted-foreground" },
  WhatsApp: { icon: MessageCircle, color: "text-emerald-400" },
  Contatos: { icon: UserPen, color: "text-blue-400" },
  Logica: { icon: GitBranch, color: "text-pink-400" },
  IA: { icon: Bot, color: "text-violet-400" },
};

// Per-action icon+color mapping (by system action ID or plugin slug)
const ACTION_ICONS: Record<string, { icon: typeof Zap; color: string }> = {
  "HTTP Request": { icon: Zap, color: "text-amber-300" },
  "Database Query": { icon: Database, color: "text-orange-300" },
  Condition: { icon: GitBranch, color: "text-pink-300" },
  "Execute Code": { icon: Code, color: "text-green-300" },
  Delay: { icon: Clock, color: "text-yellow-300" },
  "Set Variable": { icon: Code, color: "text-cyan-300" },
  "Get Variable": { icon: Code, color: "text-cyan-300" },
};

// Plugin slug to icon mapping
const PLUGIN_SLUG_ICONS: Record<string, { icon: typeof Zap; color: string }> = {
  "send-message": { icon: MessageCircle, color: "text-emerald-400" },
  "ask-question": { icon: MessageCircle, color: "text-emerald-400" },
  "send-template": { icon: MessageCircle, color: "text-emerald-400" },
  "send-media": { icon: MessageCircle, color: "text-emerald-400" },
  "send-buttons": { icon: MessageCircle, color: "text-emerald-400" },
  "send-list": { icon: MessageCircle, color: "text-emerald-400" },
  "wait-for-reply": { icon: Pause, color: "text-emerald-400" },
  "handoff": { icon: Hand, color: "text-amber-400" },
  "update-contact": { icon: UserPen, color: "text-blue-400" },
  "manage-tags": { icon: Tags, color: "text-blue-400" },
  "ab-split": { icon: Shuffle, color: "text-pink-400" },
  "business-hours": { icon: Clock, color: "text-pink-400" },
  "sub-workflow": { icon: Layers, color: "text-purple-400" },
  "ai-response": { icon: Bot, color: "text-violet-400" },
  "send-carousel": { icon: MessageCircle, color: "text-emerald-400" },
  "send-flow": { icon: Layers, color: "text-emerald-400" },
};

function getActionSlug(actionId: string): string | null {
  const slash = actionId.indexOf("/");
  return slash >= 0 ? actionId.substring(slash + 1) : null;
}

function GroupIcon({
  group,
}: {
  group: { category: string; actions: ActionType[] };
}) {
  const catIcon = CATEGORY_ICONS[group.category];
  if (catIcon) {
    const Icon = catIcon.icon;
    return <Icon className={cn("size-4", catIcon.color)} />;
  }
  const firstAction = group.actions[0];
  if (firstAction?.integration) {
    return (
      <IntegrationIcon
        className="size-4"
        integration={firstAction.integration}
      />
    );
  }
  return <Zap className="size-4" />;
}

function ActionIcon({
  action,
  className,
}: {
  action: ActionType;
  className?: string;
}) {
  // System actions by ID
  const systemIcon = ACTION_ICONS[action.id];
  if (systemIcon) {
    const Icon = systemIcon.icon;
    return <Icon className={cn(className, systemIcon.color)} />;
  }

  // Plugin actions by slug
  const slug = getActionSlug(action.id);
  if (slug) {
    const pluginIcon = PLUGIN_SLUG_ICONS[slug];
    if (pluginIcon) {
      const Icon = pluginIcon.icon;
      return <Icon className={cn(className, pluginIcon.color)} />;
    }
  }

  if (action.integration) {
    return (
      <IntegrationIcon className={className} integration={action.integration} />
    );
  }
  return <Settings className={cn(className, "text-muted-foreground")} />;
}

// Local storage keys
const HIDDEN_GROUPS_KEY = "workflow-action-grid-hidden-groups";
const VIEW_MODE_KEY = "workflow-action-grid-view-mode";

type ViewMode = "list" | "grid";

function getInitialHiddenGroups(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(HIDDEN_GROUPS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function getInitialViewMode(): ViewMode {
  if (typeof window === "undefined") return "list";
  try {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    return stored === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export function ActionGrid({
  onSelectAction,
  disabled,
  isNewlyCreated,
}: ActionGridProps) {
  const [filter, setFilter] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(
    getInitialHiddenGroups
  );
  const [showHidden, setShowHidden] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);
  const actions = useAllActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const isTouch = useIsTouch();

  const toggleViewMode = () => {
    const newMode = viewMode === "list" ? "grid" : "list";
    setViewMode(newMode);
    localStorage.setItem(VIEW_MODE_KEY, newMode);
  };

  const toggleGroup = (category: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleHideGroup = (category: string) => {
    setHiddenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      // Persist to localStorage
      localStorage.setItem(HIDDEN_GROUPS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    // Only focus after touch detection is complete (isTouch !== undefined)
    // and only on non-touch devices to avoid opening the keyboard
    if (isNewlyCreated && isTouch === false && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isNewlyCreated, isTouch]);

  const filteredActions = useMemo(() => {
    const searchTerm = filter.toLowerCase();
    return actions.filter((action) =>
      action.label.toLowerCase().includes(searchTerm) ||
      action.description.toLowerCase().includes(searchTerm) ||
      action.category.toLowerCase().includes(searchTerm)
    );
  }, [actions, filter]);

  // Group actions by category
  const groupedActions = useMemo(() => {
    const groups: Record<string, ActionType[]> = {};

    for (const action of filteredActions) {
      const category = action.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(action);
    }

    // Sort categories by user priority: WhatsApp > Contatos > Logica > IA > Sistema
    const CATEGORY_ORDER: Record<string, number> = {
      WhatsApp: 0,
      Contatos: 1,
      Logica: 2,
      IA: 3,
      Sistema: 99,
    };
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      const orderA = CATEGORY_ORDER[a] ?? 50;
      const orderB = CATEGORY_ORDER[b] ?? 50;
      if (orderA !== orderB) return orderA - orderB;
      return a.localeCompare(b);
    });

    return sortedCategories.map((category) => ({
      category,
      actions: groups[category],
    }));
  }, [filteredActions]);

  // Filter groups based on hidden state
  const visibleGroups = useMemo(() => {
    if (showHidden) return groupedActions;
    return groupedActions.filter((g) => !hiddenGroups.has(g.category));
  }, [groupedActions, hiddenGroups, showHidden]);

  const hiddenCount = hiddenGroups.size;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            data-testid="action-search-input"
            disabled={disabled}
            id="action-filter"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar ações..."
            ref={inputRef}
            value={filter}
          />
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="shrink-0"
                onClick={toggleViewMode}
                size="icon"
                variant="ghost"
              >
                {viewMode === "list" ? (
                  <Grid3X3 className="size-4" />
                ) : (
                  <List className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {viewMode === "list" ? "Grid view" : "List view"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {hiddenCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn("shrink-0", showHidden && "bg-muted")}
                  onClick={() => setShowHidden(!showHidden)}
                  size="icon"
                  variant="ghost"
                >
                  {showHidden ? (
                    <Eye className="size-4" />
                  ) : (
                    <EyeOff className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showHidden
                  ? "Hide hidden groups"
                  : `Show ${hiddenCount} hidden group${hiddenCount > 1 ? "s" : ""}`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto pb-4"
        data-testid="action-grid"
      >
        {filteredActions.length === 0 && (
          <p className="py-4 text-center text-muted-foreground text-sm">
            Nenhuma ação encontrada
          </p>
        )}
        {filteredActions.length > 0 && visibleGroups.length === 0 && (
          <p className="py-4 text-center text-muted-foreground text-sm">
            All groups are hidden
          </p>
        )}

        {/* Grid View */}
        {viewMode === "grid" && visibleGroups.length > 0 && (
          <div
            className="grid gap-2 p-1"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
            }}
          >
            {filteredActions
              .filter(
                (action) => showHidden || !hiddenGroups.has(action.category)
              )
              .map((action) => (
                <button
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-transparent p-2 text-center transition-colors hover:border-border hover:bg-muted",
                    disabled && "pointer-events-none opacity-50"
                  )}
                  data-testid={`action-option-${action.id.toLowerCase().replace(/\s+/g, "-")}`}
                  disabled={disabled}
                  key={action.id}
                  onClick={() => onSelectAction(action.id)}
                  type="button"
                >
                  <ActionIcon action={action} className="size-6" />
                  <span className="line-clamp-2 font-medium text-xs leading-tight">
                    {action.label}
                  </span>
                </button>
              ))}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" &&
          visibleGroups.length > 0 &&
          visibleGroups.map((group, groupIndex) => {
            const isCollapsed = collapsedGroups.has(group.category);
            const isHidden = hiddenGroups.has(group.category);
            return (
              <div key={group.category}>
                {groupIndex > 0 && <div className="my-2 h-px bg-border" />}
                <div
                  className={cn(
                    "sticky top-0 z-10 mb-1 flex items-center gap-2 bg-background px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider",
                    isHidden && "opacity-50"
                  )}
                >
                  <button
                    className="flex flex-1 items-center gap-2 text-left hover:text-foreground"
                    onClick={() => toggleGroup(group.category)}
                    type="button"
                  >
                    <ChevronRight
                      className={cn(
                        "size-3.5 transition-transform",
                        !isCollapsed && "rotate-90"
                      )}
                    />
                    <GroupIcon group={group} />
                    {group.category}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="rounded p-0.5 hover:bg-muted hover:text-foreground"
                        type="button"
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => toggleHideGroup(group.category)}
                      >
                        {isHidden ? (
                          <>
                            <Eye className="mr-2 size-4" />
                            Show group
                          </>
                        ) : (
                          <>
                            <EyeOff className="mr-2 size-4" />
                            Hide group
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {!isCollapsed &&
                  group.actions.map((action) => (
                    <button
                      className={cn(
                        "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                        disabled && "pointer-events-none opacity-50"
                      )}
                      data-testid={`action-option-${action.id.toLowerCase().replace(/\s+/g, "-")}`}
                      disabled={disabled}
                      key={action.id}
                      onClick={() => onSelectAction(action.id)}
                      type="button"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{action.label}</span>
                        {action.description && (
                          <span className="block text-muted-foreground text-xs leading-tight mt-0.5">
                            {action.description}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
              </div>
            );
          })}
      </div>
    </div>
  );
}
