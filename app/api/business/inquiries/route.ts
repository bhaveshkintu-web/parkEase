import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";

const businessInquirySchema = z.object({
  fullName: z.string().min(2),
  companyName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().optional(),
  businessType: z.enum(["PARKING"]),
  message: z.string().max(500).optional(),
  source: z.string(),
});

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = businessInquirySchema.parse(body);

    // Create inquiry in database
    const inquiry = await prisma.businessInquiry.create({
      data: {
        fullName: validatedData.fullName,
        companyName: validatedData.companyName,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        businessType: validatedData.businessType,
        message: validatedData.message,
        source: validatedData.source,
        status: "NEW",
      },
    });

    // Send email to admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #14b8a6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #1f2937; }
            .value { color: #4b5563; }
            .button { background: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Business Inquiry</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Company:</div>
                <div class="value">${inquiry.companyName}</div>
              </div>
              <div class="field">
                <div class="label">Contact:</div>
                <div class="value">${inquiry.fullName}</div>
              </div>
              <div class="field">
                <div class="label">Email:</div>
                <div class="value">${inquiry.email}</div>
              </div>
              <div class="field">
                <div class="label">Phone:</div>
                <div class="value">${inquiry.phone}</div>
              </div>
              ${inquiry.address
        ? `
              <div class="field">
                <div class="label">Address:</div>
                <div class="value">${inquiry.address}</div>
              </div>
              `
        : ""
      }
              <div class="field">
                <div class="label">Business Type:</div>
                <div class="value">${inquiry.businessType.replace("_", " ")}</div>
              </div>
              ${inquiry.message
        ? `
              <div class="field">
                <div class="label">Message:</div>
                <div class="value">${inquiry.message}</div>
              </div>
              `
        : ""
      }
              <div class="field">
                <div class="label">Source:</div>
                <div class="value">${inquiry.source}</div>
              </div>
              <div class="field">
                <div class="label">Submitted:</div>
                <div class="value">${inquiry.createdAt.toLocaleString()}</div>
              </div>
              <a href="${process.env.APP_URL}/admin/business-inquiries/${inquiry.id}" class="button">
                View in Dashboard
              </a>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.SMTP_USER, // Send to admin email
        subject: `New Business Inquiry - ${inquiry.companyName}`,
        html: adminEmailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send admin email:", emailError);
      // Don't fail the request if email fails
    }

    // Send confirmation to submitter
    const confirmationHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #14b8a6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9fafb; border-radius: 0 0 8px 8px; }
            a { color: #14b8a6; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You for Your Interest</h1>
            </div>
            <div class="content">
              <p>Hi ${inquiry.fullName},</p>
              <p>Thank you for reaching out to ParkEase for Business!</p>
              <p>We've received your inquiry and our partnership team will review your information. You can expect to hear from us within 24 hours.</p>
              <p>In the meantime, feel free to explore our resources:</p>
              <ul>
                <li><a href="${process.env.APP_URL}/business">Business Solutions</a></li>
                <li><a href="${process.env.APP_URL}/business/partner">Partner Program</a></li>
              </ul>
              <p>Best regards,<br>The ParkEase Business Team</p>
              <hr>
              <p style="font-size: 14px; color: #6b7280;">
                Need immediate assistance?<br>
                Email: business@parkease.com<br>
                Phone: +1 (408) 598-3338
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: inquiry.email,
        subject: "Thank you for your interest in ParkEase for Business",
        html: confirmationHtml,
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      inquiryId: inquiry.id,
      message: "Thank you for your interest. We'll contact you within 24 hours.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          errors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error("Business inquiry error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "An error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}
