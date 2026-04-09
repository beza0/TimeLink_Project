import { Button } from "../ui/button";
import { Clock, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import type { PageType } from "../../App";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { Sidebar } from "./Sidebar";

interface NavbarProps {
  onNavigate?: (page: PageType) => void;
}

export function Navbar({ onNavigate }: NavbarProps) {
  const { isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(width >= 80rem)");
    const onChange = () => {
      if (mq.matches) setIsMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    onChange();
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const handleNavigate = (page: PageType) => {
    if (onNavigate) {
      onNavigate(page);
      setIsMenuOpen(false);
      window.scrollTo(0, 0);
    }
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    handleNavigate("landing");
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/85">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 min-w-0 items-center justify-between gap-3">
            {/* Logo */}
            <button
              onClick={() => handleNavigate("landing")}
              className="flex shrink-0 cursor-pointer items-center gap-2 transition-opacity hover:opacity-80"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl whitespace-nowrap text-gray-900 dark:text-gray-100">
                TimeLink
              </span>
            </button>

            {/* Desktop Navigation — only wide screens; flex-nowrap in CSS (nav-xl-row) */}
            <div className="nav-xl-row min-w-0 gap-6">
              <button
                onClick={() => handleNavigate("browse")}
                className="shrink-0 whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                {t.nav.browseSkills}
              </button>

              {isAuthenticated && (
                <>
                  <button
                    onClick={() => handleNavigate("dashboard")}
                    className="shrink-0 whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    {t.nav.dashboard}
                  </button>
                  <button
                    onClick={() => handleNavigate("messages")}
                    className="shrink-0 whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    {t.nav.messages}
                  </button>
                  <button
                    onClick={() => handleNavigate("profile")}
                    className="shrink-0 whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    {t.nav.profile}
                  </button>
                  <button
                    onClick={() => handleNavigate("settings")}
                    className="shrink-0 whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    {t.nav.settings}
                  </button>
                </>
              )}
              <button
                onClick={() => handleNavigate("how-it-works")}
                className="shrink-0 whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                {t.nav.howItWorks}
              </button>
            </div>

            {/* Desktop Auth */}
            <div className="nav-xl-row shrink-0 gap-3">
              {isAuthenticated ? (
                <Button variant="ghost" onClick={handleLogout}>
                  {t.nav.logout}
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => handleNavigate("login")}>
                    {t.nav.signIn}
                  </Button>
                  <Button
                    onClick={() => handleNavigate("signup")}
                    className="whitespace-nowrap bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  >
                    {t.nav.getStarted}
                  </Button>
                </>
              )}
            </div>

            {/* Narrow screens: hamburger → sidebar */}
            <button
              type="button"
              className="nav-xl-menu-btn shrink-0 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>

      <Sidebar
        isOpen={isMenuOpen}
        isAuthenticated={isAuthenticated}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />
    </>
  );
}
