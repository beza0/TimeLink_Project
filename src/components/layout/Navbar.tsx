import { Button } from "../ui/button";
import { Clock, LogOut, Menu, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { PageType } from "../../App";
import { useAuth } from "../../contexts/AuthContext";

interface NavbarProps {
  onNavigate?: (page: PageType) => void;
}

export function Navbar({ onNavigate }: NavbarProps) {
  const { isAuthenticated, logout } = useAuth();
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
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
              <span className="text-xl text-gray-900 whitespace-nowrap">
                TimeLink
              </span>
            </button>

            {/* Desktop Navigation — only wide screens; flex-nowrap in CSS (nav-xl-row) */}
            <div className="nav-xl-row min-w-0 gap-6">
              <button
                onClick={() => handleNavigate("browse")}
                className="shrink-0 whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900"
              >
                Browse Skills
              </button>
              <button
                onClick={() => handleNavigate("how-it-works")}
                className="shrink-0 whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900"
              >
                How It Works
              </button>
              {isAuthenticated && (
                <>
                  <button
                    onClick={() => handleNavigate("dashboard")}
                    className="shrink-0 whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => handleNavigate("messages")}
                    className="shrink-0 whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900"
                  >
                    Messages
                  </button>
                  <button
                    onClick={() => handleNavigate("profile")}
                    className="shrink-0 whitespace-nowrap text-gray-600 transition-colors hover:text-gray-900"
                  >
                    Profile
                  </button>
                </>
              )}
            </div>

            {/* Desktop Auth */}
            <div className="nav-xl-row shrink-0 gap-3">
              {isAuthenticated ? (
                <Button variant="ghost" onClick={handleLogout}>
                  Log out
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => handleNavigate("login")}>
                    Sign In
                  </Button>
                  <Button
                    onClick={() => handleNavigate("signup")}
                    className="whitespace-nowrap bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>

            {/* Narrow screens: hamburger → sidebar */}
            <button
              type="button"
              className="nav-xl-menu-btn shrink-0 rounded-lg p-2 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      {isMenuOpen && (
        <>
          <div
            className="nav-xl-sidebar-host fixed inset-0 z-50 bg-black/50"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden
          />

          <div className="nav-xl-sidebar-host fixed top-0 left-0 bottom-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleNavigate("landing");
                }}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl text-gray-900">TimeLink</span>
              </button>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div
              className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-5"
              style={{ maxHeight: "calc(100vh - 200px)" }}
            >
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleNavigate("browse")}
                  className="sidebar-nav-item rounded-xl px-4 py-4 text-left text-base text-gray-700 transition-colors"
                >
                  Browse Skills
                </button>
                <button
                  onClick={() => handleNavigate("how-it-works")}
                  className="sidebar-nav-item rounded-xl px-4 py-4 text-left text-base text-gray-700 transition-colors"
                >
                  How It Works
                </button>
                {isAuthenticated && (
                  <>
                    <button
                      onClick={() => handleNavigate("dashboard")}
                      className="sidebar-nav-item rounded-xl px-4 py-4 text-left text-base text-gray-700 transition-colors"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => handleNavigate("messages")}
                      className="sidebar-nav-item rounded-xl px-4 py-4 text-left text-base text-gray-700 transition-colors"
                    >
                      Messages
                    </button>
                    <button
                      onClick={() => handleNavigate("profile")}
                      className="sidebar-nav-item rounded-xl px-4 py-4 text-left text-base text-gray-700 transition-colors"
                    >
                      Profile
                    </button>
                    <div className="my-3 border-t border-gray-200" />
                    <button
                      onClick={() => handleNavigate("edit-profile")}
                      className="sidebar-nav-item flex items-center gap-2 rounded-xl px-4 py-4 text-left text-base text-gray-700 transition-colors"
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                      Settings
                    </button>
                  </>
                )}
              </div>

              <div className="mt-auto border-t border-gray-200 pt-4">
                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => handleNavigate("login")}
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={() => handleNavigate("signup")}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                    >
                      Get Started
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
