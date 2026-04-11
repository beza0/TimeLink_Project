import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Clock } from "lucide-react";
import { useState } from "react";
import type { PageType } from "../App";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { loginRequest, registerRequest } from "../api/auth";
import { apiErrorDisplayMessage } from "../api/client";

interface SignUpPageProps {
  onNavigate?: (page: PageType) => void;
}

export function SignUpPage({ onNavigate }: SignUpPageProps) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const a = t.auth.signup;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const fullName = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm-password") || "");

    if (password !== confirm) {
      setError(a.errorPasswordMismatch);
      return;
    }

    setLoading(true);
    try {
      await registerRequest({ fullName, email, password });
      const res = await loginRequest({ email, password });
      login(
        {
          id: res.userId,
          name: res.fullName,
          email: res.email,
          role: res.role,
        },
        res.token,
      );
      sessionStorage.setItem("timelink_profile_onboarding", "1");
      onNavigate?.("edit-profile");
    } catch (err) {
      setError(apiErrorDisplayMessage(err, a.errorFailed));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button 
            onClick={() => onNavigate?.("landing")}
            className="inline-flex items-center gap-2 mb-4"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
              <Clock className="h-7 w-7 text-primary" />
            </div>
            <span className="text-2xl text-white">TimeLink</span>
          </button>
          <h1 className="text-3xl text-white mb-2">{a.title}</h1>
          <p className="text-white/80">{a.subtitle}</p>
        </div>

        <div className="rounded-3xl bg-card p-8 text-card-foreground shadow-2xl">
          {error ? (
            <p
              className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="name">{a.fullName}</Label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                className="mt-2"
                required
                autoComplete="name"
              />
            </div>

            <div>
              <Label htmlFor="email">{a.email}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                className="mt-2"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <Label htmlFor="password">{a.password}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className="mt-2"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>

            <div>
              <Label htmlFor="confirm-password">{a.confirmPassword}</Label>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                placeholder="••••••••"
                className="mt-2"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="terms" className="mt-1" />
              <label htmlFor="terms" className="cursor-pointer text-sm text-muted-foreground">
                {a.termsPrefix}{" "}
                <a href="#" className="text-primary hover:underline">{a.terms}</a>
                {" "}{a.and}{" "}
                <a href="#" className="text-primary hover:underline">{a.privacy}</a>
              </label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-6"
            >
              {loading ? t.common.loading : a.createAccount}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {a.hasAccount}{" "}
              <button 
                onClick={() => onNavigate?.("login")}
                className="text-primary hover:underline"
              >
                {a.signIn}
              </button>
            </p>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-2 text-muted-foreground">{a.orWith}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button variant="outline" className="w-full">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button variant="outline" className="w-full">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
