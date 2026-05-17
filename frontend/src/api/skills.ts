import { apiFetch } from "./client";

export type SkillDto = {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  category: string | null;
  level: string | null;
  sessionTypes?: string[];
  inPersonLocation?: string | null;
  availableDays?: string[];
  availableFrom?: string | null;
  availableUntil?: string | null;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  /** Sunucunun skill oluştururken kaydettiği AI kapak görseli URL’si */
  coverImageUrl?: string | null;
};

export type CreateSkillBody = {
  title: string;
  description: string;
  durationMinutes?: number;
  category?: string | null;
  level?: string | null;
  sessionTypes?: string[];
  inPersonLocation?: string | null;
  availableDays?: string[];
  availableFrom?: string | null;
  availableUntil?: string | null;
};

export function fetchMySkills(token: string) {
  return apiFetch<SkillDto[]>("/api/skills/mine", {
    method: "GET",
    token,
  });
}

/** Herkese açık beceri listesi (giriş gerekmez). */
export function fetchPublicSkills() {
  return apiFetch<SkillDto[]>("/api/skills", { method: "GET" });
}

export function fetchSkillById(skillId: string) {
  return apiFetch<SkillDto>(`/api/skills/${skillId}`, { method: "GET" });
}

export function createSkill(token: string, body: CreateSkillBody) {
  return apiFetch<SkillDto>("/api/skills", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export function updateSkill(
  token: string,
  skillId: string,
  body: CreateSkillBody & { durationMinutes: number },
) {
  return apiFetch<SkillDto>(`/api/skills/${skillId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(body),
  });
}
