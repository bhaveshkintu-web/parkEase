"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { signIn } from "next-auth/react";

/* =======================
   TYPES
======================= */

export type UserRole = "admin" | "owner" | "watchman" | "customer";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  emailVerified: boolean;
  role: UserRole;
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
    role: raw.role,
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
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  /* =======================
     RESTORE SESSION
  ======================= */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) throw new Error("No session");

      const parsed = JSON.parse(stored);
      if (!parsed?.user) throw new Error("Invalid session");

      const user = normalizeUser(parsed.user);

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setState((s) => ({ ...s, isLoading: false }));
    }
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

  /* =======================
     LOGIN
  ======================= */
  const login = useCallback(async (email: string, password: string) => {
    try {
      // First, use our custom API to get the user data for localStorage
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (!res.ok) {
        return { success: false, error: result.error };
      }

      const user = normalizeUser(result.user);

      // CRITICAL: Synchronize with NextAuth session cookie
      const nextAuthResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (nextAuthResult?.error) {
        console.error("NextAuth Sync failed:", nextAuthResult.error);
        // We continue because the custom login succeeded, but warnings are good
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user }));

      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true, user };
    } catch (err) {
      console.error("LOGIN_ERROR:", err);
      return { success: false, error: "Network error" };
    }
  }, []);

  /* =======================
     UPDATE PROFILE
  ======================= */
  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      if (!state.user) {
        return { success: false, error: "Not authenticated" };
      }

      try {
        const res = await fetch("/api/user/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: state.user.id,
            ...data,
          }),
        });

        const result = await res.json();

        if (!res.ok) {
          return { success: false, error: result.error };
        }

        const mergedUser = normalizeUser({
          ...state.user,
          ...result.user,
        });

        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({ user: mergedUser }),
        );

        setState((s) => ({ ...s, user: mergedUser }));

        return { success: true };
      } catch (err) {
        console.error("UPDATE_PROFILE_ERROR:", err);
        return { success: false, error: "Network error" };
      }
    },
    [state.user],
  );

  /* =======================
     RESEND EMAIL
  ======================= */
  const resendEmailVerification = useCallback(async () => {
    if (!state.user) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: state.user.email }),
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
  }, [state.user]);

  /* =======================
     UPLOAD AVATAR
  ======================= */
  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!state.user) {
        return { success: false, error: "Not authenticated" };
      }

      const formData = new FormData();
      formData.append("avatar", file);
      formData.append("userId", state.user.id);

      try {
        const res = await fetch("/api/user/avatar", {
          method: "POST",
          body: formData,
        });

        const result = await res.json();

        if (!res.ok) {
          return { success: false, error: result.error };
        }

        const updatedUser = normalizeUser({
          ...state.user,
          avatar: result.avatar,
        });

        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({ user: updatedUser }),
        );

        setState((s) => ({ ...s, user: updatedUser }));

        return { success: true };
      } catch (err) {
        console.error("UPLOAD_AVATAR_ERROR:", err);
        return { success: false, error: "Network error" };
      }
    },
    [state.user],
  );

  /* =======================
     REMOVE AVATAR
  ======================= */
  const removeAvatar = useCallback(async () => {
    if (!state.user) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const res = await fetch("/api/user/avatar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: state.user.id }),
      });

      const result = await res.json();

      if (!res.ok) {
        return { success: false, error: result.error };
      }

      const updatedUser = { ...state.user, avatar: null };

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user: updatedUser }),
      );

      setState((s) => ({ ...s, user: updatedUser }));

      return { success: true };
    } catch (err) {
      console.error("REMOVE_AVATAR_ERROR:", err);
      return { success: false, error: "Network error" };
    }
  }, [state.user]);

  /* =======================
     LOGOUT
  ======================= */
  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        updateProfile,
        resendEmailVerification,
        uploadAvatar,
        removeAvatar,
        logout,
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

export function getDashboardUrlForRole(role: UserRole) {
  switch (role) {
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
