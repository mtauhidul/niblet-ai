// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "./middleware/adminAuth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply admin authentication middleware to admin routes
  if (pathname.startsWith("/admin")) {
    return adminAuth(request);
  }

  // For other protected routes, apply the existing middleware logic
  const token = await getToken({ req: request });

  // Only check authenticated users
  if (token) {
    // Check if user is new and trying to access dashboard directly
    if (token.isNewUser === true && pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // Check if user profile exists by making a minimal fetch
    if (pathname === "/dashboard") {
      try {
        // Fetch from your API endpoint that checks if onboarding is complete
        const res = await fetch(
          `${request.nextUrl.origin}/api/user/onboarding-status`,
          {
            headers: {
              cookie: request.headers.get("cookie") || "",
            },
          }
        );

        if (
          res.status === 404 ||
          (res.status === 200 &&
            (await res.json().then((data) => !data.onboardingCompleted)))
        ) {
          return NextResponse.redirect(new URL("/onboarding", request.url));
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        // If there's an error, allow access to dashboard to prevent login loops
      }
    }
  } else if (
    pathname !== "/auth/signin" &&
    pathname !== "/auth/signup" &&
    pathname !== "/auth/error" &&
    pathname !== "/" &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/")
  ) {
    // Redirect unauthenticated users to sign in for protected routes
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // Continue to the requested page
  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Only apply to /admin routes, but EXCLUDE /admin-setup
    "/admin/:path*",
  ],
};
