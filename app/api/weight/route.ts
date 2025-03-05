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
    // Get token and validate user
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit") || "0")
      : undefined;

    // Get weight logs
    const weightLogs = await getWeightLogsByUser(token.sub);

    // Apply limit if specified
    const limitedLogs =
      limit && limit > 0 ? weightLogs.slice(0, limit) : weightLogs;

    return NextResponse.json(limitedLogs);
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
    // Get token and validate user
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get weight data from request body
    const { weight, date } = await request.json();

    // Validate weight
    const weightValue =
      typeof weight === "string" ? parseFloat(weight) : weight;

    if (!weightValue || isNaN(weightValue) || weightValue <= 0) {
      return NextResponse.json(
        { message: "Valid weight is required (must be a positive number)" },
        { status: 400 }
      );
    }

    // Create weight log
    const weightLog = await logWeight(
      token.sub,
      weightValue,
      date ? new Date(date) : undefined
    );

    // Update current weight in user profile
    await createOrUpdateUserProfile(token.sub, {
      currentWeight: weightValue,
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
