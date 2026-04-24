/**
 * Backend base URL. No trailing slash.
 * - Boş: aynı origin üzerinden `/api` (Vite dev proxy, Docker nginx, `npm run preview` + proxy)
 * - Dolu: doğrudan tam URL (ayrı backend host için build-time `.env` ile `VITE_API_BASE_URL`)
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (raw !== undefined && raw.trim() !== "") {
    return raw.replace(/\/$/, "");
  }
  if (typeof window === "undefined") return "";
  const host = window.location.hostname.toLowerCase();
  // Local proxied hosts use same-origin /api.
  if (host === "localhost" || host === "127.0.0.1") {
    return "";
  }
  // Fallback for preview/webview contexts where same-origin has no /api proxy.
  return "http://localhost:8080";
}
