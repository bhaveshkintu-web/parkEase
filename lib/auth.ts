import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";

export async function getAuthUserId(): Promise<string> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  return session.user.id;
}
