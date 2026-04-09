import type { Translation } from "./locale/en";
import { en } from "./locale/en";
import { tr } from "./locale/tr";

export type Locale = "en" | "tr";

export const messages: Record<Locale, Translation> = {
  en,
  tr,
};

export type Messages = Translation;

/** Simple template: "Hello {{name}}" + { name: "x" } */
export function formatTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(vars[key] ?? ""),
  );
}
