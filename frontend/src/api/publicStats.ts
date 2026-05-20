import { apiFetch } from "./client";

export type PublicPlatformStats = {
  verifiedMemberCount: number;
  skillsListedCount: number;
  completedSessionMinutesTotal: number;
  reviewCount: number;
  /** Ortalama puanın 5 üzerinden yüzdesi; henüz yorum yoksa null */
  satisfactionPercent: number | null;
};

export function fetchPublicPlatformStats(): Promise<PublicPlatformStats> {
  return apiFetch<PublicPlatformStats>("/api/public/stats", {
    timeoutMs: 15_000,
  });
}
