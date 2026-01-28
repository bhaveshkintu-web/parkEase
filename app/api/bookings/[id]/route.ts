import { NextResponse } from "next/server";
import { getBookingDetails } from "@/lib/actions/booking-actions";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const result = await getBookingDetails(params.id);

    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      const status = result.error === "Unauthorized access to booking" ? 403 : 404;
      return NextResponse.json({ error: result.error }, { status });
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
