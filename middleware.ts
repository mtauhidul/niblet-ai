// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path is protected
  const protectedPaths = ["/dashboard", "/charts", "/admin", "/api/assistant"];

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
    pathname.startsWith("/api/auth");

  // Get the token and check if the user is authenticated
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // If it's a protected path and the user is not authenticated, redirect to sign in
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // For onboarding path, check if user has completed onboarding
  if (isOnboardingPath && token) {
    // Get user profile from database
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/user/profile`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.sub}`,
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
  }

  // If authenticated user tries to access auth pages, redirect to dashboard
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow the request to continue
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/charts/:path*",
    "/admin/:path*",
    "/onboarding/:path*",
    "/auth/:path*",
    "/api/assistant/:path*",
  ],
};
