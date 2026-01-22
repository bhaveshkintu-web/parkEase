import crypto from "crypto";

export function generateToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(rawToken);
  const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  return { rawToken, hashedToken, expiry };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
