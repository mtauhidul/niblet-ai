// app/api/admin/setup/route.ts
import { setupFirstAdmin } from "@/lib/auth/adminService";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * API route for setting up the first admin user
 * This should only be used once during initial setup
 * Requires a special setup token for security
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get setup token from request body
    const { setupToken } = await request.json();

    if (!setupToken) {
      return NextResponse.json(
        { message: "Setup token is required" },
        { status: 400 }
      );
    }

    // Try to set up the first admin
    const success = await setupFirstAdmin(token.sub, setupToken);

    if (!success) {
      return NextResponse.json(
        { message: "Failed to set up admin user" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Admin user set up successfully",
      userId: token.sub,
    });
  } catch (error) {
    console.error("Error in admin setup:", error);
    return NextResponse.json(
      { message: "An error occurred during admin setup" },
      { status: 500 }
    );
  }
}
