import { useState } from "react";
import { LandingPage } from "./pages/LandingPage";
import { BrowsePage } from "./pages/BrowsePage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProfilePage } from "./pages/ProfilePage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { AddSkillPage } from "./pages/AddSkillPage";
import { PastSessionsPage } from "./pages/PastSessionsPage";
import { EditProfilePage } from "./pages/EditProfilePage";
import { MessagesPage } from "./pages/MessagesPage";
import { SignUpPage } from "./pages/SignUpPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SkillDetailPage } from "./pages/SkillDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useAuth, pageRequiresAuth } from "./contexts/AuthContext";

// Basit routing sistemi - sayfalar arası geçiş için
export type PageType =
  | "landing"
  | "browse"
  | "dashboard"
  | "profile"
  | "how-it-works"
  | "add-skill"
  | "past-sessions"
  | "edit-profile"
  | "settings"
  | "messages"
  | "signup"
  | "login"
  | "forgot-password"
  | "reset-password"
  | "skill-detail";

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("landing");
  const { isAuthenticated } = useAuth();

  const renderPage = () => {
    if (pageRequiresAuth(currentPage) && !isAuthenticated) {
      return (
        <LoginPage onNavigate={setCurrentPage} returnTo={currentPage} />
      );
    }

    switch (currentPage) {
      case "landing":
        return <LandingPage onNavigate={setCurrentPage} />;
      case "browse":
        return <BrowsePage onNavigate={setCurrentPage} />;
      case "dashboard":
        return <DashboardPage onNavigate={setCurrentPage} />;
      case "profile":
        return <ProfilePage onNavigate={setCurrentPage} />;
      case "how-it-works":
        return <HowItWorksPage onNavigate={setCurrentPage} />;
      case "add-skill":
        return <AddSkillPage onNavigate={setCurrentPage} />;
      case "past-sessions":
        return <PastSessionsPage onNavigate={setCurrentPage} />;
      case "edit-profile":
        return <EditProfilePage onNavigate={setCurrentPage} />;
      case "settings":
        return <SettingsPage onNavigate={setCurrentPage} />;
      case "messages":
        return <MessagesPage onNavigate={setCurrentPage} />;
      case "signup":
        if (isAuthenticated) {
          return <DashboardPage onNavigate={setCurrentPage} />;
        }
        return <SignUpPage onNavigate={setCurrentPage} />;
      case "login":
        if (isAuthenticated) {
          return <DashboardPage onNavigate={setCurrentPage} />;
        }
        return <LoginPage onNavigate={setCurrentPage} />;
      case "forgot-password":
        return <ForgotPasswordPage onNavigate={setCurrentPage} />;
      case "reset-password":
        return <ResetPasswordPage onNavigate={setCurrentPage} />;
      case "skill-detail":
        return <SkillDetailPage onNavigate={setCurrentPage} />;
      default:
        return <LandingPage onNavigate={setCurrentPage} />;
    }
  };

  return renderPage();
}
