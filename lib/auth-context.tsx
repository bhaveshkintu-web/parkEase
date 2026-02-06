"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { signIn, signOut } from "next-auth/react";

/* =======================
   TYPES
======================= */

export type UserRole = "ADMIN" | "OWNER" | "WATCHMAN" | "CUSTOMER" | "admin" | "owner" | "watchman" | "customer";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  emailVerified: boolean;
  role: UserRole;
  ownerId?: string;
  ownerProfile?: any; // Avoiding circular dependency if possible, or just use any for now
  createdAt?: string;
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

interface AuthContextType extends AuthState {
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; user?: User; error?: string }>;

  register: (
    data: RegisterData,
  ) => Promise<{ success: boolean; user?: User; error?: string }>;

  updateProfile: (
    data: Partial<User>,
  ) => Promise<{ success: boolean; error?: string }>;

  resendEmailVerification: () => Promise<{ success: boolean; error?: string }>;

  uploadAvatar: (file: File) => Promise<{ success: boolean; error?: string }>;

  removeAvatar: () => Promise<{ success: boolean; error?: string }>;

  logout: () => void;
}

/* =======================
   CONSTANTS
======================= */


const AUTH_STORAGE_KEY = "parkease_auth";

export const DEMO_ACCOUNTS = {
  customer: {
    email: "customer@example.com",
    password: "password123",
    dashboardUrl: "/account",
    description: "Search and book parking spots, manage your vehicles and reservations.",
  },
  owner: {
    email: "owner@example.com",
    password: "password123",
    dashboardUrl: "/owner",
    description: "Manage your parking locations, watchmen staff, and track earnings.",
  },
  watchman: {
    email: "watchman@example.com",
    password: "password123",
    dashboardUrl: "/watchman",
    description: "Scan QR codes, manage vehicle check-ins and check-outs at locations.",
  },
  admin: {
    email: "admin@example.com",
    password: "password123",
    dashboardUrl: "/admin",
    description: "Full platform oversight, user management, and system-wide analytics.",
  },
};

/* =======================
   HELPERS
======================= */

function normalizeUser(raw: any): User {
  return {
    id: raw.id,
    email: raw.email,
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    phone: raw.phone ?? null,
    avatar: raw.avatar ?? null,
    emailVerified: Boolean(raw.emailVerified),
    role: raw.role, // Preserve exact role from database (ADMIN, OWNER, CUSTOMER, etc.)
    ownerId: raw.ownerId,
    ownerProfile: raw.ownerProfile,
    createdAt: raw.createdAt,
  };
}

/* =======================
   CONTEXT
======================= */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* =======================
   PROVIDER
======================= */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // restore session
  useEffect(() => {
    async function restoreSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data?.user) {
          setUser(normalizeUser(data.user));
          setIsAuthenticated(true);
        }
      } catch { }
      setIsLoading(false);
    }
    restoreSession();
  }, []);

  /* =======================
       REGISTER
    ======================= */
  const register = useCallback(async (data: RegisterData) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        return { success: false, error: result.error };
      }

      // register API user return nahi karti (email verification ke liye)
      return { success: true };
    } catch (err) {
      console.error("REGISTER_ERROR:", err);
      return { success: false, error: "Network error" };
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setIsLoading(false);
        return { success: false, error: res.error };
      }

      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (!sessionData?.user) throw new Error("Unauthorized");

      console.log("session==================", sessionData);

      setUser(normalizeUser(sessionData.user));
      setIsAuthenticated(true);
      setIsLoading(false);
      return { success: true, user: normalizeUser(sessionData.user) };
    } catch {
      setIsLoading(false);
      return { success: false, error: "Network error" };
    }
  }, []);

  /* =======================
       UPDATE PROFILE
    ======================= */
  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      try {
        const res = await fetch("/api/user/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            ...data,
          }),
        });

        const result = await res.json();

        if (!res.ok) {
          return { success: false, error: result.error };
        }

        // 🔁 refresh NextAuth session
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();

        if (sessionData?.user) {
          setUser(normalizeUser(sessionData.user));
        } else {
          // Fallback: manually update local state if session refresh fails or returns stale data
          setUser(prev => prev ? { ...prev, ...data } : null);
        }

        return { success: true };
      } catch (err) {
        console.error("UPDATE_PROFILE_ERROR:", err);
        return { success: false, error: "Network error" };
      }
    },
    [user],
  );

  const resendEmailVerification = useCallback(async () => {
    if (!user?.email) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      const result = await res.json();

      if (!res.ok) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (err) {
      console.error("RESEND_VERIFICATION_ERROR:", err);
      return { success: false, error: "Network error" };
    }
  }, [user]);

  //   /* =======================
  //      UPLOAD AVATAR
  //   ======================= */
  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      const formData = new FormData();
      formData.append("avatar", file);
      formData.append("userId", user.id);

      try {
        const res = await fetch("/api/user/avatar", {
          method: "POST",
          body: formData,
        });

        const result = await res.json();

        if (!res.ok) {
          return { success: false, error: result.error };
        }

        // 🔁 refresh session
        if (result.avatar) {
          setUser(prev => prev ? { ...prev, avatar: result.avatar } : null);
        }

        return { success: true };
      } catch (err) {
        console.error("UPLOAD_AVATAR_ERROR:", err);
        return { success: false, error: "Network error" };
      }
    },
    [user],
  );

  //   /* =======================
  //      REMOVE AVATAR
  //   ======================= */
  const removeAvatar = useCallback(async () => {
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const res = await fetch("/api/user/avatar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = await res.json();

      if (!res.ok) {
        return { success: false, error: result.error };
      }

      // 🔁 refresh session
      setUser(prev => prev ? { ...prev, avatar: null } : null);

      return { success: true };
    } catch (err) {
      console.error("REMOVE_AVATAR_ERROR:", err);
      return { success: false, error: "Network error" };
    }
  }, [user]);

  const logout = useCallback(() => {
    signOut({ callbackUrl: "/" });
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        register,
        updateProfile,
        uploadAvatar,
        removeAvatar,
        resendEmailVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =======================
   HOOK
======================= */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

/* =======================
   ROLE → DASHBOARD
======================= */

export function getDashboardUrlForRole(role: string) {
  const normalizedRole = role.toLowerCase();
  switch (normalizedRole) {
    case "admin":
      return "/admin";
    case "owner":
      return "/owner";
    case "watchman":
      return "/watchman";
    default:
      return "/account";
  }
}
