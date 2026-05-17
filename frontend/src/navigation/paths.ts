import type { PageType } from "../App";

/** Tüm uygulama yolları — tarayıcı geri/ileri ve paylaşılabilir URL'ler */
export const PATHS = {
  home: "/",
  browse: "/browse",
  dashboard: "/dashboard",
  profile: "/profile",
  howItWorks: "/how-it-works",
  addSkill: "/add-skill",
  editSkill: (id: string) => `/edit-skill/${id}`,
  pastSessions: "/past-sessions",
  editProfile: "/edit-profile",
  settings: "/settings",
  messages: "/messages",
  notifications: "/notifications",
  signup: "/signup",
  login: "/login",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  /** Dinamik */
  skill: (id: string) => `/skill/${id}`,
  user: (id: string) => `/u/${id}`,
  about: "/about",
  community: "/community",
  contact: "/contact",
  support: "/support",
  terms: "/terms",
  privacy: "/privacy",
  policyCancellation: "/policies/cancellation",
  instructorGuide: "/instructor-guide",
  faq: "/faq",
  buyCredits: "/buy-credits",
  payment: "/payment",
  paymentReturn: "/payment/return",
} as const;

const PAGE_PATH: Record<
  Exclude<PageType, "skill-detail" | "user-profile">,
  string
> = {
  landing: PATHS.home,
  browse: PATHS.browse,
  dashboard: PATHS.dashboard,
  profile: PATHS.profile,
  "how-it-works": PATHS.howItWorks,
  "add-skill": PATHS.addSkill,
  "past-sessions": PATHS.pastSessions,
  "edit-profile": PATHS.editProfile,
  settings: PATHS.settings,
  messages: PATHS.messages,
  notifications: PATHS.notifications,
  signup: PATHS.signup,
  login: PATHS.login,
  "forgot-password": PATHS.forgotPassword,
  "reset-password": PATHS.resetPassword,
  about: PATHS.about,
  community: PATHS.community,
  contact: PATHS.contact,
  support: PATHS.support,
  terms: PATHS.terms,
  privacy: PATHS.privacy,
  "policy-cancellation": PATHS.policyCancellation,
  "instructor-guide": PATHS.instructorGuide,
  faq: PATHS.faq,
  "buy-credits": PATHS.buyCredits,
  payment: PATHS.payment,
};

export function pageToPath(
  page: PageType,
  opts?: { skillId?: string; userId?: string },
): string {
  if (page === "skill-detail") {
    if (!opts?.skillId) return PATHS.browse;
    return PATHS.skill(opts.skillId);
  }
  if (page === "user-profile") {
    if (!opts?.userId) return PATHS.profile;
    return PATHS.user(opts.userId);
  }
  return PAGE_PATH[page];
}
