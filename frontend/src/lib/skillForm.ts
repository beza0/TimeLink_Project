import type { SkillDto } from "../api/skills";
import type { Messages } from "../language";

export const SKILL_CATEGORY_KEYS = [
  "Sports",
  "Arts",
  "Languages",
  "Programming",
  "Music",
  "Cooking",
  "Photography",
  "Writing",
  "Design",
] as const;

export const SKILL_CATEGORY_OTHER = "Other";

export const SKILL_DAY_KEYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const API_DAY_TO_FORM: Record<string, (typeof SKILL_DAY_KEYS)[number]> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export type SkillFormValues = {
  title: string;
  category: string;
  customCategory: string;
  description: string;
  level: string;
  selectedDays: string[];
  tags: string[];
  locationType: string[];
  locationText: string;
  startTime: string;
  endTime: string;
};

function descriptionMain(desc: string): string {
  const sep = "\n\n———\n";
  const i = desc.indexOf(sep);
  return (i >= 0 ? desc.slice(0, i) : desc).trim();
}

function descriptionMeta(desc: string): string {
  const sep = "\n\n———\n";
  const i = desc.indexOf(sep);
  return i >= 0 ? desc.slice(i + sep.length).trim() : "";
}

function parseMetaField(meta: string, labels: string[]): string | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${escaped}\\s*:\\s*([^\\n]+)`, "i");
    const m = meta.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

export function skillDtoToFormValues(skill: SkillDto, a: Messages["addSkill"]): SkillFormValues {
  const meta = descriptionMeta(skill.description ?? "");
  const rawCategory = (skill.category ?? "").trim();

  const knownCategory = (SKILL_CATEGORY_KEYS as readonly string[]).includes(rawCategory);
  const category = knownCategory ? rawCategory : rawCategory ? SKILL_CATEGORY_OTHER : "";
  const customCategory = knownCategory ? "" : rawCategory;

  const selectedDays = (skill.availableDays ?? [])
    .map((d) => API_DAY_TO_FORM[d.toUpperCase()])
    .filter((d): d is (typeof SKILL_DAY_KEYS)[number] => Boolean(d));

  let locationType = [...(skill.sessionTypes ?? [])];
  if (locationType.length === 0) {
    const sessionLine = parseMetaField(meta, [a.sessionType, "Session Type", "Oturum türü"]);
    if (sessionLine) {
      const lower = sessionLine.toLowerCase();
      if (lower.includes("online") || lower.includes("çevrim")) locationType.push("online");
      if (lower.includes("in-person") || lower.includes("yüz")) locationType.push("in-person");
    }
  }

  let locationText = skill.inPersonLocation?.trim() ?? "";
  if (!locationText) {
    locationText =
      parseMetaField(meta, [a.location, "Location", "Konum"]) ?? "";
  }

  let startTime = skill.availableFrom ?? "";
  let endTime = skill.availableUntil ?? "";
  if (!startTime || !endTime) {
    const rangeLine = parseMetaField(meta, [
      `${a.availableFrom}–${a.availableUntil}`,
      "Available From–Available Until",
      "Başlangıç–Bitiş",
    ]);
    if (rangeLine) {
      const parts = rangeLine.split(/[–-]/).map((p) => p.trim());
      if (parts.length >= 2) {
        startTime = parts[0] === "—" ? "" : parts[0];
        endTime = parts[1] === "—" ? "" : parts[1];
      }
    }
  }

  const tagsLine = parseMetaField(meta, [a.tags, "Tags", "Etiketler"]);
  const tags = tagsLine
    ? tagsLine.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return {
    title: skill.title ?? "",
    category,
    customCategory,
    description: descriptionMain(skill.description ?? ""),
    level: skill.level ?? "",
    selectedDays,
    tags,
    locationType,
    locationText,
    startTime,
    endTime,
  };
}

export function buildSkillDescription(
  base: string,
  a: Messages["addSkill"],
  opts: {
    locationType: string[];
    locationText: string;
    selectedDays: string[];
    dayLabels: string[];
    startTime: string;
    endTime: string;
    tags: string[];
  },
): string {
  const lines: string[] = [];
  if (opts.locationType.length > 0) {
    lines.push(`${a.sessionType}: ${opts.locationType.join(", ")}`);
  }
  if (opts.locationText.trim()) {
    lines.push(`${a.location}: ${opts.locationText.trim()}`);
  }
  if (opts.selectedDays.length > 0) {
    const labelByDay = new Map<string, string>(
      SKILL_DAY_KEYS.map((k, i) => [k, opts.dayLabels[i] ?? k]),
    );
    const dayPart = opts.selectedDays
      .map((d) => labelByDay.get(d) ?? d)
      .join(", ");
    lines.push(`${a.availableDays}: ${dayPart}`);
  }
  if (opts.startTime || opts.endTime) {
    lines.push(
      `${a.availableFrom}–${a.availableUntil}: ${opts.startTime || "—"} – ${opts.endTime || "—"}`,
    );
  }
  if (opts.tags.length > 0) {
    lines.push(`${a.tags}: ${opts.tags.join(", ")}`);
  }
  const trimmed = base.trim();
  if (lines.length === 0) return trimmed;
  if (!trimmed) return lines.join("\n");
  return `${trimmed}\n\n———\n${lines.join("\n")}`;
}
