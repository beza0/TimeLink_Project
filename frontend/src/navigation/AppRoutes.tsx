import { useCallback } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { LandingPage } from "../pages/LandingPage";
import { BrowsePage } from "../pages/BrowsePage";
import { DashboardPage } from "../pages/DashboardPage";
import { ProfilePage } from "../pages/ProfilePage";
import { HowItWorksPage } from "../pages/HowItWorksPage";
import { AddSkillPage } from "../pages/AddSkillPage";
import { PastSessionsPage } from "../pages/PastSessionsPage";
import { EditProfilePage } from "../pages/EditProfilePage";
import { SettingsPage } from "../pages/SettingsPage";
import { MessagesPage } from "../pages/MessagesPage";
import { PublicUserProfilePage } from "../pages/PublicUserProfilePage";
import { SignUpPage } from "../pages/SignUpPage";
import { LoginPage } from "../pages/LoginPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { SkillDetailPage } from "../pages/SkillDetailPage";
import { NotificationsPage } from "../pages/NotificationsPage";
import { BuyCreditsPage } from "../pages/BuyCreditsPage";
import { PaymentPage } from "../pages/PaymentPage";
import { PaymentReturnPage } from "../pages/PaymentReturnPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { AboutPage } from "../pages/AboutPage";
import { ContactPage } from "../pages/ContactPage";
import { FAQPage } from "../pages/FAQPage";
import {
  CommunityPage,
  SupportPage,
  TermsPage,
  PrivacyPage,
  CancellationPolicyPage,
  InstructorGuidePage,
} from "../pages/StaticContentPages";
import { useAuth } from "../contexts/AuthContext";
import { PUBLIC_PROFILE_USER_ID_KEY } from "../api/user";
import type { PageType } from "../App";
import { pageToPath, PATHS } from "./paths";
import { ProtectedRoute } from "./ProtectedRoute";
import { ScrollToTop } from "./ScrollToTop";
import { AnalyticsPageView } from "./AnalyticsPageView";

function SkillWithLogin({ onPage }: { onPage: (p: PageType) => void }) {
  const loc = useLocation();
  const nav = useNavigate();
  return (
    <SkillDetailPage
      onNavigate={onPage}
      onLoginRequired={() =>
        nav(PATHS.login, {
          state: { from: { pathname: loc.pathname, search: loc.search } },
        })
      }
    />
  );
}

function AppRoutesContent() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const onPage = useCallback(
    (page: PageType) => {
      if (page === "skill-detail" || page === "user-profile") return;
      navigate(pageToPath(page));
    },
    [navigate],
  );

  const openUserProfile = useCallback((userId: string) => {
    try {
      sessionStorage.setItem(PUBLIC_PROFILE_USER_ID_KEY, userId);
    } catch {
      /* ignore */
    }
    navigate(PATHS.user(userId));
  }, [navigate]);

  const openSkill = useCallback(
    (skillId: string) => {
      if (!isAuthenticated) {
        navigate(PATHS.login, {
          state: { from: { pathname: PATHS.skill(skillId) } },
        });
        return;
      }
      navigate(PATHS.skill(skillId));
    },
    [isAuthenticated, navigate],
  );

  const openEditSkill = useCallback(
    (skillId: string) => {
      navigate(PATHS.editSkill(skillId));
    },
    [navigate],
  );

  return (
    <Routes>
      <Route
        path={PATHS.home}
        element={<LandingPage onNavigate={onPage} />}
      />
      <Route
        path={PATHS.browse}
        element={
          <BrowsePage
            onNavigate={onPage}
            onOpenSkillDetail={openSkill}
            onOpenUserProfile={openUserProfile}
          />
        }
      />
      <Route
        path={PATHS.howItWorks}
        element={<HowItWorksPage onNavigate={onPage} />}
      />
      <Route
        path={PATHS.login}
        element={
          isAuthenticated ? (
            <Navigate to={PATHS.dashboard} replace />
          ) : (
            <LoginPage onNavigate={onPage} />
          )
        }
      />
      <Route
        path={PATHS.signup}
        element={
          isAuthenticated ? (
            <Navigate to={PATHS.dashboard} replace />
          ) : (
            <SignUpPage onNavigate={onPage} />
          )
        }
      />
      <Route
        path={PATHS.forgotPassword}
        element={<ForgotPasswordPage onNavigate={onPage} />}
      />
      <Route
        path={PATHS.resetPassword}
        element={<ResetPasswordPage onNavigate={onPage} />}
      />
      <Route
        path={PATHS.about}
        element={<AboutPage onNavigate={onPage} />}
      />
      <Route
        path={PATHS.community}
        element={<CommunityPage onNavigate={onPage} />}
      />
      <Route
        path={PATHS.contact}
        element={<ContactPage onNavigate={onPage} />}
      />
      <Route path={PATHS.faq} element={<FAQPage onNavigate={onPage} />} />
      <Route
        path={PATHS.support}
        element={<SupportPage onNavigate={onPage} />}
      />
      <Route
        path={PATHS.terms}
        element={<TermsPage onNavigate={onPage} />}
      />
      <Route
        path={PATHS.privacy}
        element={<PrivacyPage onNavigate={onPage} />}
      />
      <Route
        path={PATHS.policyCancellation}
        element={<CancellationPolicyPage onNavigate={onPage} />}
      />
      <Route
        path={PATHS.instructorGuide}
        element={<InstructorGuidePage onNavigate={onPage} />}
      />
      <Route
        path="/skill/:skillId"
        element={<SkillWithLogin onPage={onPage} />}
      />

      <Route
        path={PATHS.dashboard}
        element={
          <ProtectedRoute>
            <DashboardPage onNavigate={onPage} />
          </ProtectedRoute>
        }
      />
      <Route
        path={PATHS.profile}
        element={
          <ProtectedRoute>
            <ProfilePage
              onNavigate={onPage}
              onOpenSkillDetail={(id) => navigate(PATHS.skill(id))}
              onEditSkill={openEditSkill}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path={PATHS.addSkill}
        element={
          <ProtectedRoute>
            <AddSkillPage onNavigate={onPage} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-skill/:skillId"
        element={
          <ProtectedRoute>
            <AddSkillPage onNavigate={onPage} />
          </ProtectedRoute>
        }
      />
      <Route
        path={PATHS.pastSessions}
        element={
          <ProtectedRoute>
            <PastSessionsPage onNavigate={onPage} />
          </ProtectedRoute>
        }
      />
      <Route
        path={PATHS.editProfile}
        element={
          <ProtectedRoute>
            <EditProfilePage onNavigate={onPage} />
          </ProtectedRoute>
        }
      />
      <Route
        path={PATHS.settings}
        element={
          <ProtectedRoute>
            <SettingsPage onNavigate={onPage} />
          </ProtectedRoute>
        }
      />
      <Route
        path={PATHS.messages}
        element={
          <ProtectedRoute>
            <MessagesPage
              onNavigate={onPage}
              onViewUserProfile={openUserProfile}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path={PATHS.notifications}
        element={
          <ProtectedRoute>
            <NotificationsPage onNavigate={onPage} />
          </ProtectedRoute>
        }
      />
      <Route
        path={PATHS.buyCredits}
        element={
          <ProtectedRoute>
            <BuyCreditsPage onNavigate={onPage} />
          </ProtectedRoute>
        }
      />
      <Route
        path={PATHS.payment}
        element={
          <ProtectedRoute>
            <PaymentPage onNavigate={onPage} />
          </ProtectedRoute>
        }
      />
      <Route
        path={PATHS.paymentReturn}
        element={
          <ProtectedRoute>
            <PaymentReturnPage onNavigate={onPage} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/u/:userId"
        element={
          <ProtectedRoute>
            <PublicUserProfilePage onNavigate={onPage} />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFoundPage onNavigate={onPage} />} />
    </Routes>
  );
}

export function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <AnalyticsPageView />
      <AppRoutesContent />
    </>
  );
}
