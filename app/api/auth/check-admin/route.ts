// app/api/auth/check-admin/route.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get session token for authentication
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    // In a real application, you would check if the user is an admin in your database
    // For example:
    // const user = await prisma.user.findUnique({ where: { id: token.sub } });
    // return NextResponse.json({ isAdmin: user?.isAdmin || false });

    // For demo purposes, we'll hardcode this to true
    // In a real app, replace this with actual user role checking logic
    const isAdmin = true;

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json(
      { isAdmin: false, error: "Failed to check admin status" },
      { status: 500 }
    );
  }
}
