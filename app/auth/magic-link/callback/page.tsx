"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function MagicLinkCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const token = searchParams.get("token");
  const returnUrl = searchParams.get("returnUrl") || "/";

  useEffect(() => {
    if (token) {
      signIn("credentials", {
        token,
        callbackUrl: returnUrl,
        redirect: false,
      }).then(async (res) => {
        if (res?.error) {
          router.push(`/auth/login?error=${res.error}`);
        } else {
          await refresh();
          router.push(returnUrl);
        }
      });
    }
  }, [token, router, returnUrl, refresh]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <h1 className="text-xl font-bold">Signing you in...</h1>
      <p className="text-muted-foreground">Please wait while we verify your magic link.</p>
    </div>
  );
}
