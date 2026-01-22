export default function VerifySuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Email Verified 🎉</h1>
        <p className="text-muted-foreground">
          Your email has been verified successfully.
        </p>
        <a
          href="/auth/login"
          className="inline-block mt-4 px-6 py-2 bg-primary text-white rounded"
        >
          Login
        </a>
      </div>
    </div>
  );
}
