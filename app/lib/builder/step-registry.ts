import { getAllActions } from "./plugins";

export type StepImporter = {
  importer: () => Promise<unknown>;
  stepFunction: string;
};

const STEP_IMPORTERS: Record<string, () => Promise<unknown>> = {
  "whatsapp/send-message": () => import("./steps/whatsapp/send-message"),
  "whatsapp/ask-question": () => import("./steps/whatsapp/ask-question"),
  "whatsapp/send-template": () => import("./steps/whatsapp/send-template"),
  "whatsapp/send-media": () => import("./steps/whatsapp/send-media"),
  "whatsapp/send-buttons": () => import("./steps/whatsapp/send-buttons"),
  "whatsapp/send-list": () => import("./steps/whatsapp/send-list"),
  "whatsapp/wait-for-reply": () => import("./steps/whatsapp/wait-for-reply"),
  "whatsapp/handoff": () => import("./steps/whatsapp/handoff"),
  "whatsapp/send-carousel": () => import("./steps/whatsapp/send-carousel"),
  "whatsapp/send-flow": () => import("./steps/whatsapp/send-flow"),
  "contact/update-contact": () => import("./steps/contact/update-profile"),
  "contact/manage-tags": () => import("./steps/contact/manage-tags"),
  "logic/ab-split": () => import("./steps/logic/ab-split"),
  "logic/business-hours": () => import("./steps/logic/business-hours"),
  "logic/sub-workflow": () => import("./steps/logic/sub-workflow"),
  "ai/ai-response": () => import("./steps/ai/ai-response"),
};

export function getStepImporter(actionType: string): StepImporter | null {
  const actions = getAllActions();
  const action = actions.find(
    (item) =>
      item.id === actionType ||
      item.slug === actionType ||
      item.label === actionType ||
      `${item.integration}/${item.slug}` === actionType
  );

  if (!action) {
    return null;
  }

  const importer = STEP_IMPORTERS[action.stepImportPath];
  if (!importer) {
    return null;
  }

  return {
    importer,
    stepFunction: action.stepFunction,
  };
}

export function getActionLabel(actionType: string): string {
  const action = getAllActions().find(
    (item) =>
      item.id === actionType ||
      item.slug === actionType ||
      item.label === actionType ||
      `${item.integration}/${item.slug}` === actionType
  );
  return action?.label ?? actionType;
}
