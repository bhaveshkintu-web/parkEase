import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { TicketStatus } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPPORT")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { status, internalNotes } = body;

    const currentTicket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!currentTicket) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: status || currentTicket.status,
        internalNotes: internalNotes !== undefined ? internalNotes : currentTicket.internalNotes,
      },
    });

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error("Error updating support ticket:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.supportTicket.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Support ticket deleted successfully" });
  } catch (error) {
    console.error("Error deleting support ticket:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
