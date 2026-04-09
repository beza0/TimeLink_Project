import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Clock, CheckCircle, Eye, EyeOff } from "lucide-react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";

interface ResetPasswordPageProps {
  onNavigate?: (page: PageType) => void;
}

export function ResetPasswordPage({ onNavigate }: ResetPasswordPageProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const { t } = useLanguage();
  const a = t.auth.reset;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === confirmPassword && password.length >= 8) {
      setPasswordReset(true);
    }
  };

  const passwordsMatch = password === confirmPassword;
  const passwordLengthValid = password.length >= 8;

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
          <h1 className="text-3xl text-white mb-2">
            {passwordReset ? a.titleDone : a.title}
          </h1>
          <p className="text-white/80">
            {passwordReset ? a.subtitleDone : a.subtitle}
          </p>
        </div>

        <div className="rounded-3xl bg-card p-8 text-card-foreground shadow-2xl">
          {!passwordReset ? (
            <>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="password">{a.newPassword}</Label>
                  <div className="relative mt-2">
                    <Input 
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {password && !passwordLengthValid && (
                    <p className="text-xs text-red-500 mt-1">
                      {a.pwdShort}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">{a.confirmNew}</Label>
                  <div className="relative mt-2">
                    <Input 
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-500 mt-1">
                      {a.pwdMismatch}
                    </p>
                  )}
                  {confirmPassword && passwordsMatch && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {a.pwdMatch}
                    </p>
                  )}
                </div>

                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-6"
                  disabled={!passwordsMatch || !passwordLengthValid}
                >
                  {a.resetBtn}
                </Button>
              </form>

              <div className="mt-6 rounded-xl border border-border bg-muted/50 p-4">
                <p className="mb-2 text-sm text-foreground/90">
                  {a.reqTitle}
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className={`flex items-center gap-2 ${passwordLengthValid ? 'text-green-600' : ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordLengthValid ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                    {a.reqLen}
                  </li>
                  <li className={`flex items-center gap-2 ${passwordsMatch && confirmPassword ? 'text-green-600' : ''}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordsMatch && confirmPassword ? 'bg-green-600' : 'bg-gray-300'}`}></span>
                    {a.reqMatch}
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/50">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                
                <h3 className="mb-2 text-xl text-foreground">{a.allSet}</h3>
                <p className="mb-6 whitespace-pre-line text-muted-foreground">
                  {a.successBody}
                </p>

                <Button 
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-6"
                  onClick={() => onNavigate?.("login")}
                >
                  {a.continueSignIn}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
