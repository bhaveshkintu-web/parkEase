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

    // 1. Try Cloudinary if configured
    if (process.env.CLOUDINARY_NAME && process.env.CLOUDINARY_KEY && process.env.CLOUDINARY_SECRET) {
      try {
        const upload = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream({ folder: "avatars" }, (err, res) => {
              if (err) reject(err);
              resolve(res);
            })
            .end(buffer);
        });
        if (upload?.secure_url) avatarUrl = upload.secure_url;
      } catch (cloudinaryError) {
        console.error("CLOUDINARY_UPLOAD_FAILED, tried local fallback:", cloudinaryError);
      }
    }

    // 2. Fallback to Local Storage if Cloudinary is missing or failed
    if (!avatarUrl) {
      const fs = require("fs/promises");
      const path = require("path");

      const fileName = `${userId}-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");

      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, fileName), buffer);

      avatarUrl = `/uploads/${fileName}`;
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
