// middleware/adminAuth.ts
import { getUserProfileById } from "@/lib/auth/authService";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware to protect admin routes
 * Only allows access if the user is authenticated and has isAdmin: true in their profile
 */
export async function adminAuth(req: NextRequest) {
  try {
    // Get token from the request
    const token = await getToken({ req });

    if (!token?.sub) {
      // If no token or not authenticated, redirect to login
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // Check if the user has admin privileges
    const userProfile = await getUserProfileById(token.sub);

    if (!userProfile?.isAdmin) {
      // User is authenticated but not an admin, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // User is authenticated and is admin, allow access
    return NextResponse.next();
  } catch (error) {
    console.error("Error in admin authentication middleware:", error);
    // In case of error, redirect to dashboard for safety
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
}
