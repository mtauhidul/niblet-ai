// app/api/user/profile/route.ts
import { getUserProfileById, updateUserProfile } from "@/lib/auth/authService";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get session
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const userProfile = await getUserProfileById(token.sub);

    if (!userProfile) {
      return NextResponse.json(
        { message: "User profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(userProfile);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "An error occurred while fetching the user profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get session
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const data = await request.json();

    // Extract fields for profile update
    const profileUpdate = {
      age: data.age,
      gender: data.gender,
      currentWeight: data.currentWeight,
      targetWeight: data.targetWeight,
      height: data.height,
      activityLevel: data.activityLevel,
      dietaryPreferences: data.dietaryPreferences,
      allergies: data.allergies,
      goalType: data.goalType,
      targetCalories: data.targetCalories,
      targetProtein: data.targetProtein,
      targetCarbs: data.targetCarbs,
      targetFat: data.targetFat,
      aiPersonality: data.aiPersonality,
      // New fields
      receiveNotifications: data.receiveNotifications,
      preferredMealFrequency: data.preferredMealFrequency,
    };

    // Process allergies if it's a string (comma-separated)
    if (typeof data.allergies === "string") {
      profileUpdate.allergies = data.allergies
        .split(",")
        .map((item: string) => item.trim())
        .filter(Boolean);
    }

    // Process dietaryPreferences if needed
    if (typeof data.dietaryPreferences === "string") {
      profileUpdate.dietaryPreferences = [data.dietaryPreferences];
    }

    // Validate numeric fields
    if (data.age !== undefined && (isNaN(data.age) || data.age < 0)) {
      return NextResponse.json(
        { message: "Age must be a valid positive number" },
        { status: 400 }
      );
    }

    // Remove undefined fields to prevent overwriting with null values
    (Object.keys(profileUpdate) as (keyof typeof profileUpdate)[]).forEach(
      (key) => {
        if (profileUpdate[key] === undefined) {
          delete profileUpdate[key];
        }
      }
    );

    // Update user profile
    const userProfile = await updateUserProfile(token.sub, profileUpdate);

    return NextResponse.json(userProfile);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { message: "An error occurred while updating the user profile" },
      { status: 500 }
    );
  }
}
