import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {

  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "hidden" },
      },

      async authorize(credentials) {
        if (credentials?.token) {
          const { consumeMagicToken } = await import("@/lib/token-utils");
          const user = await consumeMagicToken(credentials.token);
          if (!user) throw new Error("Invalid or expired token");
          
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            avatar: user.avatar,
          };
        }

        if (!credentials?.email || !credentials.password) {
          throw new Error("Missing credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("No user found with this email");
        }

        if (!user.emailVerified) {
          throw new Error("Email not verified");
        }

        if (user.status !== "ACTIVE") {
          throw new Error(`Account is ${user.status.toLowerCase()}. Please contact support.`);
        }

        if (!user.password) {
          throw new Error("This account does not have a password set. Please use the method you originally signed up with (e.g., Guest Checkout).");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatar: user.avatar,
          isGuest: (user as any).isGuest,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.phone = (user as any).phone;
        token.avatar = (user as any).avatar;
        token.isGuest = (user as any).isGuest;

        // Fetch ownerId if role is OWNER
        if ((user as any).role === "OWNER") {
          const profile = await prisma.ownerProfile.findUnique({
            where: { userId: user.id },
            select: { id: true }
          });
          if (profile) {
            token.ownerId = profile.id;
          }
        }
        
        // Fetch preferences
        const prefSettings = await prisma.platformSettings.findMany({
          where: { key: { startsWith: `user:${user.id}:` } }
        });

        const preferences: any = {
          notifications: { email: true, sms: false, marketing: false },
          defaultVehicleId: "no-default",
          defaultPaymentId: "no-default",
          lastRevokedAt: null as string | null
        };

        prefSettings.forEach((s: any) => {
          if (s.key.endsWith("notifications.email")) preferences.notifications.email = s.value === "true";
          if (s.key.endsWith("notifications.sms")) preferences.notifications.sms = s.value === "true";
          if (s.key.endsWith("notifications.marketing")) preferences.notifications.marketing = s.value === "true";
          if (s.key.endsWith("security.lastRevokedAt")) preferences.lastRevokedAt = s.value;
        });

        // Fetch default vehicle/payment from their models
        const defaultVehicle = await prisma.savedVehicle.findFirst({
          where: { userId: user.id, isDefault: true },
          select: { id: true }
        });
        if (defaultVehicle) preferences.defaultVehicleId = defaultVehicle.id;

        const defaultPayment = await prisma.paymentMethod.findFirst({
          where: { userId: user.id, isDefault: true },
          select: { id: true }
        });
        if (defaultPayment) preferences.defaultPaymentId = defaultPayment.id;

        token.preferences = preferences;
      }

      // Session Revocation Check
      const revocationKey = `user:${token.id}:security.lastRevokedAt`;
      const lastRevokedAt = await prisma.platformSettings.findUnique({
        where: { key: revocationKey },
        select: { value: true },
      });

      if (lastRevokedAt && token.iat) {
        const revokedTime = new Date(lastRevokedAt.value).getTime();
        const issuedTime = (token.iat as number) * 1000; // JWT iat is in seconds
        if (issuedTime < revokedTime) {
          throw new Error("Session revoked");
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.phone = token.phone as string | null;
        session.user.avatar = token.avatar as string | null;
        (session.user as any).isGuest = token.isGuest as boolean;
        (session.user as any).ownerId = token.ownerId as string | undefined;
        (session.user as any).preferences = token.preferences;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
