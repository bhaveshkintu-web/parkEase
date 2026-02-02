import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",

      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        console.log('🔐 NextAuth authorize called with:', { email: credentials?.email });

        if (!credentials?.email || !credentials.password) {
          console.log('❌ Missing credentials');
          throw new Error("Missing credentials");
        }


        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        console.log('👤 User found:', user ? {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        } : 'NO USER FOUND');

        if (!user) {
          console.log('❌ User not found');
          throw new Error("Invalid credentials");
        }

        if (!user.emailVerified) {
          console.log('❌ Email not verified');
          throw new Error("Email not verified");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        console.log('🔑 Password validation result:', isValid);

        if (!isValid) {
          console.log('❌ Invalid password');
          throw new Error("Invalid credentials");
        }

        console.log('✅ Authorization successful');
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatar: user.avatar,
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
        (session.user as any).ownerId = token.ownerId as string | undefined;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
