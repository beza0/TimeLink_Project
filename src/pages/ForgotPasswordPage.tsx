import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Clock, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import type { PageType } from "../App";
import { useLanguage } from "../contexts/LanguageContext";

interface ForgotPasswordPageProps {
  onNavigate?: (page: PageType) => void;
}

export function ForgotPasswordPage({ onNavigate }: ForgotPasswordPageProps) {
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState("");
  const { t } = useLanguage();
  const a = t.auth.forgot;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSent(true);
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
          <h1 className="text-3xl text-white mb-2">
            {emailSent ? a.titleSent : a.title}
          </h1>
          <p className="text-white/80">
            {emailSent ? a.subtitleSent : a.subtitle}
          </p>
        </div>

        <div className="rounded-3xl bg-card p-8 text-card-foreground shadow-2xl">
          {!emailSent ? (
            <>
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="email">{t.auth.login.email}</Label>
                  <Input 
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    className="mt-2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-6"
                >
                  {a.sendLink}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => onNavigate?.("login")}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {a.backSignIn}
                </button>
              </div>

              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/40">
                <p className="text-sm text-foreground/90">
                  <strong>{t.common.note}:</strong> {a.noteBox}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/50">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                
                <h3 className="mb-2 text-xl text-foreground">{a.emailSent}</h3>
                <p className="mb-6 text-muted-foreground">
                  {a.sentToPrefix}<br />
                  <strong>{email}</strong>
                </p>

                <div className="space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-6"
                    onClick={() => onNavigate?.("reset-password")}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {a.openDemo}
                  </Button>

                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => setEmailSent(false)}
                  >
                    {a.resend}
                  </Button>
                </div>
              </div>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => onNavigate?.("login")}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {a.backSignIn}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
