import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("avatar") as File;
  const userId = formData.get("userId") as string;

  const buffer = Buffer.from(await file.arrayBuffer());

  const upload = await new Promise<any>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: "avatars" }, (err, res) => {
        if (err) reject(err);
        resolve(res);
      })
      .end(buffer);
  });

  await prisma.user.update({
    where: { id: userId },
    data: { avatar: upload.secure_url },
  });

  return NextResponse.json({ avatar: upload.secure_url });
}

export async function DELETE(req: Request) {
  const { userId } = await req.json();

  await prisma.user.update({
    where: { id: userId },
    data: { avatar: null },
  });

  return NextResponse.json({ success: true });
}
