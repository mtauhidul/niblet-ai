// app/api/meals/route.ts - Improved fix with better error handling and logging

import { db } from "@/lib/firebase/clientApp";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Add these headers to prevent caching
const addCacheControlHeaders = (response: NextResponse) => {
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
};

export async function GET(request: NextRequest) {
  try {
    console.log("GET /api/meals request received");

    // Authenticate user
    const token = await getToken({ req: request });
    if (!token?.sub) {
      console.log("Unauthorized request to /api/meals");
      return addCacheControlHeaders(
        NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      );
    }

    // Parse date parameter
    const url = new URL(request.url);
    const dateStr = url.searchParams.get("date");
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (dateStr) {
      try {
        // If a specific date is provided, set start/end to that day
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          startDate = new Date(date);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(date);
          endDate.setHours(23, 59, 59, 999);
        } else {
          console.log("Invalid date format:", dateStr);
        }
      } catch (error) {
        console.log("Error parsing date:", error);
      }
    }

    console.log("Fetching meals with userId filter only");

    // Create a simple query that doesn't require complex indexing
    // Just filter by userId, we'll filter by date in memory
    const mealsRef = collection(db, "meals");
    const simpleQuery = query(mealsRef, where("userId", "==", token.sub));

    const querySnapshot = await getDocs(simpleQuery);

    // Transform the data
    const meals: { id: string; date: Date; [key: string]: any }[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Convert the date
      const mealDate = data.date?.toDate
        ? data.date.toDate()
        : new Date(data.date);

      // Filter by date in memory if needed
      if (startDate && endDate) {
        if (mealDate >= startDate && mealDate <= endDate) {
          meals.push({
            id: doc.id,
            ...data,
            date: mealDate,
          });
        }
      } else {
        meals.push({
          id: doc.id,
          ...data,
          date: mealDate,
        });
      }
    });

    // Sort by date
    const sortedMeals = meals.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    console.log(`Returning ${sortedMeals.length} meals`);

    // Return the meals
    return addCacheControlHeaders(NextResponse.json(sortedMeals));
  } catch (error) {
    console.error("Error processing meals request:", error);

    // Return a proper error response
    return addCacheControlHeaders(
      NextResponse.json(
        {
          message: "Error fetching meals",
          error: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    );
  }
}
