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
import { PublicUserProfilePage } from "./pages/PublicUserProfilePage";
import { PUBLIC_PROFILE_USER_ID_KEY } from "./api/user";
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
  | "skill-detail"
  | "user-profile";

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("landing");
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [loginReturnTo, setLoginReturnTo] = useState<PageType>("dashboard");
  const { isAuthenticated } = useAuth();

  /** Navbar vb. ile girişe gidildiğinde varsayılan dönüş hedefi dashboard kalır */
  const navigate = (page: PageType) => {
    if (page === "login") {
      setLoginReturnTo("dashboard");
    }
    setCurrentPage(page);
  };

  const openSkillDetail = (skillId: string) => {
    setSelectedSkillId(skillId);
    setCurrentPage("skill-detail");
  };

  const openPublicUserProfile = (userId: string) => {
    try {
      sessionStorage.setItem(PUBLIC_PROFILE_USER_ID_KEY, userId);
    } catch {
      /* ignore */
    }
    setCurrentPage("user-profile");
  };

  /** Explore / Browse: giriş yoksa book ile skill detayı yerine giriş sayfası */
  const openBrowseSkillForBooking = (skillId: string) => {
    if (!isAuthenticated) {
      setSelectedSkillId(skillId);
      setLoginReturnTo("skill-detail");
      setCurrentPage("login");
      return;
    }
    openSkillDetail(skillId);
  };

  const goToLoginFromSkillBooking = () => {
    setLoginReturnTo("skill-detail");
    setCurrentPage("login");
  };

  const renderPage = () => {
    if (pageRequiresAuth(currentPage) && !isAuthenticated) {
      return (
        <LoginPage onNavigate={navigate} returnTo={currentPage} />
      );
    }

    switch (currentPage) {
      case "landing":
        return <LandingPage onNavigate={navigate} />;
      case "browse":
        return (
          <BrowsePage
            onNavigate={navigate}
            onOpenSkillDetail={openBrowseSkillForBooking}
          />
        );
      case "dashboard":
        return <DashboardPage onNavigate={navigate} />;
      case "profile":
        return (
          <ProfilePage
            onNavigate={navigate}
            onOpenSkillDetail={openSkillDetail}
          />
        );
      case "how-it-works":
        return <HowItWorksPage onNavigate={navigate} />;
      case "add-skill":
        return <AddSkillPage onNavigate={navigate} />;
      case "past-sessions":
        return <PastSessionsPage onNavigate={navigate} />;
      case "edit-profile":
        return <EditProfilePage onNavigate={navigate} />;
      case "settings":
        return <SettingsPage onNavigate={navigate} />;
      case "messages":
        return (
          <MessagesPage
            onNavigate={navigate}
            onViewUserProfile={openPublicUserProfile}
          />
        );
      case "user-profile":
        return <PublicUserProfilePage onNavigate={navigate} />;
      case "signup":
        if (isAuthenticated) {
          return <DashboardPage onNavigate={navigate} />;
        }
        return <SignUpPage onNavigate={navigate} />;
      case "login":
        if (isAuthenticated) {
          return <DashboardPage onNavigate={navigate} />;
        }
        return <LoginPage onNavigate={navigate} returnTo={loginReturnTo} />;
      case "forgot-password":
        return <ForgotPasswordPage onNavigate={navigate} />;
      case "reset-password":
        return <ResetPasswordPage onNavigate={navigate} />;
      case "skill-detail":
        return (
          <SkillDetailPage
            onNavigate={navigate}
            onLoginRequired={goToLoginFromSkillBooking}
            skillId={selectedSkillId}
          />
        );
      default:
        return <LandingPage onNavigate={navigate} />;
    }
  };

  return renderPage();
}
