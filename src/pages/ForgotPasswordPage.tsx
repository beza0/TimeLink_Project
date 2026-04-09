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
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center">
              <Clock className="w-7 h-7 text-purple-600" />
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

        <div className="bg-white rounded-3xl shadow-2xl p-8">
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
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {a.backSignIn}
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-sm text-gray-700">
                  <strong>{t.common.note}:</strong> {a.noteBox}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                
                <h3 className="text-xl text-gray-900 mb-2">{a.emailSent}</h3>
                <p className="text-gray-600 mb-6">
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
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
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
