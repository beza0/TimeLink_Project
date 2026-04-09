import { Button } from "../ui/button";
import { Clock, LogOut, Settings, X } from "lucide-react";
import type { PageType } from "../../App";
import { useLanguage } from "../../contexts/LanguageContext";

interface SidebarProps {
  isOpen: boolean;
  isAuthenticated: boolean;
  onClose: () => void;
  onNavigate: (page: PageType) => void;
  onLogout: () => void;
}

export function Sidebar({
  isOpen,
  isAuthenticated,
  onClose,
  onNavigate,
  onLogout,
}: SidebarProps) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <>
      <div
        className="nav-xl-sidebar-host fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        aria-hidden
      />

      <div className="nav-xl-sidebar-host fixed top-0 left-0 bottom-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-gray-950 dark:shadow-black/40">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
          <button
            onClick={() => {
              onClose();
              onNavigate("landing");
            }}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl text-gray-900 dark:text-gray-100">TimeLink</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
              onClick={() => onNavigate("browse")}
              className="sidebar-nav-item rounded-xl px-4 py-4 text-left text-base text-gray-700 transition-colors dark:text-gray-200"
            >
              {t.sidebar.browseSkills}
            </button>
            <button
              onClick={() => onNavigate("how-it-works")}
              className="sidebar-nav-item rounded-xl px-4 py-4 text-left text-base text-gray-700 transition-colors dark:text-gray-200"
            >
              {t.sidebar.howItWorks}
            </button>
            {isAuthenticated && (
              <>
                <button
                  onClick={() => onNavigate("dashboard")}
                  className="sidebar-nav-item rounded-xl px-4 py-4 text-left text-base text-gray-700 transition-colors dark:text-gray-200"
                >
                  {t.sidebar.dashboard}
                </button>
                <button
                  onClick={() => onNavigate("messages")}
                  className="sidebar-nav-item rounded-xl px-4 py-4 text-left text-base text-gray-700 transition-colors dark:text-gray-200"
                >
                  {t.sidebar.messages}
                </button>
                <button
                  onClick={() => onNavigate("profile")}
                  className="sidebar-nav-item rounded-xl px-4 py-4 text-left text-base text-gray-700 transition-colors dark:text-gray-200"
                >
                  {t.sidebar.profile}
                </button>
                <div className="my-3 border-t border-gray-200 dark:border-gray-800" />
                <button
                  onClick={() => onNavigate("settings")}
                  className="sidebar-nav-item flex items-center gap-2 rounded-xl px-4 py-4 text-left text-base text-gray-700 transition-colors dark:text-gray-200"
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  {t.sidebar.settings}
                </button>
              </>
            )}
          </div>

          <div className="mt-auto border-t border-gray-200 pt-4 dark:border-gray-800">
            {isAuthenticated ? (
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t.sidebar.logout}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => onNavigate("login")}
                >
                  {t.sidebar.signIn}
                </Button>
                <Button
                  onClick={() => onNavigate("signup")}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                >
                  {t.sidebar.getStarted}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
