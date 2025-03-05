// app/api/meals/route.ts
import {
  createMeal,
  getCaloriesSummary,
  getMealsByUserAndDate,
} from "@/lib/firebase/models/meal";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// GET meals
export async function GET(request: NextRequest) {
  try {
    // Get token and validate user
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get date from query parameters
    const url = new URL(request.url);
    const dateStr = url.searchParams.get("date");
    const date = dateStr ? new Date(dateStr) : undefined;

    // Get summary flag from query parameters
    const summary = url.searchParams.get("summary") === "true";

    if (summary) {
      // Return only the calories summary
      const caloriesSummary = await getCaloriesSummary(token.sub, date);
      return NextResponse.json(caloriesSummary);
    } else {
      // Get meals
      const meals = await getMealsByUserAndDate(token.sub, date);
      return NextResponse.json(meals);
    }
  } catch (error) {
    console.error("Error fetching meals:", error);
    return NextResponse.json(
      { message: "Failed to fetch meals" },
      { status: 500 }
    );
  }
}

// POST meal
export async function POST(request: NextRequest) {
  try {
    // Get token and validate user
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get meal data from request body
    const mealData = await request.json();

    // Validate required fields
    if (!mealData.name || !mealData.calories) {
      return NextResponse.json(
        { message: "Name and calories are required" },
        { status: 400 }
      );
    }

    // Ensure numbers are properly parsed
    const calories =
      typeof mealData.calories === "string"
        ? parseFloat(mealData.calories)
        : mealData.calories;

    const protein = mealData.protein
      ? typeof mealData.protein === "string"
        ? parseFloat(mealData.protein)
        : mealData.protein
      : null;

    const carbs = mealData.carbs
      ? typeof mealData.carbs === "string"
        ? parseFloat(mealData.carbs)
        : mealData.carbs
      : null;

    const fat = mealData.fat
      ? typeof mealData.fat === "string"
        ? parseFloat(mealData.fat)
        : mealData.fat
      : null;

    // Create meal
    const meal = await createMeal({
      userId: token.sub,
      name: mealData.name,
      calories: calories,
      protein: protein,
      carbs: carbs,
      fat: fat,
      mealType: mealData.mealType || "Other",
      items: Array.isArray(mealData.items) ? mealData.items : [],
      date: mealData.date ? new Date(mealData.date) : new Date(),
    });

    return NextResponse.json(meal, { status: 201 });
  } catch (error) {
    console.error("Error creating meal:", error);
    return NextResponse.json(
      { message: "Failed to create meal" },
      { status: 500 }
    );
  }
}
