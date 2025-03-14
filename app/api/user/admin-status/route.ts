// app/api/user/admin-status/route.ts
import { db } from "@/lib/firebase/clientApp";
import { doc, getDoc } from "firebase/firestore";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * API endpoint to check if the current user has admin privileges
 * Returns { isAdmin: boolean }
 */
// app/api/user/admin-status/route.ts
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request });

    if (!token?.sub) {
      return NextResponse.json({ isAdmin: false }, { status: 401 });
    }

    // Query directly for admin status for efficiency
    const profileRef = doc(db, "userProfiles", token.sub);
    const profileSnap = await getDoc(profileRef);
    const isAdmin =
      profileSnap.exists() && profileSnap.data()?.isAdmin === true;

    return NextResponse.json({ isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
