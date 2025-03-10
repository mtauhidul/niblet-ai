// app/api/meals/[id]/route.ts
import {
  deleteMeal,
  getMealById,
  updateMeal,
} from "@/lib/firebase/models/meal";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// PATCH endpoint to update a meal
export async function PATCH(request: NextRequest, context: any) {
  try {
    // Get session token for authentication
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const mealId = context.params.id;
    if (!mealId) {
      return NextResponse.json(
        { message: "Meal ID is required" },
        { status: 400 }
      );
    }

    // Get request body
    const updateData = await request.json();

    // Verify the meal exists and belongs to the user
    const meal = await getMealById(mealId);
    if (!meal) {
      return NextResponse.json({ message: "Meal not found" }, { status: 404 });
    }

    // Check ownership
    if (meal.userId !== token.sub) {
      return NextResponse.json(
        { message: "You don't have permission to update this meal" },
        { status: 403 }
      );
    }

    // Process date: ensure it's a Date object
    if (updateData.date) {
      // If it's an ISO string, convert to Date
      if (typeof updateData.date === "string") {
        updateData.date = new Date(updateData.date);
      }
    }

    // Update the meal
    await updateMeal(mealId, updateData);

    // Return success response with no caching
    const response = NextResponse.json(
      { message: "Meal updated successfully" },
      { status: 200 }
    );

    // Prevent caching
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error updating meal:", error);

    return NextResponse.json(
      {
        message: "Failed to update meal",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a meal
export async function DELETE(request: NextRequest, context: any) {
  try {
    // Get session token for authentication
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const mealId = context.params.id;
    if (!mealId) {
      return NextResponse.json(
        { message: "Meal ID is required" },
        { status: 400 }
      );
    }

    // Verify the meal exists and belongs to the user
    const meal = await getMealById(mealId);
    if (!meal) {
      return NextResponse.json({ message: "Meal not found" }, { status: 404 });
    }

    // Check ownership
    if (meal.userId !== token.sub) {
      return NextResponse.json(
        { message: "You don't have permission to delete this meal" },
        { status: 403 }
      );
    }

    // Delete the meal
    await deleteMeal(mealId);

    // Return success response with no caching
    const response = NextResponse.json(
      { message: "Meal deleted successfully" },
      { status: 200 }
    );

    // Prevent caching
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error deleting meal:", error);

    return NextResponse.json(
      {
        message: "Failed to delete meal",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
