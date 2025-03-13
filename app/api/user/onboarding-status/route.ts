// app/api/user/onboarding-status/route.ts
import { getUserProfileById } from "@/lib/auth/authService";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userProfile = await getUserProfileById(token.sub);

    if (!userProfile) {
      return NextResponse.json(
        { message: "User profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      onboardingCompleted: userProfile.onboardingCompleted || false,
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json(
      { message: "Failed to check onboarding status" },
      { status: 500 }
    );
  }
}
