import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function googleAnalyticsHtmlPlugin(gaId: string | undefined): Plugin {
  return {
    name: "inject-google-analytics",
    transformIndexHtml(html) {
      const id = gaId?.trim();
      if (!id?.startsWith("G-")) return html;
      const snippet = `<!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${id}');
    </script>`;
      return html.replace("<head>", `<head>\n${snippet}`);
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, "");
  const gaId = env.VITE_GA_MEASUREMENT_ID;
  /** Yerelde 8080 başka bir konteyner/süreç tarafından doluysa: .env → DEV_API_PROXY=http://localhost:8082 */
  const devApiProxy = (env.DEV_API_PROXY || "http://localhost:8080").trim().replace(/\/+$/, "");

  return {
    envDir: projectRoot,
    envPrefix: ["VITE_", "GOOGLE_"],
    plugins: [react(), googleAnalyticsHtmlPlugin(gaId)],
    server: {
      proxy: {
        "/api": {
          target: devApiProxy,
          changeOrigin: true,
        },
      },
    },
  };
});
