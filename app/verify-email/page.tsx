"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing verification token");
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const result = await res.json();
        console.log("verifyEmail-------------------", result);

        if (!res.ok) {
          throw new Error(result.error || "Verification failed");
        }

        setStatus("success");
        setMessage("Email verified successfully 🎉");

        // redirect after success
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Verification failed");
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="max-w-md w-full p-6 text-center border rounded-lg">
      {status === "loading" && <p>{message}</p>}
      {status === "success" && <p className="text-green-600">{message}</p>}
      {status === "error" && <p className="text-red-600">{message}</p>}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
