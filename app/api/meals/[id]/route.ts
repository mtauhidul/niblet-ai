import { deleteMeal, getMealById } from "@/lib/firebase/models/meal";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Optional: Add a caching helper for consistency
const addCacheControlHeaders = (response: NextResponse) => {
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("DELETE /api/meals/[id] request received");

    // Authenticate user
    const token = await getToken({ req: request });
    if (!token?.sub) {
      console.log("Unauthorized DELETE request");
      return addCacheControlHeaders(
        NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      );
    }

    const mealId = params.id;
    if (!mealId) {
      console.log("No meal ID provided in DELETE request");
      return addCacheControlHeaders(
        NextResponse.json({ message: "Meal ID is required" }, { status: 400 })
      );
    }

    // Verify the meal exists and belongs to the user
    const meal = await getMealById(mealId);
    if (!meal) {
      console.log(`Meal with ID ${mealId} not found`);
      return addCacheControlHeaders(
        NextResponse.json({ message: "Meal not found" }, { status: 404 })
      );
    }

    if (meal.userId !== token.sub) {
      console.log(
        `User ${token.sub} not authorized to delete meal with ID ${mealId}`
      );
      return addCacheControlHeaders(
        NextResponse.json(
          { message: "You don't have permission to delete this meal" },
          { status: 403 }
        )
      );
    }

    // Delete the meal
    await deleteMeal(mealId);
    console.log(`Meal with ID ${mealId} deleted successfully`);

    // Return success response with caching disabled
    const response = NextResponse.json(
      { message: "Meal deleted successfully" },
      { status: 200 }
    );
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  } catch (error) {
    console.error("Error deleting meal:", error);
    return addCacheControlHeaders(
      NextResponse.json(
        {
          message: "Failed to delete meal",
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}
