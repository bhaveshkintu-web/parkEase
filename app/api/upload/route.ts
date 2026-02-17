import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Helper function with retry logic for upload
async function uploadToCloudinary(buffer: Buffer, options = {}): Promise<any> {
  const maxRetries = 4;
  let attempt = 0;
  let lastError: any;

  while (attempt < maxRetries) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "parkease/cms",
              resource_type: "image",
              timeout: 60000, // Increase timeout to 60s (helps with slow DNS/network)
              ...options,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(buffer);
      });

      return result; // Success
    } catch (error: any) {
      attempt++;
      lastError = error;

      // Only retry on DNS/network related errors
      const retryableCodes = ['EAI_AGAIN', 'ENETUNREACH', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'];
      if (
        retryableCodes.includes(error.code) ||
        error.message?.includes('getaddrinfo') ||
        error.message?.includes('Temporary failure')
      ) {
        console.warn(`Cloudinary upload retry ${attempt}/${maxRetries}: ${error.message || error.code}`);
        // Exponential backoff delay: 2s, 4s, 8s...
        await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, attempt - 1)));
        continue;
      } else {
        // Non-retryable error → throw immediately
        throw error;
      }
    }
  }

  // Max retries reached
  console.error("Max retries reached for Cloudinary upload:", lastError);
  throw lastError || new Error("Cloudinary upload failed after retries");
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  const role = session?.user?.role?.toUpperCase();
  if (!session || (role !== "ADMIN" && role !== "OWNER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check Cloudinary config (same as before)
  const cloudName = process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("Missing Cloudinary configuration");
    return NextResponse.json(
      { error: "Cloudinary is not configured correctly in .env" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type and size (same as before)
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size too large. Maximum 5MB allowed." },
        { status: 400 }
      );
    }

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload with retry
    const result = await uploadToCloudinary(buffer);

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    const errorMessage = error.message || "Failed to upload image";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}