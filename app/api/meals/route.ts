// app/api/meals/route.ts
import { createMeal, getMealsByUserAndDate } from "@/lib/firebase/models/meal";
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

    // Get meals
    const meals = await getMealsByUserAndDate(token.sub, date);

    return NextResponse.json(meals);
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

    // Create meal
    const meal = await createMeal({
      userId: token.sub,
      name: mealData.name,
      calories: mealData.calories,
      protein: mealData.protein || null,
      carbs: mealData.carbs || null,
      fat: mealData.fat || null,
      mealType: mealData.mealType || null,
      items: mealData.items || [],
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
