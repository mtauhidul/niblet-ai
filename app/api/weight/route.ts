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

    // Set cache control headers to prevent caching
    const response = NextResponse.json(limitedLogs);
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
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
    const { weight, date, note } = await request.json();

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
      date ? new Date(date) : undefined,
      note
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

// app/api/weight/[id]/route.ts
import {
  deleteWeightLog,
  getWeightLogById,
  updateWeightLog,
} from "@/lib/firebase/models/weightLog";

// PATCH endpoint to update a weight log
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get token and validate user
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const logId = context.params.id;
    if (!logId) {
      return NextResponse.json(
        { message: "Weight log ID is required" },
        { status: 400 }
      );
    }

    // Get weight log to check ownership
    const weightLog = await getWeightLogById(logId);

    if (!weightLog) {
      return NextResponse.json(
        { message: "Weight log not found" },
        { status: 404 }
      );
    }

    // Check if the log belongs to the user
    if (weightLog.userId !== token.sub) {
      return NextResponse.json(
        { message: "You don't have permission to update this weight log" },
        { status: 403 }
      );
    }

    // Get update data from request body
    const { weight, date, note } = await request.json();

    // Validate weight if provided
    if (weight !== undefined) {
      const weightValue =
        typeof weight === "string" ? parseFloat(weight) : weight;
      if (isNaN(weightValue) || weightValue <= 0) {
        return NextResponse.json(
          { message: "Valid weight is required (must be a positive number)" },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (weight !== undefined) {
      updateData.weight =
        typeof weight === "string" ? parseFloat(weight) : weight;
    }

    if (date !== undefined) {
      updateData.date = date instanceof Date ? date : new Date(date);
    }

    if (note !== undefined) {
      updateData.note = note;
    }

    // Update the weight log
    await updateWeightLog(logId, updateData);

    // If this is the latest weight log, update the user's current weight
    const userWeightLogs = await getWeightLogsByUser(token.sub, 1);
    if (userWeightLogs.length > 0 && userWeightLogs[0].id === logId) {
      await createOrUpdateUserProfile(token.sub, {
        currentWeight: updateData.weight || weightLog.weight,
      });
    }

    return NextResponse.json({ message: "Weight log updated successfully" });
  } catch (error) {
    console.error("Error updating weight log:", error);
    return NextResponse.json(
      { message: "Failed to update weight log" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a weight log
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get token and validate user
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const logId = context.params.id;
    if (!logId) {
      return NextResponse.json(
        { message: "Weight log ID is required" },
        { status: 400 }
      );
    }

    // Get weight log to check ownership
    const weightLog = await getWeightLogById(logId);

    if (!weightLog) {
      return NextResponse.json(
        { message: "Weight log not found" },
        { status: 404 }
      );
    }

    // Check if the log belongs to the user
    if (weightLog.userId !== token.sub) {
      return NextResponse.json(
        { message: "You don't have permission to delete this weight log" },
        { status: 403 }
      );
    }

    // Delete the weight log
    await deleteWeightLog(logId);

    // If this was the latest log, update the currentWeight in user's profile
    // to the next most recent log (if one exists)
    const userWeightLogs = await getWeightLogsByUser(token.sub, 1);
    if (userWeightLogs.length > 0) {
      await createOrUpdateUserProfile(token.sub, {
        currentWeight: userWeightLogs[0].weight,
      });
    }

    return NextResponse.json({ message: "Weight log deleted successfully" });
  } catch (error) {
    console.error("Error deleting weight log:", error);
    return NextResponse.json(
      { message: "Failed to delete weight log" },
      { status: 500 }
    );
  }
}
