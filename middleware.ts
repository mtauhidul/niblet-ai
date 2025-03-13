// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Only check authenticated users
  if (token) {
    // Check if user is new and trying to access dashboard directly
    if (token.isNewUser === true && request.nextUrl.pathname === "/dashboard") {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    // Check if user profile exists by making a minimal fetch
    if (request.nextUrl.pathname === "/dashboard") {
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
  }

  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ["/dashboard", "/profile", "/goals", "/admin"],
};
