// app/api/meals/[id]/route.ts
import {
  deleteMeal,
  getMealById,
  updateMeal,
} from "@/lib/firebase/models/meal";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Helper function to extract ID from request
function getMealIdFromRequest(request: NextRequest): string {
  const pathname = request.nextUrl.pathname;
  return pathname.split("/").pop() || "";
}

// GET single meal
export async function GET(request: NextRequest) {
  try {
    // Get token and validate user
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get meal ID from URL
    const id = getMealIdFromRequest(request);

    if (!id) {
      return NextResponse.json(
        { message: "Meal ID is required" },
        { status: 400 }
      );
    }

    // Get meal
    const meal = await getMealById(id);

    if (!meal) {
      return NextResponse.json({ message: "Meal not found" }, { status: 404 });
    }

    // Verify user owns this meal
    if (meal.userId !== token.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(meal);
  } catch (error) {
    console.error("Error fetching meal:", error);
    return NextResponse.json(
      { message: "Failed to fetch meal" },
      { status: 500 }
    );
  }
}

// PUT/PATCH to update meal
export async function PUT(request: NextRequest) {
  try {
    // Get token and validate user
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get meal ID from URL
    const id = getMealIdFromRequest(request);

    if (!id) {
      return NextResponse.json(
        { message: "Meal ID is required" },
        { status: 400 }
      );
    }

    // Get meal to verify ownership
    const existingMeal = await getMealById(id);

    if (!existingMeal) {
      return NextResponse.json({ message: "Meal not found" }, { status: 404 });
    }

    // Verify user owns this meal
    if (existingMeal.userId !== token.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Get updated meal data from request body
    const mealData = await request.json();

    // Parse numeric values properly
    const updates: Record<string, any> = {};

    if (mealData.name) updates.name = mealData.name;

    if (mealData.calories !== undefined) {
      updates.calories =
        typeof mealData.calories === "string"
          ? parseFloat(mealData.calories)
          : mealData.calories;
    }

    if (mealData.protein !== undefined) {
      updates.protein =
        mealData.protein !== null
          ? typeof mealData.protein === "string"
            ? parseFloat(mealData.protein)
            : mealData.protein
          : null;
    }

    if (mealData.carbs !== undefined) {
      updates.carbs =
        mealData.carbs !== null
          ? typeof mealData.carbs === "string"
            ? parseFloat(mealData.carbs)
            : mealData.carbs
          : null;
    }

    if (mealData.fat !== undefined) {
      updates.fat =
        mealData.fat !== null
          ? typeof mealData.fat === "string"
            ? parseFloat(mealData.fat)
            : mealData.fat
          : null;
    }

    if (mealData.mealType) updates.mealType = mealData.mealType;
    if (mealData.items) updates.items = mealData.items;
    if (mealData.date) updates.date = new Date(mealData.date);

    // Update meal
    await updateMeal(id, updates);

    // Get updated meal
    const updatedMeal = await getMealById(id);

    return NextResponse.json(updatedMeal);
  } catch (error) {
    console.error("Error updating meal:", error);
    return NextResponse.json(
      { message: "Failed to update meal" },
      { status: 500 }
    );
  }
}

// PATCH for partial updates (same implementation as PUT)
export async function PATCH(request: NextRequest) {
  return PUT(request);
}

// DELETE meal
export async function DELETE(request: NextRequest) {
  try {
    // Get token and validate user
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get meal ID from URL
    const id = getMealIdFromRequest(request);

    if (!id) {
      return NextResponse.json(
        { message: "Meal ID is required" },
        { status: 400 }
      );
    }

    // Get meal to verify ownership
    const meal = await getMealById(id);

    if (!meal) {
      return NextResponse.json({ message: "Meal not found" }, { status: 404 });
    }

    // Verify user owns this meal
    if (meal.userId !== token.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Delete meal
    await deleteMeal(id);

    return NextResponse.json(
      { message: "Meal deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting meal:", error);
    return NextResponse.json(
      { message: "Failed to delete meal" },
      { status: 500 }
    );
  }
}
