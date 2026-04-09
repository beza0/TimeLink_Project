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
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
              <Clock className="w-7 h-7 text-purple-600" />
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

        <div className="bg-white rounded-3xl shadow-2xl p-8">
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

              <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-700 mb-2">
                  {a.reqTitle}
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
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
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                
                <h3 className="text-xl text-gray-900 mb-2">{a.allSet}</h3>
                <p className="text-gray-600 mb-6 whitespace-pre-line">
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
