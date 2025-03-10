// app/api/weight/[id]/route.ts
import {
  deleteWeightLog,
  getWeightLogById,
  updateWeightLog,
} from "@/lib/firebase/models/weightLog";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// PATCH endpoint to update a weight log
export async function PATCH(request: NextRequest, context: any) {
  try {
    // Get session token for authentication
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

    // No need to update user profile here - this is handled in the model function

    return NextResponse.json({
      message: "Weight log updated successfully",
      success: true,
      weightLogId: logId,
    });
  } catch (error) {
    console.error("Error updating weight log:", error);
    return NextResponse.json(
      {
        message: "Failed to update weight log",
        error: error instanceof Error ? error.message : String(error),
        success: false,
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a weight log
export async function DELETE(request: NextRequest, context: any) {
  try {
    // Get session token for authentication
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

    return NextResponse.json({
      message: "Weight log deleted successfully",
      success: true,
      weightLogId: logId,
    });
  } catch (error) {
    console.error("Error deleting weight log:", error);
    return NextResponse.json(
      {
        message: "Failed to delete weight log",
        error: error instanceof Error ? error.message : String(error),
        success: false,
      },
      { status: 500 }
    );
  }
}
