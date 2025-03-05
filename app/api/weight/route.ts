// app/api/weight/route.ts
import { createOrUpdateUserProfile } from "@/lib/firebase/models/user";
import {
  getWeightLogsByUser,
  logWeight,
} from "@/lib/firebase/models/weightLog";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// GET weight logs
export async function GET(request: NextRequest) {
  try {
    // Get session
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get weight logs
    const weightLogs = await getWeightLogsByUser(token.sub);

    return NextResponse.json(weightLogs);
  } catch (error) {
    console.error("Error fetching weight logs:", error);
    return NextResponse.json(
      { message: "Failed to fetch weight logs" },
      { status: 500 }
    );
  }
}

// POST weight log
export async function POST(request: NextRequest) {
  try {
    // Get session
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get weight data from request body
    const { weight, date } = await request.json();

    // Validate weight
    if (!weight || isNaN(parseFloat(weight.toString()))) {
      return NextResponse.json(
        { message: "Valid weight is required" },
        { status: 400 }
      );
    }

    // Create weight log
    const weightLog = await logWeight(
      token.sub,
      parseFloat(weight.toString()),
      date ? new Date(date) : undefined
    );

    // Update current weight in user profile
    await createOrUpdateUserProfile(token.sub, {
      currentWeight: parseFloat(weight.toString()),
    });

    return NextResponse.json(weightLog, { status: 201 });
  } catch (error) {
    console.error("Error creating weight log:", error);
    return NextResponse.json(
      { message: "Failed to create weight log" },
      { status: 500 }
    );
  }
}
