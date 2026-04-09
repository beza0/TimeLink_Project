import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem={false}
    storageKey="timelink-theme"
    disableTransitionOnChange
  >
    <LanguageProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </LanguageProvider>
  </ThemeProvider>,
);
  