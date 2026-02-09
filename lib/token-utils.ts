import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function createMagicToken(email: string) {
  // Delete any existing tokens for this email to keep it clean
  await (prisma as any).magicToken.deleteMany({
    where: { email },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  return await (prisma as any).magicToken.create({
    data: {
      token,
      email,
      expiresAt,
    },
  });
}

export async function verifyMagicToken(token: string) {
  const magicToken = await (prisma as any).magicToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!magicToken) return null;

  if (magicToken.expiresAt < new Date()) {
    await (prisma as any).magicToken.delete({ where: { id: magicToken.id } });
    return null;
  }

  return magicToken.user;
}

export async function consumeMagicToken(token: string) {
  const user = await verifyMagicToken(token);
  if (user) {
    await (prisma as any).magicToken.delete({ where: { token } });
  }
  return user;
}
