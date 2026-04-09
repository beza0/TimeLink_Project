import { useEffect, useState, type FormEvent } from "react";
import { useTheme } from "next-themes";
import { PageLayout } from "../components/layout/PageLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useLanguage } from "../contexts/LanguageContext";
import type { PageType } from "../App";
import type { Locale } from "../language";
import { Moon, Sun } from "lucide-react";

interface SettingsPageProps {
  onNavigate?: (page: PageType) => void;
}

export function SettingsPage({ onNavigate }: SettingsPageProps) {
  const { t, locale, setLocale } = useLanguage();
  const s = t.settings;
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? (resolvedTheme ?? theme ?? "light") : "light";

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(false);
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError(s.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(s.passwordMismatch);
      return;
    }
    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <PageLayout onNavigate={onNavigate}>
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">
              {s.title}
            </h1>
            <p className="mt-1 text-muted-foreground">{s.subtitle}</p>
          </div>

          <Card className="rounded-2xl border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                {s.passwordTitle}
              </CardTitle>
              <CardDescription>{s.passwordDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">{s.currentPassword}</Label>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-input-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">{s.newPassword}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-input-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{s.confirmPassword}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-input-background"
                  />
                </div>
                {passwordError ? (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {passwordError}
                  </p>
                ) : null}
                {passwordSuccess ? (
                  <p className="text-sm text-green-600 dark:text-green-400" role="status">
                    {s.passwordSuccess}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                >
                  {s.updatePassword}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                {s.languageTitle}
              </CardTitle>
              <CardDescription>{s.languageDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["en", s.english],
                    ["tr", s.turkish],
                  ] as const
                ).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLocale(code as Locale)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      locale === code
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">
                {s.themeTitle}
              </CardTitle>
              <CardDescription>{s.themeDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    activeTheme === "light"
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Sun className="h-4 w-4" aria-hidden />
                  {s.themeLight}
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    activeTheme === "dark"
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Moon className="h-4 w-4" aria-hidden />
                  {s.themeDark}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
