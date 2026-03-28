import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PageType } from "../App";

const STORAGE_KEY = "timelink_user";

export type AuthUser = {
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed?.email && parsed?.name) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    typeof window !== "undefined" ? readStoredUser() : null,
  );

  const login = useCallback((next: AuthUser) => {
    setUser(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [user, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

/** Sayfalar giriş gerektirir; girişsiz açılırsa login ekranı gösterilir. */
export function pageRequiresAuth(page: PageType): boolean {
  const protectedPages: PageType[] = [
    "dashboard",
    "profile",
    "messages",
    "edit-profile",
    "add-skill",
    "past-sessions",
  ];
  return protectedPages.includes(page);
}
