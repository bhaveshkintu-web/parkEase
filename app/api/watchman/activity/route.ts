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
        const role = sessionUser.role?.toUpperCase();

        // Ensure user is watchman
        if (role !== "WATCHMAN" && role !== "OWNER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const type = searchParams.get("type");

        // Get watchman details
        let watchmanId = "";

        if (role === "WATCHMAN") {
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

        if (!session || !session.user || session.user.role?.toUpperCase() !== "WATCHMAN") {
            return NextResponse.json({ error: "Unauthorized: Watchman role required" }, { status: 401 });
        }

        const body = await request.json();
        const { type, details } = body;

        if (!type) {
            return NextResponse.json({ error: "Type is required" }, { status: 400 });
        }

        const watchman = await prisma.watchman.findUnique({
            where: { userId: session.user.id },
            include: { assignedLocations: { select: { name: true }, take: 1 } }
        });

        if (!watchman) {
            return NextResponse.json({ error: "Watchman not found" }, { status: 404 });
        }

        const watchmanLocation = watchman.assignedLocations?.[0]?.name;
        const refinedDetails = {
            ...details,
            location: details?.location || watchmanLocation || "Unknown Location"
        };

        const newLog = await prisma.watchmanActivityLog.create({
            data: {
                watchmanId: watchman.id,
                type,
                details: refinedDetails,
                timestamp: new Date()
            }
        });

        // Increment counts on active shift if exists
        if (type === "incident" || type === "check_in" || type === "check_out") {
            const activeShift = await prisma.watchmanShift.findFirst({
                where: {
                    watchmanId: watchman.id,
                    status: "ACTIVE"
                }
            });

            if (activeShift) {
                await prisma.watchmanShift.update({
                    where: { id: activeShift.id },
                    data: {
                        incidentsReported: type === "incident" ? { increment: 1 } : undefined,
                        totalCheckIns: type === "check_in" ? { increment: 1 } : undefined,
                        totalCheckOuts: type === "check_out" ? { increment: 1 } : undefined,
                    }
                });
            }
        }

        return NextResponse.json({ success: true, log: newLog });

    } catch (error: any) {
        console.error("Error creating activity log:", error);
        return NextResponse.json(
            { error: "Failed to create log", details: error.message },
            { status: 500 }
        );
    }
}
