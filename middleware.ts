// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path is protected
  const protectedPaths = [
    "/dashboard",
    "/charts",
    "/admin",
    "/api/assistant",
    "/profile",
  ];

  // Paths that onboarded users should not access
  const onboardingPaths = ["/onboarding"];

  // Public paths and authentication paths
  const authPaths = [
    "/auth/signin",
    "/auth/signup",
    "/auth/error",
    "/auth/verify-request",
    "/auth/forgot-password",
  ];

  // Check if this is a protected path
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );
  const isOnboardingPath = onboardingPaths.some((path) =>
    pathname.startsWith(path)
  );
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));
  const isPublicPath =
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes("."); // Static files

  // Get the token and check if the user is authenticated
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If it's a protected path and the user is not authenticated, redirect to sign in
  if (isProtectedPath && !token) {
    const signInUrl = new URL("/auth/signin", request.url);
    // Add the callback URL to redirect after login
    signInUrl.searchParams.set("callbackUrl", encodeURI(request.url));
    return NextResponse.redirect(signInUrl);
  }

  // For onboarding path, check if user has completed onboarding (only if token exists)
  if (isOnboardingPath && token) {
    try {
      // Get user profile from API
      const response = await fetch(
        `${
          process.env.NEXTAUTH_URL || request.nextUrl.origin
        }/api/user/profile`,
        {
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
        }
      );

      if (response.ok) {
        const profile = await response.json();

        // If onboarding is completed, redirect to dashboard
        if (profile?.onboardingCompleted) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // Continue without redirecting if there's an error checking status
    }
  }

  // If authenticated user tries to access auth pages, redirect to dashboard
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow the request to continue
  return NextResponse.next();
}

// Configure the matcher to only run middleware on specific paths
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/charts/:path*",
    "/admin/:path*",
    "/onboarding/:path*",
    "/auth/:path*",
    "/api/assistant/:path*",
    "/profile/:path*",
  ],
};
