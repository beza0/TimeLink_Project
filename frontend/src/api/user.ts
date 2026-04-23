import { apiFetch } from "./client";

/** sessionStorage: başka üyenin profil sayfası için hedef kullanıcı id */
export const PUBLIC_PROFILE_USER_ID_KEY = "timelink_view_user_id";

export type UserProfileDto = {
  id: string;
  fullName: string;
  email: string;
  bio: string | null;
  phone: string | null;
  location: string | null;
  languages: string | null;
  website: string | null;
  linkedin: string | null;
  twitter: string | null;
  /** data URL veya kısa görsel URL */
  avatarUrl: string | null;
  timeCreditMinutes: number;
  createdAt?: string;
};

export type UpdateUserProfileBody = {
  fullName: string;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  languages?: string | null;
  website?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  avatarUrl?: string | null;
};

export function fetchMyProfile(token: string) {
  return apiFetch<UserProfileDto>("/api/users/me/profile", {
    method: "GET",
    token,
  });
}

export function updateMyProfile(token: string, body: UpdateUserProfileBody) {
  return apiFetch<UserProfileDto>("/api/users/me/profile", {
    method: "PUT",
    token,
    body: JSON.stringify(body),
  });
}

export type UserDashboardDto = {
  fullName: string;
  timeCreditMinutes: number;
  mySkillsCount: number;
  sentRequestsCount: number;
  receivedRequestsCount: number;
};

export function fetchMyDashboard(token: string) {
  return apiFetch<UserDashboardDto>("/api/users/me/dashboard", {
    method: "GET",
    token,
  });
}

export function deleteMyAccount(token: string) {
  return apiFetch<void>("/api/users/me/delete", {
    method: "POST",
    token,
  });
}

/** Başka üyenin herkese açık profili; giriş gerekir. E-posta/telefon dönmez. */
export type PublicUserProfileDto = {
  id: string;
  fullName: string;
  bio: string | null;
  location: string | null;
  languages: string | null;
  website: string | null;
  linkedin: string | null;
  twitter: string | null;
  avatarUrl: string | null;
  memberSince: string;
  averageRating: number;
  totalReviews: number;
};

export function fetchPublicUserProfile(token: string, userId: string) {
  return apiFetch<PublicUserProfileDto>(`/api/users/${encodeURIComponent(userId)}/public`, {
    method: "GET",
    token,
  });
}
