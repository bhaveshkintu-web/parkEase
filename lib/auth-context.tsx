"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
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
  isProfileComplete?: boolean;
  ownerProfile?: any; // Avoiding circular dependency if possible, or just use any for now
  createdAt?: string;
  preferences?: {
    notifications: {
      email: boolean;
      sms: boolean;
      marketing: boolean;
    };
    defaultVehicleId?: string;
    defaultPaymentId?: string;
    lastRevokedAt?: string | null;
  };
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

  updateSecurityPreferences: (
    data: any,
  ) => Promise<{ success: boolean; error?: string }>;

  enableTwoFactor: (
    method: string,
  ) => Promise<{ success: boolean; error?: string; secret?: string }>;

  disableTwoFactor: (password: string) => Promise<{ success: boolean; error?: string }>;

  verifyTwoFactor: (code: string) => Promise<{ success: boolean; error?: string }>;

  getTrustedDevices: () => Promise<any[]>;

  removeTrustedDevice: (id: string) => Promise<{ success: boolean; error?: string }>;

  getLoginActivity: () => Promise<any[]>;

  revokeAllSessions: () => Promise<{ success: boolean; error?: string }>;

  uploadAvatar: (file: File) => Promise<{ success: boolean; error?: string }>;

  removeAvatar: () => Promise<{ success: boolean; error?: string }>;

  updatePreferences: (
    data: any,
  ) => Promise<{ success: boolean; error?: string }>;

  changePassword: (
    current: string,
    newPass: string,
  ) => Promise<{ success: boolean; error?: string }>;

  deleteAccount: () => Promise<{ success: boolean; error?: string }>;

  logout: () => void;
  refresh: () => Promise<void>;
}

/* =======================
   CONSTANTS
======================= */


const AUTH_STORAGE_KEY = "parkzipply_auth";

export const DEMO_ACCOUNTS = {
  customer: {
    email: "customer@parkzipply.com",
    password: "password123",
    dashboardUrl: "/account",
    description: "Search and book parking spots, manage your vehicles and reservations.",
  },
  owner: {
    email: "owner@parkzipply.com",
    password: "password123",
    dashboardUrl: "/owner",
    description: "Manage your parking locations, watchmen staff, and track earnings.",
  },
  watchman: {
    email: "watchman@parkzipply.com",
    password: "password123",
    dashboardUrl: "/watchman",
    description: "Scan QR codes, manage vehicle check-ins and check-outs at locations.",
  },
  admin: {
    email: "admin@parkzipply.com",
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
    isProfileComplete: raw.isProfileComplete,
    ownerProfile: raw.ownerProfile,
    createdAt: raw.createdAt,
    preferences: raw.preferences ?? {
      notifications: { email: true, sms: false, marketing: false },
    },
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

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      if (data?.user) {
        setUser(normalizeUser(data.user));
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);


  const value = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    login: async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setIsLoading(false);
          return { success: false, error: result.error };
        }

        const res = await fetch("/api/auth/session");
        const data = await res.json();

        if (data?.user) {
          const normalized = normalizeUser(data.user);
          setUser(normalized);
          setIsAuthenticated(true);
          setIsLoading(false);
          return { success: true, user: normalized };
        }

        setIsLoading(false);
        return { success: false, error: "Failed to fetch session" };
      } catch (error) {
        setIsLoading(false);
        return { success: false, error: "Authentication failed" };
      }
    },
    register: async (data: RegisterData) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          setIsLoading(false);
          return { success: true, user: result.user };
        } else {
          setIsLoading(false);
          return { success: false, error: result.error || "Registration failed" };
        }
      } catch (error) {
        setIsLoading(false);
        return { success: false, error: "Registration failed" };
      }
    },
    logout: () => {
      signOut({ redirect: true, callbackUrl: "/" });
      setUser(null);
      setIsAuthenticated(false);
    },
    updateProfile: async (data: Partial<User>) => {
      try {
        const response = await fetch("/api/user/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, userId: user?.id }),
        });

        if (response.ok) {
          const res = await fetch("/api/auth/session");
          const sessionData = await res.json();
          if (sessionData?.user) setUser(normalizeUser(sessionData.user));
          return { success: true };
        } else {
          const error = await response.json();
          return { success: false, error: error.message || "Failed to update profile" };
        }
      } catch (error) {
        return { success: false, error: "An unexpected error occurred" };
      }
    },
    resendEmailVerification: async () => {
      try {
        const response = await fetch("/api/auth/verify-email/resend", {
          method: "POST",
        });

        if (response.ok) {
          return { success: true };
        } else {
          const error = await response.json();
          return { success: false, error: error.message || "Failed to resend verification email" };
        }
      } catch (error) {
        return { success: false, error: "An unexpected error occurred" };
      }
    },
    uploadAvatar: async (file: File) => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/user/avatar", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const res = await fetch("/api/auth/session");
          const sessionData = await res.json();
          if (sessionData?.user) setUser(normalizeUser(sessionData.user));
          return { success: true };
        } else {
          const error = await response.json();
          return { success: false, error: error.message || "Failed to upload avatar" };
        }
      } catch (error) {
        return { success: false, error: "An unexpected error occurred" };
      }
    },
    removeAvatar: async () => {
      try {
        const response = await fetch("/api/user/avatar", {
          method: "DELETE",
        });

        if (response.ok) {
          const res = await fetch("/api/auth/session");
          const sessionData = await res.json();
          if (sessionData?.user) setUser(normalizeUser(sessionData.user));
          return { success: true };
        } else {
          const error = await response.json();
          return { success: false, error: error.message || "Failed to remove avatar" };
        }
      } catch (error) {
        return { success: false, error: "An unexpected error occurred" };
      }
    },
    updatePreferences: async (data: any) => {
      if (!user) return { success: false, error: "Not authenticated" };

      try {
        // Determine what's being updated
        if (data.notifications) {
          const { updateUserNotificationSetting } = await import("@/lib/actions/user-settings");
          for (const [key, val] of Object.entries(data.notifications)) {
            await updateUserNotificationSetting(user.id, key as any, val as boolean);
          }
        }
        if (data.defaultVehicleId) {
          const { setDefaultVehicle } = await import("@/lib/actions/user-settings");
          await setDefaultVehicle(user.id, data.defaultVehicleId);
        }
        if (data.defaultPaymentId) {
          const { setDefaultPaymentMethod } = await import("@/lib/actions/user-settings");
          await setDefaultPaymentMethod(user.id, data.defaultPaymentId);
        }

        // Refresh session
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (sessionData?.user) setUser(normalizeUser(sessionData.user));

        return { success: true };
      } catch (err) {
        console.error("UPDATE_PREFERENCES_ERROR:", err);
        return { success: false, error: "Failed to update preferences" };
      }
    },
    changePassword: async (current: string, newPass: string) => {
      if (!user) return { success: false, error: "Not authenticated" };
      const { updateUserPassword } = await import("@/lib/actions/auth-actions");
      const result = await updateUserPassword(user.id, current, newPass);
      return result;
    },
    deleteAccount: async () => {
      if (!user) return { success: false, error: "Not authenticated" };
      const { deleteUserAccount } = await import("@/lib/actions/user-settings");
      const result = await deleteUserAccount(user.id);
      if (result.success) {
        signOut({ redirect: true, callbackUrl: "/" });
        setUser(null);
        setIsAuthenticated(false);
      }
      return result;
    },
    updateSecurityPreferences: async (data: any) => {
      if (!user) return { success: false, error: "Not authenticated" };
      const { updateUserSecurityPreferences } = await import("@/lib/actions/auth-actions");
      const result = await updateUserSecurityPreferences(user.id, data);
      if (result.success) {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (sessionData?.user) setUser(normalizeUser(sessionData.user));
      }
      return result;
    },
    enableTwoFactor: async (method: string) => {
      if (!user) return { success: false, error: "Not authenticated" };
      const { enableUserTwoFactor } = await import("@/lib/actions/auth-actions");
      return await enableUserTwoFactor(user.id, method);
    },
    disableTwoFactor: async (password: string) => {
      if (!user) return { success: false, error: "Not authenticated" };
      const { updateUserSecuritySetting } = await import("@/lib/actions/auth-actions");
      // Here we would also verify password if field was configured to require it
      return await updateUserSecuritySetting(user.id, "twoFactorEnabled" as any, false);
    },
    verifyTwoFactor: async (code: string) => {
      if (!user) return { success: false, error: "Not authenticated" };
      const { verifyUserTwoFactor } = await import("@/lib/actions/auth-actions");
      const result = await verifyUserTwoFactor(user.id, code);
      if (result.success) {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (sessionData?.user) setUser(normalizeUser(sessionData.user));
      }
      return result;
    },
    getTrustedDevices: async () => {
      if (!user) return [];
      const { getUserTrustedDevices } = await import("@/lib/actions/auth-actions");
      return await getUserTrustedDevices(user.id);
    },
    removeTrustedDevice: async (id: string) => {
      if (!user) return { success: false, error: "Not authenticated" };
      const { removeUserTrustedDevice } = await import("@/lib/actions/auth-actions");
      return await removeUserTrustedDevice(user.id, id);
    },
    getLoginActivity: async () => {
      if (!user) return [];
      const { getUserLoginActivity } = await import("@/lib/actions/auth-actions");
      return await getUserLoginActivity(user.id);
    },
    revokeAllSessions: async () => {
      if (!user) return { success: false, error: "Not authenticated" };
      const { revokeAllUserSessions } = await import("@/lib/actions/auth-actions");
      return await revokeAllUserSessions(user.id);
    },
    refresh,
  }), [user, isAuthenticated, isLoading, refresh]);

  return (
    <AuthContext.Provider
      value={value}
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
