// app/api/meals/[id]/route.ts
import { deleteMeal, getMealById } from "@/lib/firebase/models/meal";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    // Get session token for authentication
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const mealId = params.id;
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
