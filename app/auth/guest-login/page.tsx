"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, ArrowRight, Loader2, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ---------------- INNER COMPONENT ---------------- */

function GuestLoginContent() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/guest-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, returnUrl }),
      });

      if (res.ok) {
        setIsSent(true);
        toast({
          title: "Check your email",
          description:
            "We've sent you a magic link to sign in as a guest.",
        });
      } else {
        const error = await res.json();
        throw new Error(error.error || "Failed to send guest login link");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md border-2 border-primary/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Check your inbox
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              We've sent a magic link to{" "}
              <span className="font-bold text-foreground">
                {email}
              </span>
              . Click the link to sign in and continue your booking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 border border-amber-200">
              <p className="font-semibold">Note:</p>
              <p>
                The link will expire in 15 minutes. If you don't
                see it, check your spam folder.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsSent(false)}
            >
              Back to guest login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="container relative flex flex-1 flex-col items-center justify-center lg:px-0">
        <Link
          href="/auth/login"
          className="absolute left-4 top-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground md:left-8 md:top-8"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Login
        </Link>

        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Continue as Guest
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to receive a magic sign-in link
            </p>
          </div>

          <Card className="border-2">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">
                Quick Access
              </CardTitle>
              <CardDescription>
                No password required. We'll verify your email instantly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      required
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Send Magic Link
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="px-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href={`/auth/login?returnUrl=${encodeURIComponent(
                returnUrl
              )}`}
              className="font-semibold text-primary underline underline-offset-4 hover:opacity-80"
            >
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- WRAPPER (IMPORTANT FIX) ---------------- */

export default function GuestLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <GuestLoginContent />
    </Suspense>
  );
}