// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // For admin routes, we'll handle access control in the page component
  // But still ensure the user is authenticated
  if (pathname.startsWith("/admin")) {
    const token = await getToken({ req: request });

    if (!token?.sub) {
      // If not authenticated, redirect to login
      return NextResponse.redirect(new URL("/auth/signin", request.url));
    }

    // Allow authenticated users to continue - we'll check admin status in the page
    return NextResponse.next();
  }

  // The rest of your middleware code...
  const token = await getToken({ req: request });

  // Only check authenticated users
  if (token) {
    // Your existing middleware logic...
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
    // Include admin routes
    "/admin/:path*",
    // Any other routes you want middleware for
    "/dashboard",
    // etc.
  ],
};
