// app/api/meals/route.ts - Fixed with better error handling and query optimization
import { createMeal, getMealsByUserAndDate } from "@/lib/firebase/models/meal";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Helper to add cache control headers to prevent caching
const addCacheControlHeaders = (response: NextResponse) => {
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
};

// GET meals
export async function GET(request: NextRequest) {
  try {
    console.log("GET /api/meals request received");

    // Get token and validate user
    const token = await getToken({ req: request });

    if (!token?.sub) {
      console.error("Unauthorized access attempt");
      return addCacheControlHeaders(
        NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      );
    }

    // Get date from query parameters
    const url = new URL(request.url);
    const dateStr = url.searchParams.get("date");
    let date: Date | undefined;

    if (dateStr) {
      try {
        date = new Date(dateStr);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          console.warn("Invalid date parameter:", dateStr);
          date = new Date(); // Default to today
        }
      } catch (error) {
        console.warn("Error parsing date:", dateStr, error);
        date = new Date(); // Default to today
      }
    }

    console.log("Fetching meals for date:", date?.toISOString() || "all dates");

    // Get summary flag from query parameters
    const summary = url.searchParams.get("summary") === "true";

    try {
      if (summary) {
        // Return a simplified summary for performance
        const meals = await getMealsByUserAndDate(token.sub, date);
        const totalCalories = meals.reduce(
          (sum, meal) => sum + (meal.calories || 0),
          0
        );

        return addCacheControlHeaders(
          NextResponse.json({
            consumed: totalCalories,
            mealCount: meals.length,
          })
        );
      } else {
        // Get meals
        console.log("Fetching full meal list");
        const meals = await getMealsByUserAndDate(token.sub, date);
        console.log(`Found ${meals.length} meals`);
        return addCacheControlHeaders(NextResponse.json(meals));
      }
    } catch (error) {
      console.error("Error retrieving meals from Firestore:", error);
      // Return an empty array instead of throwing an error
      return addCacheControlHeaders(
        NextResponse.json(summary ? { consumed: 0, mealCount: 0 } : [], {
          status: 200,
        })
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return addCacheControlHeaders(
      NextResponse.json(
        {
          message: "Failed to fetch meals",
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}

// POST meal
export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/meals request received");

    // Get token and validate user
    const token = await getToken({ req: request });

    if (!token?.sub) {
      console.error("Unauthorized: No user token found");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get meal data from request body
    const mealData = await request.json();
    console.log("Received meal data:", {
      name: mealData.name,
      calories: mealData.calories,
      mealType: mealData.mealType,
    });

    // Validate required fields
    if (!mealData.name || mealData.calories === undefined) {
      console.error("Missing required fields:", {
        name: mealData.name,
        calories: mealData.calories,
      });
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

    const protein =
      mealData.protein !== undefined &&
      mealData.protein !== null &&
      mealData.protein !== ""
        ? typeof mealData.protein === "string"
          ? parseFloat(mealData.protein)
          : mealData.protein
        : null;

    const carbs =
      mealData.carbs !== undefined &&
      mealData.carbs !== null &&
      mealData.carbs !== ""
        ? typeof mealData.carbs === "string"
          ? parseFloat(mealData.carbs)
          : mealData.carbs
        : null;

    const fat =
      mealData.fat !== undefined && mealData.fat !== null && mealData.fat !== ""
        ? typeof mealData.fat === "string"
          ? parseFloat(mealData.fat)
          : mealData.fat
        : null;

    // Process items array
    let items = [];
    if (mealData.items) {
      if (Array.isArray(mealData.items)) {
        items = mealData.items;
      } else if (typeof mealData.items === "string") {
        items = mealData.items
          .split(",")
          .map((item: string) => item.trim())
          .filter((item: string) => item);
      }
    }

    // Create meal object with the current date if not specified
    let mealDate = mealData.date ? new Date(mealData.date) : new Date();

    // Ensure we have a valid date
    if (isNaN(mealDate.getTime())) {
      console.warn("Invalid date in meal data, using current date instead");
      mealDate = new Date();
    }

    const mealToCreate = {
      userId: token.sub,
      name: mealData.name,
      calories: calories,
      protein: protein,
      carbs: carbs,
      fat: fat,
      mealType: mealData.mealType || "Other",
      items: items,
      date: mealDate,
    };

    console.log("Creating meal with data:", {
      name: mealToCreate.name,
      calories: mealToCreate.calories,
      date: mealToCreate.date,
    });

    // Create meal
    try {
      const meal = await createMeal(mealToCreate);
      console.log("Meal created successfully with ID:", meal.id);
      return NextResponse.json(meal, { status: 201 });
    } catch (createError) {
      console.error("Error in Firestore createMeal operation:", createError);
      return NextResponse.json(
        {
          message: "Failed to store meal in database",
          error:
            createError instanceof Error
              ? createError.message
              : String(createError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating meal:", error);
    return NextResponse.json(
      {
        message: "Failed to create meal",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
