import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("avatar") as File;
    const userId = formData.get("userId") as string;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let avatarUrl = "";

    // Check Cloudinary configuration
    if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_KEY || !process.env.CLOUDINARY_SECRET) {
      throw new Error("Cloudinary configuration is missing. Please check your .env file.");
    }

    // Upload to Cloudinary
    try {
      const upload = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "avatars" }, (err, res) => {
            if (err) reject(err);
            resolve(res);
          })
          .end(buffer);
      });

      if (upload?.secure_url) {
        avatarUrl = upload.secure_url;
      } else {
        throw new Error("Failed to get secure URL from Cloudinary");
      }
    } catch (cloudinaryError: any) {
      console.error("CLOUDINARY_UPLOAD_ERROR:", cloudinaryError);
      throw new Error(`Cloudinary upload failed: ${cloudinaryError.message}`);
    }

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
