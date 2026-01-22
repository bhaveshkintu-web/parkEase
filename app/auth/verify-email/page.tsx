// "use client";

// import { useState } from "react";
// import { useSearchParams } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Alert, AlertDescription } from "@/components/ui/alert";
// import { Loader2, MailCheck, AlertCircle } from "lucide-react";

// export default function VerifyEmailPage() {
//   const searchParams = useSearchParams();
//   const email = searchParams.get("email");

//   const [loading, setLoading] = useState(false);
//   const [success, setSuccess] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   const resendEmail = async () => {
//     if (!email) {
//       setError("Email not found. Please register again.");
//       return;
//     }

//     setLoading(true);
//     setError(null);
//     setSuccess(null);

//     try {
//       const res = await fetch("/api/auth/resend-verification", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email }),
//       });

//       const result = await res.json();

//       if (!res.ok) {
//         setError(result.error || "Failed to resend email");
//       } else {
//         setSuccess("Verification email sent successfully.");
//       }
//     } catch {
//       setError("Network error");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center px-4">
//       <Card className="w-full max-w-md">
//         <CardHeader className="text-center space-y-2">
//           <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
//             <MailCheck className="w-6 h-6 text-primary" />
//           </div>
//           <CardTitle className="text-2xl">Verify your email</CardTitle>
//           <p className="text-sm text-muted-foreground">
//             We sent a verification link to <br />
//             <strong>{email}</strong>
//           </p>
//         </CardHeader>

//         <CardContent className="space-y-4">
//           {success && (
//             <Alert>
//               <AlertDescription>{success}</AlertDescription>
//             </Alert>
//           )}

//           {error && (
//             <Alert variant="destructive">
//               <AlertCircle className="w-4 h-4" />
//               <AlertDescription>{error}</AlertDescription>
//             </Alert>
//           )}

//           <Button className="w-full" onClick={resendEmail} disabled={loading}>
//             {loading ? (
//               <>
//                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
//                 Sending...
//               </>
//             ) : (
//               "Resend verification email"
//             )}
//           </Button>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, MailCheck, AlertCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ AUTO VERIFY IF TOKEN EXISTS
  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Verification failed");
          return;
        }

        setMessage("Email verified successfully 🎉 Redirecting...");
        setTimeout(() => router.push("/auth/login"), 5000);
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <MailCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {token ? "Verifying email..." : "Verify your email"}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading && (
            <div className="flex justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Please wait...
            </div>
          )}

          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!token && (
            <p className="text-sm text-muted-foreground">
              We have sent a verification link to your email. Please check your
              inbox.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
