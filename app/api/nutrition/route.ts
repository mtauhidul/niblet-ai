// app/api/nutrition/route.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get session token for authentication
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // This is a simple implementation that returns the nutrition data
    // In a real app, you might fetch this from a database
    return NextResponse.json({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  } catch (error) {
    console.error("Error fetching nutrition data:", error);
    return NextResponse.json(
      { message: "Failed to fetch nutrition data" },
      { status: 500 }
    );
  }
}
