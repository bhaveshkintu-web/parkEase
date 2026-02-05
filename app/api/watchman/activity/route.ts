import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessionUser = session.user as any;

        // Ensure user is watchman
        if (sessionUser.role !== "WATCHMAN" && sessionUser.role !== "OWNER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const type = searchParams.get("type");

        // Get watchman details
        let watchmanId = "";

        if (sessionUser.role === "WATCHMAN") {
            const watchman = await prisma.watchman.findUnique({
                where: { userId: sessionUser.id }
            });
            if (!watchman) {
                return NextResponse.json({ error: "Watchman profile not found" }, { status: 404 });
            }
            watchmanId = watchman.id;
        } else {
            // If OWNER, maybe they want to see logs for their watchmen?
            // For now let's focus on the Watchman viewing their own activity
            // Or return empty if not watchman
            return NextResponse.json({ logs: [] });
        }

        const whereClause: any = {
            watchmanId: watchmanId
        };

        if (type && type !== "all") {
            whereClause.type = type;
        }

        const logs = await prisma.watchmanActivityLog.findMany({
            where: whereClause,
            orderBy: {
                timestamp: "desc"
            },
            take: limit,
            include: {
                watchman: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                }
            }
        });

        const formattedLogs = logs.map(log => ({
            id: log.id,
            watchmanId: log.watchmanId,
            watchmanName: `${log.watchman.user.firstName} ${log.watchman.user.lastName}`,
            type: log.type,
            timestamp: log.timestamp,
            details: log.details || {}
        }));

        return NextResponse.json({ logs: formattedLogs });

    } catch (error: any) {
        console.error("Error fetching activity logs:", error);
        return NextResponse.json(
            { error: "Failed to fetch activity logs", details: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || session.user.role !== "WATCHMAN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { type, details } = body;

        if (!type) {
            return NextResponse.json({ error: "Type is required" }, { status: 400 });
        }

        const watchman = await prisma.watchman.findUnique({
            where: { userId: session.user.id }
        });

        if (!watchman) {
            return NextResponse.json({ error: "Watchman not found" }, { status: 404 });
        }

        const newLog = await prisma.watchmanActivityLog.create({
            data: {
                watchmanId: watchman.id,
                type,
                details: details || {},
                timestamp: new Date()
            }
        });

        return NextResponse.json({ success: true, log: newLog });

    } catch (error: any) {
        console.error("Error creating activity log:", error);
        return NextResponse.json(
            { error: "Failed to create log", details: error.message },
            { status: 500 }
        );
    }
}
