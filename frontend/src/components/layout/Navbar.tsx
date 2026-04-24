import { Button } from "../ui/button";
import { Clock, Menu, Bell, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { PageType } from "../../App";
import { PATHS } from "../../navigation/paths";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  isNotificationUnread,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  type NotificationDto,
} from "../../api/notifications";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Sidebar } from "./Sidebar";

interface NavbarProps {
  onNavigate?: (page: PageType) => void;
}

export function Navbar({ onNavigate }: NavbarProps) {
  const { isAuthenticated, logout, token } = useAuth();
  const { t, locale } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifUnreadOnly, setNotifUnreadOnly] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);

  const loadUnread = async () => {
    if (!isAuthenticated || !token) {
      setNotifCount(0);
      return;
    }
    try {
      const r = await fetchUnreadNotificationCount(token);
      setNotifCount(r.count);
    } catch {
      setNotifCount(0);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setNotifCount(0);
      return;
    }
    void loadUnread();
    const interval = window.setInterval(() => void loadUnread(), 60_000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!notifOpen || !token) return;
    let cancelled = false;
    const load = async () => {
      try {
        const list = await fetchNotifications(token);
        if (cancelled) return;
        setNotifications(list);
      } catch {
        if (!cancelled) {
          setNotifications([]);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [notifOpen, token]);

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

  const goToExchangeMessages = async (exchangeRequestId: string | null) => {
    if (!exchangeRequestId) return;
    try {
      sessionStorage.setItem("timelink_open_exchange", exchangeRequestId);
    } catch {
      /* ignore */
    }
    setNotifOpen(false);
    handleNavigate("messages");
  };

  const syncNotificationsFromServer = async () => {
    if (!token) return;
    try {
      const list = await fetchNotifications(token);
      setNotifications(list);
      setNotifCount(list.filter((n) => isNotificationUnread(n)).length);
    } catch {
      void loadUnread();
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!token) return;
    setNotifCount(0);
    try {
      await markAllNotificationsRead(token);
      await syncNotificationsFromServer();
    } catch {
      void loadUnread();
    }
  };

  const navLinkClass =
    "cursor-pointer rounded-md px-2 py-1.5 shrink-0 whitespace-nowrap text-white/90 transition-all duration-150 hover:bg-white/30 hover:text-white hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]";

  const notificationsForPopover = notifUnreadOnly
    ? notifications.filter((n) => isNotificationUnread(n))
    : notifications;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/20 bg-gradient-to-r from-blue-500 to-purple-600 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 min-w-0 items-center justify-between gap-3">
            {/* Logo */}
            <button
              onClick={() => handleNavigate("landing")}
              className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 transition-all hover:bg-white/10 hover:opacity-100"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl whitespace-nowrap text-white">
                TimeLink
              </span>
            </button>

            {/* Desktop Navigation — only wide screens; flex-nowrap in CSS (nav-xl-row) */}
            <div className="nav-xl-row min-w-0 gap-6">
              <button
                onClick={() => handleNavigate("browse")}
                className={navLinkClass}
              >
                {t.nav.browseSkills}
              </button>

              {isAuthenticated && (
                <>
                  <button
                    onClick={() => handleNavigate("dashboard")}
                    className={navLinkClass}
                  >
                    {t.nav.dashboard}
                  </button>
                  <button
                    onClick={() => handleNavigate("messages")}
                    className={`${navLinkClass} inline-flex items-center gap-1.5`}
                  >
                    {t.nav.messages}
                  </button>
                  <button
                    onClick={() => handleNavigate("profile")}
                    className={navLinkClass}
                  >
                    {t.nav.profile}
                  </button>
                  <button
                    onClick={() => handleNavigate("settings")}
                    className={navLinkClass}
                  >
                    {t.nav.settings}
                  </button>
                </>
              )}
              <button
                onClick={() => handleNavigate("how-it-works")}
                className={navLinkClass}
              >
                {t.nav.howItWorks}
              </button>
            </div>

            {/* Auth cluster: bell outside nav-xl-row so it stays next to hamburger on narrow screens */}
            <div className="flex shrink-0 items-center gap-3 sm:gap-2 md:gap-3 pl-2 pr-[max(0.75rem,env(safe-area-inset-right))] sm:pl-1 sm:pr-[max(0rem,env(safe-area-inset-right))]">
              {isAuthenticated ? (
                <Popover modal={false} open={notifOpen} onOpenChange={setNotifOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="nav-notification-bell-btn inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-white ring-1 ring-white/30 transition hover:bg-white/30 sm:mx-1"
                      aria-label={t.nav.notifications}
                    >
                      <Bell className="h-4 w-4 shrink-0 text-white" />
                      <span className="text-sm font-semibold tabular-nums">
                        {notifCount > 99 ? "99+" : notifCount}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    side="bottom"
                    sideOffset={8}
                    collisionPadding={20}
                    className="nav-notification-popover overflow-hidden rounded-2xl border border-border bg-popover p-0 text-popover-foreground shadow-2xl"
                  >
                    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-lg font-semibold text-foreground">
                        {t.nav.notifications}
                      </h2>
                      <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
                          <input
                            type="checkbox"
                            checked={notifUnreadOnly}
                            onChange={() => setNotifUnreadOnly((u) => !u)}
                            className="h-3.5 w-3.5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 dark:border-zinc-500 dark:bg-zinc-900"
                          />
                          {t.notificationsPage.unreadOnly}
                        </label>
                        <button
                        type="button"
                        className="text-sm font-medium text-purple-600 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-purple-400 dark:hover:text-purple-300"
                        disabled={
                          notifications.length === 0 ||
                          !notifications.some((n) => isNotificationUnread(n))
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleMarkAllNotificationsRead();
                        }}
                      >
                        {t.nav.markAllRead}
                      </button>
                      </div>
                    </div>
                    <div className="nav-notification-scroll max-h-[min(440px,calc(100dvh-10rem))]">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 dark:text-muted-foreground">
                          {t.nav.noNotifications}
                        </p>
                      ) : notificationsForPopover.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 dark:text-muted-foreground">
                          {t.notificationsPage.emptyUnreadFilter}
                        </p>
                      ) : (
                        notificationsForPopover.map((n) => {
                          const unread = isNotificationUnread(n);
                          return (
                            <div
                              key={n.id}
                              className={`border-b border-border p-4 transition-colors last:border-b-0 ${
                                unread
                                  ? "border-l-[5px] border-l-purple-600 bg-background"
                                  : "border-l-[5px] border-l-transparent bg-muted/30"
                              }`}
                            >
                              <div
                                role={n.exchangeRequestId ? "button" : undefined}
                                tabIndex={n.exchangeRequestId ? 0 : undefined}
                                className={
                                  n.exchangeRequestId
                                    ? "w-full cursor-pointer text-left outline-none"
                                    : "w-full text-left"
                                }
                                onClick={() =>
                                  n.exchangeRequestId
                                    ? void goToExchangeMessages(n.exchangeRequestId)
                                    : undefined
                                }
                                onKeyDown={
                                  n.exchangeRequestId
                                    ? (ev) => {
                                        if (ev.key === "Enter" || ev.key === " ") {
                                          ev.preventDefault();
                                          void goToExchangeMessages(n.exchangeRequestId);
                                        }
                                      }
                                    : undefined
                                }
                              >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                  <h3
                                    className={
                                      unread
                                        ? "font-bold text-gray-900 dark:text-foreground"
                                        : "font-medium text-gray-400 dark:text-muted-foreground"
                                    }
                                  >
                                    {n.title}
                                  </h3>
                                  <span
                                    className={`shrink-0 whitespace-nowrap text-xs ${
                                      unread
                                        ? "text-gray-500 dark:text-muted-foreground"
                                        : "text-gray-400 dark:text-muted-foreground/90"
                                    }`}
                                  >
                                    {new Date(n.createdAt).toLocaleString(
                                      locale === "tr" ? "tr-TR" : "en-US",
                                      { dateStyle: "short", timeStyle: "short" },
                                    )}
                                  </span>
                                </div>
                                {n.skillTitle ? (
                                  <p
                                    className={`mb-2 text-sm ${
                                      unread
                                        ? "font-medium text-purple-600 dark:text-purple-400"
                                        : "font-medium text-purple-400/45 dark:text-purple-400/35"
                                    }`}
                                  >
                                    {n.skillTitle}
                                  </p>
                                ) : null}
                                <p
                                  className={`mb-3 text-sm leading-relaxed ${
                                    unread
                                      ? "text-gray-700 dark:text-foreground/90"
                                      : "text-gray-400 dark:text-muted-foreground/85"
                                  }`}
                                >
                                  {n.body}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-3">
                                {n.exchangeRequestId ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void goToExchangeMessages(n.exchangeRequestId);
                                    }}
                                    className={`inline-flex items-center gap-2 text-sm font-medium ${
                                      unread
                                        ? "text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                                        : "text-purple-500/55 hover:text-purple-500/75 dark:text-purple-400/45 dark:hover:text-purple-400/65"
                                    }`}
                                  >
                                    <MessageCircle className="h-4 w-4 shrink-0" />
                                    {t.nav.goToMessages}
                                  </button>
                                ) : null}
                                {token && n.id && unread ? (
                                  <button
                                    type="button"
                                    className="relative z-10 text-sm text-gray-600 hover:text-gray-800 dark:text-muted-foreground dark:hover:text-foreground"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void (async () => {
                                        try {
                                          await markNotificationRead(token, n.id);
                                          await syncNotificationsFromServer();
                                        } catch {
                                          void loadUnread();
                                        }
                                      })();
                                    }}
                                  >
                                    {t.nav.markRead}
                                  </button>
                                ) : null}
                                {token && n.id && !unread ? (
                                  <button
                                    type="button"
                                    className="relative z-10 text-sm text-gray-400 hover:text-gray-500 dark:text-muted-foreground/80 dark:hover:text-muted-foreground"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void (async () => {
                                        try {
                                          await markNotificationUnread(token, n.id);
                                          await syncNotificationsFromServer();
                                        } catch {
                                          void loadUnread();
                                        }
                                      })();
                                    }}
                                  >
                                    {t.nav.markUnread}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="border-t border-border bg-muted/20 p-3">
                      <Link
                        to={notifUnreadOnly ? `${PATHS.notifications}?unread=1` : PATHS.notifications}
                        className="block w-full rounded-lg px-3 py-2 text-center text-sm font-medium text-purple-600 transition-colors hover:bg-purple-100 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-500/20 dark:hover:text-purple-300"
                        onClick={() => setNotifOpen(false)}
                      >
                        {t.nav.allNotifications}
                      </Link>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : null}

              <div className="nav-xl-row shrink-0 gap-3">
                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    className="cursor-pointer text-white/90 hover:bg-white/15 hover:text-white"
                    onClick={handleLogout}
                  >
                    {t.nav.logout}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className="cursor-pointer text-white/90 hover:bg-white/15 hover:text-white"
                      onClick={() => handleNavigate("login")}
                    >
                      {t.nav.signIn}
                    </Button>
                    <Button
                      onClick={() => handleNavigate("signup")}
                      className="cursor-pointer whitespace-nowrap bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                    >
                      {t.nav.getStarted}
                    </Button>
                  </>
                )}
              </div>

              {/* Narrow screens: hamburger → sidebar */}
              <button
                type="button"
                className="nav-xl-menu-btn shrink-0 rounded-lg p-2 text-white hover:bg-white/15 hover:text-white"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
                aria-expanded={isMenuOpen}
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
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
