// app/api/meals/route.ts
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

// GET meals
export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get date from query parameters
    const url = new URL(request.url);
    const date = url.searchParams.get("date");

    // Prepare filter
    const filter: any = {
      userId: session.user.id,
    };

    if (date) {
      // Create date range for the specific day
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      filter.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get meals
    const meals = await prisma.meal.findMany({
      where: filter,
      orderBy: {
        date: "asc",
      },
    });

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
    // Get session
    const session = await getServerSession();

    if (!session?.user?.id) {
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
    const meal = await prisma.meal.create({
      data: {
        userId: session.user.id,
        name: mealData.name,
        calories: mealData.calories,
        protein: mealData.protein || null,
        carbs: mealData.carbs || null,
        fat: mealData.fat || null,
        mealType: mealData.mealType || null,
        items: mealData.items || [],
        date: mealData.date ? new Date(mealData.date) : new Date(),
      },
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
