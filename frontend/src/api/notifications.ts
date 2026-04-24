import { apiFetch } from "./client";

export type NotificationDto = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  exchangeRequestId: string | null;
  skillTitle: string | null;
};

/** Normalize API row (Jackson camelCase vs occasional snake_case). */
function parseNotificationRow(raw: unknown): NotificationDto {
  const o = raw as Record<string, unknown>;
  const readRaw = o.readAt ?? o.read_at;
  const readAt =
    readRaw === null || readRaw === undefined
      ? null
      : typeof readRaw === "string"
        ? readRaw
        : String(readRaw);
  return {
    id: String(o.id ?? "").trim(),
    title: String(o.title ?? ""),
    body: String(o.body ?? ""),
    createdAt: String(o.createdAt ?? o.created_at ?? ""),
    readAt,
    exchangeRequestId:
      o.exchangeRequestId != null || o.exchange_request_id != null
        ? String(o.exchangeRequestId ?? o.exchange_request_id)
        : null,
    skillTitle:
      o.skillTitle != null || o.skill_title != null
        ? String(o.skillTitle ?? o.skill_title)
        : null,
  };
}

export async function fetchNotifications(token: string): Promise<NotificationDto[]> {
  const rows = await apiFetch<unknown[]>("/api/notifications", {
    method: "GET",
    token,
  });
  return Array.isArray(rows) ? rows.map(parseNotificationRow) : [];
}

export async function fetchUnreadNotificationCount(token: string): Promise<{
  count: number;
}> {
  const raw = await apiFetch<Record<string, unknown>>(
    "/api/notifications/unread-count",
    {
      method: "GET",
      token,
    },
  );
  const c = raw.count ?? raw.Count;
  const n = typeof c === "number" ? c : Number(c);
  return { count: Number.isFinite(n) ? n : 0 };
}

/**
 * Fixed path + query (like mark-all-read) — some stacks mishandle `/uuid/read`.
 */
export function markNotificationRead(token: string, id: string) {
  const q = encodeURIComponent(id.trim());
  return apiFetch<void>(`/api/notifications/mark-one-read?id=${q}`, {
    method: "POST",
    token,
  });
}

export function markNotificationUnread(token: string, id: string) {
  const q = encodeURIComponent(id.trim());
  return apiFetch<void>(`/api/notifications/mark-one-unread?id=${q}`, {
    method: "POST",
    token,
  });
}

export function markAllNotificationsRead(token: string) {
  return apiFetch<void>("/api/notifications/mark-all-read", {
    method: "POST",
    token,
  });
}

export function deleteSelectedNotifications(token: string, ids: string[]) {
  return apiFetch<void>("/api/notifications/delete-selected", {
    method: "POST",
    token,
    body: JSON.stringify({ ids }),
  });
}

/** True if the notification should count toward the unread badge. */
export function isNotificationUnread(n: NotificationDto): boolean {
  const r = n.readAt;
  if (r == null) return true;
  if (typeof r === "string" && r.trim() === "") return true;
  return false;
}
