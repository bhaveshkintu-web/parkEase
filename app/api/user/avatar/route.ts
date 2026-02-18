import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

// Upload via base64 data URI with retry logic (more reliable on Vercel than streams)
async function uploadAvatarToCloudinary(buffer: Buffer, mimeType: string): Promise<string> {
  const maxRetries = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const base64 = buffer.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: "avatars",
        resource_type: "image",
        timeout: 60000,
      });

      if (!result?.secure_url) {
        throw new Error("Failed to get secure URL from Cloudinary");
      }

      return result.secure_url;
    } catch (error: any) {
      lastError = error;
      const retryableCodes = ["EAI_AGAIN", "ENETUNREACH", "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED"];
      const isRetryable =
        retryableCodes.includes(error.code) ||
        error.message?.includes("getaddrinfo") ||
        error.message?.includes("Temporary failure") ||
        error.message?.includes("Request Timeout") ||
        error.message?.includes("timeout");

      if (isRetryable && attempt < maxRetries) {
        console.warn(`Cloudinary avatar upload retry ${attempt}/${maxRetries}: ${error.message || error.code}`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Cloudinary upload failed after retries");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("avatar") as File;
    const userId = formData.get("userId") as string;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check Cloudinary configuration
    if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_KEY || !process.env.CLOUDINARY_SECRET) {
      throw new Error("Cloudinary configuration is missing. Please check your .env file.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/jpeg";

    const avatarUrl = await uploadAvatarToCloudinary(buffer, mimeType);

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    return NextResponse.json({ avatar: avatarUrl });
  } catch (error: any) {
    console.error("AVATAR_UPLOAD_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload photo" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const { userId } = await req.json();

  await prisma.user.update({
    where: { id: userId },
    data: { avatar: null },
  });

  return NextResponse.json({ success: true });
}
