import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      avatar: string | null;
    };
  }

  interface User {
    role: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatar: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatar: string | null;
  }
}
