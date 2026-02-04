import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isApiPage = req.nextUrl.pathname.startsWith("/api");
    const isAdminPage = req.nextUrl.pathname.startsWith("/admin");
    const isSupportPage = req.nextUrl.pathname.startsWith("/admin/support") || 
                           req.nextUrl.pathname.startsWith("/admin/disputes") ||
                           req.nextUrl.pathname.startsWith("/admin/refunds");

    if (isAdminPage || (isApiPage && req.nextUrl.pathname.startsWith("/api/admin"))) {
      if (!isAuth) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
      }

      const role = token.role?.toUpperCase();
      
      // Support Agents can only access specific admin sub-paths if restricted, 
      // but here we allow ADMIN and SUPPORT to main admin areas and their specific routes
      if (role !== "ADMIN" && role !== "SUPPORT") {
        return NextResponse.redirect(new URL("/account", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
