/** Render static site — /api proxy yoksa doğrudan Spring API. */
const PRODUCTION_API_HOSTS = new Set([
  "tiempos.site",
  "www.tiempos.site",
  "tiempo-project.onrender.com",
]);

const DEFAULT_PRODUCTION_API =
  "https://tiempos-backend-w26e.onrender.com";

/**
 * Backend base URL. No trailing slash.
 * - Boş: aynı origin `/api` (Vite proxy, Docker nginx, Render /api rewrite)
 * - Dolu: `VITE_API_BASE_URL` (build-time)
 * - Canlı domain, env boş: `VITE_PRODUCTION_API_URL` veya varsayılan Render API
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (raw !== undefined && raw.trim() !== "") {
    return raw.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && PRODUCTION_API_HOSTS.has(window.location.hostname)) {
    const fallback = import.meta.env.VITE_PRODUCTION_API_URL as string | undefined;
    const url = (fallback?.trim() || DEFAULT_PRODUCTION_API).replace(/\/$/, "");
    return url;
  }
  return "";
}
