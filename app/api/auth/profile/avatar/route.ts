
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file || file.size === 0) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        let avatarUrl = "";

        // Check Cloudinary configuration
        if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_KEY || !process.env.CLOUDINARY_SECRET) {
            throw new Error("Cloudinary configuration is missing");
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
            where: { id: session.user.id },
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
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: { avatar: null },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("AVATAR_DELETE_ERROR:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
