import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PageType } from "../App";

const AUTH_STORAGE_KEY = "timelink_auth";
const LEGACY_USER_KEY = "timelink_user";

/** localStorage ~5MB; base64 profil fotoğrafı diske yazılmaz (API tek kaynak). Bellekte tam URL kalır. */
function userForLocalStorage(u: AuthUser): AuthUser {
  const av = u.avatarUrl;
  if (av != null && av.startsWith("data:")) {
    return { ...u, avatarUrl: null };
  }
  return u;
}

export type AuthUser = {
  /** Backend user id (UUID string) when logged in via API */
  id?: string;
  name: string;
  email: string;
  role?: string;
  /** Profil fotoğrafı (data URL veya URL), isteğe bağlı */
  avatarUrl?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  /** Oturumdaki kullanıcıyı günceller (ör. profil kaydından sonra ad). */
  patchUser: (patch: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): { user: AuthUser; token: string } | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        token?: string;
        user?: AuthUser;
      };
      if (
        parsed?.token &&
        parsed?.user?.email &&
        parsed?.user?.name
      ) {
        return { token: parsed.token, user: parsed.user };
      }
    }
    if (localStorage.getItem(LEGACY_USER_KEY)) {
      localStorage.removeItem(LEGACY_USER_KEY);
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined") return null;
    return readStoredSession()?.user ?? null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return readStoredSession()?.token ?? null;
  });

  const login = useCallback((next: AuthUser, nextToken: string) => {
    setUser(next);
    setToken(nextToken);
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ user: userForLocalStorage(next), token: nextToken }),
    );
    localStorage.removeItem(LEGACY_USER_KEY);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  }, []);

  const patchUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            token?: string;
            user?: AuthUser;
          };
          if (parsed?.token) {
            localStorage.setItem(
              AUTH_STORAGE_KEY,
              JSON.stringify({
                user: userForLocalStorage(next),
                token: parsed.token,
              }),
            );
          }
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: user !== null && token !== null,
      login,
      logout,
      patchUser,
    }),
    [user, token, login, logout, patchUser],
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
    "add-skill",
    "past-sessions",
    "edit-profile",
    "settings",
    "messages",
  ];
  return protectedPages.includes(page);
}
