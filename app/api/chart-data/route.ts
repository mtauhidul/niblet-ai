// app/api/chart-data/route.ts
import { db } from "@/lib/firebase/clientApp";
import {
  collection,
  getDocs,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const headers = new Headers();
  headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  try {
    // Add Cache-Control headers to prevent caching
    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");

    // Verify user authentication
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401, headers }
      );
    }

    // Get date range parameter
    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "month";

    // Calculate date range
    const today = new Date();
    let startDate: Date;

    switch (range) {
      case "week":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case "month":
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case "3months":
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 3);
        break;
      case "year":
        startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1); // Default to 1 month
    }

    console.log(
      `Getting chart data from ${startDate.toISOString()} to ${today.toISOString()}`
    );

    // Load target values from user profile
    // Simple query for user profile that doesn't require a complex index
    const userProfileRef = collection(db, "userProfiles");
    const profileQuery = query(
      userProfileRef,
      where("userId", "==", token.sub)
    );
    const profileSnapshot = await getDocs(profileQuery);

    let targetWeight = null;
    let targetCalories = 2000; // Default values
    let targetProtein = 120;
    let targetCarbs = 200;
    let targetFat = 60;

    if (!profileSnapshot.empty) {
      const profileData = profileSnapshot.docs[0].data();
      if (profileData.targetWeight) targetWeight = profileData.targetWeight;
      if (profileData.targetCalories)
        targetCalories = profileData.targetCalories;
      if (profileData.targetProtein) targetProtein = profileData.targetProtein;
      if (profileData.targetCarbs) targetCarbs = profileData.targetCarbs;
      if (profileData.targetFat) targetFat = profileData.targetFat;
    }

    // Get weight data (simple query)
    const weightLogsRef = collection(db, "weightLogs");
    const weightQuery = query(weightLogsRef, where("userId", "==", token.sub));
    const weightSnapshot = await getDocs(weightQuery);

    const weightLogs: Array<{
      date: Date;
      weight: number;
    }> = [];

    weightSnapshot.forEach((doc) => {
      const data = doc.data();
      const logDate =
        data.date instanceof Timestamp
          ? data.date.toDate()
          : new Date(data.date);

      // Filter in memory
      if (logDate >= startDate && logDate <= today) {
        weightLogs.push({
          date: logDate,
          weight: data.weight,
        });
      }
    });

    // Sort by date
    weightLogs.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Get meals data (simple query)
    const mealsRef = collection(db, "meals");
    const mealsQuery = query(mealsRef, where("userId", "==", token.sub));
    const mealsSnapshot = await getDocs(mealsQuery);

    const mealsByDate: Record<
      string,
      {
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
      }
    > = {};

    mealsSnapshot.forEach((doc) => {
      const data = doc.data();
      const mealDate =
        data.date instanceof Timestamp
          ? data.date.toDate()
          : new Date(data.date);

      // Filter in memory
      if (mealDate >= startDate && mealDate <= today) {
        const dateKey = mealDate.toISOString().split("T")[0];

        if (!mealsByDate[dateKey]) {
          mealsByDate[dateKey] = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          };
        }

        // Sum macros for the day
        mealsByDate[dateKey].calories += data.calories || 0;
        mealsByDate[dateKey].protein += data.protein || 0;
        mealsByDate[dateKey].carbs += data.carbs || 0;
        mealsByDate[dateKey].fat += data.fat || 0;
      }
    });

    // Calculate weight goal trajectory
    const startWeight = weightLogs.length > 0 ? weightLogs[0].weight : null;

    const daysDiff = Math.floor(
      (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dailyWeightChange =
      startWeight && targetWeight ? (startWeight - targetWeight) / daysDiff : 0;

    // Create a map of all dates in the range
    const dateMap = new Map<string, any>();
    const currentDate = new Date(startDate);
    let day = 0;

    while (currentDate <= today) {
      const dateKey = currentDate.toISOString().split("T")[0];

      // Calculate goal weight for this day
      const goalWeight =
        startWeight && targetWeight
          ? startWeight - dailyWeightChange * day
          : null;

      dateMap.set(dateKey, {
        date: dateKey,
        weightGoal: goalWeight ? Number(goalWeight.toFixed(1)) : null,
        caloriesTarget: targetCalories,
        proteinTarget: targetProtein,
        carbsTarget: targetCarbs,
        fatTarget: targetFat,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      day++;
    }

    // Merge weight data
    weightLogs.forEach((log) => {
      const dateKey = log.date.toISOString().split("T")[0];
      const existingData = dateMap.get(dateKey) || { date: dateKey };

      dateMap.set(dateKey, {
        ...existingData,
        weight: log.weight,
      });
    });

    // Merge meal data
    Object.entries(mealsByDate).forEach(([dateKey, mealData]) => {
      const existingData = dateMap.get(dateKey) || { date: dateKey };

      dateMap.set(dateKey, {
        ...existingData,
        calories: mealData.calories,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fat: mealData.fat,
      });
    });

    // Convert map to array and sort by date
    const chartData = Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Return the formatted chart data with cache headers
    return NextResponse.json(
      {
        chartData,
        targets: {
          weight: targetWeight,
          calories: targetCalories,
          protein: targetProtein,
          carbs: targetCarbs,
          fat: targetFat,
        },
      },
      { headers }
    );
  } catch (error) {
    console.error("Error fetching chart data:", error);

    const headers = new Headers();
    headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );

    return NextResponse.json(
      {
        message: "Failed to fetch chart data",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers }
    );
  }
}
