import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { useEffect, useState } from "react";
import type { PageType } from "../App";
import { Link } from "react-router-dom";
import { PATHS } from "../navigation/paths";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import {
  loginRequest,
  registerRequest,
  resendVerificationEmail,
  verifyEmailWithCode,
} from "../api/auth";
import { apiErrorDisplayMessage } from "../api/client";
import { formatTemplate } from "../language";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import { BrandLogo } from "../components/common/BrandLogo";

const RESEND_COOLDOWN_SEC = 60;

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface SignUpPageProps {
  onNavigate?: (page: PageType) => void;
}

export function SignUpPage({ onNavigate }: SignUpPageProps) {
  const { login } = useAuth();
  const { t } = useLanguage();
  const a = t.auth.signup;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [smtpMailDeliveryEnabled, setSmtpMailDeliveryEnabled] = useState(false);
  const [smtpLocalCapture, setSmtpLocalCapture] = useState(true);
  useEffect(() => {
    if (!awaitingVerification || resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [awaitingVerification, resendCooldown]);

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
      const created = await registerRequest({ fullName, email, password });
      if (!created?.id) {
        throw new Error(a.errorFailed);
      }
      if (created.emailVerificationPending) {
        setPendingEmail(email.trim().toLowerCase());
        setSmtpMailDeliveryEnabled(Boolean(created.smtpMailDeliveryEnabled));
        setSmtpLocalCapture(
          created.smtpLocalCapture !== undefined ? Boolean(created.smtpLocalCapture) : true,
        );
        setResendCooldown(RESEND_COOLDOWN_SEC);
        setAwaitingVerification(true);
        return;
      }
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

  const handleVerifyCode = async () => {
    if (!pendingEmail) return;
    const code = verifyCode.replace(/\D/g, "").slice(0, 6);
    if (code.length !== 6) {
      setError(a.errorVerifyCodeShort);
      return;
    }
    setError(null);
    setVerifyLoading(true);
    try {
      const res = await verifyEmailWithCode({ email: pendingEmail, code });
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
      setVerifyLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingEmail) return;
    setError(null);
    setResendLoading(true);
    try {
      await resendVerificationEmail(pendingEmail);
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(apiErrorDisplayMessage(err, a.errorFailed));
    } finally {
      setResendLoading(false);
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
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
              <BrandLogo className="h-full w-full object-cover" />
            </div>
            <span className="text-2xl text-white">Tiempo</span>
          </button>
          <h1 className="text-3xl text-white mb-2">{a.title}</h1>
          <p className="text-white/80">{a.subtitle}</p>
        </div>

        <div className="rounded-3xl bg-card p-8 text-card-foreground shadow-2xl">
          {awaitingVerification ? (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground">{a.verifySentTitle}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{a.verifySentBody}</p>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {!smtpMailDeliveryEnabled
                    ? a.verifyLogsHint
                    : smtpLocalCapture
                      ? a.verifyMailHint
                      : a.verifyRealInboxHint}
                </p>
                {pendingEmail ? (
                  <p className="mt-2 text-sm font-medium text-foreground">{pendingEmail}</p>
                ) : null}
              </div>
              {error ? (
                <p
                  className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              <div>
                <Label htmlFor="verify-code">{a.codeLabel}</Label>
                <Input
                  id="verify-code"
                  value={verifyCode}
                  onChange={(e) =>
                    setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder={a.codePlaceholder}
                  className="mt-2 text-center font-mono text-lg tracking-[0.35em]"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  aria-invalid={verifyCode.length > 0 && verifyCode.length < 6}
                />
              </div>
              <Button
                type="button"
                disabled={verifyLoading || verifyCode.replace(/\D/g, "").length !== 6}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                onClick={() => void handleVerifyCode()}
              >
                {verifyLoading ? t.common.loading : a.verifyAccountBtn}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={resendLoading || resendCooldown > 0}
                onClick={() => void handleResendCode()}
              >
                {resendLoading
                  ? t.common.loading
                  : resendCooldown > 0
                    ? formatTemplate(a.resendCodeWithTimer, {
                        time: formatMmSs(resendCooldown),
                      })
                    : a.resendCodeBtn}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  onClick={() => onNavigate?.("login")}
                >
                  {a.goToSignIn}
                </button>
              </div>
            </div>
          ) : null}
          {!awaitingVerification && error ? (
            <p
              className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {!awaitingVerification ? (
          <>
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
                <Link to={PATHS.terms} className="text-primary hover:underline">
                  {a.terms}
                </Link>
                {" "}{a.and}{" "}
                <Link to={PATHS.privacy} className="text-primary hover:underline">
                  {a.privacy}
                </Link>
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

            <div className="mt-6">
              <GoogleSignInButton
                disabled={loading}
                onError={(msg) => {
                  if (msg) setError(msg);
                }}
                onSuccess={(res) => {
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
                }}
              />
            </div>
          </div>
          </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
